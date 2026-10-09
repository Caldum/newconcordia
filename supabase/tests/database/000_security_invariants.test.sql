-- Invariants that every migration must keep. They scan the catalog, so new objects are
-- covered automatically.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is_empty(
  $$ select format('%I.%I', n.nspname, c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('public', 'game') and c.relkind in ('r', 'p')
       and not c.relrowsecurity $$,
  'every table in public and game has row level security enabled'
);

select is_empty(
  $$ select format('%I.%I %s %s', n.nspname, c.relname, r.rolname, p.privilege)
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join (values ('anon'), ('authenticated')) as r (rolname)
     cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) as p (privilege)
     where n.nspname in ('public', 'game') and c.relkind in ('r', 'p', 'v', 'm')
       and has_table_privilege(r.rolname, c.oid, p.privilege) $$,
  'the API roles cannot write any table directly'
);

select ok(
  not has_schema_privilege('anon', 'game', 'USAGE')
    and not has_schema_privilege('authenticated', 'game', 'USAGE'),
  'the API roles cannot use the private game schema'
);

select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (has_function_privilege('anon', p.oid, 'EXECUTE')
            or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
       and not coalesce('search_path=""' = any (p.proconfig), false) $$,
  'every function the API roles can call pins search_path to empty'
);

select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'game' and p.prosecdef
       and not coalesce('search_path=""' = any (p.proconfig), false) $$,
  'every security definer function in game pins search_path to empty'
);

-- Default privileges: objects created by later migrations (run as postgres) start closed.
set local role postgres;
create table public.probe_table (id bigint primary key);
create function public.probe_fn() returns int language sql as 'select 1';

select ok(
  not has_table_privilege('anon', 'public.probe_table', 'SELECT')
    and not has_table_privilege('authenticated', 'public.probe_table', 'SELECT'),
  'new tables in public are not readable by the API roles'
);

select ok(
  not has_function_privilege('anon', 'public.probe_fn()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.probe_fn()', 'EXECUTE'),
  'new functions in public are not executable by the API roles'
);

reset role;
select * from finish();
rollback;
