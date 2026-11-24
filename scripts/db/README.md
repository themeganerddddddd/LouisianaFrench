# Database migrations

`scripts/db/migrate.mjs` applies the SQL in `supabase/migrations` and checks the username objects afterwards. It does not start a local stack, and it does not need `supabase/config.toml`.

Dev is project `isezzedrbdomyhfuqjak`. Prod is project `ykfbvrkqzzyyeheblhye`. Those refs come from `scripts/release/config.js` (`preview` and `production`). The script refuses a URL whose username ref does not match `--env`.

## Setup

You need Node, `psql`, and a network path the first time `npx` downloads the pinned Supabase CLI (`3.3.0`).

Copy the **Session pooler** URI from the Supabase dashboard: Connect, or Project Settings → Database → Connection string → Session pooler. It looks like this:

`postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

The username is `postgres.<project-ref>` and the port is `5432`. Put the URI in the environment, or in a gitignored file at the repo root:

```
SUPABASE_DB_URL_DEV=postgresql://postgres.isezzedrbdomyhfuqjak:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
SUPABASE_DB_URL_PROD=postgresql://postgres.ykfbvrkqzzyyeheblhye:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

The file is `.env.db.local`. A value already set in the environment wins. Quote the value if the password contains spaces or `#`.

The transaction pooler is the same host on port `6543`. This script refuses `6543` and tells you to use `5432` on that same host. The direct connection (`db.<project-ref>.supabase.co`, username `postgres`) is also refused, because the username has no project ref.

## Commands

```
node scripts/db/migrate.mjs status --env dev
node scripts/db/migrate.mjs plan --env dev
node scripts/db/migrate.mjs apply --env dev
node scripts/db/migrate.mjs verify --env dev
```

`status` reads `supabase_migrations.schema_migrations` and compares it with the files. `plan` is a dry run: the same check, then `supabase db push --dry-run`. `apply` runs that dry run, then the real push (which records each file version), then `verify`. `verify` runs `scripts/db/verify.sql` only.

Prod also needs the prod ref on the command line. Anything else stops the script before it connects:

```
node scripts/db/migrate.mjs apply --env prod --confirm ykfbvrkqzzyyeheblhye
```

The CLI pin is `npx supabase@3.3.0`. Version 3 replaced `--db-url` with `--remote=<url>` (the old flag still works in 3.3.0 and is removed in v4). The push is `db push --yes --skip-vault --remote=<url>`. `--skip-vault` keeps vault secrets out of the push. `--include-all` is never passed, so an out-of-order file cannot be forced through.

Passwords and database URLs are removed from this script's output, including child-process stderr. The URI is still in the process list while `psql` or the CLI runs.

## History check

The script stops, and does not call `db push`, when:

- the remote history has a version that is not in `supabase/migrations`
- the same migration name is stored under a different version
- a file that is not on the remote has a version older than one that is

For the name mismatch it prints this statement and does not run it:

```sql
update supabase_migrations.schema_migrations set version='<file version>' where version='<stamped>' and name='<name>';
```

Run that yourself only after you have checked the row. It must change one row.

## Password reset

Reset the database password in the dashboard: Project Settings → Database → Database password. Then replace the password in `.env.db.local`. Do this if the URI was pasted into a chat, a ticket, or a shell history you share. The old password stops working as soon as you reset it.

## MCP fallback

Use this when the script cannot run and the Supabase connector is available. Do not run `tests/db` or pgTAP against a hosted database.

1. Read the migration file. Call `apply_migration` with that file's SQL, unchanged, and the name from the filename (the part after the version and the underscore, without `.sql`).
2. Note the version the connector stamped. It may not match the filename. Run the update below and check that it changed exactly one row. If the count is not 1, stop.

```sql
update supabase_migrations.schema_migrations set version='<file version>' where version='<stamped>' and name='<name>';
```

3. Call `list_migrations` and confirm that version and name.
4. Run `scripts/db/verify.sql` through `execute_sql`. The file sets the session read-only, then checks `check_username` and `set_username` (no execute for `anon`, execute for `authenticated`, security definer, empty `search_path`), row level security on `profiles`, and lists the policies. If the connector rejects `SET`, skip that first line and run the rest. If it accepts one statement at a time, run the `do` block first, then the policy `select`.

Dev's project id is `isezzedrbdomyhfuqjak`. Prod's is `ykfbvrkqzzyyeheblhye`.

## Local check

Unit tests do not open a database. To run `verify.sql` against local Postgres after the migrations, with podman available:

```
LF_DB_LOCAL=1 npx jest --watchAll=false scripts/db/__tests__/migrate.test.js
```

That test is skipped in CI. It uses its own container name, `lf-migrate-verify`.
