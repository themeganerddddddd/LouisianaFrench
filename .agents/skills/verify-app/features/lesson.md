# Lesson

A Lesson walks through Activities (15 in the first Lesson of each Language). New-word Activities play Audio and teach a Word. Practice Activities ask for an answer, show Correct or Incorrect, and move on. Finishing the last Activity opens Lesson Complete.

## Sub-features

- `lesson-new-word` shows the Word, plays Audio on open and on tap, and continues.
- `lesson-practice` takes a choice, checks it, shows feedback, and moves to the next question.
- `lesson-listening` plays Audio and asks the learner to choose the Word they heard.
- `lesson-incorrect` shows `Not quite` for a wrong answer and lets the learner try again.
- `lesson-skip` skips a Practice Activity.
- `lesson-leave` leaves mid-Lesson with Android Back.
- `lesson-complete` shows the end screen (`id:lesson-complete-scroll`). The driving steps are in `lesson-complete.md`.

## How to get to it (user POV)

- Home: tap `Start your new lesson` (`id:home-plan-cta`) or the Unit card's Start button (`id:home-current-unit-continue`).

## Driving it with lfv

Preconditions:

- Home with Louisiana French chosen, at the first Lesson (fresh `up`).

- **Open.** Run `$L tap id:home-plan-cta` and `$L wait id:lesson-activity-shell`. The header shows `text:1 / 15`, `text:NEW WORD`, and `text:Bonjour!`.
- **New word.** Run `$L tap 'desc:Play audio: Bonjour!'` to replay the Audio, then `$L tap desc:Continue`. The counter moves to `text:2 / 15`.
- **Practice.** The screen shows `text:Choose the match for 'Hello!'`. Run `$L tap 'desc:Bonjour!'` and `$L tap 'desc:Check answer'`. `text:Correct!` appears with `desc:Next Question`. A wrong choice shows the incorrect feedback instead.
- **Next.** Run `$L tap 'desc:Next Question'`. The counter moves on.
- **Kouri-Vini.** After choosing Kouri-Vini, run `$L tap id:home-plan-cta`. Activity `1 / 15` is the New word `text:Bonjou` (`text:Hello`). Replay its Audio with `desc:Play audio: Bonjou`, then run `$L tap desc:Continue`. Activity `2 / 15` is `text:LISTENING`: `text:Listen and choose the word`, with `desc:Play audio` and four choices. Run `$L tap desc:Bonjou` and `$L tap 'desc:Check answer'`. `text:Correct!` appears.
- **Wrong answer.** At Kouri-Vini Activity `2 / 15`, run `$L tap 'desc:Mo byin'` and `$L tap 'desc:Check answer'`. `text:Not quite` appears with `desc:Try again`. Run `$L tap 'desc:Try again'`, then choose `desc:Bonjou` and check again. `text:Correct!` appears.
- **Leave.** Run `$L key BACK`. Home returns.
- **Proof.** Run `$L rec-start lesson-answer` before the Practice taps and `$L rec-stop` after the feedback. Then open the Dictionary: the practised Word shows the status `Learning` (see `dictionary.md`).

## Gotchas

- `desc:Continue` exists only on New-word Activities. Practice uses `desc:Check answer`, then `desc:Next Question`. A `tap` on a missing handle waits 10 seconds, then fails.
- The Languages differ at Activity 2: Louisiana French has a Practice match for `Hello!`, and Kouri-Vini has a Listening Activity for `Bonjou`.
- A wrong answer followed by a right one on `Try again` leaves `desc:Mistakes, none pending` on Home. To create a pending Mistake, Skip, or answer wrong twice and tap Continue (see `mistake-review.md`).
- Activity order and answer choices come from the Catalog. Read the question with `$L dump`. Do not hard-code which answer comes in which position.
- `adb` has no audio capture. To prove Audio plays, use the `desc:Play audio: …` tap and the Metro `$L logs`, not the video.
