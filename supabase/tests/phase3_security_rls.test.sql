begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
select no_plan();

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

-- Deterministic identities used only inside this rolled-back test transaction.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'a@test.local', crypt('Test-only-1!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Usuario A","city":"Río Grande","role":"client"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'b@test.local', crypt('Test-only-2!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Profesional B","city":"Ushuaia","role":"provider"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c@test.local', crypt('Test-only-3!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Usuario C","city":"Tolhuin","role":"client"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin@test.local', crypt('Test-only-4!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Real","city":"Río Grande","role":"client"}', now(), now());

insert into public.user_roles(user_id, role)
values ('10000000-0000-0000-0000-000000000004', 'admin')
on conflict do nothing;

insert into public.provider_profiles(user_id, trade_title, published, completed_jobs, rating)
values ('10000000-0000-0000-0000-000000000002', 'Electricidad', true, 2, 5.0)
on conflict(user_id) do update set published = true, trade_title = excluded.trade_title;

insert into public.service_requests(id, client_id, provider_id, description, status, completion_verified_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Solicitud legítima del usuario A', 'request_sent', null),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Trabajo terminado del usuario C', 'completed', now()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Segundo trabajo terminado de C', 'completed', now()),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Trabajo terminado del usuario A', 'completed', now()),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Solicitud cancelable del usuario A', 'request_sent', null);

insert into public.quotes(id, request_id, version, total, scope, expires_at, valid_days)
values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 1000, 'Diagnóstico seguro', now() + interval '1 day', 5);

insert into public.jobs(id, request_id, client_id, provider_id, status, completion_verified_at) values
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'completed', now()),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'completed', now()),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'completed', now()),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'completed', now());

insert into public.reviews(id, job_id, client_id, provider_id, rating, comment, qualities) values
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 5, 'Trabajo verificado C', array['Puntualidad']),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 5, 'Trabajo verificado A', array['Rapidez']);

insert into public.client_request_attachments(id, request_id, client_id, storage_path, position, image_width, image_height) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003/20000000-0000-0000-0000-000000000002/foto-1.jpg', 1, 800, 800),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/foto-1.jpg', 1, 800, 800);

insert into public.provider_completed_works(id, provider_id, work_code, service_label, description, position)
values ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'TR01', 'Electricidad', 'Trabajo de prueba para validar la cola segura.', 1);
insert into public.provider_portfolio_items(id, provider_id, storage_path, work_id, photo_position)
values ('71000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002/TR01/foto.jpg', '70000000-0000-0000-0000-000000000001', 1);

insert into public.subscription_requests(id, client_id, plan_months, amount_ars, receipt_path)
values ('72000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 3500, '10000000-0000-0000-0000-000000000001/subscription/pago.jpg');

insert into storage.objects(bucket_id, name, owner, metadata) values
  ('avatars', '10000000-0000-0000-0000-000000000003/perfil.jpg', '10000000-0000-0000-0000-000000000003', '{}'),
  ('profile-photos', '10000000-0000-0000-0000-000000000003/avatar.jpg', '10000000-0000-0000-0000-000000000003', '{}'),
  ('portfolio', '10000000-0000-0000-0000-000000000002/TR01/foto.jpg', '10000000-0000-0000-0000-000000000002', '{}'),
  ('private-documents', '10000000-0000-0000-0000-000000000003/documento.pdf', '10000000-0000-0000-0000-000000000003', '{}'),
  ('request-photos', '10000000-0000-0000-0000-000000000003/20000000-0000-0000-0000-000000000002/foto-1.jpg', '10000000-0000-0000-0000-000000000003', '{}'),
  ('provider-credentials', '10000000-0000-0000-0000-000000000003/matricula.jpg', '10000000-0000-0000-0000-000000000003', '{}'),
  ('private-receipts', '10000000-0000-0000-0000-000000000003/subscription/pago.jpg', '10000000-0000-0000-0000-000000000003', '{}');

-- Anonymous access: only narrow public RPCs and public objects.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select is((select count(*) from public.profiles), 0::bigint, 'anon cannot read raw profiles');
select is((select count(*) from public.reviews), 0::bigint, 'anon cannot read raw reviews');
select is((select count(*) from public.discover_published_reviews()), 2::bigint, 'anon reads projected published reviews');
select ok(not exists (
  select 1 from public.discover_published_reviews() r
  where to_jsonb(r) ?| array['id','job_id','client_id','provider_id']
), 'public review projection contains no technical UUID fields');
select ok(pg_temp.statement_fails('select public.purge_expired_client_data()'), 'anon cannot execute global purge');
select is((select count(*) from storage.objects where bucket_id in ('private-documents','request-photos','provider-credentials','private-receipts')), 0::bigint, 'anon cannot read private buckets');
select is((select count(*) from storage.objects where bucket_id in ('avatars','portfolio')), 2::bigint, 'anon can read intentionally public buckets');
set local role postgres;

-- User A: owner operations work, unrelated identities/data stay hidden.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000003'), 0::bigint, 'A cannot read private profile row of C');
select is((select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000002'), 0::bigint, 'A cannot read full provider profile row');
select is((select count(*) from public.get_visible_profile_summaries(array['10000000-0000-0000-0000-000000000002'::uuid])), 1::bigint, 'A can read safe provider summary');
select ok(not exists (
  select 1 from public.get_visible_profile_summaries(array['10000000-0000-0000-0000-000000000002'::uuid]) p
  where to_jsonb(p) ?| array['account_status','must_change_password','created_at','updated_at']
), 'profile summary contains no control fields');

update public.profiles set full_name = 'Nombre legítimo A' where id = '10000000-0000-0000-0000-000000000001';
select is((select full_name from public.profiles where id = '10000000-0000-0000-0000-000000000001'), 'Nombre legítimo A', 'A can update own public identity fields');
update public.profiles set account_status = 'deleted' where id = '10000000-0000-0000-0000-000000000001';
select is((select account_status from public.profiles where id = '10000000-0000-0000-0000-000000000001'), 'active', 'A cannot alter protected account status');
update public.profiles set full_name = 'Ataque' where id = '10000000-0000-0000-0000-000000000003';
select ok(pg_temp.statement_fails($sql$insert into public.user_roles(user_id, role) values ('10000000-0000-0000-0000-000000000001','admin')$sql$), 'A cannot self-grant admin');
select ok(pg_temp.statement_fails('select public.purge_expired_client_data()'), 'authenticated cannot execute global purge');

select is((select count(*) from public.reviews where client_id = '10000000-0000-0000-0000-000000000003'), 0::bigint, 'A cannot read review belonging only to C');
select is((select count(*) from public.reviews where client_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'A can read own review');
select ok(pg_temp.statement_fails($sql$
  insert into public.reviews(job_id, client_id, provider_id, rating, comment)
  values ('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',1,'Reseña falsificada')
$sql$), 'A cannot forge a review for C job');
select ok(pg_temp.statement_fails($sql$
  insert into public.reviews(job_id, client_id, provider_id, rating, comment)
  values ('40000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003',1,'Proveedor falsificado')
$sql$), 'A cannot attribute its verified job review to the wrong provider');
select ok(not pg_temp.statement_fails($sql$
  insert into public.reviews(job_id, client_id, provider_id, rating, comment)
  values ('40000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',5,'Reseña legítima adicional')
$sql$), 'A can review the exact provider from its verified job');

select is((select count(*) from public.service_requests where id = '20000000-0000-0000-0000-000000000002'), 0::bigint, 'A cannot read unrelated request C');
update public.service_requests set status = 'completed' where id = '20000000-0000-0000-0000-000000000002';
select ok(pg_temp.statement_fails($sql$
  insert into public.service_requests(client_id, provider_id, description, status)
  values ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Intento de salto de estado','completed')
$sql$), 'A cannot create a request already completed');
select ok(pg_temp.statement_fails($sql$
  insert into public.service_requests(client_id, provider_id, description, status)
  values ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Proveedor no publicado','request_sent')
$sql$), 'A cannot create a request for an unpublished account');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok($sql$
  insert into public.service_requests(id, client_id, provider_id, description, status)
  values ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','Solicitud válida a prestador publicado','request_sent')
$sql$, 'client can create the initial request for an active published provider');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- A cannot read, create, replace or remove B/C private objects.
select is((select count(*) from storage.objects where bucket_id in ('private-documents','request-photos','provider-credentials','private-receipts') and name like '10000000-0000-0000-0000-000000000003/%'), 0::bigint, 'A cannot read C private files');
select ok(pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('private-documents','10000000-0000-0000-0000-000000000003/attack.pdf')$sql$), 'A cannot write private documents under C path');
select ok(pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('request-photos','10000000-0000-0000-0000-000000000003/attack.jpg')$sql$), 'A cannot write request photos under C path');
select ok(pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('provider-credentials','10000000-0000-0000-0000-000000000003/attack.jpg')$sql$), 'A cannot write credentials under C path');
select ok(pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('private-receipts','10000000-0000-0000-0000-000000000003/attack.jpg')$sql$), 'A cannot write receipts under C path');
select is((select count(*) from storage.objects where bucket_id = 'private-documents' and name = '10000000-0000-0000-0000-000000000003/documento.pdf'), 0::bigint, 'A cannot delete C private document');
select is((select count(*) from storage.objects where bucket_id = 'request-photos' and name = '10000000-0000-0000-0000-000000000003/20000000-0000-0000-0000-000000000002/foto-1.jpg'), 0::bigint, 'A cannot delete C request photo');
select is((select count(*) from storage.objects where bucket_id = 'provider-credentials' and name = '10000000-0000-0000-0000-000000000003/matricula.jpg'), 0::bigint, 'A cannot delete C credential');
select is((select count(*) from storage.objects where bucket_id = 'private-receipts' and name = '10000000-0000-0000-0000-000000000003/subscription/pago.jpg'), 0::bigint, 'A cannot delete C receipt');

-- Legitimate owner writes remain available in every bucket.
select ok(not pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('avatars','10000000-0000-0000-0000-000000000001/perfil.jpg')$sql$), 'A can write own avatar');
select ok(not pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('profile-photos','10000000-0000-0000-0000-000000000001/avatar.jpg')$sql$), 'A can write own profile photo');
select ok(not pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('portfolio','10000000-0000-0000-0000-000000000001/TR01/foto.jpg')$sql$), 'A can write own portfolio object');
select ok(not pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('private-documents','10000000-0000-0000-0000-000000000001/documento.pdf')$sql$), 'A can write own private document');
select ok(not pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('request-photos','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/foto-1.jpg')$sql$), 'A can write own request photo');
select ok(not pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('provider-credentials','10000000-0000-0000-0000-000000000001/matricula.jpg')$sql$), 'A can write own credential');
select ok(not pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('private-receipts','10000000-0000-0000-0000-000000000001/subscription/pago.jpg')$sql$), 'A can write own receipt');

select ok(pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('avatars','10000000-0000-0000-0000-000000000003/otro.jpg')$sql$), 'A cannot overwrite C avatar path');
select ok(pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('profile-photos','10000000-0000-0000-0000-000000000003/otro.jpg')$sql$), 'A cannot write C profile-photo path');
select ok(pg_temp.statement_fails($sql$insert into storage.objects(bucket_id,name) values ('portfolio','10000000-0000-0000-0000-000000000003/otro.jpg')$sql$), 'A cannot write C portfolio path');

-- Drive queues accept only owned records, fixed roots and traversal-free paths.
select ok(pg_temp.statement_fails($sql$
  insert into public.client_drive_media_outbox(client_id, request_id, source_storage_path, target_root_folder_id, target_relative_path, target_file_name)
  values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/foto-1.jpg','root-atacante','Clientes/ataque/Solicitudes/SOL_1','foto.jpg')
$sql$), 'A cannot choose an arbitrary client Drive root');
select ok(pg_temp.statement_fails($sql$
  insert into public.client_drive_media_outbox(client_id, request_id, source_storage_path, target_relative_path, target_file_name)
  values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/foto-1.jpg','Clientes/../escape','foto.jpg')
$sql$), 'A cannot traverse the client Drive target path');
select ok(not pg_temp.statement_fails($sql$
  insert into public.client_drive_media_outbox(client_id, request_id, source_storage_path, target_relative_path, target_file_name)
  select id, '20000000-0000-0000-0000-000000000001', id::text || '/20000000-0000-0000-0000-000000000001/foto-1.jpg',
         'Clientes/' || public_id || '_Usuario_A/Solicitudes/SOL_001', 'foto-1.jpg'
  from public.profiles where id = '10000000-0000-0000-0000-000000000001'
$sql$), 'A can enqueue an owned client attachment with the allowlisted root');
select ok(pg_temp.statement_fails($sql$
  insert into public.receipt_drive_outbox(owner_id, receipt_kind, source_storage_path, target_relative_path, target_file_name)
  values ('10000000-0000-0000-0000-000000000001','subscription','10000000-0000-0000-0000-000000000001/subscription/pago.jpg','Clientes/../escape','pago.jpg')
$sql$), 'A cannot traverse a receipt Drive target path');
select ok(not pg_temp.statement_fails($sql$
  insert into public.receipt_drive_outbox(owner_id, receipt_kind, source_storage_path, target_relative_path, target_file_name)
  values ('10000000-0000-0000-0000-000000000001','subscription','10000000-0000-0000-0000-000000000001/subscription/pago.jpg','Clientes/LP000001/Suscripciones','pago.jpg')
$sql$), 'A can enqueue its own subscription receipt');
select ok(pg_temp.statement_fails($sql$
  insert into public.drive_media_outbox(provider_id, completed_work_id, source_storage_path, target_relative_path, target_file_name)
  values ('10000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002/TR01/foto.jpg','LP000002_Profesional_B/Trabajos/TR01','foto.jpg')
$sql$), 'A cannot enqueue provider B portfolio media');
set local role postgres;

-- Verify denied deletes did not remove seeded private objects.
select is((select count(*) from storage.objects where bucket_id in ('private-documents','request-photos','provider-credentials','private-receipts') and name like '10000000-0000-0000-0000-000000000003/%'), 4::bigint, 'cross-user private deletes changed no rows');
select is((select full_name from public.profiles where id = '10000000-0000-0000-0000-000000000003'), 'Usuario C', 'cross-user profile update changed no row');

-- Legitimate state machine operations work for the actual participants.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select ok(pg_temp.statement_fails($sql$
  insert into public.drive_media_outbox(provider_id, completed_work_id, source_storage_path, target_root_folder_id, target_relative_path, target_file_name)
  values ('10000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002/TR01/foto.jpg','root-atacante','LP000002_Profesional_B/Trabajos/TR01','foto.jpg')
$sql$), 'provider B cannot choose an arbitrary portfolio Drive root');
select ok(not pg_temp.statement_fails($sql$
  insert into public.drive_media_outbox(provider_id, completed_work_id, source_storage_path, target_relative_path, target_file_name)
  select id, '70000000-0000-0000-0000-000000000001', id::text || '/TR01/foto.jpg', public_id || '_Profesional_B/Trabajos/TR01', 'foto.jpg'
  from public.profiles where id = '10000000-0000-0000-0000-000000000002'
$sql$), 'provider B can enqueue its own portfolio media');
select lives_ok($sql$select public.mark_service_request_quote_sent('20000000-0000-0000-0000-000000000001')$sql$, 'assigned provider can send quote');
select ok(pg_temp.statement_fails($sql$select public.mark_service_request_quote_sent('20000000-0000-0000-0000-000000000002')$sql$), 'provider cannot reopen completed request');
set local role postgres;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok($sql$select public.request_quote_revision('20000000-0000-0000-0000-000000000001','Necesito revisar el alcance completo')$sql$, 'client can request a quote revision');
select lives_ok($sql$select public.cancel_service_request('20000000-0000-0000-0000-000000000005','client_cancelled')$sql$, 'client can cancel an active own request');
select lives_ok($sql$select public.undo_cancel_service_request('20000000-0000-0000-0000-000000000005')$sql$, 'client can undo own cancellation within window');
select is((select status::text from public.service_requests where id = '20000000-0000-0000-0000-000000000005'), 'request_sent', 'undo restored the previous state');
set local role postgres;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok($sql$select public.mark_service_request_quote_sent('20000000-0000-0000-0000-000000000001')$sql$, 'provider can answer a revision');
set local role postgres;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok($sql$select public.accept_service_quote('20000000-0000-0000-0000-000000000001')$sql$, 'client can accept own provider quote');
set local role postgres;

-- Even a privileged execution path carrying A's JWT cannot force an invalid transition.
set local role service_role;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select ok(pg_temp.statement_fails($sql$
  update public.service_requests set status = 'completed', completion_verified_at = now()
  where id = '20000000-0000-0000-0000-000000000001'
$sql$), 'state trigger rejects quote_accepted to completed jump');
set local role postgres;

-- Admin gets privileges only from user_roles and can read protected rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select ok(pg_temp.statement_fails($sql$
  select * from public.admin_set_premium_by_public_id(
    (select public_id from public.profiles where id = '10000000-0000-0000-0000-000000000001'), true
  )
$sql$), 'authenticated user cannot enable own premium');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select ok(pg_temp.statement_fails($sql$
  select * from public.admin_set_premium_by_public_id('LP999999', true)
$sql$), 'anon cannot invoke premium administration');

set local role postgres;
delete from public.client_memberships where client_id = '10000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select count(*) from public.profiles where id in (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004'
)), 4::bigint, 'real admin can read every seeded profile even when staging contains tombstones');
select is((select count(*) from public.reviews), 3::bigint, 'real admin can read all raw reviews');
select ok(pg_temp.statement_fails($sql$
  select * from public.admin_set_premium_by_public_id('LP999999', true)
$sql$), 'admin receives a controlled failure for an unknown public id');
select lives_ok($sql$
  select * from public.admin_set_premium_by_public_id(
    (select public_id from public.profiles where id = '10000000-0000-0000-0000-000000000003'), true
  )
$sql$, 'admin premium RPC creates a missing membership');
select is((select plan_code from public.client_memberships where client_id = '10000000-0000-0000-0000-000000000003'), 'plus', 'premium upsert targets the intended account');
select lives_ok($sql$
  select * from public.admin_set_premium_by_public_id(
    (select public_id from public.profiles where id = '10000000-0000-0000-0000-000000000001'), true
  )
$sql$, 'real admin can enable premium through the guarded RPC');
select is((select plan_code from public.client_memberships where client_id = '10000000-0000-0000-0000-000000000001'), 'plus', 'admin premium RPC updates the intended membership');
select lives_ok($sql$
  select * from public.admin_set_premium_by_public_id(
    (select public_id from public.profiles where id = '10000000-0000-0000-0000-000000000001'), false
  )
$sql$, 'real admin can disable premium through the guarded RPC');
select is((select plan_code from public.client_memberships where client_id = '10000000-0000-0000-0000-000000000001'), 'free', 'premium update can restore the free plan');
set local role postgres;

select * from finish();
rollback;
