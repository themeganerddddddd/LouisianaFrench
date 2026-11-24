begin;

select plan(54);

insert into auth.users (id, created_at) values
  ('70000000-0000-0000-0000-000000000001', '2024-03-01T00:00:00Z'),
  ('70000000-0000-0000-0000-000000000002', '2024-03-02T00:00:00Z'),
  ('70000000-0000-0000-0000-000000000003', '2024-03-03T00:00:00Z'),
  ('70000000-0000-0000-0000-000000000004', '2024-03-04T00:00:00Z'),
  ('70000000-0000-0000-0000-000000000005', '2024-03-05T00:00:00Z'),
  ('70000000-0000-0000-0000-000000000006', '2024-03-06T00:00:00Z'),
  ('70000000-0000-0000-0000-000000000007', '2024-03-07T00:00:00Z'),
  ('70000000-0000-0000-0000-000000000008', '2024-03-08T00:00:00Z');

select ok(
  has_function_privilege('authenticated', 'public.set_username(text)', 'execute'),
  'authenticated can execute set_username'
);
select ok(
  not has_function_privilege('anon', 'public.set_username(text)', 'execute'),
  'anon cannot execute set_username'
);
select ok(
  not has_function_privilege('service_role', 'public.set_username(text)', 'execute'),
  'service_role cannot execute set_username'
);
select ok(
  has_function_privilege('authenticated', 'public.check_username(text)', 'execute'),
  'authenticated can execute check_username'
);
select ok(
  not has_function_privilege('anon', 'public.check_username(text)', 'execute'),
  'anon cannot execute check_username'
);
select ok(
  not has_function_privilege('public', 'public.set_username(text)', 'execute'),
  'public cannot execute set_username'
);
select ok(
  not has_function_privilege('public', 'public.check_username(text)', 'execute'),
  'public cannot execute check_username'
);
select ok(
  (select prosecdef from pg_proc
   where pronamespace = 'public'::regnamespace and proname = 'set_username'),
  'set_username is security definer'
);
select ok(
  (select prosecdef from pg_proc
   where pronamespace = 'public'::regnamespace and proname = 'check_username'),
  'check_username is security definer'
);
select is(
  (
    select setting
    from pg_proc, unnest(proconfig) as setting
    where pronamespace = 'public'::regnamespace
      and proname = 'set_username'
  ),
  'search_path=""',
  'set_username sets an empty search_path'
);
select is(
  (
    select setting
    from pg_proc, unnest(proconfig) as setting
    where pronamespace = 'public'::regnamespace
      and proname = 'check_username'
  ),
  'search_path=""',
  'check_username sets an empty search_path'
);

set local role anon;
select throws_ok(
  $$ select public.set_username('Céline') $$,
  '42501',
  'permission denied for function set_username',
  'anon cannot call set_username'
);
reset role;

select is(
  public.set_username('Céline') ->> 'reason',
  'invalid',
  'a call with no user writes nothing'
);
select ok(
  (select username is null and username_set_at is null and username_changed_at is null
   from public.profiles where id = '70000000-0000-0000-0000-000000000001'),
  'the unauthenticated call left the profile empty'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);

select is((public.set_username(null) ->> 'ok')::boolean, true, 'skip returns ok');
reset role;
select ok(
  (select username is null and username_set_at is null and username_changed_at is null
   from public.profiles where id = '70000000-0000-0000-0000-000000000001'),
  'skip sets no timestamps'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);

select is(public.set_username('ab') ->> 'reason', 'invalid', 'too short is invalid');
select is(public.set_username(repeat('a', 21)) ->> 'reason', 'invalid', 'too long after NFC is invalid');
select is(public.set_username('ab-c') ->> 'reason', 'invalid', 'hyphen is invalid');
select is(public.set_username('ab c') ->> 'reason', 'invalid', 'space is invalid');
select is(public.set_username(U&'ab\+01F600') ->> 'reason', 'invalid', 'emoji is invalid');
select is(public.set_username('') ->> 'reason', 'invalid', 'empty is invalid');
select is(public.set_username('æbc') ->> 'reason', 'invalid', 'æ is invalid');
select is(public.set_username('œab') ->> 'reason', 'invalid', 'œ is invalid');
select is(public.set_username('1logan') ->> 'reason', 'invalid', 'a leading digit is invalid');
select is(public.set_username(U&'\0435lise') ->> 'reason', 'invalid', 'a Cyrillic lookalike is invalid');
select is(public.set_username('Admin') ->> 'reason', 'reserved', 'Admin is reserved');
select is(public.set_username('T_Boy') ->> 'reason', 'reserved', 'T_Boy is reserved');
select is(public.check_username('Admin') ->> 'status', 'reserved', 'check_username returns reserved');
select is(public.check_username('ab') ->> 'status', 'invalid', 'check_username returns invalid');

select is(public.set_username('Céline') ->> 'username', 'Céline', 'Céline is stored as typed');
reset role;
select is(
  (select username_key from public.profiles where id = '70000000-0000-0000-0000-000000000001'),
  'celine',
  'set_username stores the folded key'
);
select ok(
  (select username_set_at is not null and username_changed_at is null
   from public.profiles where id = '70000000-0000-0000-0000-000000000001'),
  'the first set starts the window and is not a change'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);

select is(
  (public.set_username('Céline') ->> 'ok')::boolean,
  true,
  'the identical display is ok'
);
reset role;
select ok(
  (select username_changed_at is null
   from public.profiles where id = '70000000-0000-0000-0000-000000000001'),
  'the identical display does not consume a change'
);
set local role authenticated;

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
select is(public.check_username('celine') ->> 'status', 'taken', 'check_username folds Céline to celine');
select is(public.set_username('celine') ->> 'reason', 'taken', 'the folded collision is taken');

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select is(public.check_username('celine') ->> 'status', 'current', 'the caller''s own fold is current');

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);
select is(public.set_username('Window_A') ->> 'username', 'Window_A', 'the window starts with Window_A');
select is(public.set_username('Window_B') ->> 'username', 'Window_B', 'a different name inside 24h is ok');
reset role;
select ok(
  (select username = 'Window_B' and username_changed_at is null
   from public.profiles where id = '70000000-0000-0000-0000-000000000003'),
  'a change inside the typo window does not set username_changed_at'
);

reset role;
update public.profiles
set username_set_at = now() - interval '25 hours'
where id = '70000000-0000-0000-0000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000004', true);
select is(public.set_username('Limit_A') ->> 'username', 'Limit_A', 'Limit_A is the first set');
reset role;
update public.profiles
set username_set_at = now() - interval '25 hours'
where id = '70000000-0000-0000-0000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000004', true);
select is(public.set_username('Limit_B') ->> 'username', 'Limit_B', 'one change is allowed after the window');
reset role;
select ok(
  (select username_changed_at is not null
   from public.profiles where id = '70000000-0000-0000-0000-000000000004'),
  'the counted change sets username_changed_at'
);
select is(
  (public.set_username('Limit_C') ->> 'retryAt')::timestamptz,
  (select username_changed_at + interval '30 days'
   from public.profiles where id = '70000000-0000-0000-0000-000000000004'),
  'too_soon retryAt is username_changed_at plus 30 days'
);
select is(
  (select username from public.profiles where id = '70000000-0000-0000-0000-000000000004'),
  'Limit_B',
  'too_soon does not replace the username'
);

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000005', true);
select is(public.set_username('Renée') ->> 'username', 'Renée', 'Renée is stored as typed');
reset role;
update public.profiles
set username_set_at = now() - interval '25 hours'
where id = '70000000-0000-0000-0000-000000000005';
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000005', true);
select is(public.set_username('renée') ->> 'username', 'renée', 'a same-key re-case is not taken');
reset role;
select ok(
  (select username = 'renée' and username_changed_at is not null
   from public.profiles where id = '70000000-0000-0000-0000-000000000005'),
  'a same-key re-case counts as a change'
);
set local role authenticated;

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000006', true);
select is(public.check_username('Fresh_1') ->> 'status', 'available', 'Fresh_1 is available');
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000007', true);
select is(public.set_username('Fresh_1') ->> 'username', 'Fresh_1', 'another user claims Fresh_1');
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000006', true);
select is(public.set_username('fresh_1') ->> 'reason', 'taken', 'set_username returns taken after the claim');

reset role;
-- The harness switches loopback to scram-sha-256. Trust auth would ignore
-- the password, and non-superuser dblink then refuses the connection.
create extension if not exists dblink;
select dblink_connect('a', 'host=127.0.0.1 dbname=postgres user=postgres password=postgres');
select dblink_connect('b', 'host=127.0.0.1 dbname=postgres user=postgres password=postgres');
select dblink_exec('a', $$
  insert into auth.users (id, created_at) values
    ('60000000-0000-0000-0000-00000000000a', now()),
    ('60000000-0000-0000-0000-00000000000b', now())
$$);
select dblink_exec('a', 'begin');
select is(
  (select result ->> 'username' from dblink('a', $$
    select public.set_username('Race_1')
    from (select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-00000000000a', true)) as cfg
  $$) as t(result jsonb)),
  'Race_1',
  'the first concurrent claim is ok'
);
select dblink_send_query('b', $$
  select public.set_username('race_1')
  from (select set_config('request.jwt.claim.sub', '60000000-0000-0000-0000-00000000000b', false)) as cfg
$$);
select pg_sleep(0.4);
select dblink_exec('a', 'commit');
select is(
  (select result ->> 'reason' from dblink_get_result('b') as t(result jsonb)),
  'taken',
  'the second concurrent claim is taken'
);
select dblink_exec('a', $$
  delete from auth.users
  where id in (
    '60000000-0000-0000-0000-00000000000a',
    '60000000-0000-0000-0000-00000000000b'
  )
$$);
select dblink_disconnect('a');
select dblink_disconnect('b');

select * from finish(true);
rollback;
