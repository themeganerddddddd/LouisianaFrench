-- Read-only checks for the username functions. Safe to run through psql or execute_sql.
set default_transaction_read_only = on;

do $verify$
declare
  fn text;
  cfg text[];
  definer boolean;
  empty_path boolean;
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
end
$verify$;
