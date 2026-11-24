# Home and Today's plan

Home shows the chosen Language, Today's plan (a stepper and a main button), the current Unit card, the Unit list, and controls for Review, Dictionary, Hub, and Mistakes. Day 1 status reads `Day 1`. After a Lesson was completed on an earlier day, the status reads `N of M done`.

## Sub-features

- `home-plan` shows the stepper (`home-plan-step-<id>`), the status, the helper line, and the plan button.
- `home-current-unit` shows the current Unit progress and its Start/Continue button.
- `home-controls` covers the Review, Dictionary, Hub, and Mistakes controls.
- `home-units` covers the Unit list toggles (`unit-toggle-u01`, …) and starting a Lesson from a row.
- `home-plan-later` covers the day-2 plan: Review due, Mistakes, Practice Speech, and all done.

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
- **Unit list, Louisiana French.** `id:unit-toggle-u01` sits on the bottom edge of a fresh Home. Tap it there. One `$L swipe up` from that spot jumps to Unit 2, so swipe only after the toggle is open, to bring the rows up. The rows are `desc:Part 1 — Hello!, How’s it going?, Is it going okay?` (em dash, curly apostrophe in How's) and the later Parts. Each badge reads `text:Start`. None read Locked. Run `$L tap 'desc:Part 1 — Hello!, How’s it going?, Is it going okay?'` and `$L wait id:lesson-activity-shell`. The Lesson is `text:1 / 15`, `text:NEW WORD`, `text:Bonjour!`, and the header title is `text:Greetings & Goodbyes`. There is no preface. Run `$L shot unit-01-lesson-open`. `$L key BACK` returns to the open list. Part 2 (`desc:Part 2 — It’s going badly!, How are things?, It's not going too well.`) also opens at `text:1 / 15`. Run `$L shot unit-02-later-lesson`. Leave it with `$L key BACK`.
- **Unit list, Kouri-Vini.** Run `$L tap id:home-language-flag` and `$L wait 'text:Kouri-Vini'`. Expand `id:unit-toggle-u01` (`desc:Toggle Greetings & Check-ins`). The first row is `desc:Part 1 — Hello, How is it going?, How goes it?`, and the later rows also read `text:Start`. Run `$L tap 'desc:Part 1 — Hello, How is it going?, How goes it?'`. The Lesson is `text:1 / 15` and `text:Bonjou`, with no preface. Run `$L shot unit-kv-lesson`.
- **Proof.** Run `$L shot home`. After a Lesson, run `$L open`. The plan and the Unit card show the progress.

Day 2+ uses the same Home. Preconditions, from a cold `$L up`:

- Louisiana French chosen. No Lesson completed yet.
- Complete one Lesson with no pending Mistake, then move the clock so that completion is on an earlier day. This run completed Unit 6 Part 1 (10 Activities; dismiss the preface with `desc:Start lesson`, see `lesson-preface.md`). Listening answers, in order, are `desc:ils sont`, `desc:eux-autres est`, `desc:eusse est`, then those three again. The last Activity is select-all: tap those three labels, then `desc:Check answer`. `$L wait id:lesson-complete-screen`, then `$L tap id:lesson-complete-home`.
- On that same day the status is still `text:Day 1` and `id:home-plan-cta` reads `Continue to lesson`. A clock change alone does not leave Day 1.
- Move the emulator clock two days, on `emulator-5580` only. `date` without root fails with `Operation not permitted`. Root restarts adbd and drops the reverse:

  ```bash
  adb -s emulator-5580 root
  adb -s emulator-5580 shell date $(date -d '+2 days' +%m%d%H%M%Y.%S)
  adb -s emulator-5580 reverse tcp:8097 tcp:8097
  ```

  Then `$L open` and `$L wait id:home-scroll`. Two days, not one: the first correct answer schedules the Card one day ahead. `adb root` and `adb shell date` are emulator-only. When this section ends, or if a step after the clock change fails, restore the clock with the Emulator clock step in `README.md` before `$L down`.

- **Review due.** `$L dump` shows `id:home-plan-status` `text:0 of 3 done`, steps Review, Lesson, Speech (`id:home-plan-step-review`, `id:home-plan-step-lesson`, `id:home-plan-step-practice`), helper `text:No mistakes to fix — speech practice instead.` (em dash), and `id:home-plan-cta` `Start Daily Review · ~3 min` after the Unit 6 Lesson (`desc:Review, 7 due`). The eyebrow is `text:WHERE YOU LEFT OFF`. Run `$L shot day2-02-review-due`. Run `$L tap id:home-plan-cta` and `$L wait id:daily-review-screen`. Daily Review opens (`daily-review.md`). The seven Cards follow the order they were answered. Tap each answer by its label, then `desc:Check answer`, then `text:Next Question`. The last Card is the select-all. `$L wait id:lesson-complete-screen`. The title is Daily Review. `$L tap id:lesson-complete-home`. The status is `text:1 of 3 done` and the button is `Continue to lesson`.
- **Lesson today.** Run `$L tap id:home-plan-cta`. This opens Unit 1 Part 1 (`text:Greetings & Goodbyes`, `text:1 / 15`, `text:Bonjour!`), not the Lesson completed yesterday. Finish all 15 with no Skip and no double wrong (`lesson.md`). Answers are the Catalog label for that prompt, including the Match pairs. `$L wait id:lesson-complete-screen`, then `$L tap id:lesson-complete-home`. The status is `text:2 of 3 done`. The helper is still the speech line. The button is `Practice Speech`. Run `$L shot day2-07-practice-speech`.
- **Speech step.** Run `$L tap id:home-plan-cta`, `$L wait id:speech-practice-hub`, and `$L wait id:speech-practice-screen`. The card shows `text:Attempt 1/5` and a Word with Audio (`text:Bonjour!` / `text:Hello!` on this path). `id:advanced-home-button` is present. `id:advanced-back-button` is not. That is scored Daily Speech Practice, not the free Hub (`speech-practice.md`) and not one Dictionary Word. Do not tap `id:speech-practice-stop`. Do not tap Record or Stop. Run `$L shot day2-08-speech-scored`. Leave with `$L tap id:advanced-home-button`. Do not use `$L key BACK`. Do not finish all five attempts yet.
- **Mistakes pending.** The next Lesson is Unit 1 Part 2. Run `$L tap id:home-current-unit-continue`, `$L tap 'desc:Continue'` past the New word, `$L tap 'desc:Skip'` on `Type: 'It’s going badly!'`, `$L tap 'text:Continue'`, and `$L key BACK`. Home shows `desc:Mistakes, 1 pending`, the third step label `text:Mistakes`, and `id:home-plan-cta` `Fix 1 mistake`. The helper line is gone. The status stays `text:2 of 3 done`. Run `$L shot day2-09-mistakes-pending`.
- **Plan complete.** Run `$L tap id:home-plan-cta` and `$L wait id:mistake-review-screen`. Mistake Review shows that typing card (`mistake-review.md`). `$L tap 'text:Type your answer'`, `$L type 'Ca va mal'`, `$L key BACK`, `$L tap 'desc:Check answer'`. Accents and the exclamation are folded, so `Ca va mal` is `text:Correct!`. `$L tap 'text:Next Question'`. Home shows `text:3 of 3 done`, the third step `text:Speech` again, `desc:Mistakes, none pending`, and `id:home-plan-completion` with `text:All done with today's plan! Practice more in the Hub`. A tap on that control stays on Home. Run `$L shot day2-11-all-done`. Run `$L open`. The same status and the cleared badge are still there. Run `$L shot day2-12-all-done-reopen`.
- **Kouri-Vini, same clock.** Run `$L tap id:home-language-flag` and `$L wait 'text:Kouri-Vini'`. The plan is still Day 1: `text:Day 1`, the Day 1 helper, and `Start your new lesson`. Run `$L shot day2-13-kv-still-day1`. Switch back. Louisiana French is still `text:3 of 3 done`. This recipe does not repeat the full Lesson-and-clock path in Kouri-Vini. Restore the clock (README, Emulator clock).

## Gotchas

- Home scrolls (`id:home-scroll`). From a fresh Home, tap `id:unit-toggle-u01` while it is on the bottom edge, then `$L swipe up` to read its rows. A swipe first lands on Unit 2.
- Lesson rows are not locked. The badge is `text:Start` or, after that Lesson is completed, Done. A later Part opens its own Lesson.
- The Unit 1 review row's label is `desc:Review`, the same text as `id:home-review-control`. Do not use `desc:Review` to open that Lesson.
- The Home Unit title can differ from the Lesson header. Unit 1's card is `Greetings & Politeness`. The Lesson header is `Greetings & Goodbyes`.
- `id:home-tboy` is T-Boy. Tapping it 10 times opens the debug catalog navigator. Learners never use it, so it does not count as proof of a learner path.
- Day 1 step ids are `home-plan-step-lesson-1` and `home-plan-step-lesson-2`. Day 2+ uses one `home-plan-step-lesson` plus `home-plan-step-practice`. The status never reads `Day 2`.
- Any Lesson button except `Start your new lesson` is drawn as `Continue to lesson`. The unit card's continue label still names the Lesson.
- Clearing the last pending Mistake records today's practice. The plan then shows all done, and `Practice Speech` is no longer the button. Open the speech step before creating the Mistake.
- Answer choices are matched by label text, never by position or index. Day-2 waits are `id:daily-review-screen`, `id:lesson-complete-screen`, `id:lesson-complete-home`, `id:mistake-review-screen`, `id:speech-practice-hub`, and `id:speech-practice-screen`. Do not tap `id:speech-practice-stop`, and do not tap Record or Stop.
