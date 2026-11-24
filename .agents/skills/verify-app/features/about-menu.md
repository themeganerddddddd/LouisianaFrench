# About menu

The pelican in the Home top bar opens the About menu: About Us (expandable text pages) and Support. On `main` it does not show Account (#344). Identity branches show Account first.

## Sub-features

- `about-open` opens and dismisses the menu.
- `about-us` expands About Us and opens its text pages (`about-menu-leaf-<kind>`, `id:about-text-modal`).
- `about-support` opens the Report a bug sheet (`id:bug-report-sheet`), checks the form, and reaches the consent step. Sending is not part of the run.
- `about-account` (Identity branches only) opens sign-in (`id:sign-in-modal`).

## How to get to it (user POV)

- Home: tap the pelican (`id:home-pelican`, `desc:About menu`).

## Driving it with lfv

Preconditions:

- Home with Louisiana French chosen.

- **Open.** Run `$L tap id:home-pelican`. `id:home-about-menu` lists `desc:About Us` and `desc:Support`.
- **About Us.** Run `$L tap id:about-menu-section`. Three leaves appear: `id:about-menu-leaf-acknowledgements`, `id:about-menu-leaf-privacy`, and `id:about-menu-leaf-faq`. Tapping a leaf opens `id:about-text-modal`. Close it with `id:about-text-close`.
- **Support.** Run `$L tap id:about-menu-support`. The Report a bug sheet opens (`id:bug-report-sheet`, `text:Report a bug`), with Name (`desc:Bug report name`), Email (`desc:Bug report email`), and What happened (`desc:Bug report description`). `$L key BACK` closes it when the keyboard is not open.
- **Empty submit.** Run `$L tap 'desc:Submit bug report'`. The name field takes focus and the keyboard opens, so the lower errors sit under it. Run `$L key BACK`. The sheet shows `text:Name is required.`, `text:Email is required.`, and `text:Description is required.`. Run `$L shot bug-03-validation-keyboard-closed`. Those lines stay after the fields are filled, until Submit leaves the form.
- **Consent.** Run `$L tap 'desc:Bug report name'`, `$L type 'Recipe Check'`, `$L key BACK`, then the same for `desc:Bug report email` (`recipe-check@example.com`) and `desc:Bug report description`. Close the keyboard before each next tap, because the keyboard hides the lower fields. Run `$L tap 'desc:Submit bug report'`. The sheet shows `text:Share device info?` and `id:bug-report-consent-actions`, with `desc:Decline consent and close` and `desc:Accept and send bug report` (visible `text:Accept & send`). The warning says nothing is collected until you accept. Run `$L shot bug-06-consent`.
- **not run: would create a real report in email (`mailto:louisianafrenchsupport@gmail.com`).** `desc:Accept and send bug report` calls `openBugReportEmail`, which opens that mailto (`app.json` `extra.bugReportEmail`). That is a real inbox, not a local stub. Do not tap it. Run `$L tap 'desc:Decline consent and close'` instead. Home returns and no report is sent. One Language is enough: the chosen Language is only stamped into the unsent device block.
- **Dismiss.** Run `$L key BACK` or `$L tap id:about-menu-backdrop`. Home returns.
- **Proof.** Run `$L shot about-menu` with the menu open. The `main` check is that `id:about-menu-account` is not in `$L dump`.

## Gotchas

- On Identity branches, `id:about-menu-account` is the first row and opens sign-in. Signing up or signing in uses the real Supabase project in `.env.local`, so use a throwaway email.
- The backdrop covers the whole screen. While the menu is open, a tap anywhere else closes it instead of reaching Home.
- Submit on the form only opens consent. The mailto is the Accept & send step, which this recipe does not tap.
