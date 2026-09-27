begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
select plan(15);

create or replace function pg_temp.statement_fails(statement text)
returns boolean language plpgsql as $$
begin
  execute statement;
  return false;
exception when others then
  return true;
end;
$$;
grant execute on function pg_temp.statement_fails(text) to public;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '17000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'delete-a@test.local', crypt('Test-only-1!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eliminar A","city":"Río Grande","role":"client"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '17000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'keep-b@test.local', crypt('Test-only-2!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Conservar B","city":"Ushuaia","role":"provider"}', now(), now());

insert into public.provider_profiles(user_id, trade_title, published)
values ('17000000-0000-0000-0000-000000000002', 'Electricidad', true);
insert into public.service_requests(id, client_id, provider_id, description, approximate_zone, status)
values ('27000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000002', 'Dirección y detalle personal que debe desaparecer', 'Zona privada', 'completed');
insert into public.jobs(id, request_id, client_id, provider_id, status, completion_verified_at)
values ('37000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000002', 'completed', now());
insert into public.messages(request_id, sender_id, body)
values ('27000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', 'Mensaje privado');
insert into public.reviews(job_id, client_id, provider_id, rating, comment, qualities)
values ('37000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000002', 5, 'Comentario personal', array['Rapidez']);
update public.client_memberships set plan_code = 'plus', status = 'active'
where client_id = '17000000-0000-0000-0000-000000000001';
insert into public.notifications(user_id, kind, title, body)
values ('17000000-0000-0000-0000-000000000001', 'test', 'Privado', 'Contenido privado');
insert into public.subscription_requests(id, client_id, plan_months, amount_ars, receipt_path, drive_file_id)
values ('47000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001', 1, 3500, '17000000-0000-0000-0000-000000000001/subscription/pago.jpg', 'drive-receipt-test');

set local role authenticated;
select set_config('request.jwt.claim.sub', '17000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select ok(pg_temp.statement_fails($sql$select public.prepare_account_deletion('17000000-0000-0000-0000-000000000002')$sql$), 'authenticated A cannot invoke privileged deletion for B');

set local role service_role;
select lives_ok($sql$select public.prepare_account_deletion('17000000-0000-0000-0000-000000000001')$sql$, 'service backend prepares self deletion');
select lives_ok($sql$select public.prepare_account_deletion('17000000-0000-0000-0000-000000000001')$sql$, 'double submit is idempotent');

set local role postgres;
select is((select full_name from public.profiles where id = '17000000-0000-0000-0000-000000000001'), 'Cuenta eliminada', 'profile is anonymized');
select is((select account_status from public.profiles where id = '17000000-0000-0000-0000-000000000001'), 'deleted', 'profile is marked deleted');
select is((select description from public.service_requests where id = '27000000-0000-0000-0000-000000000001'), 'Cuenta eliminada', 'request free text is anonymized');
select is((select count(*) from public.messages where request_id = '27000000-0000-0000-0000-000000000001'), 0::bigint, 'conversation content is removed');
select is((select comment from public.reviews where job_id = '37000000-0000-0000-0000-000000000001'), null::text, 'review free text is removed');
select is((select count(*) from public.user_roles where user_id = '17000000-0000-0000-0000-000000000001'), 0::bigint, 'roles are removed');
select is((select count(*) from public.client_memberships where client_id = '17000000-0000-0000-0000-000000000001'), 0::bigint, 'premium membership is removed');
select is((select count(*) from public.notifications where user_id = '17000000-0000-0000-0000-000000000001'), 0::bigint, 'notifications are removed');
select ok((select receipt_path like 'deleted/%' from public.subscription_requests where id = '47000000-0000-0000-0000-000000000001'), 'financial row remains without receipt path');
select is((select count(*) from public.drive_cleanup_outbox where user_id = '17000000-0000-0000-0000-000000000001' and drive_file_id = 'drive-receipt-test'), 1::bigint, 'Drive cleanup is queued');
select is((select full_name from public.profiles where id = '17000000-0000-0000-0000-000000000002'), 'Conservar B', 'other account is unchanged');

delete from auth.users where id = '17000000-0000-0000-0000-000000000001';
select is((select count(*) from public.profiles where id = '17000000-0000-0000-0000-000000000001' and account_status = 'deleted'), 1::bigint, 'Auth deletion preserves the anonymous tombstone');

select * from finish();
rollback;
