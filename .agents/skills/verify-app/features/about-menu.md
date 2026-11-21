# About menu

The pelican in the Home top bar opens the About menu: About Us (expandable text pages) and Support. On `main` it does not show Account (#344). Identity branches show Account first.

## Sub-features

- `about-open` opens and dismisses the menu.
- `about-us` expands About Us and opens its text pages (`about-menu-leaf-<kind>`, `id:about-text-modal`).
- `about-support` opens the Report a bug sheet (`id:bug-report-sheet`).
- `about-account` (Identity branches only) opens sign-in (`id:sign-in-modal`).

## How to get to it (user POV)

- Home: tap the pelican (`id:home-pelican`, `desc:About menu`).

## Driving it with lfv

Preconditions:

- Home with Louisiana French chosen.

- **Open.** Run `$L tap id:home-pelican`. `id:home-about-menu` lists `desc:About Us` and `desc:Support`.
- **About Us.** Run `$L tap id:about-menu-section`. Three leaves appear: `id:about-menu-leaf-acknowledgements`, `id:about-menu-leaf-privacy`, and `id:about-menu-leaf-faq`. Tapping a leaf opens `id:about-text-modal`. Close it with `id:about-text-close`.
- **Support.** Run `$L tap id:about-menu-support`. The Report a bug sheet opens (`id:bug-report-sheet`, `text:Report a bug`), with Name and Email fields. `$L key BACK` closes it.
- **Dismiss.** Run `$L key BACK` or `$L tap id:about-menu-backdrop`. Home returns.
- **Proof.** Run `$L shot about-menu` with the menu open. The `main` check is that `id:about-menu-account` is not in `$L dump`.

## Gotchas

- On Identity branches, `id:about-menu-account` is the first row and opens sign-in. Signing up or signing in uses the real Supabase project in `.env.local`, so use a throwaway email.
- The backdrop covers the whole screen. While the menu is open, a tap anywhere else closes it instead of reaching Home.
