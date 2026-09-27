-- Retention is backend maintenance. Run it from pg_cron, never from a client.
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'laburapp-purge-expired-client-data'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'laburapp-purge-expired-client-data',
    '17 3 * * *',
    'select public.purge_expired_client_data();'
  );
end
$$;

revoke all on schema cron from public, anon, authenticated;
revoke all on all tables in schema cron from public, anon, authenticated;
