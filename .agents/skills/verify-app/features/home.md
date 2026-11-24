# Home and Today's plan

Home shows the chosen Language, Today's plan (a stepper of Lessons and Review with a main button), the current Unit card, the Unit list, and controls for Review, Dictionary, Hub, and Mistakes.

## Sub-features

- `home-plan` shows the stepper (`home-plan-step-<id>`), the status (`Day N`), the helper line, and the plan button.
- `home-current-unit` shows the current Unit progress and its Start/Continue button.
- `home-controls` covers the Review, Dictionary, Hub, and Mistakes controls.
- `home-units` covers the Unit list toggles (`unit-toggle-u01`, …).

## How to get to it (user POV)

- Open the app after a Language is chosen.
- Tap Back to Home from Dictionary, Advanced, or Lesson Complete.

## Driving it with lfv

Preconditions:

- Louisiana French chosen (see `language-select.md`).

- **Read the plan.** Run `$L wait id:home-plan` and `$L dump`. On day 1, `id:home-plan-status` reads `Day 1`, the steps are Lesson, Lesson, No review, and `id:home-plan-cta` reads `Start your new lesson`.
- **Kouri-Vini.** After choosing Kouri-Vini, the plan is the same (Day 1, Lesson, Lesson, No review). The Unit card reads `text:Greetings & Check-ins`, `text:0 / 12 words · 0 / 3 lessons`, and `text:Part 1 — Hello, How is it going?, How goes it?`.
- **Start from the plan.** Run `$L tap id:home-plan-cta`. A Lesson opens at `text:1 / 15` (see `lesson.md`).
- **Start from the Unit card.** Run `$L tap id:home-current-unit-continue`. The same Lesson opens.
- **Open a control.** Run `$L tap id:home-dictionary-control`. The Dictionary opens (`id:dictionary-screen`). `id:home-hub-control` opens the Hub (see `speech-practice.md`). On a fresh Day 1 Home, `id:home-review-control` is disabled: its label is `desc:Review`, the plan helper is `text:Reviews unlock once you've learned new words.`, and a tap stays on Home. Review opens Daily Review only after a Word is learned, or from day 2 on (see `daily-review.md`). `id:home-mistakes-control` is disabled while it reads `desc:Mistakes, none pending`. It opens Mistake Review only when the badge is at least 1 (see `mistake-review.md`).
- **Proof.** Run `$L shot home`. After a Lesson, run `$L open`. The plan and the Unit card show the progress.

## Gotchas

- Home scrolls (`id:home-scroll`). The Unit list is below the fold, so run `$L swipe up` before tapping `unit-toggle-*`.
- `id:home-tboy` is T-Boy. Tapping it 10 times opens the debug catalog navigator. Learners never use it, so it does not count as proof of a learner path.
- Day-based plan changes need a later day. Move the emulator clock with `adb -s emulator-5580 shell date …`, as #435 did, and say so in the evidence.
