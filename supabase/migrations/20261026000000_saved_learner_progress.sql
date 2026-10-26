-- Saved Learner Progress in the Identity project.
-- One language_progress row per Identity per Language. Child rows are columns, not a JSON document.
-- Do not create these tables by hand before this migration.

create schema if not exists auth;

do $do$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $fn$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as $body$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $body$
    $fn$;
  end if;
end
$do$;

do $do$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$do$;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant authenticated to postgres;
do $do$
begin
  if current_user <> 'postgres' and not pg_has_role(current_user, 'authenticated', 'member') then
    execute format('grant authenticated to %I', current_user);
  end if;
end
$do$;

create table language_progress (
  user_id uuid not null,
  language text not null,
  username text not null,
  xp integer not null,
  streak integer not null,
  last_study_at timestamptz,
  last_worked_unit text,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, language),
  constraint language_progress_language_check check (language in ('cajun', 'kreole')),
  constraint language_progress_xp_check check (xp >= 0),
  constraint language_progress_streak_check check (streak >= 0),
  constraint language_progress_revision_check check (revision >= 1)
);

create table completed_lesson (
  user_id uuid not null,
  language text not null,
  lesson_id text not null,
  completed_at timestamptz not null,
  primary key (user_id, language, lesson_id),
  constraint completed_lesson_language_check check (language in ('cajun', 'kreole')),
  constraint completed_lesson_language_fk
    foreign key (user_id, language) references language_progress (user_id, language)
);

create table word_mastery (
  user_id uuid not null,
  language text not null,
  word_row_id text not null,
  seen integer not null,
  correct integer not null,
  wrong integer not null,
  primary key (user_id, language, word_row_id),
  constraint word_mastery_language_check check (language in ('cajun', 'kreole')),
  constraint word_mastery_counts_check check (seen >= 0 and correct >= 0 and wrong >= 0),
  constraint word_mastery_language_fk
    foreign key (user_id, language) references language_progress (user_id, language)
);

create table card_review (
  user_id uuid not null,
  card_id text not null,
  repetitions integer not null,
  review_interval integer not null,
  ease numeric not null,
  next_review_at timestamptz,
  lapses integer not null,
  primary key (user_id, card_id),
  constraint card_review_language_check check (card_id like 'cajun:%' or card_id like 'kreole:%'),
  constraint card_review_counts_check check (
    repetitions >= 0 and review_interval >= 0 and lapses >= 0 and ease > 0
  )
);

create table pending_mistake (
  user_id uuid not null,
  language text not null,
  card_id text not null,
  answer text not null,
  source text not null,
  source_id text,
  recorded_at timestamptz not null,
  primary key (user_id, language, card_id),
  constraint pending_mistake_language_check check (language in ('cajun', 'kreole')),
  constraint pending_mistake_language_fk
    foreign key (user_id, language) references language_progress (user_id, language)
);

create table daily_review_day (
  user_id uuid not null,
  language text not null,
  day date not null,
  primary key (user_id, language, day),
  constraint daily_review_day_language_check check (language in ('cajun', 'kreole')),
  constraint daily_review_day_language_fk
    foreign key (user_id, language) references language_progress (user_id, language)
);

create table practice_day (
  user_id uuid not null,
  language text not null,
  day date not null,
  practice_type text not null,
  completed_at timestamptz not null,
  primary key (user_id, language, day, practice_type),
  constraint practice_day_language_check check (language in ('cajun', 'kreole')),
  constraint practice_day_language_fk
    foreign key (user_id, language) references language_progress (user_id, language)
);

-- Reads use row security. Writes are not granted to the learner role: a direct insert
-- would skip the revision gate. claim and apply run as the owner and write only auth.uid().
do $do$
declare
  table_name text;
begin
  foreach table_name in array array[
    'language_progress',
    'completed_lesson',
    'word_mastery',
    'card_review',
    'pending_mistake',
    'daily_review_day',
    'practice_day'
  ]
  loop
    execute format('alter table %I enable row level security', table_name);
    execute format('alter table %I force row level security', table_name);
    execute format('revoke all on table %I from public', table_name);
    execute format('grant select on table %I to authenticated', table_name);
    execute format(
      'create policy %I on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name || '_own',
      table_name
    );
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon', table_name);
    end if;
  end loop;
end
$do$;

-- Child rows share one writer so Claim and the revision update cannot drift.
-- Authenticated cannot call this directly.
create function saved_learner_progress_change(
  p_mode text,
  p_expected_revision integer,
  p_language text,
  p_username text,
  p_xp integer,
  p_streak integer,
  p_last_study_at timestamptz,
  p_last_worked_unit text,
  p_op text,
  p_lesson_id text,
  p_completed_at timestamptz,
  p_word_row_id text,
  p_seen integer,
  p_correct integer,
  p_wrong integer,
  p_card_id text,
  p_repetitions integer,
  p_review_interval integer,
  p_ease numeric,
  p_next_review_at timestamptz,
  p_lapses integer,
  p_answer text,
  p_source text,
  p_source_id text,
  p_recorded_at timestamptz,
  p_day date,
  p_practice_type text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  token text;
  new_revision integer;
begin
  if auth.uid() is null then
    raise exception 'Saved Learner Progress requires an Identity' using errcode = '42501';
  end if;
  if p_language not in ('cajun', 'kreole') then
    raise exception 'Unknown Language' using errcode = '22023';
  end if;
  if p_op in ('card_review', 'pending_mistake', 'pending_mistake_delete')
     and (p_card_id is null or left(p_card_id, char_length(p_language) + 1) is distinct from p_language || ':') then
    raise exception 'Card id must start with the Language' using errcode = '22023';
  end if;
  if p_op not in (
    'profile',
    'completed_lesson',
    'word_mastery',
    'card_review',
    'pending_mistake',
    'pending_mistake_delete',
    'daily_review_day',
    'practice_day'
  ) then
    raise exception 'Unknown Saved Learner Progress write' using errcode = '22023';
  end if;

  if p_mode = 'claim' then
    -- Transaction-local. A later statement in another transaction does not see it,
    -- so a second Claim inserts language_progress again and stops before any child row.
    token := auth.uid()::text || ':' || p_language;
    if current_setting('saved_progress.claim', true) is distinct from token then
      insert into language_progress (
        user_id, language, username, xp, streak, last_study_at, last_worked_unit, revision, updated_at
      ) values (
        auth.uid(), p_language, p_username, p_xp, p_streak, p_last_study_at, p_last_worked_unit, 1, now()
      );
      perform set_config('saved_progress.claim', token, true);
    end if;
    new_revision := 1;
  elsif p_mode = 'apply' then
    update language_progress
    set
      username = p_username,
      xp = p_xp,
      streak = p_streak,
      last_study_at = p_last_study_at,
      last_worked_unit = p_last_worked_unit,
      revision = revision + 1,
      updated_at = now()
    where user_id = auth.uid()
      and language = p_language
      and revision = p_expected_revision
    returning revision into new_revision;

    if new_revision is null then
      raise exception 'Saved Learner Progress revision is stale' using errcode = '40001';
    end if;
  else
    raise exception 'Unknown Saved Learner Progress mode' using errcode = '22023';
  end if;

  if p_op = 'profile' then
    null;
  elsif p_op = 'completed_lesson' then
    insert into completed_lesson (user_id, language, lesson_id, completed_at)
    values (auth.uid(), p_language, p_lesson_id, p_completed_at)
    on conflict (user_id, language, lesson_id)
    do update set completed_at = excluded.completed_at;
  elsif p_op = 'word_mastery' then
    insert into word_mastery (user_id, language, word_row_id, seen, correct, wrong)
    values (auth.uid(), p_language, p_word_row_id, p_seen, p_correct, p_wrong)
    on conflict (user_id, language, word_row_id)
    do update set seen = excluded.seen, correct = excluded.correct, wrong = excluded.wrong;
  elsif p_op = 'card_review' then
    insert into card_review (
      user_id, card_id, repetitions, review_interval, ease, next_review_at, lapses
    ) values (
      auth.uid(), p_card_id, p_repetitions, p_review_interval, p_ease, p_next_review_at, p_lapses
    )
    on conflict (user_id, card_id)
    do update set
      repetitions = excluded.repetitions,
      review_interval = excluded.review_interval,
      ease = excluded.ease,
      next_review_at = excluded.next_review_at,
      lapses = excluded.lapses;
  elsif p_op = 'pending_mistake' then
    insert into pending_mistake (
      user_id, language, card_id, answer, source, source_id, recorded_at
    ) values (
      auth.uid(), p_language, p_card_id, p_answer, p_source, p_source_id, p_recorded_at
    )
    on conflict (user_id, language, card_id)
    do update set
      answer = excluded.answer,
      source = excluded.source,
      source_id = excluded.source_id,
      recorded_at = excluded.recorded_at;
  elsif p_op = 'pending_mistake_delete' then
    delete from pending_mistake
    where user_id = auth.uid() and language = p_language and card_id = p_card_id;
  elsif p_op = 'daily_review_day' then
    insert into daily_review_day (user_id, language, day)
    values (auth.uid(), p_language, p_day)
    on conflict (user_id, language, day) do nothing;
  elsif p_op = 'practice_day' then
    insert into practice_day (user_id, language, day, practice_type, completed_at)
    values (auth.uid(), p_language, p_day, p_practice_type, p_completed_at)
    on conflict (user_id, language, day, practice_type)
    do update set completed_at = excluded.completed_at;
  end if;

  return new_revision;
end;
$$;

create function claim_saved_learner_progress(
  p_language text,
  p_username text,
  p_xp integer,
  p_streak integer,
  p_last_study_at timestamptz,
  p_last_worked_unit text,
  p_op text,
  p_lesson_id text default null,
  p_completed_at timestamptz default null,
  p_word_row_id text default null,
  p_seen integer default null,
  p_correct integer default null,
  p_wrong integer default null,
  p_card_id text default null,
  p_repetitions integer default null,
  p_review_interval integer default null,
  p_ease numeric default null,
  p_next_review_at timestamptz default null,
  p_lapses integer default null,
  p_answer text default null,
  p_source text default null,
  p_source_id text default null,
  p_recorded_at timestamptz default null,
  p_day date default null,
  p_practice_type text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return saved_learner_progress_change(
    p_mode => 'claim',
    p_expected_revision => null,
    p_language => p_language,
    p_username => p_username,
    p_xp => p_xp,
    p_streak => p_streak,
    p_last_study_at => p_last_study_at,
    p_last_worked_unit => p_last_worked_unit,
    p_op => p_op,
    p_lesson_id => p_lesson_id,
    p_completed_at => p_completed_at,
    p_word_row_id => p_word_row_id,
    p_seen => p_seen,
    p_correct => p_correct,
    p_wrong => p_wrong,
    p_card_id => p_card_id,
    p_repetitions => p_repetitions,
    p_review_interval => p_review_interval,
    p_ease => p_ease,
    p_next_review_at => p_next_review_at,
    p_lapses => p_lapses,
    p_answer => p_answer,
    p_source => p_source,
    p_source_id => p_source_id,
    p_recorded_at => p_recorded_at,
    p_day => p_day,
    p_practice_type => p_practice_type
  );
end;
$$;

create function apply_saved_learner_progress(
  p_expected_revision integer,
  p_language text,
  p_username text,
  p_xp integer,
  p_streak integer,
  p_last_study_at timestamptz,
  p_last_worked_unit text,
  p_op text,
  p_lesson_id text default null,
  p_completed_at timestamptz default null,
  p_word_row_id text default null,
  p_seen integer default null,
  p_correct integer default null,
  p_wrong integer default null,
  p_card_id text default null,
  p_repetitions integer default null,
  p_review_interval integer default null,
  p_ease numeric default null,
  p_next_review_at timestamptz default null,
  p_lapses integer default null,
  p_answer text default null,
  p_source text default null,
  p_source_id text default null,
  p_recorded_at timestamptz default null,
  p_day date default null,
  p_practice_type text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  return saved_learner_progress_change(
    p_mode => 'apply',
    p_expected_revision => p_expected_revision,
    p_language => p_language,
    p_username => p_username,
    p_xp => p_xp,
    p_streak => p_streak,
    p_last_study_at => p_last_study_at,
    p_last_worked_unit => p_last_worked_unit,
    p_op => p_op,
    p_lesson_id => p_lesson_id,
    p_completed_at => p_completed_at,
    p_word_row_id => p_word_row_id,
    p_seen => p_seen,
    p_correct => p_correct,
    p_wrong => p_wrong,
    p_card_id => p_card_id,
    p_repetitions => p_repetitions,
    p_review_interval => p_review_interval,
    p_ease => p_ease,
    p_next_review_at => p_next_review_at,
    p_lapses => p_lapses,
    p_answer => p_answer,
    p_source => p_source,
    p_source_id => p_source_id,
    p_recorded_at => p_recorded_at,
    p_day => p_day,
    p_practice_type => p_practice_type
  );
end;
$$;

revoke all on function saved_learner_progress_change(
  text, integer, text, text, integer, integer, timestamptz, text, text,
  text, timestamptz, text, integer, integer, integer, text, integer, integer,
  numeric, timestamptz, integer, text, text, text, timestamptz, date, text
) from public;

revoke all on function claim_saved_learner_progress(
  text, text, integer, integer, timestamptz, text, text,
  text, timestamptz, text, integer, integer, integer, text, integer, integer,
  numeric, timestamptz, integer, text, text, text, timestamptz, date, text
) from public;

revoke all on function apply_saved_learner_progress(
  integer, text, text, integer, integer, timestamptz, text, text,
  text, timestamptz, text, integer, integer, integer, text, integer, integer,
  numeric, timestamptz, integer, text, text, text, timestamptz, date, text
) from public;

grant execute on function claim_saved_learner_progress(
  text, text, integer, integer, timestamptz, text, text,
  text, timestamptz, text, integer, integer, integer, text, integer, integer,
  numeric, timestamptz, integer, text, text, text, timestamptz, date, text
) to authenticated;

grant execute on function apply_saved_learner_progress(
  integer, text, text, integer, integer, timestamptz, text, text,
  text, timestamptz, text, integer, integer, integer, text, integer, integer,
  numeric, timestamptz, integer, text, text, text, timestamptz, date, text
) to authenticated;
