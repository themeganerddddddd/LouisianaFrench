# Which methods can score pronunciation against Catalog Audio

Research for [issue #161](https://github.com/themeganerddddddd/LouisianaFrench/issues/161), answering a decision on the [Speaking accuracy spec](https://github.com/themeganerddddddd/LouisianaFrench/issues/160). Primary sources only. No product implementation.

**Question:** Which self-hosted or on-device methods can score how close a short learner recording is to Catalog Audio for a Word — pronunciation quality, not transcript match?

**Repo context:** A Word pairs a target-language expression with optional Audio. Speaking accuracy on this map means pronunciation quality against that model Audio, not a Whisper-as-ASR transcript compared to `Word.target`. Whisper-class models are in scope only as acoustic encoders or aligners. Allowed runners: a model we host, or on-device. Banned: OpenAI Audio, Deepgram, Google Cloud Speech, chat LLMs, and other vendor STT APIs.

## Short answer

Four families of methods can run without a third-party hosted API. They split on **what they treat as the reference**.

**Forced alignment** (Montreal Forced Aligner, torchaudio wav2vec2 CTC, SpeechBrain `HMMAligner`) and **Goodness of Pronunciation (GOP)** (Witt & Young; Kaldi `compute-gop`) score the learner recording against a **canonical phone sequence** derived from orthography plus a pronunciation dictionary and an acoustic model. They return phone timings and per-phone or per-utterance scalars. They do **not** take Catalog Audio as the acoustic reference. MFA ships a French acoustic model; it does not ship Louisiana French or Kouri-Vini. MFA itself warns that alignment log-likelihood is a relative best-path score, not a pronunciation grade.

**Embedding similarity** is the only family whose first-party APIs take **two recordings**. wav2vec2 (`last_hidden_state`), SpeechBrain's SSL `WaveformEncoder`, and OpenAI Whisper's `embed_audio` / whisper.cpp `whisper_encode` emit acoustic feature sequences. Cosine or DTW comparison to Catalog Audio is an application of those encoders, not a packaged pronunciation API. SpeechBrain's documented two-file cosine API (`SpeakerRecognition.verify_files`) scores **speaker identity**, not pronunciation.

**whisper.cpp** is an on-device Whisper port. It exposes an encoder, token probabilities, and experimental DTW token timestamps. It does not document a pronunciation scorer. Token `p` is decoder confidence of transcribed tokens — Whisper-as-ASR adjacent, out of scope as the definition of speaking accuracy.

## Forced alignment

Forced alignment takes an orthographic transcript of an audio file and produces time-aligned word and phone intervals using a pronunciation dictionary to look up phones. Source: [MFA User Guide — What is forced alignment?](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/index.html).

### Montreal Forced Aligner (MFA)

MFA is a command-line aligner built on Kaldi. `mfa align` aligns a corpus with a pronunciation dictionary and a pretrained acoustic model; `mfa align_one` does a single file (faster, no speaker adaptation). Output is typically Praat TextGrids with word and phone intervals. Source: [Align with an acoustic model (`mfa align`)](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/workflows/alignment.html).

When TextGrids are exported, MFA also writes `alignment_analysis.csv`. Documented fields:

| Field | What MFA says it is |
| --- | --- |
| Overall alignment log-likelihood | Objective that was optimized. **Relative** to other possible alignments of **this** utterance, not a cross-utterance grade. Speaker adaptation and training/alignment mismatch (variety, style, noise) skew it. |
| Speech log-likelihood | Average of per-phone log-likelihoods with silence intervals removed. |
| Phone duration deviation | Maximum absolute z-score of each phone's log-duration vs the corpus. Flags unexpected length, not phone identity. |
| SNR | Mean intensity of speech phones over silence. Used to find transcript/alignment errors, not pronunciation quality. |

Source: [Analyzing alignment quality](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/implementations/alignment_analysis.html). MFA's author states it is "not entirely as straightforward as taking the overall alignment log-likelihood" as a quality measure.

**Returns:** phone and word timings; optional utterance-level scalars as above. Not pass/fail. Not a pronunciation score against another recording.

**Reference:** orthography + pronunciation dictionary + acoustic model. Catalog Audio is unused.

**Hosted API:** none. Local CLI (Kaldi + conda). Heavy; not documented as a mobile runtime.

**Language fit:** [French MFA acoustic model v3.0.0](https://mfa-models.readthedocs.io/en/latest/acoustic/French/French%20MFA%20acoustic%20model%20v3_0_0.html) is for "forced alignment of French transcripts." Training data: Common Voice French, GlobalPhone French, African-accented French. Phone set: MFA French. Dialect: N/A. Intended use is French; MFA says models perform best on data similar to training, and that adding pronunciations for the variety in the dataset helps. The MFA acoustic index lists French models only under French; it does not list Louisiana French, Kouri-Vini, or Haitian Creole.

### torchaudio wav2vec2 CTC alignment

PyTorch's torchaudio documents forced alignment of a **transcript** to speech using wav2vec2 emissions and CTC segmentation. `torchaudio.functional.forced_align(log_probs, targets, ...)` returns:

1. A label for each time step on the alignment path.
2. **Log probability scores of the labels for each time step.**

Source: [`torchaudio.functional.forced_align`](https://docs.pytorch.org/audio/stable/generated/torchaudio.functional.forced_align.html).

`merge_tokens` collapses blanks and repeats into `TokenSpan` objects: token id, start, end, and a **score averaged across the time span**. Source: [`torchaudio.functional.merge_tokens`](https://docs.pytorch.org/audio/stable/generated/torchaudio.functional.merge_tokens.html).

The high-level bundle is `torchaudio.pipelines.Wav2Vec2FABundle`. `MMS_FA` packages Meta's Massively Multilingual Speech wav2vec2 acoustic model with a matching tokenizer. The tutorial uses it for non-English transcripts (including French in the multilingual examples). Source: [Forced alignment for multilingual data](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_for_multilingual_data_tutorial.html) and [Wav2Vec2FABundle](https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.Wav2Vec2FABundle.html).

The older [Forced Alignment with Wav2Vec2](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html) tutorial uses `WAV2VEC2_ASR_BASE_960H` as an acoustic feature extractor and CTC trellis, then backtracks the most likely path.

**Returns:** character/token timings plus per-token log-prob scores (scalar per span; can be aggregated to an utterance scalar). Not pass/fail unless a threshold is chosen downstream.

**Reference:** orthography tokenized to the model's alphabet (not a phoneme inventory unless the model is phoneme-CTC). Not Catalog Audio.

**Hosted API:** none. Local PyTorch. Weights download once. Server-class by default; not a whisper.cpp-style mobile port.

This is the wav2vec2 path that is **documented for alignment**, not transcription: the transcript is an input, and the model scores how well the acoustics match those tokens.

### SpeechBrain `HMMAligner`

SpeechBrain's alignment module is "Tools for aligning transcripts and speech signals." `HMMAligner` runs Viterbi (or forward) alignment over acoustic-model log posteriors given a phoneme sequence. `forward(..., dp_algorithm="viterbi")` returns **viterbi_scores** (log likelihood of the Viterbi path) and **alignments** (list of state indices). `use_lexicon` maps words through a lexicon to possible phoneme sequences. Source: [speechbrain.alignment.aligner](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.alignment.aligner.html).

**Returns:** phone-state timings and a path log-likelihood scalar. Not a packaged GOP or pass/fail.

**Reference:** phoneme sequence (from orthography + lexicon) + frame posteriors from an acoustic model you supply. Not Catalog Audio.

**Hosted API:** none. Local PyTorch. SpeechBrain does **not** ship a GOP or pronunciation-assessment recipe in its first-party docs; alignment is a building block.

## Phoneme / GOP scoring

### Witt & Young GOP (definition)

GOP is a phone-level pronunciation score for computer-assisted language learning. Witt & Young (2000): given a known orthographic transcription and HMMs, GOP for phone *p* is the duration-normalised log posterior that the speaker uttered *p* given the corresponding acoustic segment. In the practical form, the numerator is a **forced alignment** with the canonical phone sequence; the denominator is an **unconstrained phone loop**. A **threshold** on GOP rejects badly pronounced phones (pass/fail per phone). Phone-specific thresholds can be set from native GOP statistics or human rejection counts.

They state the aim: locate pronunciation errors, assess how close pronunciation is to a native speaker, and identify systematic differences versus a pronunciation dictionary. Native speakers train the acoustic models. The method is **text-independent** once models exist — it does not require several native recordings of each teaching item (they contrast that with earlier word-level systems that did).

Source: S.M. Witt & S.J. Young, [Phone-level pronunciation scoring and assessment for interactive language learning](https://doi.org/10.1016/s0167-6393(99)00044-8), *Speech Communication* 30 (2000) 95–108. Author PDF: [wiyo00.pdf](http://mi.eng.cam.ac.uk/~sjy/papers/wiyo00.pdf).

**Returns:** per-phone scalar; threshold → pass/fail. Can be aggregated to word/utterance.

**Reference:** orthography → canonical phones via a dictionary; native acoustic model; phoneme inventory *Q*. **Not** a reference recording of the Word.

**Hosted API:** none (HMM toolkit / Kaldi implementations).

### Kaldi `compute-gop` (DNN GOP)

Kaldi's first-party recipe [egs/gop_speechocean762](https://github.com/kaldi-asr/kaldi/blob/master/egs/gop_speechocean762/README.md) implements GOP-NN after Hu et al. (2015). GOP is "a variation of the posterior probability, for phone level pronunciation scoring," "widely used in pronunciation evaluation and mispronunciation detection."

DNN GOP: log phone posterior ratio between the canonical phone and the highest-scoring phone:

`GOP(p) = log( LPP(p) / max_q LPP(q) )`

with `LPP(p)` the duration-averaged log posterior over frames of the forced-aligned segment. `compute-gop` reads nnet3 log-softmax posteriors plus phone alignments and writes per-phone GOP plus optional LPP/LPR feature vectors for a classifier. Chain models are documented as a poor fit; nnet3 TDNN (non-chain) is what the recipe uses. GOP-GMM is not implemented "as GOP-NN performs much better."

The recipe's example corpus is **speechocean762**: 5,000 English sentences, Mandarin-L1 speakers, expert scores at phoneme, word, and sentence level. Automatic **phoneme-level scoring** is what the recipe illustrates.

Source: [README](https://github.com/kaldi-asr/kaldi/blob/master/egs/gop_speechocean762/README.md) and [`src/bin/compute-gop.cc`](https://github.com/kaldi-asr/kaldi/blob/master/src/bin/compute-gop.cc).

**Returns:** per-phone GOP scalars (and optional feature vectors). Pass/fail needs a threshold or a trained classifier (Kaldi: "the classifier-based approach archives better performance than the GOP-based approach").

**Reference:** canonical phones from a lexicon + alignments + a native (or native-trained) acoustic model. Not Catalog Audio. Language-specific: the published recipe is English (LibriSpeech model + speechocean762). A Louisiana French or Kouri-Vini GOP scorer would need a phone inventory, lexicon, and a compatible non-chain acoustic model for that language — none of which Kaldi ships for those languages.

**Hosted API:** none. Local Kaldi.

### wav2vec2 as a phoneme encoder (Wav2Vec2Phoneme)

Hugging Face documents [Wav2Vec2Phoneme](https://huggingface.co/docs/transformers/en/model_doc/wav2vec2_phoneme) from Xu, Baevski & Auli, *Simple and Effective Zero-shot Cross-lingual Phoneme Recognition* (2021). Same architecture as wav2vec2; CTC head decodes a **sequence of phonemes**. It "can be fine-tuned on multiple language at once and decode unseen languages in a single forward pass to a sequence of phonemes." `output_char_offsets` yields phoneme timestamps from CTC.

**Returns:** phoneme sequence (and optional timings). Comparing that sequence to a canonical pronunciation is string match over phones, not GOP. Frame logits from a phoneme-CTC model *could* feed a GOP-style posterior ratio; that composition is not a first-party pronunciation API.

**Reference for decoding:** none (open phoneme recognition). **Reference for scoring against a Word:** a phoneme inventory and a G2P/lexicon for `Word.target`. Tokenizer phonemization defaults to espeak-ng (`phonemizer_lang="en-us"`).

**Hosted API:** none if weights run locally.

## Embedding similarity to a reference recording

This is the family that can use **Catalog Audio** as the other waveform.

### wav2vec2 hidden states

wav2vec 2.0 learns contextual speech representations from raw audio (masking + contrastive task over quantized latents), then optionally fine-tunes for ASR. Source: Baevski et al., [wav2vec 2.0 paper](https://research.facebook.com/publications/wav2vec-2-0-a-framework-for-self-supervised-learning-of-speech-representations/) / [NeurIPS PDF](https://proceedings.neurips.cc/paper_files/paper/2020/file/92d1e1eb1cd6f9fba3227870bb6d7f07-Paper.pdf); code in [fairseq](https://github.com/pytorch/fairseq).

Hugging Face `Wav2Vec2Model` returns `last_hidden_state` — "Sequence of hidden-states at the output of the last layer of the model" — and `extract_features` from the last convolutional layer. Source: [Wav2Vec2 docs](https://huggingface.co/docs/transformers/en/model_doc/wav2vec2). That is a frame-level acoustic embedding sequence, not a transcript.

**Returns (encoder):** `(batch, time, hidden)` vectors. A scalar similarity (cosine of pooled vectors, or DTW over frames) against Catalog Audio is **not** a documented wav2vec2 API; it is a comparison you run on those vectors.

**Reference:** the other recording (Catalog Audio). No phoneme inventory required. Speaker, channel, and duration differences are not factored out by the first-party encoder API.

**Hosted API:** none if the checkpoint runs locally.

### SpeechBrain SSL encoder vs speaker verification

SpeechBrain documents two different embedding paths.

**SSL wav2vec2 encoder.** The model card [speechbrain/ssl-wav2vec2-base-librispeech](https://huggingface.co/speechbrain/ssl-wav2vec2-base-librispeech) is "all the necessary tools to extract wav2vec2 embeddings from a pretrained model": convolutional frontend plus transformer; embeddings are the transformer output. `WaveformEncoder.from_hparams(...).encode_file("mywavfile.wav")`. API: [speechbrain.inference.encoders](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.encoders.html). Hugging Face integration can use wav2vec2 as a "fixed feature extractor." Source: [speechbrain.integrations.huggingface.wav2vec2](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.integrations.huggingface.wav2vec2.html).

**Speaker recognition.** `SpeakerRecognition.verify_files(path_x, path_y)` / `verify_batch` "Performs speaker verification with cosine distance." Returns a cosine **score** and a **prediction**: 1 if same speaker, 0 otherwise (threshold default 0.25). Source: [speechbrain.inference.speaker](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.speaker.html). This is the only first-party "compare two wav files → scalar + pass/fail" API in this survey, and it is **explicitly speaker identity**. Using it as speaking accuracy would grade "same voice as the Catalog speaker," not "same pronunciation of the Word."

SpeechBrain's project page lists transcription, speaker verification, enhancement, and separation as pretrained-model tasks. It does not list pronunciation assessment. Source: [speechbrain.github.io](https://speechbrain.github.io/).

**Returns:** SSL encoder → frame embeddings (same caveats as wav2vec2). Speaker API → scalar + pass/fail for **speaker match**.

**Reference:** two waveforms (Catalog Audio + learner). SSL path needs no phoneme inventory. Speaker path needs no orthography either, but scores the wrong property.

**Hosted API:** none. Local PyTorch.

### Whisper encoder (OpenAI Whisper and whisper.cpp)

OpenAI Whisper is an encoder–decoder ASR model. The `Whisper` class exposes `embed_audio(mel)` which **returns `self.encoder(mel)`** — encoded audio features of shape `(batch, n_audio_ctx, n_audio_state)` — separately from `transcribe`. Source: [`whisper/model.py`](https://github.com/openai/whisper/blob/main/whisper/model.py) (`AudioEncoder`, `embed_audio`). The [openai/whisper README](https://github.com/openai/whisper) presents the model as general-purpose speech recognition (multilingual ASR, translation, language ID). Encoder embeddings are a documented module interface, not a pronunciation API.

**whisper.cpp** is a C/C++ port for local/on-device inference: "Plain C/C++ implementation without dependencies," Apple Silicon (NEON, Metal, Core ML), quantization, CPU-only, no runtime allocations. Source: [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp). Relevant APIs in [`include/whisper.h`](https://github.com/ggml-org/whisper.cpp/blob/master/include/whisper.h):

| API | What the header says |
| --- | --- |
| `whisper_encode` | "Run the Whisper encoder on the log mel spectrogram." Requires `whisper_pcm_to_mel` first. |
| `whisper_decode` | Decoder logits/probabilities for the **next token**. "Make sure to call `whisper_encode()` first." |
| `whisper_token_data` | `p` / `plog` token probability; `t0`/`t1` token timestamps; experimental DTW token timestamps (`dtw_token_timestamps`). |
| `whisper_full` | "PCM → log mel spectrogram → encoder → decoder → text." |
| CLI `--print-colors` | Experimental color-coding of **transcribed** words by confidence. |

There is no pronunciation, GOP, or reference-audio comparison in the documented API. Token `p` is decoder confidence of the ASR token, i.e. Whisper-as-ASR adjacent. The encoder (`whisper_encode`) is the on-device counterpart of OpenAI's `embed_audio`.

**Returns:** encoder feature sequence (if you stop after encode); or transcript + token probs + timings (full pipeline). Similarity to Catalog Audio is again an application of the encoder, not a first-party scorer.

**Reference for encoder comparison:** Catalog Audio. **Reference for token `p`:** the model's decoder vocabulary / transcript — out of scope as speaking accuracy.

**Hosted API:** none. whisper.cpp is the method in this survey **designed** for on-device (Core ML encoder on Apple Silicon). OpenAI's Python Whisper is typically server/desktop PyTorch.

## What each method needs vs Catalog Audio

Catalog Audio is one bundled recording per Word. GOP and MFA-style alignment score against a **language-wide phone model**, not that recording. Embedding methods can score against **that recording**, but first-party docs do not calibrate the scalar to human pronunciation grades, and speaker-verification cosine is the wrong target.

| Method | Returns | Reference | Catalog Audio used? | Phoneme inventory / orthography | Third-party hosted API? | On-device story in the docs |
| --- | --- | --- | --- | --- | --- | --- |
| MFA forced alignment | Phone/word timings; relative log-likelihoods; duration/SNR diagnostics | Orthography + dictionary + acoustic model | No | Yes (dictionary + model phone set) | No | No (Kaldi CLI) |
| torchaudio wav2vec2 CTC align | Token timings + per-span log-prob scores | Orthography tokenized to model alphabet | No | Orthography; phonemes only if the CTC units are phones | No | Not documented as mobile |
| SpeechBrain `HMMAligner` | Alignments + Viterbi log-likelihood | Phoneme sequence + AM posteriors | No | Yes | No | Not documented as mobile |
| Witt GOP / Kaldi `compute-gop` | Per-phone scalar; optional pass/fail via threshold; optional classifier features | Canonical phones + native AM + alignments | No (Witt: native models, not per-word recordings) | Yes | No | No (Kaldi) |
| Wav2Vec2Phoneme CTC | Phoneme string ± offsets | None to decode; lexicon/G2P to score vs a Word | No | Yes, to interpret vs `Word.target` | No | Not documented as mobile |
| wav2vec2 / SpeechBrain SSL embeddings | Frame vectors; scalar only after cosine/DTW you add | Other recording | **Yes** | No | No | Possible in principle; not a mobile port |
| SpeechBrain `SpeakerRecognition` | Cosine + same-speaker pass/fail | Other recording | Yes, but **speaker ID** | No | No | Not documented as mobile |
| OpenAI Whisper `embed_audio` | Encoder sequence | Other recording, if compared | **Yes**, if compared | No | No (self-hosted weights) | Desktop/server PyTorch |
| whisper.cpp encoder | Encoder pass; or ASR tokens/`p`/DTW times | Encoder: other recording. Tokens: transcript | Encoder: **yes** if compared | No for encoder | No | **Yes** (Core ML, Metal, quantized CPU) |

## Fit to this map

Speaking accuracy is defined as closeness to **Catalog Audio**, not transcript match. Methods that consume only `Word.target` (MFA, GOP, CTC forced alignment, Wav2Vec2Phoneme) can still measure pronunciation quality against a **canonical phone model**. That is the classical CAPT design (Witt: native HMMs, not extra native recordings of each item). It is **not** "how close to this Word's Audio." Dialect mismatch matters: French MFA is metropolitan/African-accented Common Voice French, not Louisiana French; no MFA model is listed for Kouri-Vini.

Methods that consume **two waveforms** can target Catalog Audio directly (SSL/wav2vec2/Whisper encoder + cosine or DTW). First-party docs stop at "here is an embedding / encoder." They do not document a pronunciation grade, a pass/fail threshold for quality, or a phoneme view. SpeechBrain's two-file pass/fail is speaker verification.

whisper.cpp is the documented on-device runner. Using it as ASR+token-`p` is out of scope as the definition. Using `whisper_encode` as an acoustic encoder is in scope as a building block, same as OpenAI `embed_audio`.

No listed toolkit returns a learner-facing grade calibrated for Louisiana French or Kouri-Vini. Any product scalar, pass/fail, or phoneme view is a spec choice on top of one of these outputs.

## Sources

- [MFA User Guide (forced alignment, Kaldi, speaker adaptation)](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/index.html)
- [MFA `mfa align` / `mfa align_one`](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/workflows/alignment.html)
- [MFA analyzing alignment quality](https://montreal-forced-aligner.readthedocs.io/en/stable/user_guide/implementations/alignment_analysis.html)
- [French MFA acoustic model v3.0.0](https://mfa-models.readthedocs.io/en/latest/acoustic/French/French%20MFA%20acoustic%20model%20v3_0_0.html)
- [MFA acoustic models index](https://mfa-models.readthedocs.io/en/latest/acoustic/index.html)
- [Montreal-Forced-Aligner GitHub](https://github.com/montrealcorpustools/montreal-forced-aligner)
- [Witt & Young 2000, Speech Communication (DOI)](https://doi.org/10.1016/s0167-6393(99)00044-8) / [author PDF](http://mi.eng.cam.ac.uk/~sjy/papers/wiyo00.pdf)
- [Kaldi GOP recipe README](https://github.com/kaldi-asr/kaldi/blob/master/egs/gop_speechocean762/README.md)
- [Kaldi `compute-gop.cc`](https://github.com/kaldi-asr/kaldi/blob/master/src/bin/compute-gop.cc)
- [torchaudio `forced_align`](https://docs.pytorch.org/audio/stable/generated/torchaudio.functional.forced_align.html)
- [torchaudio `merge_tokens`](https://docs.pytorch.org/audio/stable/generated/torchaudio.functional.merge_tokens.html)
- [torchaudio Forced Alignment with Wav2Vec2](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html)
- [torchaudio Forced alignment for multilingual data / MMS_FA](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_for_multilingual_data_tutorial.html)
- [wav2vec 2.0 (Meta Research)](https://research.facebook.com/publications/wav2vec-2-0-a-framework-for-self-supervised-learning-of-speech-representations/)
- [Hugging Face Wav2Vec2](https://huggingface.co/docs/transformers/en/model_doc/wav2vec2)
- [Hugging Face Wav2Vec2Phoneme](https://huggingface.co/docs/transformers/en/model_doc/wav2vec2_phoneme)
- [SpeechBrain alignment.aligner](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.alignment.aligner.html)
- [SpeechBrain inference.encoders](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.encoders.html)
- [SpeechBrain inference.speaker](https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.speaker.html)
- [speechbrain/ssl-wav2vec2-base-librispeech](https://huggingface.co/speechbrain/ssl-wav2vec2-base-librispeech)
- [OpenAI whisper `model.py` (`embed_audio`)](https://github.com/openai/whisper/blob/main/whisper/model.py)
- [openai/whisper README](https://github.com/openai/whisper)
- [whisper.cpp README](https://github.com/ggml-org/whisper.cpp)
- [whisper.cpp `whisper.h`](https://github.com/ggml-org/whisper.cpp/blob/master/include/whisper.h)
- [Meta MMS paper page](https://ai.meta.com/research/publications/scaling-speech-technology-to-1000-languages/)
