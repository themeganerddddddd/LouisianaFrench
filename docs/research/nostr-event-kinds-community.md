# Which Nostr event kinds belong in a community spec

**Ticket:** [Which Nostr event kinds belong in the spec](https://github.com/themeganerddddddd/LouisianaFrench/issues/148)
**Map:** [Accountless community spec](https://github.com/themeganerddddddd/LouisianaFrench/issues/147)

## Question

Which Nostr NIPs and event kinds can carry a public forum, private DMs, a Display name, and a replaceable XP snapshot on public relays — and what must a spec not assume those NIPs provide (moderation, deletion, unique names, hidden metadata)?

## Sources

Primary sources only: [nostr-protocol/nips](https://github.com/nostr-protocol/nips) as of commit [`13664fb18a3c`](https://github.com/nostr-protocol/nips/commit/13664fb18a3ce5fa48a849de012ab789d82eb254) (2026-08-24). Blob URLs below point at `master` of that repository. NIPs listed in the index are not a protocol checklist; each app picks a subset ([README, opening](https://github.com/nostr-protocol/nips/blob/master/README.md)).

## Short answer

| Need | Carry it with | Do not assume |
| --- | --- | --- |
| Display name | Kind `0` user metadata ([NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md#kinds)); optional `display_name` ([NIP-24](https://github.com/nostr-protocol/nips/blob/master/24.md#kind-0)) | Unique names. Kind `0` `name` / `display_name` are signed claims, not reserved handles. [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) maps a key to a DNS identifier; it does not make Display names unique and is “identification, not verification.” |
| Public forum | Kind `1` notes ([NIP-10](https://github.com/nostr-protocol/nips/blob/master/10.md)); kind `11` threads + kind `1111` comments ([NIP-7D](https://github.com/nostr-protocol/nips/blob/master/7D.md), [NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md)). Optional community tagging via unrecommended [NIP-72](https://github.com/nostr-protocol/nips/blob/master/72.md). | Network-wide moderation, deletion, or a hosted group. [NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md) groups need a relay that enforces rules; this map does not run a relay. |
| Private DMs | [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) kind `14` rumors, sealed as kind `13` and gift-wrapped as kind `1059`, encrypted with [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) via [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md). Inbox relays via kind `10050`. | [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md) kind `4` (deprecated; metadata leak). Hidden recipient metadata on every public relay. No protocol invitations, bans, or admins. |
| Replaceable XP snapshot | Addressable (formerly “parameterized replaceable”) kinds `30000–39999` in [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md#kinds); [NIP-33](https://github.com/nostr-protocol/nips/blob/master/33.md) only points there. App-private payload: kind `30078` ([NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md)). | Relays keep history. Older versions MAY be discarded. Content on public relays is public. |

A spec must not treat NIPs as providing moderation, guaranteed deletion, unique Display names, or hidden metadata for events published in the clear on public relays.

## Display name: kind 0 metadata

[NIP-01, Kinds](https://github.com/nostr-protocol/nips/blob/master/01.md#kinds) defines kind `0` as **user metadata**: `content` is a stringified JSON object `{name: <nickname or full name>, about: <short bio>, picture: <url of the image>}`. Extra fields may be set. Kind `0` is **replaceable**: for each `pubkey` + `kind`, only the latest event MUST be stored; older versions MAY be discarded. A relay may delete older kind `0` events once it gets a new one for the same pubkey.

[NIP-24, kind 0](https://github.com/nostr-protocol/nips/blob/master/24.md#kind-0) adds optional fields, including `display_name` (“an alternative, bigger name with richer characters than `name`”). `name` should always be set regardless of `display_name`. Deprecated aliases: `displayName` → `display_name`, `username` → `name`.

Nothing in NIP-01 or NIP-24 reserves `name` or `display_name`. Two keys may publish the same string. Identity remains the public key ([NIP-01, Events and signatures](https://github.com/nostr-protocol/nips/blob/master/01.md#events-and-signatures)).

[NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) is a separate, optional DNS mapping: a `nip05` internet identifier on kind `0` is checked against `https://<domain>/.well-known/nostr.json`. It is “identification, not verification.” Clients must follow public keys, not NIP-05 addresses. That does not make Display names unique on the protocol.

Kind `0` is fully public on any relay that stores it.

## Public forum: notes, comments, threads

### Kind 1 text notes (NIP-10)

[NIP-10](https://github.com/nostr-protocol/nips/blob/master/10.md) defines kind `1` as a simple plaintext note. `e` tags thread replies among kind `1` events. Kind `1` replies MUST NOT be used to reply to other kinds; use NIP-22 instead. Markup SHOULD NOT be used. Kind `1` is a **regular** event ([NIP-01, Kinds](https://github.com/nostr-protocol/nips/blob/master/01.md#kinds)): relays are expected to store all of them.

This is the basic public feed. It does not define a community, moderators, or approval.

### Kind 1111 comments (NIP-22)

[NIP-22](https://github.com/nostr-protocol/nips/blob/master/22.md) defines kind `1111` comments, always scoped to a root event (or an external `I` tag). Uppercase tags (`E`/`A`/`I`, `K`, `P`) mark the root; lowercase tags mark the parent. Content is plaintext (no HTML or Markdown). Kind `1111` sits in the regular range `1000–9999`.

Use this when posts reply to something that is not a kind `1` note (a thread, a community definition, an addressable XP event, and so on).

### Kind 11 forum threads (NIP-7D)

[NIP-7D](https://github.com/nostr-protocol/nips/blob/master/7D.md) defines a thread as kind `11` with a `title` tag. Replies MUST use NIP-22 kind `1111`, scoped to the root kind `11`, to avoid nested reply hierarchies.

This is the closest named “forum thread” kind in the index. Kind `11` is regular ([NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md#kinds) range `4 ≤ n < 45`).

### NIP-72 moderated communities (unrecommended)

The NIP index marks [NIP-72](https://github.com/nostr-protocol/nips/blob/master/72.md) **unrecommended**: try [NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md) instead.

If used anyway, NIP-72 works on ordinary public relays with **client-side** approval:

- Kind `34550` (addressable) is the community definition and moderator list (`d` tag MAY double as the name; a `name` tag SHOULD be displayed instead).
- Posts SHOULD be NIP-22 kind `1111` tagged to that community `A`/`a`. Older kind `1` posts with an `a` tag MAY still be queried; new posts SHOULD NOT use kind `1`.
- Kind `4550` is a moderator approval. Anyone may issue an approval; clients MAY choose which to honor, but SHOULD at least use the defined moderators.

NIP-72 does not make relays hide unapproved posts. Moderation is a client filter over public events.

### NIP-29 relay-based groups (poor fit without a group relay)

[NIP-29](https://github.com/nostr-protocol/nips/blob/master/29.md) defines groups writable only by a closed set of users. There is no create-group event: a **relay** creates rules around a group id. Relays generate metadata (`kind:39000`) and admin lists (`kind:39001`) signed by the relay keypair. User events MUST carry an `h` tag with the group id. The group is only as durable as that relay.

The map does not house accounts or run a relay. NIP-29 therefore does not carry a public forum on arbitrary public relays.

### Other chat kinds (not the public forum)

- [NIP-28](https://github.com/nostr-protocol/nips/blob/master/28.md) public chat (kinds `40–44`) is **unrecommended**; try NIP-29.
- [NIP-C7](https://github.com/nostr-protocol/nips/blob/master/C7.md) kind `9` is a chat-stream message, not a forum thread.

## Private DMs: NIP-17 / 44 / 59 versus NIP-04

### Do not use NIP-04

[NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md) kind `4` is **unrecommended** and deprecated in favor of NIP-17 ([README list](https://github.com/nostr-protocol/nips/blob/master/README.md#list)). Kind `4` encrypts `content` with AES-256-CBC from a shared ECDH secret and tags the recipient in a public `p` tag. The NIP’s security warning: it “leaks metadata in the events, therefore it must not be used for anything you really need to keep secret, and only with relays that use `AUTH` to restrict who can fetch your `kind:4` events.”

### Use NIP-17 on top of NIP-44 and NIP-59

[NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) defines encrypted chat using [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) encryption and [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) gift-wrapping.

Wire kinds:

| Kind | Role | NIP |
| --- | --- | --- |
| `14` | Chat rumor (unsigned inner message; `p` tags are receivers) | [17](https://github.com/nostr-protocol/nips/blob/master/17.md#chat-message) |
| `15` | File-message rumor | [17](https://github.com/nostr-protocol/nips/blob/master/17.md#file-message) |
| `13` | Seal (signed by the real sender; empty tags; encrypts the rumor) | [59](https://github.com/nostr-protocol/nips/blob/master/59.md#2-the-seal-event-kind) |
| `1059` | Gift wrap (random one-time key; `p` tags the recipient; persist / offline delivery) | [59](https://github.com/nostr-protocol/nips/blob/master/59.md#3-gift-wrap-event-kind) |
| `10050` | Replaceable DM inbox relay list | [17](https://github.com/nostr-protocol/nips/blob/master/17.md#publishing), [51](https://github.com/nostr-protocol/nips/blob/master/51.md) |

Clients MUST publish gift wraps only to relays in the recipient’s kind `10050` list. If that list is missing, the user is not ready to receive messages.

NIP-17 “Benefits & Limitations” includes:

1. **No Metadata Leak** of identities, real timestamps, kinds, and tags **from the public event** (they sit inside the wrap).
2. **No Moderation**: “There are no group admins: no invitations or bans.” Friend-invite policy is product work, not this NIP.
3. **Uses Public Relays**: messages can flow through public relays without loss of privacy *of the inner rumor*, but see the AUTH caveat below.
4. Group chats with more than about 10 participants should find another scheme (one wrap per receiver).

[NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) is encryption only: it “DOES NOT define any `kind`s related to a new direct messaging standard” and “SHOULD NOT be used as a drop-in replacement for NIP-04 payloads.” On its own it has no forward secrecy, no post-compromise security, an IP leak to relays, a public `created_at` on the signed event, and only partial padding of size. Gift wrapping is what hides sender, kind, and inner timestamp.

### Metadata hiding is not a relay guarantee

[NIP-59, Other Considerations](https://github.com/nostr-protocol/nips/blob/master/59.md#other-considerations): relays SHOULD guard `kind 1059` with AUTH and SHOULD only serve wraps to the marked recipient. Clients should only send wraps to recipient read relays that implement AUTH. Relays MAY refuse to store gift wraps as “not publicly useful.”

[NIP-17, Relays](https://github.com/nostr-protocol/nips/blob/master/17.md#relays) repeats that relays SHOULD serve `kind:1059` only to p-tagged users, enforced with [NIP-42](https://github.com/nostr-protocol/nips/blob/master/42.md).

A spec must not assume every public relay hides DM recipients. On a relay that serves all `kind:1059` events, the wrap’s `p` tag is visible. Inner content still requires the keys, but “who is being messaged” is not hidden.

## Replaceable XP snapshot: addressable events (ex NIP-33)

[NIP-33](https://github.com/nostr-protocol/nips/blob/master/33.md) is one sentence: parameterized replaceable events were renamed **addressable events** and moved to NIP-01.

[NIP-01, Kinds](https://github.com/nostr-protocol/nips/blob/master/01.md#kinds):

- **Replaceable** (`10000 ≤ n < 20000`, plus kinds `0` and `3`): latest event per `pubkey` + `kind`. Older versions MAY be discarded.
- **Addressable** (`30000 ≤ n < 40000`): latest event per `kind` + `pubkey` + `d` tag. Older versions MAY be discarded.
- These “are just conventions and relay implementations may differ.”

The `a` tag addresses them as `kind:pubkey:d-tag` ([NIP-01, Tags](https://github.com/nostr-protocol/nips/blob/master/01.md#tags)).

[NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md) is the dedicated app-private slot:

- Kind `30078` (addressable): `d` tag names the app/context; `content` and other tags can be anything. Suited to one current snapshot per `d` value (for example `louisiana-french:xp`).
- Kind `78` (regular): many stored events of the same type; **not** replaceable.

A friends-only leaderboard that publishes XP as kind `30078` (or another unused addressable kind) on public relays is a **public signed snapshot**. Relays do not hide it. Replaceability only means “keep the latest,” not “keep it private” or “keep a history.”

[NIP-70](https://github.com/nostr-protocol/nips/blob/master/70.md) `["-"]` protected events restrict *who may republish to a cooperating relay*; default relays MUST reject them. That is not a way to hide XP on open public relays.

## What a spec must not assume

### Moderation

NIPs do not provide network-wide moderation.

- NIP-17 DMs: “No Moderation… no invitations or bans.”
- NIP-72: approvals are optional client policy over public posts; the NIP is unrecommended.
- NIP-29: moderation exists, but only on the relay that hosts the group.
- [NIP-56](https://github.com/nostr-protocol/nips/blob/master/56.md) kind `1984` reports are signals. Relays are explicitly *not* recommended to auto-moderate from them. Clients MAY use reports from friends.

Mute lists ([NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) kind `10000`) are per-user filters, not community enforcement.

### Unique names

Kind `0` `name` / `display_name` are not unique and are not the identity. NIP-05 identifiers are DNS mappings of keys, not unique Display names, and are not verification.

### Deletion

[NIP-09](https://github.com/nostr-protocol/nips/blob/master/09.md) kind `5` is a **deletion request**. Relays SHOULD delete referenced events with the same pubkey. Clients SHOULD hide or mark them. Relays SHOULD keep the kind `5` itself. Clients MAY tell the user that deletion is not guaranteed “because it is impossible to delete events from all relays and clients.” Relays cannot in general validate that referenced events share the author’s pubkey.

[NIP-62](https://github.com/nostr-protocol/nips/blob/master/62.md) kind `62` is a **request to vanish** from tagged relays (or `ALL_RELAYS`). Only cooperating relays delete. Relays SHOULD also delete NIP-59 gift wraps that p-tag that pubkey.

[NIP-40](https://github.com/nostr-protocol/nips/blob/master/40.md) `expiration` tags: relays MAY persist expired events indefinitely. “The events could be downloaded by third parties as they are publicly accessible… don’t consider expiring messages as a security feature.”

### Hidden metadata on public relays

| Surface | What is public on a typical public relay |
| --- | --- |
| Kind `0` Display name, about, picture | Entire JSON `content` |
| Kind `1` / `11` / `1111` forum posts | Author pubkey, timestamps, plaintext, tags |
| Kind `30078` (or other addressable) XP | Author pubkey, `d` tag, `content` |
| NIP-04 kind `4` | Recipient `p` tag and other metadata; ciphertext only in `content` |
| NIP-17 gift wrap on an AUTH inbox relay | Wrap exists; inner rumor hidden; recipient served only to that user (**SHOULD**, not MUST) |
| NIP-17 gift wrap on an open relay | Wrap `p` tag (recipient) may be enumerable; inner rumor still encrypted |
| NIP-44 without gift wrap | `created_at`, size (partially padded), IP at the relay |

NIP-59 gift wrap hides the inner event from the public document. It does not hide that *some* wrap was published, does not hide the client IP from the relay, and does not hide the recipient `p` tag unless the relay implements AUTH gating.

## Suggested mapping for this spec (research only)

Not an implementation choice — a reading of which NIPs can carry the map’s surfaces:

1. **Display name:** kind `0` with `name` and optional `display_name`. Treat as a signed claim. Do not promise uniqueness. Identity is the pubkey.
2. **Public forum:** kind `11` + kind `1111` if the product wants titled threads; or kind `1` if it wants a simple public note feed. NIP-72 is optional and unrecommended; it does not replace product abuse policy. Skip NIP-29 unless a dedicated group relay is in scope (it is not).
3. **Private DMs:** NIP-17 (kinds `14` / `13` / `1059` / `10050`) with NIP-44 and NIP-59. Do not use NIP-04. Friend invites remain product policy; NIP-17 has no invitations.
4. **XP snapshot:** one addressable event, kind `30078` with a stable `d` tag (or another unused kind in `30000–39999`). Public on public relays. Relays MAY drop older versions. Not a private leaderboard by itself — audience restriction is a client filter over Friend keys.

## Non-goals of this note

This note does not pick a default public relay list, outbox behavior, web secret storage, mute/report UI, or whether restoring a Community identity restores Learner Progress. Those are other tickets on [issue 147](https://github.com/themeganerddddddd/LouisianaFrench/issues/147).
