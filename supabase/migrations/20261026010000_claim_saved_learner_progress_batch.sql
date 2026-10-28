-- One Claim call inserts the profile first, then every current child row.
-- A second call hits the profile's unique key and stops before any child write.
-- PostgREST runs each call in its own transaction, so the single-row Claim cannot
-- carry the rest of a Language by itself.

create function claim_saved_learner_progress_batch(
  p_language text,
  p_username text,
  p_xp integer,
  p_streak integer,
  p_last_study_at timestamptz,
  p_last_worked_unit text,
  p_lesson_ids text[] default null,
  p_lesson_completed_at timestamptz[] default null,
  p_word_row_ids text[] default null,
  p_seen integer[] default null,
  p_correct integer[] default null,
  p_wrong integer[] default null,
  p_card_ids text[] default null,
  p_repetitions integer[] default null,
  p_review_intervals integer[] default null,
  p_ease numeric[] default null,
  p_next_review_at timestamptz[] default null,
  p_lapses integer[] default null,
  p_mistake_card_ids text[] default null,
  p_answers text[] default null,
  p_sources text[] default null,
  p_source_ids text[] default null,
  p_recorded_at timestamptz[] default null,
  p_daily_days date[] default null,
  p_practice_days date[] default null,
  p_practice_types text[] default null,
  p_practice_completed_at timestamptz[] default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
begin
  perform claim_saved_learner_progress(
    p_language => p_language,
    p_username => p_username,
    p_xp => p_xp,
    p_streak => p_streak,
    p_last_study_at => p_last_study_at,
    p_last_worked_unit => p_last_worked_unit,
    p_op => 'profile'
  );

  for i in 1 .. coalesce(cardinality(p_lesson_ids), 0) loop
    perform claim_saved_learner_progress(
      p_language => p_language,
      p_username => p_username,
      p_xp => p_xp,
      p_streak => p_streak,
      p_last_study_at => p_last_study_at,
      p_last_worked_unit => p_last_worked_unit,
      p_op => 'completed_lesson',
      p_lesson_id => p_lesson_ids[i],
      p_completed_at => p_lesson_completed_at[i]
    );
  end loop;

  for i in 1 .. coalesce(cardinality(p_word_row_ids), 0) loop
    perform claim_saved_learner_progress(
      p_language => p_language,
      p_username => p_username,
      p_xp => p_xp,
      p_streak => p_streak,
      p_last_study_at => p_last_study_at,
      p_last_worked_unit => p_last_worked_unit,
      p_op => 'word_mastery',
      p_word_row_id => p_word_row_ids[i],
      p_seen => p_seen[i],
      p_correct => p_correct[i],
      p_wrong => p_wrong[i]
    );
  end loop;

  for i in 1 .. coalesce(cardinality(p_card_ids), 0) loop
    perform claim_saved_learner_progress(
      p_language => p_language,
      p_username => p_username,
      p_xp => p_xp,
      p_streak => p_streak,
      p_last_study_at => p_last_study_at,
      p_last_worked_unit => p_last_worked_unit,
      p_op => 'card_review',
      p_card_id => p_card_ids[i],
      p_repetitions => p_repetitions[i],
      p_review_interval => p_review_intervals[i],
      p_ease => p_ease[i],
      p_next_review_at => p_next_review_at[i],
      p_lapses => p_lapses[i]
    );
  end loop;

  for i in 1 .. coalesce(cardinality(p_mistake_card_ids), 0) loop
    perform claim_saved_learner_progress(
      p_language => p_language,
      p_username => p_username,
      p_xp => p_xp,
      p_streak => p_streak,
      p_last_study_at => p_last_study_at,
      p_last_worked_unit => p_last_worked_unit,
      p_op => 'pending_mistake',
      p_card_id => p_mistake_card_ids[i],
      p_answer => p_answers[i],
      p_source => p_sources[i],
      p_source_id => p_source_ids[i],
      p_recorded_at => p_recorded_at[i]
    );
  end loop;

  for i in 1 .. coalesce(cardinality(p_daily_days), 0) loop
    perform claim_saved_learner_progress(
      p_language => p_language,
      p_username => p_username,
      p_xp => p_xp,
      p_streak => p_streak,
      p_last_study_at => p_last_study_at,
      p_last_worked_unit => p_last_worked_unit,
      p_op => 'daily_review_day',
      p_day => p_daily_days[i]
    );
  end loop;

  for i in 1 .. coalesce(cardinality(p_practice_days), 0) loop
    perform claim_saved_learner_progress(
      p_language => p_language,
      p_username => p_username,
      p_xp => p_xp,
      p_streak => p_streak,
      p_last_study_at => p_last_study_at,
      p_last_worked_unit => p_last_worked_unit,
      p_op => 'practice_day',
      p_day => p_practice_days[i],
      p_practice_type => p_practice_types[i],
      p_completed_at => p_practice_completed_at[i]
    );
  end loop;

  return 1;
end;
$$;

do $do$
declare
  role_name text;
  signature text := 'claim_saved_learner_progress_batch(text, text, integer, integer, timestamptz, text, text[], timestamptz[], text[], integer[], integer[], integer[], text[], integer[], integer[], numeric[], timestamptz[], integer[], text[], text[], text[], text[], timestamptz[], date[], date[], text[], timestamptz[])';
begin
  execute format('revoke all on function %s from public', signature);
  foreach role_name in array array['anon', 'authenticated', 'service_role']
  loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on function %s from %I', signature, role_name);
    end if;
  end loop;
end
$do$;

grant execute on function claim_saved_learner_progress_batch(
  text, text, integer, integer, timestamptz, text, text[], timestamptz[],
  text[], integer[], integer[], integer[], text[], integer[], integer[],
  numeric[], timestamptz[], integer[], text[], text[], text[], text[],
  timestamptz[], date[], date[], text[], timestamptz[]
) to authenticated;
