-- Username lives on the profile. Clients cannot write this table.

do $$
begin
  if current_setting('server_encoding') is distinct from 'UTF8' then
    raise exception 'profiles username migration requires UTF8, not %', current_setting('server_encoding');
  end if;
end
$$;

create function public.username_key(value text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select lower(
    regexp_replace(
      normalize(normalize(value, NFC), NFD),
      U&'[\0300-\036F]',
      '',
      'g'
    )
  )
$$;

create function public.username_is_valid(value text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when value is null then false
    else char_length(n) between 3 and 20
      and n ~ '^[A-Za-zÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ][A-Za-zÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸàâäçéèêëîïôöùûüÿ0-9_]{2,19}$'
  end
  from (select normalize(value, NFC) as n) as normalized
$$;

-- One server list, exact match on username_key. A word added later does not recheck rows already stored.
create function public.username_is_blocked(key text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select key is not null and key = any (array[
    'admin',
    'administrator',
    'support',
    'louisianafrench',
    'louisianalanguages',
    'moderator',
    'official',
    'staff',
    'help',
    'root',
    'system',
    'tboy',
    't_boy',
    'mod',
    'owner',
    'nigger',
    'nigga',
    'negre',
    'faggot',
    'pede',
    'retard',
    'cunt',
    'slut',
    'whore',
    'bitch',
    'fuck',
    'shit',
    'porn',
    'nude',
    'sex',
    'putain',
    'salope',
    'connard'
  ]::text[])
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  username_key text,
  username_set_at timestamptz,
  username_changed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_username_valid
    check (username is null or public.username_is_valid(username)),
  constraint profiles_username_key_matches
    check (username_key is not distinct from public.username_key(username)),
  constraint profiles_username_not_blocked
    check (username_key is null or not public.username_is_blocked(username_key))
);

create unique index profiles_username_key_unique
  on public.profiles (username_key)
  where username_key is not null;

create function public.profiles_set_username_key()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if new.username is null then
    new.username_key := null;
  else
    new.username := normalize(new.username, NFC);
    new.username_key := public.username_key(new.username);
  end if;
  return new;
end;
$$;

create trigger profiles_set_username_key
  before insert or update on public.profiles
  for each row execute function public.profiles_set_username_key();

alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select (id, username) on table public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create function public.profiles_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger profiles_for_new_user
  after insert on auth.users
  for each row execute function public.profiles_for_new_user();

revoke all on function public.profiles_for_new_user() from public, anon, authenticated;
revoke all on function public.profiles_set_username_key() from public, anon, authenticated;

-- One shot. This is not a function, so the SQL editor cannot run it again and clear names.
do $$
begin
  insert into public.profiles (id)
  select u.id
  from auth.users as u
  where not exists (
    select 1 from public.profiles as p where p.id = u.id
  );

  with raw as (
    select
      u.id,
      u.created_at,
      normalize(u.raw_user_meta_data ->> 'display_name', NFC) as username
    from auth.users as u
  ),
  marked as (
    select
      r.id,
      r.created_at,
      r.username,
      public.username_key(r.username) as username_key,
      public.username_is_valid(r.username)
        and not public.username_is_blocked(public.username_key(r.username)) as ok
    from raw as r
  ),
  ranked as (
    select
      m.id,
      m.created_at,
      m.username,
      m.ok,
      row_number() over (
        partition by case when m.ok then m.username_key else null end
        order by m.created_at nulls last, m.id
      ) as n
    from marked as m
  )
  update public.profiles as p
  set
    username = case when ranked.ok and ranked.n = 1 then ranked.username else null end,
    username_set_at = case when ranked.ok and ranked.n = 1 then ranked.created_at else null end,
    username_changed_at = null
  from ranked
  where p.id = ranked.id;
end
$$;
