-- A full Claim is one call. A second call does not overwrite or add a child row.
\set ON_ERROR_STOP on

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
set role authenticated;

select claim_saved_learner_progress_batch(
  p_language => 'cajun',
  p_username => 'Clea',
  p_xp => 5,
  p_streak => 2,
  p_last_study_at => '2026-10-25T12:00:00Z',
  p_last_worked_unit => 'U3',
  p_lesson_ids => array['lesson-a', 'lesson-b'],
  p_lesson_completed_at => array['2026-10-25T12:00:00Z', '2026-10-25T12:05:00Z']::timestamptz[]
);

do $$
declare
  lesson_count integer;
begin
  if (select username from language_progress where language = 'cajun') is distinct from 'Clea' then
    raise exception 'batch Claim did not keep the profile';
  end if;
  if (select revision from language_progress where language = 'cajun') is distinct from 1 then
    raise exception 'batch Claim did not stay at revision 1';
  end if;
  select count(*) into lesson_count from completed_lesson where language = 'cajun';
  if lesson_count is distinct from 2 then
    raise exception 'batch Claim should write both lessons, saw %', lesson_count;
  end if;
end
$$;

do $$
begin
  perform claim_saved_learner_progress_batch(
    p_language => 'cajun',
    p_username => 'Other',
    p_xp => 9,
    p_streak => 1,
    p_last_study_at => null,
    p_last_worked_unit => null,
    p_lesson_ids => array['lesson-c'],
    p_lesson_completed_at => array['2026-10-25T18:00:00Z']::timestamptz[]
  );
  raise exception 'second batch Claim should have stopped';
exception
  when unique_violation then
    null;
end
$$;

do $$
begin
  if (select username from language_progress where language = 'cajun') is distinct from 'Clea' then
    raise exception 'second batch Claim overwrote the profile';
  end if;
  if (select count(*) from completed_lesson where lesson_id = 'lesson-c') is distinct from 0 then
    raise exception 'second batch Claim wrote a lesson';
  end if;
  if (select count(*) from completed_lesson where lesson_id = 'lesson-a') is distinct from 1 then
    raise exception 'first batch lesson disappeared';
  end if;
end
$$;
