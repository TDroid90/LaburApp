begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
select plan(9);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef and pg_get_userbyid(p.proowner) <> 'postgres'),
  0::bigint,
  'all public SECURITY DEFINER functions are owned by postgres'
);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not ('search_path=""' = any(coalesce(p.proconfig, array[]::text[])))),
  0::bigint,
  'all public SECURITY DEFINER functions pin an empty search_path'
);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and has_function_privilege('anon', p.oid, 'execute')
     and p.proname not in ('discover_published_providers', 'discover_published_reviews')),
  0::bigint,
  'anon can execute only the two minimized public discovery RPCs'
);

select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef and p.prorettype = 'trigger'::regtype
     and has_function_privilege('authenticated', p.oid, 'execute')),
  0::bigint,
  'authenticated cannot invoke trigger functions directly'
);

select ok(not has_function_privilege('authenticated', 'public.purge_expired_client_data()', 'execute'), 'authenticated cannot execute global purge');
select ok(has_function_privilege('service_role', 'public.purge_expired_client_data()', 'execute'), 'service_role can execute global purge');
select ok(not has_function_privilege('authenticated', 'public.apply_annual_credential_review_due()', 'execute'), 'annual maintenance is backend-only');
select ok(has_function_privilege('anon', 'public.discover_published_providers()', 'execute'), 'anon can use minimized provider discovery');
select ok(has_function_privilege('authenticated', 'public.admin_platform_metrics()', 'execute'), 'admin RPC remains callable by authenticated and enforces admin internally');

select * from finish();
rollback;
