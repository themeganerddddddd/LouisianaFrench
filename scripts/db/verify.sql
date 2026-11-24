-- Read-only checks for the username objects. Safe to run through psql or execute_sql.
set default_transaction_read_only = on;

do $verify$
declare
  fn text;
  cfg text[];
  definer boolean;
  empty_path boolean;
  rls boolean;
begin
  foreach fn in array array['check_username', 'set_username']
  loop
    if not exists (
      select 1
      from pg_proc as p
      join pg_namespace as n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = fn
        and p.pronargs = 1
        and oidvectortypes(p.proargtypes) = 'text'
    ) then
      raise exception 'missing function public.%(text)', fn;
    end if;

    if has_function_privilege('anon', 'public.' || fn || '(text)', 'execute') then
      raise exception 'anon must not execute %', fn;
    end if;

    if not has_function_privilege('authenticated', 'public.' || fn || '(text)', 'execute') then
      raise exception 'authenticated must execute %', fn;
    end if;

    select p.prosecdef, p.proconfig
      into definer, cfg
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = fn
      and p.pronargs = 1
      and oidvectortypes(p.proargtypes) = 'text';

    if definer is not true then
      raise exception '% must be security definer', fn;
    end if;

    select exists (
      select 1
      from unnest(coalesce(cfg, array[]::text[])) as item
      where item in ('search_path=', 'search_path=""')
    )
    into empty_path;

    if empty_path is not true then
      raise exception '% must set an empty search_path', fn;
    end if;
  end loop;

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
