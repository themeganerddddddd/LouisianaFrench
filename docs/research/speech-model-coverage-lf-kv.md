# How speech models cover Louisiana French and Kouri-Vini

Research for [issue #164](https://github.com/themeganerddddddd/LouisianaFrench/issues/164), answering a coverage decision on the [Speaking accuracy spec](https://github.com/themeganerddddddd/LouisianaFrench/issues/160). Primary sources only: Hugging Face model cards, Common Voice / MLS / VoxPopuli language lists, Whisper and wav2vec2 training-data papers or official READMEs, and first-party Louisiana French or Kouri-Vini speech corpora. No product implementation.

**Question:** What do those sources say about coverage of Louisiana French, Cajun French, Kouri-Vini, Louisiana Creole, and closely related French or Creole varieties — for pronunciation / alignment, not for whether a French ASR transcript looks plausible?

**Repo context:** The spec includes both Languages. Louisiana French is identified internally as `cajun`. Kouri-Vini is identified internally as `kreole`. Research may defer Kouri-Vini from the first scoring slice, but only with evidence. This note separates **documented in the training data** from **might transfer** from Paris French or Haitian Creole.

ISO 639-3 names used by model cards and language lists: Cajun French is `frc`; Louisiana Creole is `lou`; French is `fra` / `fr`; Haitian Creole is `hat` / `ht`. Sources: [ISO 639-3 `frc`](https://iso639-3.sil.org/code/frc), [ISO 639-3 `lou`](https://iso639-3.sil.org/code/lou).

## Short answer

No first-party model card, tokenizer language list, or training-data statement documents Louisiana French (`frc`) or Kouri-Vini (`lou`) as a speech-recognition, speech-synthesis, or labeled-alignment language. What the lists do document is standard French at large scale, and — separately — Haitian Creole plus a few other French-lexifier creoles. Those are neighbors, not coverage of the spec's two Languages.

The one named hit for Cajun French is Meta MMS language identification: `frc` / "French, Cajun" is LID-only, with empty ASR and TTS columns. Louisiana Creole (`lou`) is absent from that table entirely. Whisper's tokenizer has `fr` (french) and `ht` (haitian creole), and no Cajun, Louisiana, or Kouri-Vini token. Common Voice ships French (`fr`) and Haitian (`ht`) as locales; it does not ship `frc` or `lou`. French-of-the-United-States is a self-reported *accent of French*, not a Cajun French locale.

That is evidence to treat a French-trained acoustic encoder as a **possible first slice for Louisiana French**, with the model's own dialect caveat attached, and to **defer Kouri-Vini** from the first scoring slice: there is no documented `lou` audio in these corpora, and Haitian Creole coverage is not Kouri-Vini coverage.

## Documented vs transfer

| Variety | Documented as training / eval language? | Closest documented neighbor | Transfer? |
| --- | --- | --- | --- |
| Louisiana French / Cajun French (`frc`, internal `cajun`) | No ASR, TTS, or labeled-speech locale in Whisper, wav2vec2, XLSR-53, XLS-R, Common Voice, MLS, VoxPopuli, or FLEURS. MMS: LID only. | French (`fr` / `fra`): thousands of hours of European / web / audiobook / parliament speech. | **Not documented.** Whisper's own card says accuracy varies across accents and dialects of a language, and that transcription quality tracks hours in that language. |
| Kouri-Vini / Louisiana Creole (`lou`, internal `kreole`) | No. Not in any language list above, including MMS LID. | Haitian Creole (`ht` / `hat`), plus MMS ASR for some other French-lexifier creoles (`acf`, `crs`, `mfe`). | **Not documented.** Haitian Creole is a different language on every list that includes it. |
| French (`fr` / `fra`) | Yes, at high resource. | — | This is the documented metropolitan / standard-French pool, not Louisiana French. |
| Haitian Creole (`ht` / `hat`) | Yes, at low resource. | — | This is Haitian Creole, not Kouri-Vini. |

## Whisper

Official language inventory: [`whisper/tokenizer.py`](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py) `LANGUAGES`. The multilingual tokenizer has 99 language tokens. Relevant entries: `"fr": "french"` and `"ht": "haitian creole"`. Aliases in `TO_LANGUAGE_CODE` include `"haitian": "ht"`. There is no token or alias for Cajun, Louisiana French, Louisiana Creole, Kouri-Vini, `frc`, or `lou`.

Training-data paper: [Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356) (Radford et al., 2022). Multilingual models trained on 680,000 hours of labeled audio; 117,000 hours cover 96 languages other than English, plus 125,000 hours of X→en translation. Figure of per-language ASR hours (paper appendix, "Training Dataset Statistics"):

- **French: 9,752 hours** of multilingual speech recognition.
- **Haitian Creole: 1.0 hour** of multilingual speech recognition, and **74 hours** of translation data.
- No Cajun French, Louisiana French, Louisiana Creole, or Kouri-Vini bar.

The paper states that performance on transcription in a given language is well predicted by the amount of training data in that language.

Hugging Face card for [`openai/whisper-large-v3`](https://huggingface.co/openai/whisper-large-v3): large-v3 is trained on 1 million hours of weakly labeled audio and 4 million hours of pseudo-labeled audio from large-v2. Architecture change vs large-v2: 128 Mel bins, and a new language token for **Cantonese**. Still no Cajun / Louisiana / Kouri-Vini token. The card repeats the paper's hours-to-quality correlation, then:

> The models also exhibit disparate performance on different accents and dialects of particular languages, which may include higher word error rate across speakers of different genders, races, ages, or other demographic criteria.

That is a first-party statement that **French hours do not imply Louisiana French pronunciation quality**. Using Whisper as an acoustic encoder for speaking accuracy would still be using a model whose documented speech pool is standard French (high resource) and Haitian Creole (about one hour of ASR), not the spec's Languages.

## wav2vec 2.0, XLSR-53, and XLS-R

English wav2vec 2.0 ([paper](https://proceedings.neurips.cc/paper/2020/hash/92d1e1eb1cd6f9fba3227870bb6d7f07-Abstract.html); card [`facebook/wav2vec2-base`](https://huggingface.co/facebook/wav2vec2-base)): pretraining is LibriSpeech / LibriVox English audiobooks (960 hours, or 53k hours unlabeled LibriVox). No French, Cajun, or Creole training statement.

XLSR-53 ([paper](https://arxiv.org/abs/2006.13979); fairseq [wav2vec README](https://github.com/facebookresearch/fairseq/blob/main/examples/wav2vec/README.md)): one model on 56k hours in 53 languages from MLS + Common Voice + BABEL.

- MLS languages named: Dutch, English, **French**, German, Italian, Polish, Portuguese, Spanish.
- Common Voice languages named for that pretraining mix: includes **French**; does not include Haitian, Cajun, or Louisiana Creole.
- BABEL languages named: includes **Haitian**, with Assamese, Bengali, Cantonese, and others. No Cajun. No Louisiana Creole.

XLS-R ([paper](https://arxiv.org/abs/2111.09296); card [`facebook/wav2vec2-xls-r-300m`](https://huggingface.co/facebook/wav2vec2-xls-r-300m)): wav2vec 2.0 pretraining on 436k hours in **128 languages** from VoxPopuli, MLS, Common Voice, BABEL, and VoxLingua107. Table of pretraining hours includes:

- **French (`fr`): 23,973 hours.**
- **Haitian (`ht`): 138 hours**, family listed as "Creole / French-based."

No Cajun French and no Louisiana Creole row. The 138 Haitian hours are the documented French-lexifier creole pool in this encoder, and the paper sources them from VoxLingua107 YouTube segments plus the earlier BABEL Haitian telephone data — not from Louisiana.

## Meta MMS

[Scaling Speech Technology to 1,000+ Languages](https://arxiv.org/abs/2305.13516) and the official [MMS language coverage table](https://dl.fbaipublicfiles.com/mms/misc/language_coverage_mms.html) (linked from the [fairseq MMS README](https://github.com/facebookresearch/fairseq/blob/main/examples/mms/README.md)):

| ISO 639-3 | Name on the table | ASR | TTS | LID |
| --- | --- | --- | --- | --- |
| `fra` | French | yes | yes | yes |
| `frc` | French, Cajun | **no** | **no** | **yes** |
| `lou` | *(no row)* | — | — | — |
| `hat` | Haitian Creole | yes | yes | yes |
| `acf` | Lesser Antillean French Creole | yes | yes | yes |
| `crs` | Seychelles French Creole | yes | yes | yes |
| `mfe` | Morisyen | yes | yes | yes |
| `gcf` | Guadeloupean French Creole | no | no | yes |
| `gcr` | Guianese French Creole | no | no | yes |
| `rcf` | Réunion French Creole | no | no | yes |

The ASR language list for [`facebook/mms-1b-all`](https://dl.fbaipublicfiles.com/mms/asr/mms1b_all_langs.html) matches that split: it includes `fra`, `hat`, `acf`, `crs`, and `mfe`; it does not include `frc` or `lou`.

So Cajun French is **documented as an LID target only** — unlabeled audio used to tell languages apart — not as paired speech for recognition, synthesis, or forced alignment. Louisiana Creole is not documented even for LID. Other French-lexifier creoles that *are* in MMS ASR (`hat`, `acf`, `crs`, `mfe`) remain a transfer hypothesis for Kouri-Vini, not `lou` coverage.

MMS labeled data (MMS-lab) is New Testament readings, on the order of 32 hours per language. That domain is not Catalog Audio and is not Louisiana speech.

## Common Voice

Mozilla Data Collective, Common Voice Scripted Speech **26.0** (cut `cv-corpus-26.0-2026-06-12`):

- [French (`fr`)](https://mozilladatacollective.com/datasets/cmqim41b000tanr07q9btypkc): 868,857 clips, **1,216.01 hours** recorded (**1,102.27 hours** validated), 21,082 speakers. Locale code `fr`. Description: "read speech recordings in French (Français)."
- [Haitian (`ht`)](https://mozilladatacollective.com/organization/cmfh0j9o10006ns07jq45h7xk): a separate locale, **1.04 MB** in the org listing (v25 datasheet: 30 clips, **0.04 hours**, 3 speakers). Not Kouri-Vini.
- No Scripted Speech 26.0 dataset for Cajun French, Louisiana French, Louisiana Creole, or Kouri-Vini.

French 26.0 **variants** (self-identified; not a Cajun locale):

| Code | Variant | Clips |
| --- | --- | --- |
| `fr-metro` | Français de métropole | 545,761 (62.8%) |
| `fr-europe` | Français d'Europe | 26,971 (3.1%) |
| `fr-namerica` | Français d'Amérique du Nord | 14,424 (1.7%) |
| others | Africa, overseas, Caribbean, etc. | small |

French 26.0 **accents** that are easy to confuse with the spec's Languages:

| Code | Label | Clips | Speakers |
| --- | --- | --- | --- |
| `united_states` | Français des États-Unis | 1,610 (0.2%) | 41 |
| `canada` | Français du Canada | 12,869 (1.5%) | 275 |
| `haiti` | Français d’Haïti | 498 (0.1%) | 7 |

`united_states` is an accent of **French**, not a `frc` locale. `haiti` is **French of Haiti**, not Haitian Creole (that is locale `ht`) and not Kouri-Vini.

The Common Voice UI still lists those French accent tokens in [`web/src/stores/demographics.ts`](https://github.com/common-voice/common-voice/blob/main/web/src/stores/demographics.ts) (`united_states: 'Français des États-Unis'`, `haiti: 'Français d’Haïti'`). The file's own comment says this is no longer the canonical accent list; the v26 datasheet above is the release inventory.

## MLS, VoxPopuli, FLEURS

**Multilingual LibriSpeech** ([OpenSLR 94](https://openslr.org/94); [Hugging Face card](https://huggingface.co/datasets/facebook/multilingual_librispeech); [paper](https://arxiv.org/abs/2012.03411)): eight languages from LibriVox audiobooks — English, German, Dutch, Spanish, **French**, Italian, Portuguese, Polish. French train split: **1,076.58 hours**. Read literary French, not Louisiana French.

**VoxPopuli** ([GitHub README](https://github.com/facebookresearch/voxpopuli); [Hugging Face card](https://huggingface.co/datasets/facebook/voxpopuli)): European Parliament recordings, 2009–2020. Transcribed **French (`Fr`): 211 hours**, 534 speakers. Unlabelled French: 4.5K / 22.8K hours (v1/v2). This is parliamentary European French.

**FLEURS** ([paper](https://arxiv.org/abs/2205.12446); [Hugging Face card](https://huggingface.co/datasets/google/fleurs)): 102 languages, about 12 hours each. Includes **French (`fra` / `fr`)** in the Western Europe group. Does not include Haitian Creole, Cajun French, or Louisiana Creole.

## First-party Louisiana French and Kouri-Vini speech

These exist as community or academic audio. None of them appear in the Whisper, wav2vec2, XLSR/XLS-R, MMS ASR, Common Voice, MLS, VoxPopuli, or FLEURS language lists.

**Louisiana French**

- [CODOFIL learning resources](https://codofil.org/learn/): classroom and broadcast material for Louisiana French and Louisiana Creole (Kouri-Vini), including *Paroles de la Louisiane*, *Gombo de Mots*, and the LPB *En Français* collection (223 episodes, 1980–1993). Teaching and archive audio, not a released ASR corpus with a language code on the lists above.
- *La Découverte du français cadien à travers la parole / Discovering Cajun French through the spoken word* (Indiana University Creole Institute / Rojas et al., 2003): a CD of transcribed oral excerpts, on the order of **100 minutes** from 32 towns in 13 parishes. First-party field audio; not in any foundation-model training list.

**Kouri-Vini**

- [Ti Liv Kréyòl](https://sites.google.com/view/learnlouisianacreole/introduction): learner's primer that names the language **Louisiana Creole, also known as Kouri-Vini**, and states that the second edition added **audio recordings of each dialogue**. Herbert Wiltz and Nathan Wendte recorded those clips. Pedagogy audio, not an ASR training release.
- [CODOFIL](https://codofil.org/learn/) lists *Kouri-Vini 101* (video) and points at Ti Liv Kréyòl audio. Same gap: not a model-training locale.

Hugging Face Hub search for datasets named Cajun / Kouri and for models tagged Louisiana Creole did not surface a first-party paired speech corpus used by Whisper, wav2vec2, or MMS. Text glossaries tagged `language:lou` are not speech.

## Implication for the speaking-accuracy spec

Speaking accuracy here is pronunciation quality against Catalog Audio, not "did a French ASR transcript look right." Coverage that matters is whether an encoder has **documented audio** of the Language whose phones the scorer will compare.

- **Louisiana French:** no documented `frc` ASR/TTS/alignment data. Documented French is large (Whisper ~9.8k hours ASR; XLS-R ~24k hours unlabeled; Common Voice `fr` ~1.1k validated hours; MLS ~1.1k hours; VoxPopuli 211 transcribed hours). MMS will *identify* Cajun French as a language (LID) but will not transcribe or synthesize it. A first scoring slice that uses a French-trained encoder is using **transfer from French**, which the Whisper card already warns is uneven across dialects. That is a weaker claim than "the model was trained on Louisiana French."
- **Kouri-Vini:** no documented `lou` data in any of these lists, including MMS LID. Documented Haitian Creole is real but small (Whisper ~1 hour ASR; XLS-R 138 hours; MMS ASR+TTS; Common Voice `ht` is a toy split). Other MMS ASR creoles (`acf`, `crs`, `mfe`) are still not Louisiana Creole. **Defer Kouri-Vini from the first scoring slice:** there is no first-party evidence of pronunciation-alignment coverage, only a transfer story from a different creole.

Self-review stays the path for any Language the scorer cannot honestly cover.

## Sources

- [ISO 639-3 Cajun French (`frc`)](https://iso639-3.sil.org/code/frc)
- [ISO 639-3 Louisiana Creole (`lou`)](https://iso639-3.sil.org/code/lou)
- [OpenAI Whisper tokenizer `LANGUAGES`](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py)
- [Radford et al., Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356)
- [Hugging Face `openai/whisper-large-v3`](https://huggingface.co/openai/whisper-large-v3)
- [Baevski et al., wav2vec 2.0](https://proceedings.neurips.cc/paper/2020/hash/92d1e1eb1cd6f9fba3227870bb6d7f07-Abstract.html)
- [Hugging Face `facebook/wav2vec2-base`](https://huggingface.co/facebook/wav2vec2-base)
- [Conneau et al., XLSR-53](https://arxiv.org/abs/2006.13979)
- [fairseq wav2vec README (XLSR-53 data mix)](https://github.com/facebookresearch/fairseq/blob/main/examples/wav2vec/README.md)
- [Babu et al., XLS-R](https://arxiv.org/abs/2111.09296)
- [Hugging Face `facebook/wav2vec2-xls-r-300m`](https://huggingface.co/facebook/wav2vec2-xls-r-300m)
- [Pratap et al., Scaling Speech Technology to 1,000+ Languages (MMS)](https://arxiv.org/abs/2305.13516)
- [MMS language coverage table](https://dl.fbaipublicfiles.com/mms/misc/language_coverage_mms.html)
- [MMS-1B-all ASR language list](https://dl.fbaipublicfiles.com/mms/asr/mms1b_all_langs.html)
- [fairseq MMS README](https://github.com/facebookresearch/fairseq/blob/main/examples/mms/README.md)
- [Common Voice Scripted Speech 26.0 French](https://mozilladatacollective.com/datasets/cmqim41b000tanr07q9btypkc)
- [Mozilla Data Collective Common Voice organization listing](https://mozilladatacollective.com/organization/cmfh0j9o10006ns07jq45h7xk)
- [common-voice `demographics.ts` (legacy French accents)](https://github.com/common-voice/common-voice/blob/main/web/src/stores/demographics.ts)
- [Multilingual LibriSpeech (OpenSLR 94)](https://openslr.org/94)
- [Hugging Face `facebook/multilingual_librispeech`](https://huggingface.co/datasets/facebook/multilingual_librispeech)
- [VoxPopuli GitHub README](https://github.com/facebookresearch/voxpopuli)
- [Hugging Face `facebook/voxpopuli`](https://huggingface.co/datasets/facebook/voxpopuli)
- [Conneau et al., FLEURS](https://arxiv.org/abs/2205.12446)
- [Hugging Face `google/fleurs`](https://huggingface.co/datasets/google/fleurs)
- [CODOFIL learning resources](https://codofil.org/learn/)
- [Ti Liv Kréyòl introduction](https://sites.google.com/view/learnlouisianacreole/introduction)
