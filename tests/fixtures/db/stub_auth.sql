-- Test-only replacement for auth.uid().
-- The Supabase Postgres image already has auth.users, the roles anon,
-- authenticated and service_role, and Supabase's default grants. Its
-- auth.uid() reads only request.jwt.claim.sub. This replaces that function
-- so a test can set request.jwt.claims, which current Supabase also reads.
-- Not a migration. Keep it out of supabase/tests/.

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
