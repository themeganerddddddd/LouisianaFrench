begin;

select plan(81);

select is(public.username_key('Élise'), 'elise', 'Élise folds to elise');
select is(public.username_key('Élise'), public.username_key('elise'), 'Élise and elise share a key');
select is(public.username_key('T_Boy'), 't_boy', 'T_Boy folds to t_boy');
select is(public.username_key('Ç'), 'c', 'Ç folds to c');
select is(public.username_key('ÿ'), 'y', 'ÿ folds to y');
select is(public.username_key('Ÿ'), 'y', 'Ÿ folds to y');

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
select is(public.username_is_valid('_abc'), false, 'leading underscore');
select is(public.username_is_valid('ábc'), false, 'á');
select is(public.username_is_valid('ñab'), false, 'ñ');
select is(public.username_is_valid(U&'\0435lise'), false, 'Cyrillic lookalike');
select ok(
  char_length(repeat(U&'e\0301', 20)) > 20
    and public.username_is_valid(repeat(U&'e\0301', 20)),
  'a 20-letter name in decomposed form is accepted'
);
select is(public.username_is_blocked(public.username_key('Admin')), true, 'Admin folds to a reserved key');
select is(public.username_is_blocked(public.username_key('T_Boy')), true, 'T_Boy folds to a reserved key');

select hasnt_function(
  'public',
  'migrate_profile_usernames',
  'the backfill is not left behind as a function'
);

insert into auth.users (id, created_at) values
  ('10000000-0000-0000-0000-0000000000b1', '2024-01-01T00:00:00Z');

select ok(
  exists (
    select 1 from public.profiles
    where id = '10000000-0000-0000-0000-0000000000b1'
      and username is null
      and username_key is null
  ),
  'inserting an auth user creates an empty profile'
);

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
select is(
  (select username_set_at from public.profiles where id = '10000000-0000-0000-0000-0000000000a1'),
  (select created_at from auth.users where id = '10000000-0000-0000-0000-0000000000a1'),
  'a kept name records username_set_at as the account created_at'
);
select ok(
  (select username_changed_at is null from public.profiles where id = '10000000-0000-0000-0000-0000000000a1'),
  'a kept name leaves username_changed_at null'
);
select ok(
  (select username_set_at is null from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'a dropped name leaves username_set_at null'
);

insert into auth.users (id, created_at) values
  ('30000000-0000-0000-0000-0000000000d1', '2022-01-01T00:00:00Z'),
  ('30000000-0000-0000-0000-0000000000c1', '2022-01-02T00:00:00Z'),
  ('30000000-0000-0000-0000-0000000000c2', '2022-01-03T00:00:00Z'),
  ('30000000-0000-0000-0000-00000000000a', '2022-01-04T00:00:00Z'),
  ('30000000-0000-0000-0000-00000000000b', '2022-01-05T00:00:00Z'),
  ('30000000-0000-0000-0000-0000000000e1', '2022-01-06T00:00:00Z'),
  ('30000000-0000-0000-0000-0000000000e2', '2022-01-07T00:00:00Z'),
  ('30000000-0000-0000-0000-0000000000f1', '2022-01-08T00:00:00Z'),
  ('50000000-0000-0000-0000-000000000001', '2022-01-09T00:00:00Z'),
  ('50000000-0000-0000-0000-000000000002', '2022-01-10T00:00:00Z');

select throws_ok(
  $$ update public.profiles set username = 'ab' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects a short name'
);
select throws_ok(
  $$ update public.profiles set username = repeat('a', 21) where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects a name that is too long'
);
select throws_ok(
  $$ update public.profiles set username = 'ab-c' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects a hyphen'
);
select throws_ok(
  $$ update public.profiles set username = 'ab c' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects a space'
);
select throws_ok(
  $$ update public.profiles set username = U&'ab\+01F600' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects an emoji'
);
select throws_ok(
  $$ update public.profiles set username = '' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects an empty name'
);
select throws_ok(
  $$ update public.profiles set username = 'æbc' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects æ'
);
select throws_ok(
  $$ update public.profiles set username = 'œab' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects œ'
);
select throws_ok(
  $$ update public.profiles set username = '1logan' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects a leading digit'
);
select throws_ok(
  $$ update public.profiles set username = '_abc' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects a leading underscore'
);
select throws_ok(
  $$ update public.profiles set username = 'ábc' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects á'
);
select throws_ok(
  $$ update public.profiles set username = 'ñab' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects ñ'
);
select throws_ok(
  $$ update public.profiles set username = U&'\0435lise' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_valid"',
  'check rejects a Cyrillic lookalike'
);
select throws_ok(
  $$ update public.profiles set username = 'Admin' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_not_blocked"',
  'check rejects Admin'
);
select throws_ok(
  $$ update public.profiles set username = 'T_Boy' where id = '30000000-0000-0000-0000-0000000000d1' $$,
  '23514',
  'new row for relation "profiles" violates check constraint "profiles_username_not_blocked"',
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
  'duplicate key value violates unique constraint "profiles_username_key_unique"',
  'unique index rejects the folded collision'
);

select throws_ok(
  $$ update public.profiles set username = U&'E\0301lise' where id = '30000000-0000-0000-0000-0000000000e2' $$,
  '23505',
  'duplicate key value violates unique constraint "profiles_username_key_unique"',
  'decomposed Élise collides with an existing elise'
);

update public.profiles
set username = null
where id = '10000000-0000-0000-0000-000000000099';

update public.profiles
set username = U&'E\0301lise'
where id = '30000000-0000-0000-0000-0000000000e1';

select is(
  (select username from public.profiles where id = '30000000-0000-0000-0000-0000000000e1'),
  'Élise',
  'decomposed E\0301lise is stored as Élise'
);
select is(
  (select username_key from public.profiles where id = '30000000-0000-0000-0000-0000000000e1'),
  'elise',
  'decomposed E\0301lise folds to elise'
);

update public.profiles
set username = repeat(U&'e\0301', 20)
where id = '30000000-0000-0000-0000-0000000000f1';

select is(
  (select username from public.profiles where id = '30000000-0000-0000-0000-0000000000f1'),
  repeat('é', 20),
  'a decomposed 20-letter name is stored in NFC'
);

update public.profiles
set username = 'Cascade_1'
where id = '50000000-0000-0000-0000-000000000001';

delete from auth.users
where id = '50000000-0000-0000-0000-000000000001';

select is_empty(
  $$ select 1 from public.profiles where id = '50000000-0000-0000-0000-000000000001' $$,
  'deleting the auth user deletes the profile'
);

update public.profiles
set username = 'Cascade_1'
where id = '50000000-0000-0000-0000-000000000002';

select is(
  (select username_key from public.profiles where id = '50000000-0000-0000-0000-000000000002'),
  'cascade_1',
  'another user can take the freed key'
);

select ok(
  not has_table_privilege(r.role, 'public.profiles', p.priv),
  r.role || ' cannot ' || p.priv || ' public.profiles'
)
from (values ('anon'), ('authenticated')) as r(role)
cross join (
  values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
) as p(priv);

select is(
  (
    select setting
    from pg_proc, unnest(proconfig) as setting
    where pronamespace = 'public'::regnamespace
      and proname = 'profiles_for_new_user'
  ),
  'search_path=""',
  'profiles_for_new_user sets an empty search_path'
);

set local role authenticated;
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
  'permission denied for table profiles',
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
  'permission denied for table profiles',
  'owner cannot update username'
);
select throws_ok(
  $$ update public.profiles set username_set_at = now() where id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501',
  'permission denied for table profiles',
  'owner cannot update username_set_at'
);
select throws_ok(
  $$ select username_key from public.profiles $$,
  '42501',
  'permission denied for table profiles',
  'owner cannot read username_key'
);

reset role;
select * from finish(true);
rollback;
