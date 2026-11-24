# Mistake Review

Mistake Review clears pending Mistakes: Practice Activities the learner skipped, or got wrong twice. Home opens it when the Mistakes badge is greater than zero. Finishing a Lesson with a pending Mistake opens it before Lesson Complete. Pending Mistakes are stored per Language.

## Sub-features

- `mistake-review-create` — create one pending Mistake mid-Lesson with Skip, or with wrong, Try again, wrong, Continue.
- `mistake-review-home-entry` — open Mistake Review from Home (`desc:Mistakes, N pending`).
- `mistake-review-resolve` — answer that Activity correctly and show the badge cleared after `$L open`.
- `mistake-review-kv` — create and open one pending Mistake in Kouri-Vini.

## How to get to it (user POV)

- Home: tap Mistakes (`id:home-mistakes-control`) when it reads `Mistakes, N pending`.
- End of a Lesson: the app opens Mistake Review when the Lesson finishes with a pending Mistake. This recipe uses the Home entry. The end-of-Lesson entry is not driven here.

## Driving it with lfv

Preconditions:

- Cold `$L up`. `$L doctor` exits 0.
- Louisiana French chosen, unless the step says Kouri-Vini.
- Home Mistakes starts disabled: `desc:Mistakes, none pending`. A tap does nothing.

- **Disabled control.** On fresh Home, `$L dump` shows `id:home-mistakes-control` and `desc:Mistakes, none pending`. Run `$L tap id:home-mistakes-control`. `$L wait id:home-scroll 5`. Home stays. There is no `text:Mistake Review`.
- **Create pending (Skip).** Run `$L tap id:home-plan-cta` and `$L wait id:lesson-activity-shell`. Pass the New-word Activity with `$L tap 'text:Continue'`. On the Practice Activity, `$L tap 'text:Skip'`. The footer shows `text:Skipped`. Run `$L tap 'text:Continue'`. Run `$L key BACK` until Home. `$L dump` shows `desc:Mistakes, 1 pending` and `id:mistakes-count` text `1`. Run `$L shot mistake-review-badge`.
- **Create pending (double wrong) — the trap.** On a Practice Activity, a wrong choice, `desc:Check answer`, `desc:Try again`, a wrong choice again, `desc:Check answer`, then `text:Continue` also creates a pending Mistake. Wrong, Try again, then the **correct** choice does not. That path leaves `desc:Mistakes, none pending` (see `lesson.md`). Do not use it as setup.
- **Home entry.** Run `$L tap 'desc:Mistakes, 1 pending'`. The screen shows `text:Mistake Review`, the line about fixing missed questions, and `text:1 / 1`. There is no Skip control. Run `$L shot mistake-review-open`.
- **Resolve one.** `$L dump` and tap the correct `desc:` (the skipped Louisiana French match is `desc:Bonjour!`). `$L tap 'desc:Check answer'`. `text:Correct!` appears with `text:Next Question`. Checking the answer does not leave the screen. Run `$L tap 'text:Next Question'`. Home returns, because this was the last pending Mistake. Run `$L wait id:home-scroll`. `$L dump` shows `desc:Mistakes, none pending`. Run `$L open`, `$L wait id:home-scroll`, and `$L dump` again. The badge stays cleared. Run `$L shot mistake-review-cleared`.
- **Kouri-Vini.** Run `$L tap id:home-language-flag` and `$L wait 'text:Kouri-Vini'`. Mistakes is `desc:Mistakes, none pending` (the Louisiana French Mistake does not carry over). Run `$L tap id:home-plan-cta`. Continue past `text:Bonjou`, then on the Listening Activity `$L tap 'text:Skip'` and `$L tap 'text:Continue'`. `$L key BACK` to Home. `$L dump` shows `desc:Mistakes, 1 pending`. Run `$L tap id:home-mistakes-control`. The prompt is the Kouri-Vini Listening Activity, not `Bonjour!`. Run `$L shot mistake-review-kv`. Leave with `$L key BACK` (the Mistake can stay pending).

## Gotchas

- `id:home-mistakes-control` is disabled when the count is zero. The tap hits the control and Home does not change.
- Skip is `text:Skip`. The following footer button is `text:Continue`, not `desc:Next Question`.
- Mistake Review sets `allowSkip` false. Do not look for Skip there.
- Resolving the last Home-entry Mistake replaces the screen with Home when Next Question is tapped. It does not open Lesson Complete. Lesson Complete is the end-of-Lesson path (`lesson-complete.md`).
- `id:mistakes-count` is the badge view. The digit is the following `text:` node (`text:1`), not an attribute of the id.
- The shell has no testID. `text:Mistake Review` is the wait target.
- Answer choices must be found by their label text, never by position or index, because option order may shuffle. That applies even after the `*-choice-N` testIDs land.
