# Dictionary

The Dictionary lists every Word in the course for the chosen Language. Learners can search, filter by category, play Audio, and see each Word's status (New, Learning, …).

## Sub-features

- `dict-browse` lists Words grouped by category, with their status.
- `dict-search` filters by English, the target Word, or the category name.
- `dict-filter` filters with category chips (`desc:All Words`, `desc:Greetings & Politeness`, …).
- `dict-audio` plays a Word's Audio.

## How to get to it (user POV)

- Home: tap `Dictionary` (`id:home-dictionary-control`).

## Driving it with lfv

Preconditions:

- Home with Louisiana French chosen.

- **Open.** Run `$L tap id:home-dictionary-control` and `$L wait id:dictionary-screen`. The screen shows `text:French Dictionary`.
- **Search.** Run `$L tap 'text:Search English, target word, or category'`, `$L type merci`, and `$L key BACK` to close the keyboard. The list shows `text:Thank you!` and `text:Merci!` only.
- **Filter.** Run `$L tap 'desc:Greetings & Politeness'`. Only that category is listed.
- **Status.** After practising `Bonjour!` in a Lesson, `text:Hello!` shows `text:Learning`, not `text:New`.
- **Kouri-Vini.** With Kouri-Vini chosen, the title is `text:Kouri-Vini Dictionary`, and the category chips start with `desc:Greetings & Check-ins` and `desc:Pronouns & Feelings`. Search `byin`: the list shows `text:Mo byin` (`I'm good`) and `text:Mo pa byin` (`I'm not good`). After the first Kouri-Vini Lesson's first two Activities, `text:Bonjou` shows `text:Learning`.
- **Back.** Run `$L tap id:dictionary-home-button`. Home returns.
- **Proof.** Run `$L shot dict-search` after the search.

## Gotchas

- The search box has no testID. Its handle is its placeholder text, and after typing, the handle becomes the typed text.
- `key BACK` with the keyboard open only closes the keyboard. Press it a second time to leave the screen.
