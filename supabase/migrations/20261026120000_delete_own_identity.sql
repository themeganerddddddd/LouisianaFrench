-- A signed-in learner can remove their Identity and the Saved Learner Progress kept for it.
-- The local proof database has no auth.users table. Hosted Supabase does, and that row goes too.

create function delete_own_identity()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  delete from completed_lesson where user_id = uid;
  delete from word_mastery where user_id = uid;
  delete from pending_mistake where user_id = uid;
  delete from daily_review_day where user_id = uid;
  delete from practice_day where user_id = uid;
  delete from card_review where user_id = uid;
  delete from language_progress where user_id = uid;

  if to_regclass('auth.users') is not null then
    delete from auth.users where id = uid;
  end if;
end;
$$;

do $do$
declare
  role_name text;
begin
  execute 'revoke all on function delete_own_identity() from public';
  foreach role_name in array array['anon', 'authenticated', 'service_role']
  loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on function delete_own_identity() from %I', role_name);
    end if;
  end loop;
end
$do$;

grant execute on function delete_own_identity() to authenticated;
