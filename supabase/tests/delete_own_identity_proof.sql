-- Proves delete_own_identity removes only the signed-in learner.
\set ON_ERROR_STOP on

reset role;

create table if not exists auth.users (
  id uuid primary key
);

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

insert into language_progress (user_id, language, username, xp, streak, revision) values
  ('11111111-1111-4111-8111-111111111111', 'cajun', 'Ada', 1, 0, 1),
  ('22222222-2222-4222-8222-222222222222', 'cajun', 'Bea', 2, 0, 1);

insert into completed_lesson (user_id, language, lesson_id, completed_at) values
  ('11111111-1111-4111-8111-111111111111', 'cajun', 'greet-1', '2020-01-01T00:00:00Z');

insert into card_review (
  user_id, card_id, repetitions, review_interval, ease, lapses
) values
  ('11111111-1111-4111-8111-111111111111', 'cajun:w1:mc', 1, 1, 2.5, 0);

do $$
begin
  if has_function_privilege('anon', 'public.delete_own_identity()', 'EXECUTE') then
    raise exception 'anon can delete an identity';
  end if;
  if not has_function_privilege('authenticated', 'public.delete_own_identity()', 'EXECUTE') then
    raise exception 'authenticated cannot delete their own identity';
  end if;
end
$$;

set role anon;
do $$
begin
  begin
    perform delete_own_identity();
    raise exception 'anon deleted an identity';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
set role authenticated;
select delete_own_identity();

reset role;

do $$
begin
  if exists (
    select 1 from language_progress
    where user_id = '11111111-1111-4111-8111-111111111111'
  ) or exists (
    select 1 from completed_lesson
    where user_id = '11111111-1111-4111-8111-111111111111'
  ) or exists (
    select 1 from card_review
    where user_id = '11111111-1111-4111-8111-111111111111'
  ) or exists (
    select 1 from auth.users
    where id = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'signed-in identity was not removed';
  end if;

  if not exists (
    select 1 from language_progress
    where user_id = '22222222-2222-4222-8222-222222222222'
  ) or not exists (
    select 1 from auth.users
    where id = '22222222-2222-4222-8222-222222222222'
  ) then
    raise exception 'another identity was removed';
  end if;
end
$$;

delete from card_review;
delete from completed_lesson;
delete from language_progress;
delete from auth.users;
drop table auth.users;
