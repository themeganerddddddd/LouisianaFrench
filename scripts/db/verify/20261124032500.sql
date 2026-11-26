-- Read-only checks for public.profiles. Safe to run through psql or execute_sql.
set default_transaction_read_only = on;

do $verify$
declare
  rls boolean;
begin
  select c.relrowsecurity
    into rls
  from pg_class as c
  join pg_namespace as n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles';

  if rls is null then
    raise exception 'missing table public.profiles';
  end if;
  if rls is not true then
    raise exception 'row level security must be on for public.profiles';
  end if;

  if not exists (
    select 1
    from pg_policy as pol
    join pg_class as c on c.oid = pol.polrelid
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and pol.polname = 'profiles_select_own'
  ) then
    raise exception 'missing policy profiles_select_own';
  end if;
end
$verify$;

select
  n.nspname as schema_name,
  c.relname as table_name,
  pol.polname as policy_name,
  pol.polcmd as command,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
from pg_policy as pol
join pg_class as c on c.oid = pol.polrelid
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'profiles'
order by pol.polname;
