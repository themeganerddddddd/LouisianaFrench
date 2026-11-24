# Lesson preface

A Lesson preface is the note shown the first time a learner opens Lesson 1 of a Unit that has one. On this Catalog that is Louisiana French Unit 6 only. The note hides the Activity until the learner starts the Lesson or closes it. Kouri-Vini has no preface.

## Sub-features

- `preface-open` shows the summary (`id:preface-overlay`) over Lesson 1 of Louisiana French Unit 6.
- `preface-details` opens Learn more, then returns to the summary.
- `preface-close` closes the note without marking it read, so the next open shows it again.
- `preface-start` marks it read and shows the first Activity. A later open skips the note. Unit note reopens it in reference mode.
- `preface-kv` opens a Kouri-Vini Lesson 1 and finds no preface.

## How to get to it (user POV)

- Home: scroll to Unit 6, expand it, and tap Part 1. Do not use the Day 1 plan button. That opens Unit 1, which has no preface.
- After the note has been started once: the Lesson header's Unit note.

## Driving it with lfv

Preconditions:

- Cold `$L up`. `$L doctor` exits 0.
- Louisiana French chosen, unless the step says Kouri-Vini.
- The preface has not been started yet. `$L down && $L up` clears that.

- **Reach Unit 6.** On Home, `$L dump` until `id:unit-toggle-u06` is on screen (`$L swipe up` as needed). Its label is `desc:Toggle Pronoun “They” & To Be Able To`. The quotation marks are curly. Run `$L tap id:unit-toggle-u06`. `$L swipe down` if Part 1 is above the fold. The row is `desc:Part 1 — Three ways to say ‘they are’` (em dash, and curly single quotes around they are).
- **Open.** Run `$L tap 'desc:Part 1 — Three ways to say ‘they are’'` and `$L wait id:preface-overlay`. The header behind the note reads `text:Talking About Others` and `text:Before you begin`, with progress `text:0 / 10`. The summary shows `text:A note before you begin`, `text:Different ways to say “they”`, `id:preface-tboy-image`, `id:preface-tboy-bubble`, `id:term-chip-0` `text:they are`, `id:term-chip-1` `text:they have`, `id:term-chip-2` `text:they want`, `desc:Learn more`, `desc:Start lesson`, and `desc:Close preface`. `id:lesson-activity-shell` is absent. Run `$L shot preface-01-summary`.
- **Learn more.** Run `$L tap 'desc:Learn more'`. The details title is `text:Why are there several forms?`, with `desc:Back to summary` and `desc:Start lesson`. There is no Close on this view. Run `$L shot preface-02-details`. Run `$L tap 'desc:Back to summary'` and `$L wait 'desc:Close preface'`.
- **Close.** Run `$L tap 'desc:Close preface'`. The note is gone and `id:lesson-activity-shell` shows `text:1 / 10`, `text:NEW WORD`, and `text:ils sont`. Run `$L shot preface-03-after-close`. Run `$L key BACK` and open the same row again. `$L wait id:preface-overlay`. The note is back. Run `$L shot preface-04-overlay-after-close`. Close does not mark the preface read.
- **Start lesson.** On that summary, run `$L tap 'desc:Start lesson'`. The note closes. The Activity is `text:1 / 10` and `text:ils sont`, and the header shows `desc:Unit note`. Run `$L shot preface-05-after-start`. Run `$L key BACK` until Home, then open the same row again and `$L wait id:lesson-activity-shell`. The preface does not return. Run `$L shot preface-06-read-skipped`.
- **Unit note.** Run `$L tap 'desc:Unit note'`. The summary opens again, and the primary button is `desc:Back to lesson`, not `desc:Start lesson`. `desc:Learn more` and `desc:Close preface` are still there. Run `$L shot preface-07-unit-note`. Run `$L tap 'desc:Back to lesson'`. The Activity returns and the note is gone.
- **Kouri-Vini.** Run `$L tap id:home-language-flag` and `$L wait 'text:Kouri-Vini'`. Expand Unit 1 (`id:unit-toggle-u01`, `desc:Toggle Greetings & Check-ins`) and run `$L tap 'desc:Part 1 — Hello, How is it going?, How goes it?'`. `$L wait id:lesson-activity-shell`. The screen is `text:1 / 15` and `text:Bonjou`. `id:preface-overlay` is not in `$L dump`. Kouri-Vini has no unit preface, so there is no shared preface chrome to compare.

## Gotchas

- Only Louisiana French Unit 6 has a preface. Unit 1's plan button never opens this note.
- The Home toggle title (`Pronoun “They” & To Be Able To`) is not the Lesson header (`Talking About Others`).
- `desc:Start lesson` on the summary marks the preface read. `desc:Close preface` and `desc:Back to lesson` do not.
- Answer choices elsewhere in this Lesson are still matched by label text, never by position.
