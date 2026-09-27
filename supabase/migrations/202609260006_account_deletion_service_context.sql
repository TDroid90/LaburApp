-- PostgREST supplies the service_role claim in production. This wrapper also
-- establishes it explicitly for direct/transactional service-role execution so
-- existing state-machine triggers recognize the privileged cleanup path.
alter function public.prepare_account_deletion(uuid)
rename to prepare_account_deletion_internal;

revoke all on function public.prepare_account_deletion_internal(uuid)
from public, anon, authenticated, service_role;

create function public.prepare_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  return public.prepare_account_deletion_internal(p_user_id);
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
