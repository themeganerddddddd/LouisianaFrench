# What a self-hosted pronunciation scorer needs

Research for [issue #163](https://github.com/themeganerddddddd/LouisianaFrench/issues/163), answering a decision on the [Speaking accuracy spec](https://github.com/themeganerddddddd/LouisianaFrench/issues/160). Primary sources only. No product implementation. No hosting vendor. No product UI.

**Question:** If we host a pronunciation-quality scorer ourselves (no vendor STT API), what does that box need: runtime, model class, request/response shape, audio format, latency class, and what happens to the recording after the score?

**Repo context (this tree, Expo SDK 54):** Speech Practice records with `expo-audio` `RecordingPresets.HIGH_QUALITY` (`src/screens/prototypes/SpeechPracticePrototype.js`). Catalog Audio is bundled MP3, resolved by audio key (`src/data/audioManifest.js`; README: EBU R128, −16 LUFS). About Privacy currently says recordings stay on the device and are not sent (`src/data/aboutContent.js`). The map prefers a server we host (phone heat and battery) and defines speaking accuracy as quality against Catalog Audio, not a transcript match.

## Short answer

The box is a long-lived Python process that decodes an `expo-audio` HIGH_QUALITY clip to **16 kHz mono PCM**, runs a **wav2vec2-class acoustic encoder**, and compares that encoding to Catalog Audio. Native HIGH_QUALITY is **44.1 kHz stereo AAC in MPEG-4 (`.m4a`)**; web HIGH_QUALITY is **`audio/webm` at 128 kbps**. Hugging Face `Wav2Vec2Model` and SpeechBrain’s wav2vec2 lobe publish encoder APIs (hidden states / encoded features), not a pronunciation HTTP contract and not a grade. Montreal Forced Aligner is a Kaldi CLI that needs an orthographic transcript plus a pronunciation dictionary and emits phone/word intervals, not a quality score; its published French model is not Louisiana French and not Kouri-Vini. faster-whisper’s published interface is `transcribe()` (ASR). None of these stacks retain the learner clip unless our wrapper writes it; ephemeral delete-after-score is compatible with the encoder path. Interactive latency class: short Speech Practice clips, encoder forward on a warm process (GPU preferred).

## What `expo-audio` HIGH_QUALITY actually is (SDK 54)

Source: [Expo Audio v54](https://docs.expo.dev/versions/v54.0.0/sdk/audio/). Speech Practice already passes `RecordingPresets.HIGH_QUALITY` into `useAudioRecorder`. After `stop()`, the clip is at `audioRecorder.uri` (`null | string`).

```ts
RecordingPresets.HIGH_QUALITY = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 2,
  bitRate: 128000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};
```

Native (Android, iOS, tvOS):

| Field | Value |
| --- | --- |
| Container / extension | MPEG-4, `.m4a` |
| Codec | AAC (`android.audioEncoder: 'aac'`; iOS `IOSOutputFormat.MPEG4AAC = "aac "`) |
| Sample rate | 44100 Hz |
| Channels | 2 (stereo) |
| Bit rate | 128000 |
| iOS quality | `AudioQuality.MAX` (127) |

The iOS `linearPCM*` fields are present on the preset; the output format is AAC, not linear PCM. Expo’s iOS recording path is `AVAudioRecorder`. Android’s listed output format is `'mpeg4'` with encoder `'aac'`.

Web: `mimeType: 'audio/webm'`, `bitsPerSecond: 128000`. Expo maps these to the browser `MediaRecorder` API. SDK 54 does **not** name the web codec (Opus vs Vorbis vs other). A server interface that accepts web scoring must accept `audio/webm` without assuming AAC or `.m4a`.

Catalog Audio in this tree is bundled **MP3**, not m4a. The scorer therefore decodes two containers: learner HIGH_QUALITY (m4a or webm) and Catalog Audio (mp3).

## Model class: quality against Catalog Audio

The map forbids Whisper-as-ASR (“did they say the words?”). Self-hosted Whisper-class models may still appear as acoustic encoders. Candidate projects, judged on what they actually publish:

### wav2vec2 encoder (fits)

Hugging Face: “Wav2Vec2 is a speech model that accepts a float array corresponding to the raw waveform.” `Wav2Vec2FeatureExtractor` defaults to `sampling_rate = 16000`. `facebook/wav2vec2-base` is “pretrained on 16kHz sampled speech audio. When using the model make sure that your speech input is also sampled at 16Khz.” That checkpoint has no tokenizer; it is audio-only pretraining, not a transcript decoder.

`Wav2Vec2Model` is “the bare Wav2Vec2 Model outputting raw hidden-states without any specific head.” Forward returns:

- `last_hidden_state` — `(batch_size, sequence_length, hidden_size)` (example in the Transformers docs: `[1, 292, 768]`)
- `extract_features` — last convolutional layer

`Wav2Vec2ForCTC` is the other class: a language-modeling head for CTC. That path is ASR / phone-or-character emissions, not Catalog-Audio comparison.

SpeechBrain’s `speechbrain.integrations.huggingface.wav2vec2.Wav2Vec2` lobe “enables the integration of HuggingFace and SpeechBrain pretrained wav2vec2.0/Hubert models.” Official text: “The model can be used as a **fixed feature extractor** or can be finetuned.” `forward(wav)` / `extract_features(wav)` take a waveform tensor and return encoded features. That is an encoder, not `transcribe_file`.

**Quality-against-Catalog-Audio on this class:** encode the learner clip and the Catalog Audio clip with the same frozen encoder; compare `last_hidden_state` sequences (pooled cosine, DTW, or similar). The comparison function is ours. The libraries emit embeddings, not a pronunciation grade and not a transcript.

### wav2vec2 CTC forced alignment (related, different reference)

`torchaudio.functional.forced_align` aligns a **target token sequence** to CTC log-probabilities and returns `(alignment labels, per-frame log-prob scores)`. The TorchAudio tutorial uses `WAV2VEC2_ASR_BASE_960H` and an English letter transcript. That is goodness-of-pronunciation against an expected spelling or phone string, not against the Catalog Audio waveform. The map’s later ticket “how Catalog Audio is used as the reference when a Word has one recording” still applies. CTC GOP also needs a character/phone inventory (listed on the map as not yet specified).

### SpeechBrain speaker verification (does not fit)

`SpeakerRecognition.verify_files(path_x, path_y)` returns cosine similarity of **speaker** embeddings and a same-speaker decision. Official description: “1 if the two signals in input are from the same speaker and 0 otherwise.” Catalog Audio and a learner clip of the same Word are different speakers by design. Using this interface as a pronunciation grade would score voice identity.

SpeechBrain otherwise publishes Python inference (`from_hparams`, `transcribe_file`, `encode_batch`, `classify_file`), not an HTTP pronunciation API. `EncoderClassifier.encode_batch` requires `fs=16000` Hz; `load_audio` may downsample and downmix to the model’s input spec.

### Montreal Forced Aligner (aligner, not a scorer)

MFA “take[s] an **orthographic transcription** of an audio file and generate[s] a time-aligned version using a **pronunciation dictionary**.” Runtime: conda package pulling **Kaldi**; recommended install `conda create -n aligner -c conda-forge montreal-forced-aligner`. It is a **command-line utility**, not an HTTP scorer.

Single-file: `mfa align_one SOUND_FILE TEXT_FILE DICTIONARY ACOUSTIC_MODEL OUTPUT` (or `mfa align_one_hf` with a Hugging Face model id). Output formats: `long_textgrid` (default), `short_textgrid`, `json`, `csv`. Prosodylab output is TextGrids with a **words** tier and a **phones** tier. That is timing, not a quality scalar.

Audio: Kaldi’s default is `.wav`; conda installs `sox`/`ffmpeg` to pipe other formats. MFA resamples to **16 kHz** (feature band 20–7800 Hz). Kaldi WAV is **16-bit**. Segments should be **under 30 seconds**. `.mp3` on Windows goes through ffmpeg.

`french_mfa` exists (MFA French phone set, Common Voice French / GlobalPhone / African-accented French training data). There is **no** published Louisiana French or Kouri-Vini acoustic model or dictionary. Encoder-vs-Catalog-Audio does not need that lexicon; MFA/GOP does.

`mfa server` is a **local PostgreSQL** used for MFA’s own alignment database (`listen_addresses = ''`, Unix sockets). It is not a pronunciation HTTP API. MFA calls databases “expendable”; `--final_clean` defaults to **False**, so working files can remain under `~/Documents/MFA` or `MFA_ROOT_DIR`.

### faster-whisper (published API is ASR)

faster-whisper is “a reimplementation of OpenAI’s Whisper model using [CTranslate2](https://github.com/OpenNMT/CTranslate2/).” Python **3.9+**. GPU path: CUDA 12 + cuDNN 9. CPU path: `compute_type="int8"` is documented. Audio decode is **PyAV** (bundled FFmpeg); system FFmpeg is not required. `decode_audio` resamples to **16 kHz** float32 mono by default.

The public call is `WhisperModel.transcribe(...)`. `word_timestamps=True` runs “cross-attention pattern and dynamic time warping” to timestamp **decoded words**. That is alignment of Whisper’s own transcript, not comparison to Catalog Audio. Using `transcribe()` as “did they say the Word?” is the map’s banned tool. The encoder is not a first-class scoring interface in the README.

## Runtime

None of the four projects publish a pronunciation-scorer HTTP server. The box is a process **we** wrap.

| Stack | What actually runs | Fit for this destination |
| --- | --- | --- |
| Hugging Face wav2vec2 | Python + PyTorch; `Wav2Vec2Model` or SpeechBrain wav2vec2 lobe | Encoder vs Catalog Audio |
| SpeechBrain | Python 3.8.1–3.12 (docs recommend 3.9+); PyTorch 1.9+ (PyPI 1.1.0: `torch>=2.1.0`); CPU or CUDA | Same encoder lobe; do not use `SpeakerRecognition` as the grade |
| MFA | conda + Kaldi CLI; optional local Postgres; process spawn per `mfa align_one` | Aligner only; lexicon gap for both Languages |
| faster-whisper | Python 3.9+ + CTranslate2 | Encoder/DTW exists inside `transcribe`; public API is ASR |

Practical box for the map’s preferred home (server we host, not on-device):

1. Long-lived Python 3.9+ process (avoid cold-start plus Kaldi/Postgres per Speech Practice tap).
2. Decode layer: PyAV, torchaudio, or ffmpeg — m4a / webm / mp3 → **16 kHz mono float32**.
3. Encoder: frozen wav2vec2 (or HuBERT via the same SpeechBrain lobe) on GPU if available.
4. Catalog Audio copies on the box, keyed by `audioKey` (same identities as the bundled Catalog). The client need not upload the reference clip.
5. A thin HTTP wrapper **we** define. SpeechBrain, Transformers, MFA, and faster-whisper do not define that wrapper.

On-device is the stronger “bytes never leave the phone” story (map). This ticket’s preferred near-future home is still the hosted box, because of heat and battery.

## Request / response shape

No candidate publishes a pronunciation HTTP schema. The shape below is what those libraries **consume and emit**, so a later ticket can wrap it without inventing a vendor protocol.

**Request** (one Speech Practice attempt):

| Field | Why |
| --- | --- |
| Learner audio bytes | Native: `.m4a` / `audio/mp4`; web: `audio/webm`. `Content-Type` must distinguish them. |
| `audioKey` | Server loads Catalog Audio MP3; comparison is against that clip. |
| Language (`cajun` / `kreole`) | Needed if a later slice adds language-specific CTC/MFA; encoder-vs-catalog can share one encoder when both Words have Audio. |

Optional, only for an alignment/GOP slice: Word **target** text. That path scores against expected phones/characters, not against Catalog Audio, and is blocked on the map’s phoneme-inventory ticket.

**Response:**

| Field | Why |
| --- | --- |
| Scalar quality | **We** derive it from two `last_hidden_state` sequences (or from CTC frame log-probs if GOP is added later). Libraries do not return a grade. |
| Optional frame or span distances | Encoder sequence length is time-like (Transformers example: 292 frames). TorchAudio `forced_align` already returns per-frame scores. MFA returns phone/word intervals with **no** quality scalar. |
| Error | Decode failure, missing Catalog Audio, clip too short for the encoder. |

Do **not** put an ASR transcript on the grade path. `transcribe_file` / `model.transcribe` output is the wrong interface even if the same weights could be used as an encoder.

HTTP transport (multipart vs raw body vs JSON-with-base64) is unspecified by the candidate projects. Any of those can carry the bytes above.

## Audio format the server interface must accept

| Source | Container | Codec (docs) | Rate / channels | Bit rate |
| --- | --- | --- | --- | --- |
| Learner, iOS/Android HIGH_QUALITY | MPEG-4 `.m4a` | AAC | 44100 Hz, stereo | 128 kbps |
| Learner, web HIGH_QUALITY | WebM (`audio/webm`) | **not named** by Expo SDK 54 | (MediaRecorder; sample rate not in the web preset) | 128 kbps |
| Catalog Audio (this tree) | MP3 | MPEG-1/2 Layer III | bundled files; not the Expo recorder | normalized −16 LUFS |

After decode, every candidate encoder/aligner documented here wants **16 kHz mono PCM**:

- wav2vec2 feature extractor default 16000 Hz; model card requires 16 kHz input
- SpeechBrain `encode_batch` / `verify_batch`: “Make sure the sample rate is fs=16000 Hz”; `load_audio` may resample and downmix
- MFA feature generation defaults to 16 kHz
- faster-whisper `decode_audio(..., sampling_rate=16000)` → float32

Stereo HIGH_QUALITY must be downmixed. 44.1 kHz must be resampled. WebM must be decoded even though it is not `.m4a`.

## Latency class

Speech Practice clips are short Words or phrases (this tree rejects attempts under 600 ms). Interactive: the learner has just tapped Stop.

| Stack | Documented timing character |
| --- | --- |
| wav2vec2 encoder | One forward on a few-second waveform. Transformers documents FlashAttention-2 / SDPA as faster inference for `Wav2Vec2Model`; no official millisecond budget for a Speech Practice clip. Class: **interactive, warm process, GPU preferred**. |
| MFA `align_one` | “Many of the optimizations for larger datasets are skipped resulting in faster alignment times, but … speaker adaptation [is] not employed.” Corpus tool; under-30-second segments; Kaldi + optional Postgres start. Class: **batch/CLI**, not tap-to-score HTTP. |
| faster-whisper `transcribe` | Official GPU benchmark: **13 minutes** of audio, large-v2, RTX 3070 Ti, fp16, ~**1 m 03 s** (~12× realtime). That is full ASR, not encoder-vs-catalog. |

Keep the encoder loaded. Do not spawn conda/Kaldi per attempt if the product path is Speech Practice scoring.

## What happens to the recording after the score

The libraries do not define product retention.

- Hugging Face / SpeechBrain encoder: waveform tensor in process memory. `Pretrained.load_audio` may cache a **fetched** file under `savedir`; that is model/audio download cache, not a learner archive.
- faster-whisper: decode into a float32 array; no persist API.
- MFA: writes corpus working files; `--final_clean` defaults to **False**; Postgres is “expendable.” Using MFA as the scorer would leave more on disk unless the wrapper passes `--final_clean` and treats the MFA temp dir as disposable.

Facts for the later hosting/retention ticket (map: not yet specified):

- Encoder-path scoring does **not** require keeping the learner bytes after the response. Ephemeral temp file or in-memory decode, then delete, is compatible with wav2vec2/SpeechBrain/faster-whisper decode.
- Catalog Audio should already live on the box; only the learner clip is the new upload.
- Today’s About copy (“Recordings stay on the device and are not sent to us”) stays true until opt-in upload exists (map). This research does not write that copy.
- Region, vendor, and legal retention are out of scope here.

## Languages

Both Languages are in the spec. Encoder-vs-Catalog-Audio needs Catalog Audio for that Word; it does not need a Louisiana French or Kouri-Vini pronunciation dictionary. MFA/GOP needs a phone set and lexicon the projects do not publish for either Language (`french_mfa` is Standard French). A later ticket may defer Kouri-Vini from a GOP slice; that deferral is not implied by the encoder path.

## Sources

- [Expo Audio SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/audio/)
- [Hugging Face Wav2Vec2](https://huggingface.co/docs/transformers/en/model_doc/wav2vec2)
- [facebook/wav2vec2-base](https://huggingface.co/facebook/wav2vec2-base)
- [SpeechBrain installation](https://speechbrain.readthedocs.io/en/latest/installation.html)
- [SpeechBrain wav2vec2 lobe](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.integrations.huggingface.wav2vec2.html)
- [SpeechBrain inference interfaces (`load_audio`)](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.interfaces.html)
- [SpeechBrain EncoderClassifier](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.classifiers.html)
- [SpeechBrain SpeakerRecognition](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.speaker.html)
- [SpeechBrain pretrained inference (README)](https://github.com/speechbrain/speechbrain)
- [MFA installation](https://montreal-forced-aligner.readthedocs.io/en/stable/installation.html)
- [MFA corpus formats and sound files](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/corpus_structure.html)
- [MFA alignment / `align_one`](https://montreal-forced-aligner.readthedocs.io/en/latest/user_guide/workflows/alignment.html)
- [MFA database servers](https://montreal-forced-aligner.readthedocs.io/en/latest/user_guide/server/index.html)
- [french_mfa acoustic model v3.0.0](https://github.com/MontrealCorpusTools/mfa-models/releases/tag/acoustic-french_mfa-v3.0.0)
- [French MFA dictionary v3.0.0](https://mfa-models.readthedocs.io/en/latest/dictionary/French/French%20MFA%20dictionary%20v3_0_0.html)
- [torchaudio `forced_align`](https://docs.pytorch.org/audio/stable/generated/torchaudio.functional.forced_align.html)
- [TorchAudio forced alignment with Wav2Vec2](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html)
- [faster-whisper README](https://github.com/SYSTRAN/faster-whisper)
- [faster-whisper `decode_audio`](https://github.com/SYSTRAN/faster-whisper/blob/master/faster_whisper/audio.py)
