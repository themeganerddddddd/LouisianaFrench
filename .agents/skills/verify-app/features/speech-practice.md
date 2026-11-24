# Speech Practice

Speech Practice plays a Word's Audio and records the learner saying it. Free Speech Practice is the Hub opened from Home (`Advanced French Hub` or `Advanced Kouri-Vini Hub`). It walks every Word that has Audio. Daily Speech Practice is the plan step `Practice Speech` and is not verified by this recipe.

## Sub-features

- `speech-hub-free` — open the Hub from Home in Louisiana French and in Kouri-Vini.
- `speech-record-cycle` — start a take and allow the microphone once. Stopping the take does not work yet, so Play my recording and Sounds good are not driven.
- `speech-hub-leave` — return Home with `id:advanced-home-button`.
- `speech-daily-scored` — plan button `Practice Speech`. Not verified here. The precondition is heavier than this recipe.

## How to get to it (user POV)

- Home: tap Hub (`id:home-hub-control`) for Free Speech Practice.
- Home, day 2+: tap Practice Speech on Today's plan when that step is active.
- Dictionary: Practice on one Word. That single-Word path is not driven here.

## Driving it with lfv

Preconditions:

- Cold `$L up`. `$L doctor` exits 0.
- Louisiana French chosen, unless the step says Kouri-Vini.
- The emulator has no usable microphone (`lfv up` passes `-no-audio`). The record control still runs; playback may be silent. Proof is the on-screen status, not the sound.

- **Plan button is not Practice Speech.** On the fresh Day 1 Home, `$L dump` `id:home-plan-cta`. It reads `Start your new lesson`. Daily Speech Practice is not verified. See the last step.
- **Open the Hub.** Run `$L tap id:home-hub-control` and `$L wait id:speech-practice-hub`. The scroll is `id:advanced-practice-scroll`. The card is `id:speech-practice-screen`, with `id:speech-practice-record`, `has:Phrase 1/`, `text:Play Audio`, and `text:Play the speaker, then record yourself saying the same phrase.` The title is `text:Advanced French Hub`. Run `$L shot speech-hub-lf`.
- **Leave while idle.** Run `$L tap id:advanced-home-button` and `$L wait id:home-scroll`. Do not use `$L key BACK`. Back from this screen can leave Expo Go. Run `$L shot speech-hub-left`.
- **Kouri-Vini hub.** Run `$L tap id:home-language-flag`, `$L wait 'text:Kouri-Vini'`, `$L tap id:home-hub-control`, and `$L wait id:speech-practice-hub`. The title is `text:Advanced Kouri-Vini Hub`. `id:speech-practice-phrase` is a Kouri-Vini Word, not the Louisiana French phrase. Run `$L shot speech-hub-kv`. Leave with `$L tap id:advanced-home-button`.
- **Start a take.** Switch back to Louisiana French if needed (`id:home-language-flag`), open the Hub again (`$L tap id:home-hub-control`, `$L wait id:speech-practice-record`), and run `$L tap id:speech-practice-record`. `$L dump` shows `text:Allow Expo Go to record audio?`. Run `$L tap 'text:Only this time'` (allow once). If that handle is absent, `$L tap 'text:While using the app'`. Do not tap the deny button. The same press starts the take when the dialog closes. `id:speech-practice-record-again` appears only after a finished take. This recipe does not reach it.
- **Stop does not work yet.** While the microphone is open, uiautomator cannot dump, so `$L tap`, `$L wait`, and `$L dump` cannot see `id:speech-practice-stop`. The visible label is `Stop recording (N.Ns)` and changes every tenth of a second. This step waits on a later label or testID change that can be read during the take. Do not treat stop, Play my recording, or Sounds good as verified.
- **Daily Speech Practice (not verified).** The plan button checked above was `Start your new lesson`, not `Practice Speech`. Reaching that button needs a Lesson completed on an earlier day, today's Review finished or excluded, today's Lesson already complete, and no pending Mistakes. This recipe does not do that setup. Do not mark the scored path verified.

## Gotchas

- Idle Record is `id:speech-practice-record`. While recording the same control is `id:speech-practice-stop`, and its visible label is `Stop recording (N.Ns)`. After a finished take it is `id:speech-practice-record-again`. Stop cannot be driven until a dump can see that control during the take.
- `text:Sounds good, next phrase` is present only after a long enough take, and it does nothing until `text:Play my recording` has been tapped. This recipe does not reach that button.
- The header Home control is `id:advanced-home-button` (`desc:Back to Home`, visible `text:Home`). Single-Word practice would show `id:advanced-back-button` instead. This recipe does not open that mode.
- Free Speech Practice gives no XP. An accepted attempt still marks today's practice done.
- Do not change pronunciation rules (#439, #440). This recipe only checks that the Hub can be driven.
