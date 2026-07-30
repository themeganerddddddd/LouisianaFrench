# Spec: Lesson Preface

Status: approved

## Summary

Add a compact Modal that appears before the first Lesson of applicable Units, explaining regional variation in a way that does not overload the Activity format. The same module renders for Cajun French and Kouri-Vini without containing language-specific copy. Centered summary, left-aligned optional details.

## Product decisions

| Decision | Choice |
|----------|--------|
| UI variant | Compact dialog (prototype Variant A) |
| Mandatory content | Title, summary, pronoun chips, reassurance note, two actions |
| Optional content | Regional differences, speaker variation, example quote, conjugation note |
| Alignment | Summary centered; long-form details left-aligned |
| Trigger | First Lesson of the Unit only |
| First-opening | Mark read on "Start lesson"; closing retains unread state |
| Reopen | Via "Unit note" button in ProgressHeader |
| Languages | Shared module; content per Language/Unit in Catalog |

## User flow

```
[Tap Lesson 1 of Unit]
  → Preface unread? → Show centered Modal
    → [Start lesson] → Mark read → Begin Activity 1
    → [Learn more] → Full-screen left-aligned detail view → [Back] → Modal
    → [Close / Back to Unit] → Return without marking read
  → Preface already read? → Begin Activity 1 directly

[ProgressHeader "Unit note"] → Show Modal in reference mode → [Back to lesson]
```

## Architecture

```
src/constants/unitPrefaces.js       Structured preface content per Language/Unit
src/data/catalog.js                 +getUnitPreface(language, unitCode)
src/data/lessonLoader.js            Re-export
src/utils/storage.js                +isPrefaceRead, +markPrefaceRead
src/components/LessonPrefaceModal.js  Reusable rendering module (no Language copy)
src/components/ProgressHeader.js    Optional "Unit note" prop
src/screens/LessonRunner.js         Gate before Activity 1
```

| Module | Interface |
|--------|-----------|
| `unitPrefaces` | `UNIT_PREFACES[language][unitCode] \| undefined` |
| `catalog` | `getUnitPreface(language, unitCode)` → `preface \| undefined` |
| `storage` | `isPrefaceRead(prefaceId)` → `boolean` |
| | `markPrefaceRead(prefaceId)` → `void` |
| `LessonPrefaceModal` | `{ preface, mode, visible, onContinue, onClose, accentColor }` |

## Content shape

```js
{
  id: 'cajun:u03',
  title: 'Ways to say "they"',
  summary: 'The form you hear may depend on the region or the speaker.',
  terms: ['ils', 'eux-autres', 'eusse', 'ça'],
  reassurance: 'The app will accept multiple forms in your answers.',
  detailsTitle: 'Why are there different forms?',
  sections: [
    { heading: 'Language changes by place', paragraphs: ['...'] },
    { heading: 'People may switch forms', paragraphs: ['...'], quote: { text: '...', attribution: '...' } }
  ]
}
```

## First production entry

Cajun French Unit `u03: To Be & To Have`. Kouri-Vini entries are empty until approved copy exists.

## Out of scope

- Markdown / rich-text rendering
- Mid-lesson display
- Audio or video in the preface
- Prefaces attached to individual Lessons rather than Units
