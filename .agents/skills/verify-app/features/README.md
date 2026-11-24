# Louisiana Languages verification map

This folder is the maintained source for verifying what a learner sees and does. Read this index first, then use the matching feature file as the recipe. Domain terms (Language, Unit, Lesson, Activity, Word, Learner Progress) follow `CONTEXT.md`.

## Baseline preconditions

- `$L up` has printed `ready:` (`L=.agents/skills/verify-app/scripts/lfv.mjs`), and `$L doctor` exits 0.
- A fresh `up` starts as a first install: no Language chosen, no Learner Progress, not signed in.
- Never drive an emulator or Metro that `lfv` did not start.

## Driving conventions

- Prefer `id:<testID>`, then `desc:<accessibilityLabel>`, then `text:`. Run `$L dump` when a handle is unknown. Never use coordinates.
- Start each recipe from Home with Louisiana French chosen, unless its preconditions say otherwise.
- The two Languages have different Catalogs: Units, Words, and Activity order differ. A change that touches Lessons, the Dictionary, Home, or Learner Progress is proven in both Louisiana French and Kouri-Vini. Each recipe has a Kouri-Vini step.
- Mutations (Lesson answers, Language choice) persist across `$L open`. Run `$L down && $L up` to reset.
- Android only for now. iOS uses the same handles through Maestro. See the iOS section in `../SKILL.md`.

## Emulator clock

`adb root` and `adb shell date` are for `emulator-5580` only. Do not run them on a phone or on `emulator-5554`.

Daily Review and the day-2 Home plan move that clock. When the recipe ends, and also if a later step fails, restore it with this step:

```bash
adb -s emulator-5580 shell settings put global auto_time 1
adb -s emulator-5580 shell settings put global auto_time_zone 1
$L open
```

If the clock does not come back, recovery is `$L down` and a fresh `$L up`.

## Proof and skip reporting

- Capture the action and the resulting state: use `rec-start`/`rec-stop` across the tap, or `shot` before and after it.
- For anything that saves Learner Progress, also show a second view after `$L open`.
- Record the feature ID, platform, and entry point with every artifact.
- If an entry point can't be reached, report the command you tried and the missing precondition. Do not count a skipped platform as verified.

## Feature entry contract

Each feature file has an H1, one paragraph, then `Sub-features`, `How to get to it (user POV)`, `Driving it with lfv` (starting with `Preconditions:`), and `Gotchas`.

## Features

- [Language select](./language-select.md) covers the first-run choice and switching Language from Home.
- [Home and Today's plan](./home.md) covers the plan stepper, the plan button, the current Unit card, the Unit list, and the day-2 plan.
- [Lesson](./lesson.md) covers New-word and Practice Activities, answering, advancing, and leaving.
- [Lesson Complete](./lesson-complete.md) covers the end screen after a Lesson with no pending Mistake.
- [Daily Review](./daily-review.md) covers Day 1 disabled Review, the empty queue, and one due Card.
- [Mistake Review](./mistake-review.md) covers creating a pending Mistake, Home entry, and resolving one.
- [Speech Practice](./speech-practice.md) covers Free Speech Practice from the Hub.
- [Lesson preface](./lesson-preface.md) covers the Unit 6 note, Learn more, Close, Start lesson, and the Kouri-Vini lesson that has no preface.
- [Dictionary](./dictionary.md) covers browsing, search, category filters, Word status, and Speech Practice for one Word.
- [About menu](./about-menu.md) covers the pelican menu, About Us, Support, and bug-report consent.
