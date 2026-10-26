-- Proves the Saved Learner Progress rules as the authenticated role.
\set ON_ERROR_STOP on

do $$
declare
  role_name text;
begin
  foreach role_name in array array['authenticated', 'anon', 'service_role']
  loop
    if exists (select 1 from pg_roles where rolname = role_name)
       and exists (
         select 1
         from information_schema.role_table_grants
         where grantee = role_name
           and table_schema = 'public'
           and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
       ) then
      raise exception '% can write Saved Learner Progress tables directly', role_name;
    end if;
  end loop;
  if not has_table_privilege('authenticated', 'public.language_progress', 'SELECT') then
    raise exception 'authenticated cannot read language_progress';
  end if;
  if has_table_privilege('authenticated', 'public.language_progress', 'INSERT')
     or has_table_privilege('authenticated', 'public.language_progress', 'UPDATE')
     or has_table_privilege('authenticated', 'public.language_progress', 'DELETE')
     or has_table_privilege('authenticated', 'public.pending_mistake', 'INSERT')
     or has_table_privilege('authenticated', 'public.card_review', 'INSERT')
     or has_table_privilege('authenticated', 'public.completed_lesson', 'DELETE')
     or has_table_privilege('authenticated', 'public.word_mastery', 'INSERT') then
    raise exception 'authenticated can change Saved Learner Progress tables directly';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.saved_learner_progress_change(text,integer,text,text,integer,integer,timestamptz,text,text[],text,timestamptz,text,integer,integer,integer,text,integer,integer,numeric,timestamptz,integer,text,text,text,timestamptz,date,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can call the inner writer';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
set role authenticated;

do $$
begin
  if auth.uid() is distinct from '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'auth.uid mismatch: %', auth.uid();
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'word_mastery'
      and column_name = 'status'
  ) then
    raise exception 'word mastery must not store status';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'language_progress',
        'completed_lesson',
        'word_mastery',
        'card_review',
        'pending_mistake',
        'daily_review_day',
        'practice_day'
      )
      and data_type = 'jsonb'
  ) then
    raise exception 'Saved Learner Progress must not use a JSON document';
  end if;
end
$$;

begin;
select claim_saved_learner_progress(
  p_language => 'cajun',
  p_username => 'Ada',
  p_xp => 2,
  p_streak => 1,
  p_last_study_at => '2026-10-25T12:00:00Z',
  p_last_worked_unit => 'U1',
  p_op => 'completed_lesson',
  p_lesson_id => 'lesson-1',
  p_completed_at => '2026-10-25T12:00:00Z'
);
select claim_saved_learner_progress(
  p_language => 'cajun',
  p_username => 'Other',
  p_xp => 9,
  p_streak => 4,
  p_last_study_at => '2026-10-25T15:00:00Z',
  p_last_worked_unit => 'U9',
  p_op => 'completed_lesson',
  p_lesson_id => 'lesson-3',
  p_completed_at => '2026-10-25T15:00:00Z'
);
commit;

do $$
declare
  profile language_progress%rowtype;
  lesson_count integer;
begin
  select * into profile from language_progress where language = 'cajun';
  if profile.username is distinct from 'Ada' or profile.xp is distinct from 2
     or profile.last_worked_unit is distinct from 'U1' or profile.revision is distinct from 1 then
    raise exception 'Claim overwrote language_progress: % % %', profile.username, profile.xp, profile.revision;
  end if;
  select count(*) into lesson_count from completed_lesson where language = 'cajun';
  if lesson_count is distinct from 2 then
    raise exception 'Claim should keep both lessons from one transaction, saw %', lesson_count;
  end if;
end
$$;

do $$
begin
  perform claim_saved_learner_progress(
    p_language => 'cajun',
    p_username => 'Second',
    p_xp => 8,
    p_streak => 3,
    p_last_study_at => '2026-10-25T16:00:00Z',
    p_last_worked_unit => 'U2',
    p_op => 'completed_lesson',
    p_lesson_id => 'lesson-2',
    p_completed_at => '2026-10-25T16:00:00Z'
  );
  raise exception 'second Claim should have stopped';
exception
  when unique_violation then
    null;
end
$$;

do $$
declare
  profile language_progress%rowtype;
  lesson_count integer;
begin
  select * into profile from language_progress where language = 'cajun';
  if profile.username is distinct from 'Ada' or profile.revision is distinct from 1 then
    raise exception 'second Claim changed language_progress';
  end if;
  select count(*) into lesson_count from completed_lesson where lesson_id = 'lesson-2';
  if lesson_count is distinct from 0 then
    raise exception 'second Claim wrote a lesson';
  end if;
  select count(*) into lesson_count from completed_lesson where lesson_id = 'lesson-1';
  if lesson_count is distinct from 1 then
    raise exception 'first Claim lesson disappeared';
  end if;
end
$$;

select apply_saved_learner_progress(
  p_expected_revision => 1,
  p_language => 'cajun',
  p_username => 'Ada',
  p_xp => 3,
  p_streak => 1,
  p_last_study_at => '2026-10-25T13:00:00Z',
  p_last_worked_unit => 'U1',
  p_ops => array['card_review', 'word_mastery', 'pending_mistake'],
  p_card_id => 'cajun:m1',
  p_repetitions => 1,
  p_review_interval => 1,
  p_ease => 2.5,
  p_lapses => 0,
  p_word_row_id => 'row-1',
  p_seen => 1,
  p_correct => 0,
  p_wrong => 1,
  p_answer => 'no',
  p_source => 'lesson',
  p_source_id => 'lesson-1',
  p_recorded_at => '2026-10-25T13:00:00Z'
);

do $$
declare
  profile language_progress%rowtype;
  row_count integer;
begin
  select * into profile from language_progress where language = 'cajun';
  if profile.revision is distinct from 2 or profile.xp is distinct from 3 then
    raise exception 'apply did not advance revision once, saw % xp %', profile.revision, profile.xp;
  end if;
  select count(*) into row_count from pending_mistake where card_id = 'cajun:m1';
  if row_count is distinct from 1 then
    raise exception 'apply did not write the pending mistake';
  end if;
  select count(*) into row_count from card_review where card_id = 'cajun:m1';
  if row_count is distinct from 1 then
    raise exception 'apply did not write the card review';
  end if;
  select count(*) into row_count from word_mastery where word_row_id = 'row-1';
  if row_count is distinct from 1 then
    raise exception 'apply did not write the word mastery';
  end if;
end
$$;

do $$
begin
  perform apply_saved_learner_progress(
    p_expected_revision => 1,
    p_language => 'cajun',
    p_username => 'Ada',
    p_xp => 9,
    p_streak => 1,
    p_last_study_at => '2026-10-25T14:00:00Z',
    p_last_worked_unit => 'U1',
    p_ops => array['pending_mistake'],
    p_card_id => 'cajun:m2',
    p_answer => 'no',
    p_source => 'lesson',
    p_source_id => 'lesson-1',
    p_recorded_at => '2026-10-25T14:00:00Z'
  );
  raise exception 'stale revision should have stopped';
exception
  when serialization_failure then
    if sqlerrm not like '%stale%' then
      raise;
    end if;
end
$$;

do $$
declare
  profile language_progress%rowtype;
  mistake_count integer;
begin
  select * into profile from language_progress where language = 'cajun';
  if profile.revision is distinct from 2 or profile.xp is distinct from 3 then
    raise exception 'stale revision changed language_progress';
  end if;
  select count(*) into mistake_count from pending_mistake where card_id = 'cajun:m2';
  if mistake_count is distinct from 0 then
    raise exception 'stale revision wrote a child row';
  end if;
  select count(*) into mistake_count from pending_mistake where card_id = 'cajun:m1';
  if mistake_count is distinct from 1 then
    raise exception 'stale revision removed the existing mistake';
  end if;
end
$$;

do $$
begin
  insert into language_progress (user_id, language, username, xp, streak)
  values ('22222222-2222-4222-8222-222222222222', 'cajun', 'Stolen', 1, 1);
  raise exception 'direct insert should be denied';
exception
  when insufficient_privilege then
    null;
end
$$;

do $$
begin
  perform saved_learner_progress_change(
    'claim', null, 'cajun', 'Ada', 1, 1, null, null, array['profile']::text[],
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
  );
  raise exception 'learner called the inner write';
exception
  when insufficient_privilege then
    null;
end
$$;

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
set role authenticated;

do $$
declare
  n integer;
begin
  select count(*) into n from language_progress;
  if n is distinct from 0 then
    raise exception 'learner read another learner language_progress';
  end if;
  select count(*) into n from completed_lesson;
  if n is distinct from 0 then
    raise exception 'learner read another learner completed_lesson';
  end if;
  select count(*) into n from pending_mistake;
  if n is distinct from 0 then
    raise exception 'learner read another learner pending_mistake';
  end if;
  select count(*) into n from word_mastery;
  if n is distinct from 0 then
    raise exception 'learner read another learner word_mastery';
  end if;
  select count(*) into n from card_review;
  if n is distinct from 0 then
    raise exception 'learner read another learner card_review';
  end if;
  select count(*) into n from daily_review_day;
  if n is distinct from 0 then
    raise exception 'learner read another learner daily_review_day';
  end if;
  select count(*) into n from practice_day;
  if n is distinct from 0 then
    raise exception 'learner read another learner practice_day';
  end if;

  perform claim_saved_learner_progress(
    p_language => 'kreole',
    p_username => 'Bea',
    p_xp => 4,
    p_streak => 1,
    p_last_study_at => null,
    p_last_worked_unit => null,
    p_op => 'profile'
  );
  select count(*) into n from language_progress;
  if n is distinct from 1 then
    raise exception 'Bea should see only her own language_progress, saw %', n;
  end if;
  if (select username from language_progress) is distinct from 'Bea' then
    raise exception 'Bea read Ada''s profile';
  end if;
end
$$;

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
set role authenticated;

do $$
declare
  n integer;
begin
  select count(*) into n from language_progress;
  if n is distinct from 1 then
    raise exception 'Ada should not see Bea, saw %', n;
  end if;
  if (select username from language_progress) is distinct from 'Ada' then
    raise exception 'Ada''s profile changed';
  end if;
  if (select xp from language_progress) is distinct from 3 then
    raise exception 'Ada''s xp changed after the other learner signed in';
  end if;
end
$$;
