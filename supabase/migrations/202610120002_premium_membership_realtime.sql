-- Refleja una habilitación o baja manual de Premium en la cuenta abierta.
-- La política RLS de client_memberships limita la lectura al titular y al admin.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_memberships'
  ) then
    alter publication supabase_realtime add table public.client_memberships;
  end if;
end $$;
