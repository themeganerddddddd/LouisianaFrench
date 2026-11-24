begin;

select plan(53);

savepoint uid_cases;
select set_config('request.jwt.claim.sub', '', true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '40000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text,
  true
);
select is(
  auth.uid(),
  '40000000-0000-0000-0000-000000000001'::uuid,
  'uid reads request.jwt.claims when claim.sub is empty'
);
rollback to savepoint uid_cases;

select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
select is(
  auth.uid(),
  '40000000-0000-0000-0000-000000000002'::uuid,
  'uid reads request.jwt.claim.sub'
);
rollback to savepoint uid_cases;

select is(public.username_key('Élise'), 'elise', 'Élise folds to elise');
select is(public.username_key('Élise'), public.username_key('elise'), 'Élise and elise share a key');
select is(public.username_key('T_Boy'), 't_boy', 'T_Boy folds to t_boy');
select is(public.username_is_valid('Élise_1'), true, 'Élise_1 is valid');
select is(public.username_is_valid('abc'), true, 'three letters are valid');
select is(public.username_is_valid(repeat('a', 20)), true, '20 characters are valid');
select is(public.username_is_valid('ab'), false, 'too short');
select is(public.username_is_valid(repeat('a', 21)), false, 'too long after NFC');
select is(public.username_is_valid('ab-c'), false, 'hyphen');
select is(public.username_is_valid('ab c'), false, 'space');
select is(public.username_is_valid(U&'ab\+01F600'), false, 'emoji');
select is(public.username_is_valid(''), false, 'empty');
select is(public.username_is_valid('æbc'), false, 'æ');
select is(public.username_is_valid('œab'), false, 'œ');
select is(public.username_is_valid('1logan'), false, 'leading digit');
select is(public.username_is_valid(U&'\0435lise'), false, 'Cyrillic lookalike');
select is(public.username_is_blocked(public.username_key('Admin')), true, 'Admin folds to a reserved key');
select is(public.username_is_blocked(public.username_key('T_Boy')), true, 'T_Boy folds to a reserved key');

insert into auth.users (id, created_at, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000099', '2019-01-01', '{"display_name":"Élise"}'),
  ('10000000-0000-0000-0000-000000000001', '2020-01-01', '{"display_name":"elise"}'),
  ('20000000-0000-0000-0000-000000000001', '2021-01-01', '{"display_name":"Logan"}'),
  ('20000000-0000-0000-0000-000000000002', '2021-01-01', '{"display_name":"logan"}'),
  ('10000000-0000-0000-0000-0000000000a1', '2020-02-01', '{"display_name":"Élise_1"}'),
  ('10000000-0000-0000-0000-0000000000a2', '2020-02-01', '{"display_name":"ab"}'),
  ('10000000-0000-0000-0000-0000000000a3', '2020-02-01', '{"display_name":"1logan"}'),
  ('10000000-0000-0000-0000-0000000000a4', '2020-02-01', '{"full_name":"Élise_2"}');

select ok(
  exists (
    select 1 from public.profiles
    where id = '10000000-0000-0000-0000-0000000000a2'
      and username is null
      and username_key is null
  ),
  'inserting an auth user creates an empty profile'
);

select public.migrate_profile_usernames();

select is(
  (select username from public.profiles where id = '10000000-0000-0000-0000-000000000099'),
  'Élise',
  'earliest account keeps the display name'
);
select ok(
  (select username is null from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'later folded collision becomes null'
);
select is(
  (select username from public.profiles where id = '20000000-0000-0000-0000-000000000001'),
  'Logan',
  'smaller id wins when created_at ties'
);
select ok(
  (select username is null from public.profiles where id = '20000000-0000-0000-0000-000000000002'),
  'larger id loses a created_at tie'
);
select is(
  (select username from public.profiles where id = '10000000-0000-0000-0000-0000000000a1'),
  'Élise_1',
  'valid display name is kept as typed'
);
select ok(
  (select username is null from public.profiles where id = '10000000-0000-0000-0000-0000000000a2'),
  'too-short display name becomes null'
);
select ok(
  (select username is null from public.profiles where id = '10000000-0000-0000-0000-0000000000a3'),
  'invalid display name becomes null'
);
select ok(
  (select username is null from public.profiles where id = '10000000-0000-0000-0000-0000000000a4'),
  'full_name is not copied'
);
select ok(
  (select username_set_at is not null and username_changed_at is null
   from public.profiles where id = '10000000-0000-0000-0000-0000000000a1'),
  'kept name sets username_set_at and leaves username_changed_at null'
);
select ok(
  (select username_set_at is null from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'dropped name leaves username_set_at null'
);

insert into auth.users (id, created_at) values
  ('30000000-0000-0000-0000-0000000000d1', '2022-01-01'),
  ('30000000-0000-0000-0000-0000000000c1', '2022-01-02'),
  ('30000000-0000-0000-0000-0000000000c2', '2022-01-03'),
  ('30000000-0000-0000-0000-00000000000a', '2022-01-04'),
  ('30000000-0000-0000-0000-00000000000b', '2022-01-05');

select throws_ok(
  $$ update public.profiles set username = 'ab' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects a short name'
);
select throws_ok(
  $$ update public.profiles set username = repeat('a', 21) where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects a name that is too long'
);
select throws_ok(
  $$ update public.profiles set username = 'ab-c' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects a hyphen'
);
select throws_ok(
  $$ update public.profiles set username = 'ab c' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects a space'
);
select throws_ok(
  $$ update public.profiles set username = U&'ab\+01F600' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects an emoji'
);
select throws_ok(
  $$ update public.profiles set username = '' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects an empty name'
);
select throws_ok(
  $$ update public.profiles set username = 'æbc' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects æ'
);
select throws_ok(
  $$ update public.profiles set username = 'œab' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects œ'
);
select throws_ok(
  $$ update public.profiles set username = '1logan' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects a leading digit'
);
select throws_ok(
  $$ update public.profiles set username = U&'\0435lise' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects a Cyrillic lookalike'
);
select throws_ok(
  $$ update public.profiles set username = 'Admin' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects Admin'
);
select throws_ok(
  $$ update public.profiles set username = 'T_Boy' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  NULL,
  'check rejects T_Boy'
);

update public.profiles
set username = 'Zoé_9'
where id = '30000000-0000-0000-0000-00000000000a';

select is(
  (select username from public.profiles where id = '30000000-0000-0000-0000-00000000000a'),
  'Zoé_9',
  'Zoé_9 is stored as typed'
);
select is(
  (select username_key from public.profiles where id = '30000000-0000-0000-0000-00000000000a'),
  'zoe_9',
  'stored key is the fold'
);

update public.profiles
set username = 'Renée'
where id = '30000000-0000-0000-0000-0000000000c1';

select throws_ok(
  $$ update public.profiles set username = 'renee' where id = '30000000-0000-0000-0000-0000000000c2' $$,
  '23505',
  NULL,
  'unique index rejects the folded collision'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '30000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text,
  true
);
select is(
  auth.uid(),
  '30000000-0000-0000-0000-00000000000b'::uuid,
  'authenticated uid reads jwt.claims alone'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-00000000000b', true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '30000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text,
  true
);
select is_empty(
  $$ select id, username from public.profiles where id = '30000000-0000-0000-0000-00000000000a' $$,
  'user B cannot read user A'
);
select throws_ok(
  $$ update public.profiles set username = 'Stolen' where id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501',
  NULL,
  'user B cannot update user A'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-00000000000a', true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '30000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text,
  true
);
select results_eq(
  $$ select id, username from public.profiles order by id $$,
  $$ values ('30000000-0000-0000-0000-00000000000a'::uuid, 'Zoé_9'::text) $$,
  'owner reads own id and username'
);
select throws_ok(
  $$ update public.profiles set username = 'Changed' where id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501',
  NULL,
  'owner cannot update username'
);
select throws_ok(
  $$ update public.profiles set username_set_at = now() where id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501',
  NULL,
  'owner cannot update username_set_at'
);
select throws_ok(
  $$ select username_key from public.profiles $$,
  '42501',
  NULL,
  'owner cannot read username_key'
);

reset role;
select * from finish();
rollback;
