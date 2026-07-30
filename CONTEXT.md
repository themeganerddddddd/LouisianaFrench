# Louisiana Language Learning

The application teaches Louisiana languages through structured lessons, practice activities, and learner-specific review.

## Language

**Language**:
A language a learner can study in the application. The supported languages are Louisiana French and Kouri-Vini.
_Avoid_: Course, locale

**Louisiana French**:
The Louisiana French language track identified internally as `cajun`.

**Kouri-Vini**:
The Louisiana Creole language track identified internally as `kreole`.
_Avoid_: Kreole, Creole when naming the language track

**Unit**:
An ordered group of Lessons organized around a learning theme.
_Avoid_: Section, chapter

**Lesson**:
An ordered learning session within a Unit, containing Activities and introducing or reviewing Words.
_Avoid_: Level

**Daily Review**:
A learner session assembled from due Cards and weak Words across Units.
_Avoid_: Daily lesson

**Mistake Review**:
The follow-up learner session for Activities missed during a Lesson.
_Avoid_: Remediation

**Activity**:
One learner interaction in a Lesson or review session, such as an introduction, choice, listening, typing, sentence-building, or matching task.
_Avoid_: Question when the interaction is not a question

**Word**:
A catalog entry pairing a target-language expression with its English meaning and optional Audio.
_Avoid_: Vocabulary item

**Card**:
The stable review identity of an Activity used by spaced repetition.
_Avoid_: Activity when discussing review state

**Audio**:
A pronunciation recording identified by an audio key and resolved to a bundled asset.
_Avoid_: Sound when referring to language pronunciation

**Learner Progress**:
The learner-owned history of Lesson completion, Word mastery, Card review state, XP, streaks, and Daily Review completion.
_Avoid_: Catalog data, app state

**Catalog**:
The read-only-at-runtime collection of Languages, Units, Lessons, Words, Activities, and Audio identities shipped with the application.
_Avoid_: Learner Progress, lesson data
