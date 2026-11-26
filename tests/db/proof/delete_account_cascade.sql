-- Local cascade proof for delete-account. Runs after supabase/migrations on the
-- same Postgres image as tests/db/run-local.sh. Rolls nothing back: the container
-- is thrown away. auth.identities is not created here.

select coalesce(to_regclass('auth.identities')::text, 'absent') as identities_table;

select max(version) as newest_auth_migration from auth.schema_migrations;

select pg_get_constraintdef(oid) as profiles_user_fk
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and contype = 'f';

insert into auth.users (id, email, created_at) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'cascade-a@example.com', now()),
  ('aaaaaaaa-0000-4000-8000-00000000000b', 'cascade-b@example.com', now());

update public.profiles
set username = 'Ada_1'
where id = 'aaaaaaaa-0000-4000-8000-00000000000a';

update public.profiles
set username = 'Bea_2'
where id = 'aaaaaaaa-0000-4000-8000-00000000000b';

select id, username, username_key
from public.profiles
where id in (
  'aaaaaaaa-0000-4000-8000-00000000000a',
  'aaaaaaaa-0000-4000-8000-00000000000b'
)
order by id;

delete from auth.users
where id = 'aaaaaaaa-0000-4000-8000-00000000000a';

select count(*) as deleted_user_profile_rows
from public.profiles
where id = 'aaaaaaaa-0000-4000-8000-00000000000a';

select id, username, username_key
from public.profiles
where id = 'aaaaaaaa-0000-4000-8000-00000000000b';

update public.profiles
set username = 'Ada_1'
where id = 'aaaaaaaa-0000-4000-8000-00000000000b';

select id, username, username_key as freed_key
from public.profiles
where id = 'aaaaaaaa-0000-4000-8000-00000000000b';

do $$
begin
  if to_regclass('auth.identities') is not null then
    raise exception 'auth.identities exists; this proof did not exercise it';
  end if;
  if exists (
    select 1 from public.profiles
    where id = 'aaaaaaaa-0000-4000-8000-00000000000a'
  ) then
    raise exception 'deleted auth user left a profile row';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = 'aaaaaaaa-0000-4000-8000-00000000000b'
      and username = 'Ada_1'
      and username_key = 'ada_1'
  ) then
    raise exception 'the other user did not keep a row or did not take the freed name';
  end if;
end
$$;
