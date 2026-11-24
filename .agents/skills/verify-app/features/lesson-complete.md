# Lesson Complete

Lesson Complete is the screen after a Lesson finishes with no pending Mistake, and after Daily Review finishes its last Card. It shows the session title, XP earned, mistakes reviewed, and Back to Home. Kouri-Vini uses a green accent and a green page background. Louisiana French uses blue.

## Sub-features

- `lesson-complete-reach` — finish the first Louisiana French Lesson with every Practice Activity correct, and land on the screen.
- `lesson-complete-home` — Back to Home returns to Home, and `$L open` still shows the Lesson progress.
- `lesson-complete-kv` — the same screen after the first Kouri-Vini Lesson, with the green accent.
- `lesson-complete-daily-review` — the screen Daily Review opens after its last Card. Driven from `daily-review.md`, not repeated here.

## How to get to it (user POV)

- Finish a Lesson without a pending Mistake.
- Finish Daily Review (the title is Daily Review).
- Finish Mistake Review that was opened from the end of a Lesson, not from Home. Home Mistake Review returns to Home instead. That path is not driven here.

## Driving it with lfv

Preconditions:

- Cold `$L up`. `$L doctor` exits 0.
- Louisiana French chosen, at the first Lesson (fresh install).
- Do not Skip. Do not leave a Practice Activity wrong twice. Either one sends the end of the Lesson to Mistake Review instead of this screen.
- Read answer choices from `$L dump` and from the Catalog for that Lesson. Do not press a choice by screen position.

- **Open the Lesson.** Run `$L tap id:home-plan-cta` and `$L wait id:lesson-activity-shell`. The header shows `text:1 / 15`.
- **New word.** When the Activity shows `text:Listen and learn`, run `$L tap 'text:Continue'`. The counter advances.
- **Practice.** When `desc:Check answer` is on screen, `$L dump` the prompt. Tap the `desc:` of the Catalog answer, then `$L tap 'desc:Check answer'`. `text:Correct!` appears. Run `$L tap 'text:Next Question'`. The first Louisiana French Practice prompt is `Choose the match for 'Hello!'` and the answer handle is `desc:Bonjour!`. Later prompts name the English; the answer is that Word's target. A Listening Activity (`text:Listen and choose the word`) uses the target of the Word the Lesson just taught, or the Catalog answer for that step.
- **Match.** When `text:Match the words` is showing, tap an English `desc:`, then the target-language `desc:` for the same Word. Each pair checks immediately. Repeat until `text:Correct!`, then `$L tap 'text:Next Question'`. On `text:Wrong pair`, run `$L tap 'desc:Try again'` and pair again. Do not Skip.
- **Arrive.** After Activity 15 the screen is `id:lesson-complete-screen` and `id:lesson-complete-scroll`, with `has:Session Complete` (the title text is `Session Complete 🎉`), the Lesson title, `text:XP earned`, and `text:Mistakes reviewed`. Run `$L shot lesson-complete-lf`.
- **Back to Home.** Run `$L tap id:lesson-complete-home` and `$L wait id:home-scroll`. The plan shows the first Lesson step done. Run `$L open`, `$L wait id:home-scroll`, and `$L dump`. The same progress is still there.
- **Kouri-Vini.** Run `$L tap id:home-language-flag` and `$L wait 'text:Kouri-Vini'`. Kouri-Vini Learner Progress is still at Lesson 1. Run `$L tap id:home-plan-cta`. Activity `1 / 15` is `text:Bonjou`. Finish all 15 the same way: New-word `text:Continue`, Listening and other Practice by Catalog answer, then Match. Activity 2 is Listening for `desc:Bonjou`. The complete screen uses the green accent (`#08834C`) and the green page (`#E7F5EE`). Run `$L shot lesson-complete-kv`. Run `$L tap id:lesson-complete-home`.

## Gotchas

- `text:Session Complete` does not match. The title node is `Session Complete 🎉`. Use `has:Session Complete` or `id:lesson-complete-scroll`.
- Leave with `id:lesson-complete-home`. The visible label is still `text:Back to Home`.
- `text:Next Question` is the visible label. The control has no accessibility label. `desc:Check answer` is the check control; its visible text is `Check`.
- T-Boy (`id:home-tboy` ten times) can jump the Catalog. Do not use it for this recipe. These steps are the real Lesson.
- A pending Mistake at the last Activity opens Mistake Review (`mistake-review.md`) and this screen does not appear until that queue is cleared from the Lesson path.
