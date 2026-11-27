# C5a Dev check: `?type=recovery` survives the Supabase link

Status: PENDING. Not run, nothing here is faked.

Why pending:

- No Dev service-role key is available to the agent. The local gitignored env files (`.env.preview`, `.env.local`, `.env.db.local`) hold only the anon key and a DB URL, and the Supabase CLI is not installed.
- Logan's action is also open: add `com.westleysturhan.louisianafrench://auth/callback` (and the Expo Go `exp://` callback on Dev) to Supabase Redirect URLs. Without it Supabase falls back to the Site URL and the check would be meaningless.

## Command to run (Dev project only, never Prod)

Keep the Dev service-role key in a shell variable for this one command. Do not commit or print it.

```sh
curl -s -X POST "$DEV_SUPABASE_URL/auth/v1/admin/generate_link" \
  -H "apikey: $DEV_SERVICE_ROLE_KEY" -H "Authorization: Bearer $DEV_SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"type":"recovery","email":"<dev test user>","redirect_to":"com.westleysturhan.louisianafrench://auth/callback?type=recovery"}'
```

This is the REST form of `auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })`. Request `properties.action_link` without following redirects (`curl -sI`) and read its `Location`.

## Record here after running

- `redirect_to` (token and email redacted): expected `com.westleysturhan.louisianafrench://auth/callback?type=recovery&code=<redacted>`
- `parseAuthUrl(<that URL>)`: expected `{ kind: 'recovery', code: <redacted> }`
- If `?type=recovery` is dropped or the link lands on the Site URL, allow-list `com.westleysturhan.louisianafrench://auth/callback**` instead.

Unit coverage already in the repo: `parseAuthUrl` returns `recovery` for `...?code=x&type=recovery` and for the fragment form (`src/account/__tests__/authLink.test.ts`).
