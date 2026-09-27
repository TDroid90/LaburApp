-- Realtime is limited to the tables consumed by the mobile sync hook.
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'service_requests',
    'quotes',
    'messages',
    'credentials',
    'subscription_requests'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = relation_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', relation_name);
    end if;
  end loop;
end
$$;
