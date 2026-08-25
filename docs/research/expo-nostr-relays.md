# Can Expo talk to public Nostr relays?

Research for [issue 149](https://github.com/themeganerddddddd/LouisianaFrench/issues/149) (map: [issue 147](https://github.com/themeganerddddddd/LouisianaFrench/issues/147)).

**Question:** Which JavaScript or Expo-ready libraries can publish and subscribe to public Nostr relays on iOS, Android, and web, and what WebSocket, background, or bundling constraints apply?

**This app (repo root `package.json`):** Expo `~54.0.0`, React Native `0.81.5`, `react-native-web` `^0.21.0`. There is no WebSocket or Nostr dependency today.

**Short answer:** Yes, while the app is in the foreground. Relays are ordinary `wss://` WebSockets ([NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)). React Native and browsers already expose a global `WebSocket`. Use `nostr-tools` `SimplePool` plus `nostr-tools/pure` as the smallest path that publish/subscribes on iOS, Android, and web. `@nostr-dev-kit/ndk` also uses `new WebSocket(...)` and can sit on top later. Do not expect live relay delivery after the learner leaves the app on iOS.

## Protocol: relays are WebSockets

[NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) says relays expose a WebSocket endpoint. Clients SHOULD open one connection per relay and reuse it for all subscriptions. Clients send JSON arrays (`EVENT` to publish, `REQ` to subscribe, `CLOSE` to stop). Relays send `EVENT`, `OK`, `EOSE`, `CLOSED`, and `NOTICE`. Relay URLs in the spec examples are `wss://...`.

Any library that can open a WebSocket, send those arrays, and verify Schnorr/`secp256k1` signatures can talk to public relays. There is no Expo-specific Nostr transport.

## What already exists on each platform

### React Native (iOS and Android)

React Native documents a global `WebSocket` that matches the web API ([Networking](https://reactnative.dev/docs/network), [WebSocket](https://reactnative.dev/docs/global-WebSocket)). Example from the Networking page:

```ts
const ws = new WebSocket('ws://host.com/path');
```

The [0.81 troubleshooting page](https://reactnative.dev/docs/0.81/troubleshooting) states that React Native implements a WebSocket polyfill, initialized as part of the `react-native` module (`import React from 'react'`). Load any other module that needs WebSockets after that import, or you can hit "No transports available". Expo apps include this through React Native; Expo SDK 54 does not ship a separate WebSocket package ([SDK 54 index](https://docs.expo.dev/versions/v54.0.0) lists Network, BackgroundTask, Crypto, and so on, but not WebSocket).

`expo-network` reports IP address, airplane mode, and similar device state. It is not a socket API ([Expo Network](https://docs.expo.dev/versions/v54.0.0/sdk/network)).

iOS App Transport Security and Android cleartext blocking, as documented on the React Native Networking page, require HTTPS for `http` fetches. Public relays use `wss://` (TLS). Cleartext `ws://` would hit the same policy as `http://`.

### Web (`react-native-web`)

Browsers provide `window.WebSocket` ([MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket), which the React Native WebSocket page defers to). `react-native-web` does not replace that global. NIP-07 (`window.nostr` browser extensions) is a separate signer, not a relay transport. `nostr-tools` documents NIP-07 types and `window.nostr.signEvent` for relay AUTH, not as the socket itself ([nostr-tools README](https://github.com/nbd-wtf/nostr-tools/blob/master/README.md)).

### Node (Jest, scripts)

`nostr-tools` documents that Node.js has no global `WebSocket` by default and requires `ws` plus `useWebSocketImplementation(WebSocket)` ([README](https://github.com/nbd-wtf/nostr-tools/blob/master/README.md)). NDK's `cache-nostr` README says the same for server-side Node: polyfill `WebSocket` ([cache-nostr README](https://github.com/nostr-dev-kit/ndk/blob/master/cache-nostr/README.md)). This app's Jest preset is `jest-expo`; unit tests that construct a pool may need that polyfill even if the shipped app does not.

## Libraries

### `nostr-tools` (`SimplePool`)

- npm: [`nostr-tools`](https://www.npmjs.com/package/nostr-tools) (v2.25.0 as of this note; GitHub `package.json` on master was 2.24.3). Unlicense. Depends on `@noble/*` and `@scure/*`, plus optional `nostr-wasm`.
- Docs: [GitHub README](https://github.com/nbd-wtf/nostr-tools/blob/master/README.md), [JSR docs](https://jsr.io/@nostr/tools/doc).

The README says to use `SimplePool` for all relay interaction. Documented operations:

- `pool.get(relays, filter)` — one event
- `pool.querySync(relays, filter)` — several events
- `pool.subscribe(relays, filter, { onevent })` — live subscription
- `pool.publish(relays, signedEvent)` — publish (README uses `Promise.any(...)`)

Signing and keys live in `nostr-tools/pure` (`generateSecretKey`, `getPublicKey`, `finalizeEvent`, `verifyEvent`). The README presents this as lower-level; it points at NDK and `@snort/system` for higher-level clients.

**WebSocket:** [`pool.ts`](https://github.com/nbd-wtf/nostr-tools/blob/master/pool.ts) and [`relay.ts`](https://github.com/nbd-wtf/nostr-tools/blob/master/relay.ts) capture the global `WebSocket` constructor, with `useWebSocketImplementation(...)` to inject `ws` on Node. They do not mention React Native. On iOS, Android, and web the global exists, so no `ws` package is required in the app.

**Imports / bundling:** npm `package.json` `exports` includes `./pool`, `./pure`, `./relay`, `./wasm`, and many `./nipXX` subpaths ([package.json](https://github.com/nbd-wtf/nostr-tools/blob/master/package.json)). Expo Metro in SDK 54 resolves `package.json:exports` and matches `react-native` on native and `browser` on web ([metro.config.js](https://docs.expo.dev/versions/v54.0.0/config/metro)). `nostr-tools` does not define a `react-native` condition; Metro should still hit `import` / `require`. If a package's exports map causes resolution failures, Expo documents `config.resolver.unstable_enablePackageExports = false` as an escape hatch. TypeScript `moduleResolution` `"bundler"` (or `"node16"` / `"nodenext"`) is what Expo recommends so types follow the same map.

README import paths currently use `@nostr/tools/pool` (JSR). The npm package name remains `nostr-tools`; in this app import from `nostr-tools/pool` and `nostr-tools/pure` unless you add the JSR package.

**Crypto:** Default verify/sign is pure JS (`@noble`). `@noble/hashes` documents that it uses `crypto.getRandomValues` and that React Native may need [`react-native-get-random-values`](https://www.npmjs.com/package/react-native-get-random-values) ([noble-hashes README](https://github.com/paulmillr/noble-hashes/blob/master/README.md)). That polyfill is imported once at the app entry (`import 'react-native-get-random-values'`). `react-native-get-random-values` v2 lists peer `react-native >= 0.81`. Expo also ships [`Crypto.getRandomValues`](https://docs.expo.dev/versions/v54.0.0/sdk/crypto) on Android, iOS, and web; that fills a typed array but does not automatically polyfill the Web Crypto global that noble expects.

**WASM (optional):** `nostr-tools/wasm` plus [`nostr-wasm`](https://www.npmjs.com/package/nostr-wasm) can replace noble for hashing/signing. The README reports wasm faster than pure JS on their bench, and requires `AbstractRelay` / `AbstractSimplePool` with `verifyEvent` injected. `nostr-wasm` embeds a WASM binary (+332 KiB uncompressed, or gzipped / headless fetch). Expo Metro's SDK 54 metro reference does not document bundling application WASM. Hermes is the default JS engine ([Using Hermes](https://docs.expo.dev/guides/using-hermes/)). Prefer `nostr-tools/pure` unless a later ticket measures a need for wasm on web only.

**Expo-specific notes:** none in the README. No native module. Fits a managed Expo app as a JS dependency.

### `@nostr-dev-kit/ndk` and `@nostr-dev-kit/mobile`

- Core: [`@nostr-dev-kit/ndk`](https://www.npmjs.com/package/@nostr-dev-kit/ndk) (v3.0.3). MIT. Peer `nostr-tools ^2.17.2`.
- Docs: [core README](https://github.com/nostr-dev-kit/ndk/blob/master/core/README.md), [monorepo README](https://github.com/nostr-dev-kit/ndk/blob/master/README.md), [NDK site](https://nostr-dev-kit.github.io/ndk/getting-started/introduction.html).
- Mobile: [`@nostr-dev-kit/mobile`](https://www.npmjs.com/package/@nostr-dev-kit/mobile) (v0.9.3), [mobile README](https://github.com/nostr-dev-kit/ndk/blob/master/mobile/README.md), [NDK Mobile docs](https://nostr-dev-kit.github.io/ndk/mobile/index.html). Keywords include `expo`. Older npm name `@nostr-dev-kit/ndk-mobile` still exists.

Core NDK is a higher-level client: relay pool with reconnection, subscriptions, outbox (NIP-65), signers (private key, NIP-07, NIP-46), cache adapters. Documented API: `ndk.connect()`, `event.publish()`, `ndk.subscribe(filter, opts, { onEvent, onEose })`.

**WebSocket:** [`NDKRelayConnectivity`](https://github.com/nostr-dev-kit/ndk/blob/master/core/src/relay/connectivity.ts) does `this.ws = new WebSocket(this.ndkRelay.url)` and watches `readyState`. There is no injectable constructor in that file. Environments without a global `WebSocket` must polyfill it (as `cache-nostr` states for Node). Changelog entries describe keepalive every 5 seconds and reconnect after sleep/wake — useful in the foreground, not a background-execution claim.

**Expo-specific (`@nostr-dev-kit/mobile`):** The package documents React Native and Expo compatibility, SQLite cache (`NDKCacheAdapterSqlite`), session persistence via `expo-secure-store`, and NIP-55. Installation on the NDK site also lists `react-native-get-random-values`, `@bacons/text-decoder`, `expo-sqlite`, `expo-crypto`, and `expo-file-system`. Usage: import from `@nostr-dev-kit/mobile` instead of `@nostr-dev-kit/ndk` (mobile README); the site also says you mainly use core NDK plus `@nostr-dev-kit/react` hooks.

**Peer mismatch for this app:** npm `@nostr-dev-kit/mobile@0.9.3` peers include `expo ^53`, `expo-sqlite ^15.1.4`, `react-native ^0.71.0`, `react-native-reanimated ^3.16.0`. This repo is Expo `~54`. That is not a documented Expo 54 guarantee. The package also pulls wallet, `expo-image`, and `expo-nip55` — more than "open a relay and REQ/EVENT".

Core `@nostr-dev-kit/ndk` without the mobile package can still publish and subscribe wherever `WebSocket` exists (iOS, Android, web). Cache adapters for web (Dexie) vs native (SQLite) would be a later choice.

### `rx-nostr`

- npm: [`rx-nostr`](https://www.npmjs.com/package/rx-nostr), docs: [installation](https://penpenpng.github.io/rx-nostr/en/v3/installation.html), [GitHub](https://github.com/penpenpng/rx-nostr).

RxJS-based relay I/O. `createRxNostr({ websocketCtor })` is required when `globalThis.WebSocket` is missing (documented for Node + `ws`). On RN and web the global exists, so `websocketCtor` can be omitted or set to the global `WebSocket`. Crypto is a separate `@rx-nostr/crypto` (optional if you supply another verifier). No Expo-specific notes. Extra RxJS surface; not needed unless the app already thinks in observables.

### `@snort/system`

- npm: [`@snort/system`](https://www.npmjs.com/package/@snort/system). Mentioned from nostr-tools as a higher-level alternative.

README shows `NostrSystem`, `ConnectToRelay`, and `Query`. Dependencies include `isomorphic-ws` and `ws`. No Expo or React Native claim on the npm README. Treat as a Snort-shaped client, not as the Expo-ready path.

## Background delivery on iOS

Live Nostr subscribe needs an open WebSocket for the life of the `REQ` ([NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)). That is a foreground concern.

React Native [`AppState`](https://reactnative.dev/docs/appstate) distinguishes `active` (foreground) from `background` (home screen or another app). Libraries can reconnect when the app becomes `active` again (NDK already monitors stale sockets in the foreground).

Expo does not offer a persistent socket in the background:

- [`expo-background-task`](https://docs.expo.dev/versions/v54.0.0/sdk/background-task) runs **deferrable** work through Android `WorkManager` and iOS [`BGTaskScheduler`](https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler). The task may not run immediately. Minimum interval is 15 minutes; default example is 12 hours. On iOS the system picks the time (battery, network, usage); Expo notes short intervals are often ignored and work may run overnight. On web, `getStatusAsync()` is always `Restricted`. iOS Simulator does not support Background Tasks.
- [`expo-task-manager`](https://docs.expo.dev/versions/v54.0.0/sdk/task-manager) `defineTask` must run in the **global** JS scope because a background launch spins up JS, runs the task, and shuts down — **no views are mounted**. `isAvailableAsync()` is always `false` on web. Expo Go does not support background execution on iOS.

Apple's `BGTaskScheduler` is for scheduling work while the app is suspended, not for keeping a user-space WebSocket open. [`BGContinuedProcessingTask`](https://developer.apple.com/documentation/backgroundtasks/performing-long-running-tasks-on-ios-and-ipados) is for a person-started job that may finish after backgrounding (video export, thumbnail batch), with a system Live Activity and cancellation — not an always-on relay subscription. Expo's background-task module maps to the deferrable scheduler, not this continued-processing API.

**Realistic for this app:** publish and subscribe while the learner is in the app (and on web, while the tab is allowed to run). After iOS suspends the app, reconnect on next foreground and `REQ` stored events (`since`, `limit`). A background task could at best poll on an inexact multi-hour cadence; it cannot provide chat-like live delivery. Do not abuse VoIP or other `UIBackgroundModes` to hold a Nostr socket.

## Bundling checklist for this Expo 54 app

| Concern | What the sources say |
| --- | --- |
| WebSocket in the app | RN global + browser global; no extra native module |
| Node / Jest | Inject `ws` if `WebSocket` is missing |
| Import order | Import React / RN before any library that needs WebSocket |
| Subpath imports | Metro SDK 54 honors `exports` (`nostr-tools/pool`) |
| Randomness | Polyfill `crypto.getRandomValues` on native before noble/nostr-tools keygen |
| WASM | Optional nostr-tools path; not documented as Metro/Hermes-ready; skip for v1 |
| NDK mobile | Expo-oriented, but peer `expo ^53` and extra native modules; not required to talk to relays |
| ATS / cleartext | Use `wss://` public relays |

## Recommendation

1. **Relay transport:** add `nostr-tools` and use `SimplePool` from `nostr-tools/pool` with keys/events from `nostr-tools/pure`. Same code path on iOS, Android, and web because all three already have `WebSocket`. Do not install `ws` in the app; only in tests if Jest lacks a global socket.
2. **Polyfill:** import `react-native-get-random-values` at the native entry (or otherwise guarantee `crypto.getRandomValues`) before `generateSecretKey`.
3. **Do not start with `@nostr-dev-kit/mobile`.** It is the documented Expo wrapper for NDK, but it is heavier than this question and its published peer is Expo 53. If later tickets need outbox, Dexie/SQLite cache, or NDK React hooks, add `@nostr-dev-kit/ndk` (core) on the same global WebSocket, and revisit mobile only after checking Expo 54 peers.
4. **Product constraint:** community live updates are foreground-only. Spec DMs, forum, and leaderboard as reconnect-and-catch-up, not as iOS background push over Nostr.

This ticket does not choose a default relay list, secret storage, or NIP set; those are other map decisions.

## Sources

- [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [nostr-tools README](https://github.com/nbd-wtf/nostr-tools/blob/master/README.md), [npm](https://www.npmjs.com/package/nostr-tools), [pool.ts](https://github.com/nbd-wtf/nostr-tools/blob/master/pool.ts), [relay.ts](https://github.com/nbd-wtf/nostr-tools/blob/master/relay.ts), [package.json](https://github.com/nbd-wtf/nostr-tools/blob/master/package.json)
- [nostr-wasm npm](https://www.npmjs.com/package/nostr-wasm)
- [@noble/hashes README](https://github.com/paulmillr/noble-hashes/blob/master/README.md), [react-native-get-random-values](https://www.npmjs.com/package/react-native-get-random-values)
- [NDK monorepo README](https://github.com/nostr-dev-kit/ndk/blob/master/README.md), [core README](https://github.com/nostr-dev-kit/ndk/blob/master/core/README.md), [npm @nostr-dev-kit/ndk](https://www.npmjs.com/package/@nostr-dev-kit/ndk), [connectivity.ts](https://github.com/nostr-dev-kit/ndk/blob/master/core/src/relay/connectivity.ts), [cache-nostr README](https://github.com/nostr-dev-kit/ndk/blob/master/cache-nostr/README.md)
- [NDK Mobile docs](https://nostr-dev-kit.github.io/ndk/mobile/index.html), [mobile README](https://github.com/nostr-dev-kit/ndk/blob/master/mobile/README.md), [npm @nostr-dev-kit/mobile](https://www.npmjs.com/package/@nostr-dev-kit/mobile)
- [rx-nostr installation](https://penpenpng.github.io/rx-nostr/en/v3/installation.html)
- [@snort/system npm](https://www.npmjs.com/package/@snort/system)
- [React Native Networking (WebSocket)](https://reactnative.dev/docs/network), [WebSocket global](https://reactnative.dev/docs/global-WebSocket), [0.81 troubleshooting](https://reactnative.dev/docs/0.81/troubleshooting), [AppState](https://reactnative.dev/docs/appstate)
- [MDN WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0), [Network](https://docs.expo.dev/versions/v54.0.0/sdk/network), [Crypto](https://docs.expo.dev/versions/v54.0.0/sdk/crypto), [BackgroundTask](https://docs.expo.dev/versions/v54.0.0/sdk/background-task), [TaskManager](https://docs.expo.dev/versions/v54.0.0/sdk/task-manager), [metro.config.js](https://docs.expo.dev/versions/v54.0.0/config/metro), [Using Hermes](https://docs.expo.dev/guides/using-hermes/)
- [Apple BGTaskScheduler](https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler), [Performing long-running tasks on iOS](https://developer.apple.com/documentation/backgroundtasks/performing-long-running-tasks-on-ios-and-ipados)
