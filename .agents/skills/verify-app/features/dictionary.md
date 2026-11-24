# Dictionary

The Dictionary lists every Word in the course for the chosen Language. Learners can search, filter by category, play Audio, see each Word's status (New, Learning, …), and open Speech Practice for one Word that has Audio.

## Sub-features

- `dict-browse` lists Words grouped by category, with their status.
- `dict-search` filters by English, the target Word, or the category name.
- `dict-filter` filters with category chips (`desc:All Words`, `desc:Greetings & Politeness`, …).
- `dict-audio` plays a Word's Audio.
- `dict-speech` opens Speech Practice for one Word and returns with Back to Dictionary.

## How to get to it (user POV)

- Home: tap `Dictionary` (`id:home-dictionary-control`).

## Driving it with lfv

Preconditions:

- Home with Louisiana French chosen.

- **Open.** Run `$L tap id:home-dictionary-control` and `$L wait id:dictionary-screen`. The screen shows `text:French Dictionary`.
- **Search.** Run `$L tap 'text:Search English, target word, or category'`, `$L type merci`, and `$L key BACK` to close the keyboard. The list shows every card whose English or target contains that text: `text:Thank you!` / `text:Merci!`, `text:Thanks, Mrs. Boudreaux!` / `text:Merci, Madame Boudreaux!`, and `text:Thank you very much!` / `text:Merci beaucoup!`. Run `$L shot dict-01-search-merci`.
- **Filter.** Run `$L tap 'desc:Greetings & Politeness'`. Only that category is listed.
- **Status.** After practising `Bonjour!` in a Lesson, `text:Hello!` shows `text:Learning`, not `text:New`.
- **Kouri-Vini.** With Kouri-Vini chosen, the title is `text:Kouri-Vini Dictionary`, and the category chips start with `desc:Greetings & Check-ins` and `desc:Pronouns & Feelings`. Search `byin`: the list shows `text:Mo byin` (`I'm good`) and `text:Mo pa byin` (`I'm not good`). After the first Kouri-Vini Lesson's first two Activities, `text:Bonjou` shows `text:Learning`.
- **Speech, Louisiana French.** From Home, open the Dictionary and search `avoir` (one card: `text:to have`, `text:avoir`, category `text:To Have & Expressions`). Run `$L tap 'desc:Practice'`, `$L wait id:speech-practice-hub`, and `$L wait id:speech-practice-screen`. The title is `text:Advanced French Hub`. The card shows `text:avoir`, `text:to have`, `desc:Play Audio`, and `desc:Record`. There is no `Attempt N/5` and no `Phrase N/`. `id:advanced-back-button` (`desc:Back to Dictionary`, visible `text:Back`) is on screen, next to `id:advanced-home-button`. Do not tap `id:speech-practice-stop`, Record, or Stop. Run `$L shot dict-03-speech-lf`. Run `$L tap id:advanced-back-button` and `$L wait id:dictionary-screen`. The `avoir` search is still there. Run `$L shot dict-04-back-lf`. Do not use the Home button for this return.
- **Speech, Kouri-Vini.** Run `$L tap id:dictionary-home-button`, `$L tap id:home-language-flag`, `$L wait 'text:Kouri-Vini'`, and open the Dictionary. Search `Bonjou`. The one card is `text:Hello` / `text:Bonjou`. Run `$L tap 'desc:Practice'` and `$L wait id:speech-practice-screen`. The title is `text:Advanced Kouri-Vini Hub` and the phrase is `text:Bonjou`, not `avoir`. Run `$L shot dict-06-speech-kv`. Run `$L tap id:advanced-back-button`.
- **Back.** Run `$L tap id:dictionary-home-button`. Home returns.
- **Proof.** The speech proof is the Word on `id:speech-practice-screen`, then the Dictionary after Back. This path does not record.

## Gotchas

- The search box has no testID. Its handle is its placeholder text, and after typing, the handle becomes the typed text. `desc:Practice` taps the first match. Search a Word that is the only card (`avoir`, `Bonjou`) so that tap is that Word. To replace a query, tap the box, move to the end, and delete, then type. The letters `avoir` and `Bonjou` need no accent.
- `key BACK` with the keyboard open only closes the keyboard. Press it a second time to leave the screen.
