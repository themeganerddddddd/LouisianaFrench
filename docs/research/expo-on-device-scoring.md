# Can on-device scoring run in Expo without cooking the phone

Research for [issue #162](https://github.com/themeganerddddddd/LouisianaFrench/issues/162), answering a decision on the [Speaking accuracy spec](https://github.com/themeganerddddddd/LouisianaFrench/issues/160). Primary sources only. No product implementation.

**Question:** For this Expo SDK 54 app (iOS, Android, and web), which on-device speech / pronunciation models can actually run, and what do first-party docs say about size, memory, compute, Expo Go vs development client, and thermal or battery cost?

**Repo context (this tree, Expo SDK 54):** Speech Practice records with `expo-audio` `RecordingPresets.HIGH_QUALITY` in `SpeechPracticePrototype.js`. `package.json` has no ML, ASR, Core ML, ONNX, TFLite, ExecuTorch, or whisper dependency. Platforms are iOS, Android, and web (`app.json`). Expo SDK 54 targets React Native 0.81 and lists minimum OS versions Android 7+ / iOS 15.1+ ([Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)).

## Short answer

On-device scoring cannot run in Expo Go. SDK 54 ships recording (`expo-audio`) and text-to-speech (`expo-speech`), not speech-to-text or a model runtime. Any OS Speech API, whisper.cpp binding, ONNX Runtime, LiteRT / TensorFlow Lite, or ExecuTorch path needs custom native code and therefore a development build (or a production binary with that native code). First-party docs give model **disk and RAM** for Whisper-class weights (tiny: 75 MiB disk / ~273 MB RAM) and qualitative **power** warnings (Apple Speech “relatively high burden on battery life”; Android `SpeechRecognizer` “significant amount of battery”), but they do **not** publish phone-temperature or milliamp figures for these models. Web can record; web on-device scoring is a hard miss from platform docs: the Web Speech API’s default path sends audio to a recognition service, Expo does not ship a browser ML runtime, and WebNN is still a W3C Candidate Recommendation Draft.

None of the first-party speech APIs below score pronunciation against Catalog Audio. They transcribe. That matches the map’s warning that Whisper-as-ASR is the wrong destination tool; an on-device runtime could still host a different acoustic model if one existed.

## Expo Go vs development build

Expo Go only includes native libraries that ship in the Expo SDK, plus a curated third-party list. It cannot load custom native code. Source: [Add custom native code](https://docs.expo.dev/workflow/customizing/) and [Third-party libraries in Expo Go (v54)](https://docs.expo.dev/versions/v54.0.0/sdk/third-party-overview/).

A **development build** is “your own version of Expo Go” compiled with the project’s native libraries. Installing a library that includes `android` / `ios` directories, linking, a config plugin, or Info.plist / AndroidManifest changes requires one. Source: [Introduction to development builds](https://docs.expo.dev/develop/development-builds/introduction/) and [Using libraries](https://docs.expo.dev/workflow/using-libraries/).

SDK 54 Expo Go’s third-party list is UI, storage, maps, Stripe, Skia, and similar. It does not include whisper, ONNX Runtime, LiteRT, ExecuTorch, or Apple/Android Speech bindings.

`expo-speech` in SDK 54 is **text-to-speech**, not recognition. Source: [Expo Speech (v54)](https://docs.expo.dev/versions/v54.0.0/sdk/speech/).

So every on-device scorer candidate below is **dev-client / production native**, not Expo Go.

## Recording today (`expo-audio`)

`expo-audio` is listed for Android, iOS, web, tvOS, and Expo Go. Source: [Expo Audio (v54)](https://docs.expo.dev/versions/v54.0.0/sdk/audio/).

`RecordingPresets.HIGH_QUALITY` (the preset Speech Practice uses):

| Field | Native | Web |
| --- | --- | --- |
| Extension / MIME | `.m4a` | `audio/webm` |
| Sample rate | 44100 | (MediaRecorder) |
| Channels | 2 | (MediaRecorder) |
| Bit rate | 128000 | `bitsPerSecond: 128000` |
| Android | MPEG-4 + AAC | — |
| iOS | MPEG4AAC, `AudioQuality.MAX` | — |

Web notes from the same page: Chrome WebM files may lack duration metadata; MediaRecorder options vary by browser; **microphone access requires a secure context** (localhost or HTTPS). Speech Practice already checks `globalThis.isSecureContext` on web.

First-party ASR runtimes typically want mono PCM at 16 kHz. `whisper.rn`’s Parakeet path states: file and base64 inputs must be WAV containing 16-bit PCM; raw audio must be **mono at 16 kHz**; compressed formats (MP3, AAC, FLAC) are not decoded. HIGH_QUALITY’s AAC/m4a (native) and WebM (web) are therefore not a drop-in tensor. That is a format seam, not a platform veto.

## OS speech APIs (transcription, not pronunciation)

These keep audio on-device if configured that way. They convert speech **to text**. They do not compare a learner take to Catalog Audio. They are not in the Expo SDK; using them from this app means a local Expo module (Swift / Kotlin) and a development build.

### Apple Speech

The Speech framework “recognize[s] spoken words in recorded or live audio” and is built on Core ML. Source: [Speech](https://developer.apple.com/documentation/speech) and [Core ML](https://developer.apple.com/documentation/coreml).

**Default `SFSpeechRecognizer` path is a network service.** Apple’s permission guide: “The speech recognition process involves capturing audio of the user’s voice and sending that data to Apple’s servers for processing.” `SpeechAnalyzer` transcriber modules “don’t send audio data of the user’s voice to Apple’s servers.” Source: [Asking Permission to Use Speech Recognition](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition).

On-device `SFSpeechRecognizer`:

- `requiresOnDeviceRecognition = true` “prevent[s] an `SFSpeechRecognitionRequest` from sending audio over the network. However, on-device requests won’t be as accurate.” Honored only if `supportsOnDeviceRecognition` is also true. Source: [`requiresOnDeviceRecognition`](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition).
- Apple documents **battery and duration** for this API: “Speech recognition places a relatively high burden on battery life and network usage. To minimize this burden, the framework stops speech recognition tasks that last longer than one minute.” Also: individual devices and apps may be throttled on the **network** service; “Do not perform speech recognition on private or sensitive information.” Source: [`SFSpeechRecognizer`](https://developer.apple.com/documentation/speech/sfspeechrecognizer).

WWDC19 (Apple): on-device recognition does not apply the server request/duration limits; “your user's data will not be sent to Apple servers”; accuracy “is good on-device, but you may find it is better on server”; A9+ iPhones/iPads. Source: [Advances in Speech Recognition](https://developer.apple.com/videos/play/wwdc2019/256/).

**`SpeechAnalyzer` / `SpeechTranscriber` (iOS 26+):** Apple’s 2025 session states the new model “operates entirely on-device”; assets install via `AssetInventory` and “do[] not increase the download or storage size of your application, nor does it increase the run-time memory size. It operates outside of your application’s memory space.” Fallback: `DictationTranscriber` for unsupported languages or devices. Availability: iOS 26. Source: [Bring advanced speech-to-text to your app with SpeechAnalyzer](https://developer.apple.com/videos/play/wwdc2025/277/) and [`SpeechTranscriber`](https://developer.apple.com/documentation/speech/speechtranscriber) (iOS 26.0+). This app’s **minimum** iOS is 15.1; iOS 26 APIs are availability-gated native code, not Expo JS.

Core ML (the engine under Speech): “optimizes on-device performance by leveraging the CPU, GPU, and Neural Engine while **minimizing its memory footprint and power consumption**.” No watt or °C numbers. Source: [Core ML](https://developer.apple.com/documentation/coreml).

Apple does not document Louisiana French or Kouri-Vini as Speech locales. Supported locales are queried at runtime (`supportedLocales`).

### Android SpeechRecognizer

`SpeechRecognizer.createOnDeviceSpeechRecognizer(Context)` builds an on-device recognizer. `isOnDeviceRecognitionAvailable` must be true or creation fails. Source: [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer).

The same class documents the **default** (not necessarily on-device) service: “The implementation of this API is likely to stream audio to remote servers to perform speech recognition. As such this API is not intended to be used for continuous recognition, which would consume a **significant amount of battery and bandwidth**.”

NNAPI, the old Android hardware-ML C API, is **deprecated as of Android 15**. Google’s migration path is TensorFlow Lite in Play Services (and AICore for GenAI foundation models). Source: [NNAPI](https://developer.android.com/ndk/guides/neuralnetworks) and [NNAPI Migration Guide](https://developer.android.com/ndk/guides/neuralnetworks/migration-guide).

No first-party Android doc in this set gives RAM, model size, or thermal numbers for the system on-device recognizer. Language coverage is a system service, not something this app ships.

## Candidate model runtimes (custom weights)

These can run **a model this project hosts** on the phone. They still need a development build. First-party docs describe **inference**, not pronunciation scoring. Size and RAM below are what the vendors publish; none publish “the phone will heat by N °C.”

### whisper.cpp and whisper.rn

[whisper.cpp](https://github.com/ggml-org/whisper.cpp) is a C/C++ port of OpenAI Whisper ASR. Official examples include iOS (`examples/whisper.objc`, `whisper.swiftui`), Android (`examples/whisper.android`), and **WebAssembly** (`examples/whisper.wasm`). Apple Silicon: ARM NEON, Accelerate, Metal, and Core ML encoder on the Neural Engine (“more than x3 faster compared with CPU-only”; first ANE compile on a device is slow).

Documented **memory usage** (whisper.cpp README):

| Model | Disk | Mem |
| --- | --- | --- |
| tiny | 75 MiB | ~273 MB |
| base | 142 MiB | ~388 MB |
| small | 466 MiB | ~852 MB |
| medium | 1.5 GiB | ~2.1 GB |
| large | 2.9 GiB | ~3.9 GB |

Quantized ggml models “require less memory and disk space and depending on the hardware can be processed more efficiently.” The README does not give a second RAM table for quantized variants.

[whisper.rn](https://github.com/mybigday/whisper.rn) is the React Native binding whisper.cpp itself lists. First-party notes that matter for this app:

- **Expo:** “You will need to prebuild the project before using it.”
- Example screenshots: iPhone 13 Pro Max with **tiny.en**, Core ML enabled; Pixel 6 with **tiny.en**.
- Bundling models via `require()` “will significantly increase the size of the app in release mode.” Metro “is not allowed file size larger than 2GB,” so the original f16 **large** (2.9 GB) cannot be bundled; use quantized files.
- iOS 15+ Core ML encoder: extra `.mlmodelc` assets beside the ggml file.
- `medium` / `large`: Apple [Extended Virtual Addressing](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_developer_kernel_extended-virtual-addressing) “is recommended.”
- Default `maxThreads`: “2 for 4-core devices, 4 for more cores.” They “advise against using all cores or fewer than 2.”
- NVIDIA Parakeet TDT through the same package: example app downloads at runtime because models are “too large to bundle comfortably” (q4_0 **356 MB** through f16 **1.26 GB**).

No thermal or battery figures. Thread advice is the closest compute-cost control the binding documents.

### ONNX Runtime Mobile / React Native / Web

ONNX Runtime’s mobile tutorial: the model “must fit on the device disk and be able to be loaded into the device’s memory.” Measure **application binary size, model size, application latency, and power consumption**. Quantizing 32-bit weights to 8-bit “reduces an original model … by approximately a factor of 4.” Hardware: CPU default; Android NNAPI and XNNPACK; iOS CoreML and XNNPACK. “Performance with these execution providers is device and model specific.” Source: [Deploy on mobile](https://onnxruntime.ai/docs/tutorials/mobile/).

Pre-built vs custom **runtime** binary (v1.18.0, ResNet50 operator set — not a speech model):

| File | Pre-built | Custom build |
| --- | --- | --- |
| Android AAR | 24 415 212 bytes (~23.3 MiB) | 7 532 309 bytes (~7.2 MiB) |
| `libonnxruntime.so` arm64-v8a, uncompressed | 16 276 832 bytes (~15.5 MiB) | 3 962 832 bytes (~3.8 MiB) |

[onnxruntime-react-native](https://github.com/microsoft/onnxruntime/blob/main/js/react_native/README.md): `npm install onnxruntime-react-native`; for Expo managed/prebuild, add the config plugin and `npx expo prebuild`. That is native code → development build.

Web: `onnxruntime-web` runs in the browser (WASM, WebGL, WebGPU, WebNN). Benefits listed: faster, data stays on device, works offline, cheaper than cloud. Constraint: “the model is too large and requires higher hardware specs.” WASM address space is **4 GB**; “there is no way for ONNX Runtime Web to run models larger than 4GB.” Chrome `ArrayBuffer` fetch ceiling ~2 GB. Source: [ONNX Runtime web](https://onnxruntime.ai/docs/tutorials/web/) and [Working with Large Models](https://onnxruntime.ai/docs/tutorials/web/large-models.html).

ORT does not ship a pronunciation-scoring model. It will run whatever ONNX graph this project supplies, at that graph’s undocumented-here power cost.

### LiteRT (TensorFlow Lite)

LiteRT / TFLite is Google’s on-device inference stack and the NNAPI successor path. Mobile devices “have limited memory or computational power.” Smaller models: less storage, less download, **less RAM**, and they are “generally faster and **more energy efficient**.” Increasing interpreter threads “will, however, make your model use more resources and **power**.” Latency “can also have an impact on power consumption.” GPU / DSP / NPU delegates exist; “if you have a very small model, it may not be worth delegating … to the GPU.” Source: [Model optimization](https://ai.google.dev/edge/litert/models/model_optimization) and [Performance best practices](https://ai.google.dev/edge/litert/performance/best_practices).

Published size/latency numbers in those pages are for **image** CNNs on a Pixel 2 (MobileNet, Inception, ResNet), not speech. Do not treat them as Whisper or pronunciation-scorer numbers.

There is no LiteRT package in this app’s Expo SDK 54 surface. Embedding it is a native module + development build.

### ExecuTorch

ExecuTorch runs PyTorch-exported `.pte` programs on phones and smaller devices. The **core runtime library is less than 50 kB** without kernels or backends. Constant tensors map from the `.pte` file; mutable layout is planned ahead of time. Execution overhead is “on the order of microseconds to nanoseconds **per operation**” (not per utterance). Backends: iOS Core ML / MPS / XNNPACK; Android XNNPACK / Vulkan / Qualcomm. Source: [Runtime overview](https://docs.pytorch.org/executorch/stable/runtime-overview.html) and [Getting started](https://docs.pytorch.org/executorch/main/getting-started.html).

Official integration is Java/Kotlin (Android) and Swift PM / C++ (iOS), not an Expo SDK module. Using it here means a local native module and a development build. No speech-model RAM table and no thermal numbers in those pages.

## Web is a hard miss

Recording on Expo web is supported (`expo-audio` + MediaRecorder + secure context). **Scoring on-device on web is not a first-class Expo path.**

1. **No Expo module.** SDK 54 has no on-device ASR or ML runtime on web (or native). `expo-speech` is TTS.
2. **Web Speech API default is off-device.** MDN: “By default, using speech recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service for recognition processing, so it won't work offline.” `processLocally = true` is **experimental**, needs a language pack, and fails with language-not-supported if the pack is missing. Source: [Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API), [`processLocally`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally). That default path is a vendor STT service — the class of runner the speaking-accuracy map bans.
3. **WebNN is not a shipping Expo scorer.** It is a W3C Candidate Recommendation Draft (13 August 2026) for “neural network inference hardware acceleration,” secure-context only, with a `powerPreference` of `default` / `high-performance` / `low-power`. Use cases include speech recognition with models “such as Whisper”; it does not define pronunciation scoring or an Expo binding. Source: [Web Neural Network API](https://www.w3.org/TR/webnn/).
4. **Browser WASM is theoretically possible, not Expo-packaged.** whisper.cpp lists `examples/whisper.wasm`. ONNX Runtime Web can infer in-page if the model fits WASM’s 4 GB ceiling. Both still burn **the laptop/phone CPU or GPU in the tab**. Expo Go / Expo web does not include those runtimes. Shipping them would be a custom JS + WASM bundle, not “Expo SDK 54 on-device scoring.”

Product reading for the map: web scoring stays self-review unless a later ticket chooses a **hosted** scorer (recordings leave the device) or a custom WASM experiment outside Expo Go.

## Thermal and battery (what the docs actually say)

First-party docs **do not** state degrees Celsius, milliamps, or “will this cook an iPhone 13.” They do state:

| Source | Claim |
| --- | --- |
| Apple `SFSpeechRecognizer` | Speech recognition “places a relatively high burden on battery life and network usage”; tasks longer than one minute are stopped (server-oriented limits; WWDC19 says on-device drops those caps). |
| Android `SpeechRecognizer` | Default implementation “likely to stream audio to remote servers”; “not intended … for continuous recognition, which would consume a significant amount of battery and bandwidth.” |
| Apple Core ML | Designed to minimize memory footprint and **power consumption** by using CPU, GPU, and Neural Engine. No numbers. |
| Apple SpeechAnalyzer (WWDC25) | Model lives in **system** storage and memory, not the app’s jetsam budget. Still ASR, still on-device compute. |
| whisper.cpp | Disk + RAM table only (tiny ~273 MB RAM). Core ML encoder “more than x3” vs CPU on Apple Silicon. No thermal table. |
| whisper.rn | Don’t use all CPU cores; default 2 or 4 threads. Parakeet weights 356 MB–1.26 GB, “too large to bundle comfortably.” |
| ONNX Runtime Mobile | You must **measure** power consumption. Quantize (~4× weight shrink) and/or custom-build the runtime (~23 MiB → ~7 MiB AAR in their ResNet50 example). |
| LiteRT | Smaller / quantized models are “generally … more energy efficient.” More threads → more **power**. Image-CNN latency tables only. |
| ExecuTorch | Runtime < 50 kB without kernels; model + kernels dominate. No speech energy numbers. |
| WebNN | Authors can hint `low-power` vs `high-performance`; user agents may override for battery-sensitive devices. |

Honest mapping for the human lean (host a scorer so phones stay cool): **OS on-device ASR** is the only path whose vendors claim the work is tuned for phone power and (on Apple’s new API) kept outside the app’s memory; it still does the wrong job (transcript). **Embedded Whisper-class or similar** will occupy hundreds of MB RAM at tiny/base and more than that at small+; vendors warn about power and threads but do not quantify heat. That gap is why “we measured on device X” cannot be filled from docs alone.

## Fit for speaking accuracy

Issue 160 defines speaking accuracy as closeness to Catalog Audio, not lexical match. Every first-party speech API and Whisper README in this file is **ASR**. A hosted or on-device **encoder** used as an acoustic comparison is a different model than these docs describe. On-device remains possible only as:

- a development-build native runtime (whisper.cpp / ORT / LiteRT / ExecuTorch / Core ML) running **weights this project supplies**, or
- OS transcription (wrong metric; locale coverage is Standard French / system languages, not Louisiana French or Kouri-Vini).

Expo Go cannot do either. Web cannot do the native runtimes; its built-in Speech API is off-device by default.

## Sources

- [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)
- [Expo Audio (v54)](https://docs.expo.dev/versions/v54.0.0/sdk/audio/)
- [Expo Speech (v54) — TTS](https://docs.expo.dev/versions/v54.0.0/sdk/speech/)
- [Expo: add custom native code](https://docs.expo.dev/workflow/customizing/)
- [Expo: using libraries](https://docs.expo.dev/workflow/using-libraries/)
- [Expo: development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Go third-party libraries (v54)](https://docs.expo.dev/versions/v54.0.0/sdk/third-party-overview/)
- [Apple Speech](https://developer.apple.com/documentation/speech)
- [Apple SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
- [Apple requiresOnDeviceRecognition](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)
- [Apple Asking Permission to Use Speech Recognition](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition)
- [Apple SpeechTranscriber](https://developer.apple.com/documentation/speech/speechtranscriber)
- [Apple Core ML](https://developer.apple.com/documentation/coreml)
- [WWDC19 Advances in Speech Recognition](https://developer.apple.com/videos/play/wwdc2019/256/)
- [WWDC25 SpeechAnalyzer](https://developer.apple.com/videos/play/wwdc2025/277/)
- [Android SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer)
- [Android NNAPI](https://developer.android.com/ndk/guides/neuralnetworks)
- [Android NNAPI migration](https://developer.android.com/ndk/guides/neuralnetworks/migration-guide)
- [whisper.cpp README (memory, Core ML, WASM)](https://github.com/ggml-org/whisper.cpp)
- [whisper.cpp models](https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md)
- [whisper.rn](https://github.com/mybigday/whisper.rn)
- [whisper.rn Tips](https://github.com/mybigday/whisper.rn/blob/master/docs/TIPS.md)
- [ONNX Runtime deploy on mobile](https://onnxruntime.ai/docs/tutorials/mobile/)
- [ONNX Runtime install (web and React Native)](https://onnxruntime.ai/docs/install/)
- [onnxruntime-react-native README](https://github.com/microsoft/onnxruntime/blob/main/js/react_native/README.md)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [ONNX Runtime Web large models](https://onnxruntime.ai/docs/tutorials/web/large-models.html)
- [LiteRT model optimization](https://ai.google.dev/edge/litert/models/model_optimization)
- [LiteRT performance best practices](https://ai.google.dev/edge/litert/performance/best_practices)
- [ExecuTorch runtime overview](https://docs.pytorch.org/executorch/stable/runtime-overview.html)
- [ExecuTorch getting started](https://docs.pytorch.org/executorch/main/getting-started.html)
- [MDN Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)
- [MDN SpeechRecognition.processLocally](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally)
- [W3C Web Neural Network API](https://www.w3.org/TR/webnn/)
