# C5a Dev check: `?type=recovery` survives the Supabase link

Status: RUN on Nov 27, 2026, against the Dev project (`isezzedrbdomyhfuqjak`), never Prod. The service-role key came from a local gitignored env file and was not printed or committed.

## What was run

- User: an existing confirmed Dev test alias (email redacted). No user was created and no email was sent.
- `POST /auth/v1/admin/generate_link` with `type: recovery` and `redirect_to: com.westleysturhan.louisianafrench://auth/callback?type=recovery`. This is the REST form of `auth.admin.generateLink`.
- `GET` on `properties.action_link` without following redirects, then reading `Location`.
- `parseAuthUrl` from this branch, run on that `Location`.

## Result (tokens and email redacted)

- `properties.redirect_to`: `com.westleysturhan.louisianafrench://auth/callback?type=recovery`
- Verify response: `303`, with this `Location`:
  `com.westleysturhan.louisianafrench://auth/callback?type=recovery#access_token=<redacted>&expires_at=…&expires_in=3600&refresh_token=<redacted>&sb=&token_type=bearer&type=recovery`
- `parseAuthUrl(<that Location>)`: `{ kind: 'ignored' }`

## What this proves

- The Redirect URLs allow-list on Dev accepts the native callback. Supabase redirected to the app scheme, not to the Site URL.
- `?type=recovery` is kept in the query of the final redirect.

## What it does not prove, and why

- An admin-generated link uses the implicit flow, so the session arrives as tokens in the `#` fragment with no `code`. `parseAuthUrl` needs a `code` and correctly ignores this form.
- The app uses PKCE (`flowType: 'pkce'` in `src/identity/connector.js`), so the email that `sendReset` sends redirects to the same URL with `code=<…>` added. `parseAuthUrl` returns `recovery` for that exact shape (`…?type=recovery&code=pkce`), and `ignored` for the token-only form above. Both are pinned in `src/account/__tests__/authLink.test.ts`.
- To see the PKCE `code` form end to end on Dev, a real `resetPasswordForEmail` to a test inbox is needed (BIO-10). That is out of scope for C5a.
