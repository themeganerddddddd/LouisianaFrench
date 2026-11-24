-- set_username is the only write path. check_username is read-only.
-- Both use username_key, so the check and the save share one fold.

create function public.check_username(candidate text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text;
  key text;
  own text;
begin
  if uid is null or candidate is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  name := pg_catalog.normalize(candidate, 'NFC');
  if not public.username_is_valid(name) then
    return jsonb_build_object('status', 'invalid');
  end if;
  key := public.username_key(name);
  if public.username_is_blocked(key) then
    return jsonb_build_object('status', 'reserved');
  end if;
  select p.username_key into own from public.profiles as p where p.id = uid;
  if own is not null and own = key then
    return jsonb_build_object('status', 'current');
  end if;
  if exists (select 1 from public.profiles as p where p.username_key = key) then
    return jsonb_build_object('status', 'taken');
  end if;
  return jsonb_build_object('status', 'available');
end;
$$;

create function public.set_username(proposed text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text;
  key text;
  current_name text;
  set_at timestamptz;
  changed_at timestamptz;
  in_window boolean;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  -- Skip: not a set, and it starts no window.
  if proposed is null then
    return jsonb_build_object(
      'ok', true,
      'username', (select p.username from public.profiles as p where p.id = uid)
    );
  end if;

  name := pg_catalog.normalize(proposed, 'NFC');
  if not public.username_is_valid(name) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  key := public.username_key(name);
  if public.username_is_blocked(key) then
    return jsonb_build_object('ok', false, 'reason', 'reserved');
  end if;

  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select p.username, p.username_set_at, p.username_changed_at
    into current_name, set_at, changed_at
  from public.profiles as p
  where p.id = uid
  for update;

  if current_name is not distinct from name then
    return jsonb_build_object('ok', true, 'username', name);
  end if;

  if exists (
    select 1 from public.profiles as p
    where p.username_key = key and p.id <> uid
  ) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  in_window := set_at is not null and pg_catalog.now() < set_at + interval '24 hours';
  if current_name is not null and not in_window then
    if changed_at is not null and pg_catalog.now() < changed_at + interval '30 days' then
      return jsonb_build_object(
        'ok', false,
        'reason', 'too_soon',
        'retryAt', changed_at + interval '30 days'
      );
    end if;
  end if;

  if current_name is null then
    update public.profiles
    set username = name, username_set_at = pg_catalog.now(), username_changed_at = null
    where id = uid;
  elsif in_window then
    update public.profiles set username = name where id = uid;
  else
    update public.profiles
    set username = name, username_changed_at = pg_catalog.now()
    where id = uid;
  end if;

  return jsonb_build_object('ok', true, 'username', name);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'taken');
end;
$$;

revoke all on function public.check_username(text) from public, anon, authenticated, service_role;
revoke all on function public.set_username(text) from public, anon, authenticated, service_role;
grant execute on function public.check_username(text) to authenticated;
grant execute on function public.set_username(text) to authenticated;
