# Language select

On first launch the learner chooses Louisiana French or Kouri-Vini. Home then opens in that Language. Later, the flag on Home toggles between the two Languages.

## Sub-features

- `lang-first-run` shows the choice on a fresh install and opens Home after the learner picks.
- `lang-switch` toggles Language with the Home flag. There is no choice screen.

## How to get to it (user POV)

- Fresh install: the first screen after loading.
- Home: tap the flag in the top-right corner.

## Driving it with lfv

Preconditions:

- Fresh `$L up` (no Language chosen).

- **See the choice.** Run `$L wait id:language-select-scroll`. The screen shows `text:Choose your language`.
- **Pick Louisiana French.** Run `$L tap 'desc:French, Louisiana French'`, then `$L wait id:home-scroll 30`. The Home top bar shows `text:Louisiana French`.
- **Switch from Home.** Run `$L tap id:home-language-flag`. The top bar now shows `text:Kouri-Vini`, and the flag shows `desc:Kouri-Vini flag`. Tap it again to switch back.
- **Proof.** Run `$L shot lang-home`, then `$L open` and `$L wait id:home-scroll`. Home opens directly, without the choice screen.

## Gotchas

- The choice is saved. To see the first-run screen again, run `$L down && $L up`.
- The first-run Kouri-Vini choice (`desc:Kouri-Vini, Louisiana Creole`) has not been driven yet.
- If a flag tap opens Expo Go's developer menu, the floating Tools gear is covering the flag. `$L open` hides it.
- `id:bug-report-icon` ("Report a bug") is on this screen too. It opens the bug report form, not a Language.
