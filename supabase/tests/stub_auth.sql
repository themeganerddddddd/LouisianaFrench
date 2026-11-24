-- Test-only auth stand-in. Not applied as a migration.
-- Supabase Postgres 17.12 already has auth.users, the three roles, and
-- default grants. Its auth.uid() reads only request.jwt.claim.sub, so this
-- replaces that function with the current Supabase expression when the
-- connected role is allowed to. On a plain Postgres image it creates the
-- missing schema, table, roles, and grants.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  created_at timestamptz,
  raw_user_meta_data jsonb
);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

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

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
