-- Run against production or staging with db query. All test mutations are rolled back.
begin;
do $$
declare
  target_id uuid;
  admin_id uuid;
  reviewed public.reviews%rowtype;
  months integer;
  expected_services integer;
  expected_requests integer;
  expected_aspects integer;
  listed boolean;
  slot integer;
  blocked boolean;
begin
  select id into strict target_id from public.profiles where public_id = 'LP000005';
  if not exists (select 1 from public.client_memberships where client_id = target_id
    and plan_code = 'plus' and status = 'active' and active_plan_months = 3) then
    raise exception 'LP000005 no tiene el plan trimestral esperado';
  end if;
  if exists(select 1 from public.provider_service_offers where provider_id = target_id)
    or exists(select 1 from public.provider_completed_works where provider_id = target_id) then
    raise exception 'La cuenta ya tiene servicios o trabajos; no ejecutar prueba de escritura';
  end if;

  foreach months in array array[1,3,6,12] loop
    update public.client_memberships set active_plan_months = months where client_id = target_id;
    expected_services := case months when 1 then 3 when 3 then 5 when 6 then 8 else 10 end;
    expected_requests := case months when 1 then 3 when 3 then 5 when 6 then 10 else 20 end;
    expected_aspects := case months when 1 then 3 when 3 then 3 when 6 then 5 else 7 end;
    if public.account_plan_limit(target_id, 'services') <> expected_services
      or public.account_plan_limit(target_id, 'works') <> expected_services
      or public.account_plan_limit(target_id, 'weekly_requests') <> expected_requests
      or public.account_plan_limit(target_id, 'review_aspects') <> expected_aspects then
      raise exception 'Beneficios incorrectos para plan de % meses', months;
    end if;
    for slot in 1..expected_services loop
      insert into public.provider_service_offers(provider_id, family, specialization, specializations, description, position)
      values(target_id, 'Prueba', 'Servicio de prueba', array['Servicio de prueba'], 'Descripción de prueba temporal', slot);
      insert into public.provider_completed_works(provider_id, work_code, service_label, description, position)
      values(target_id, 'TR' || lpad(slot::text, 2, '0'), 'Servicio de prueba', 'Trabajo de prueba temporal', slot);
    end loop;
    blocked := false;
    begin
      insert into public.provider_service_offers(provider_id, family, specialization, specializations, description, position)
      values(target_id, 'Prueba', 'Servicio de prueba', array['Servicio de prueba'], 'Descripción de prueba temporal', expected_services + 1);
    exception when others then
      if sqlerrm = 'SERVICE_LIMIT' then blocked := true; else raise; end if;
    end;
    if not blocked then raise exception 'Servicios excedidos habilitados en plan de % meses', months; end if;
    blocked := false;
    begin
      insert into public.provider_completed_works(provider_id, work_code, service_label, description, position)
      values(target_id, 'TR' || lpad((expected_services + 1)::text, 2, '0'), 'Servicio de prueba', 'Trabajo de prueba temporal', expected_services + 1);
    exception when others then
      if sqlerrm = 'PORTFOLIO_LIMIT' then blocked := true; else raise; end if;
    end;
    if not blocked then raise exception 'Trabajos excedidos habilitados en plan de % meses', months; end if;
    delete from public.provider_completed_works where provider_id = target_id;
    delete from public.provider_service_offers where provider_id = target_id;
  end loop;
  update public.client_memberships set active_plan_months = 3 where client_id = target_id;

  select user_id into admin_id from public.user_roles where role = 'admin' limit 1;
  if admin_id is null then raise exception 'No hay administrador para probar la bandeja'; end if;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  select * into reviewed from public.reviews where moderated_at is null limit 1;
  if reviewed.id is null then raise exception 'No hay reseña pública para la prueba'; end if;
  perform public.admin_moderate_review(reviewed.id, 'acknowledge');
  if not exists (select 1 from public.reviews where id = reviewed.id and moderated_at is null) then
    raise exception 'OK ocultó una reseña pública';
  end if;
  select exists(select 1 from jsonb_array_elements(public.admin_list_reviews()) item
    where item->>'id' = reviewed.id::text) into listed;
  if listed then raise exception 'OK no quitó la reseña de la bandeja'; end if;

  insert into public.reports(reporter_id, target_type, target_id, category, details)
  values(reviewed.client_id, 'review', reviewed.id, 'review_appeal', 'Prueba reversible');
  select exists(select 1 from jsonb_array_elements(public.admin_list_reviews()) item
    where item->>'id' = reviewed.id::text and (item->>'report_count')::integer > 0) into listed;
  if not listed then raise exception 'Reporte no reabrió la alerta'; end if;
  perform public.admin_moderate_review(reviewed.id, 'acknowledge');
  if exists(select 1 from public.reports rp where rp.target_type = 'review' and rp.target_id = reviewed.id and rp.status = 'open') then
    raise exception 'OK no resolvió la alerta';
  end if;
end $$;
rollback;
