create or replace function public.save_own_provider_profile(p_profile jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_city text := nullif(trim(p_profile->>'city'), '');
  v_full_name text := trim(coalesce(p_profile->>'display_name', ''));
  v_trade text := trim(coalesce(p_profile->>'trade', ''));
  v_secondary_trade text := nullif(trim(coalesce(p_profile->>'secondary_trade', '')), '');
  v_diagnostic_price numeric := greatest(coalesce((p_profile->>'diagnostic_price')::numeric, 0), 0);
  v_start time := coalesce(nullif(p_profile->>'availability_start', '')::time, '08:00'::time);
  v_end time := coalesce(nullif(p_profile->>'availability_end', '')::time, '18:00'::time);
  v_public_id text;
  v_item jsonb;
  v_position integer := 0;
  v_specializations text[];
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;
  if char_length(v_full_name) not between 2 and 100 then
    raise exception using errcode = '22023', message = 'INVALID_DISPLAY_NAME';
  end if;
  if v_city not in ('San Sebastián', 'Río Grande', 'Tolhuin', 'Almanza', 'Ushuaia') then
    raise exception using errcode = '22023', message = 'INVALID_CITY';
  end if;
  if char_length(v_trade) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'INVALID_TRADE';
  end if;
  if v_start >= v_end then
    raise exception using errcode = '22023', message = 'INVALID_AVAILABILITY';
  end if;
  if jsonb_typeof(coalesce(p_profile->'services', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_profile->'services', '[]'::jsonb)) > 2 then
    raise exception using errcode = '22023', message = 'FREE_SERVICE_LIMIT';
  end if;

  insert into public.profiles(id, full_name, city, avatar_path)
  values(v_user_id, v_full_name, v_city, nullif(p_profile->>'avatar_path', ''))
  on conflict(id) do update set
    full_name = excluded.full_name,
    city = excluded.city,
    avatar_path = excluded.avatar_path,
    updated_at = now()
  returning public_id into v_public_id;

  insert into public.user_roles(user_id, role)
  values(v_user_id, 'provider'::public.app_role)
  on conflict(user_id, role) do nothing;

  insert into public.provider_profiles(
    user_id, trade_title, diagnostic_price, bio, skills_text, training,
    certifications, zones, availability, availability_start, availability_end, published
  ) values (
    v_user_id,
    concat_ws(' · ', v_trade, v_secondary_trade),
    v_diagnostic_price,
    nullif(trim(coalesce(p_profile->>'bio', '')), ''),
    nullif(trim(coalesce(p_profile->>'skills', '')), ''),
    nullif(trim(coalesce(p_profile->>'training', '')), ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'certifications', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'zones', '[]'::jsonb))), array[v_city]),
    nullif(trim(coalesce(p_profile->>'availability', '')), ''),
    v_start,
    v_end,
    true
  )
  on conflict(user_id) do update set
    trade_title = excluded.trade_title,
    diagnostic_price = excluded.diagnostic_price,
    bio = excluded.bio,
    skills_text = excluded.skills_text,
    training = excluded.training,
    certifications = excluded.certifications,
    zones = excluded.zones,
    availability = excluded.availability,
    availability_start = excluded.availability_start,
    availability_end = excluded.availability_end,
    published = true;

  delete from public.provider_services where provider_id = v_user_id;
  insert into public.provider_services(provider_id, trade_name, position, active)
  values(v_user_id, v_trade, 1, true);
  if v_secondary_trade is not null and v_secondary_trade <> v_trade then
    insert into public.provider_services(provider_id, trade_name, position, active)
    values(v_user_id, v_secondary_trade, 2, true);
  end if;

  delete from public.provider_rate_items where provider_id = v_user_id;
  insert into public.provider_rate_items(
    provider_id, trade_name, label, unit, unit_price, pricing_mode,
    availability_start, availability_end, slot_position, active
  ) values (
    v_user_id, v_trade, 'Diagnóstico / visita técnica', 'visita', v_diagnostic_price,
    'starting_at', v_start, v_end, 1, true
  );

  delete from public.provider_service_offers where provider_id = v_user_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_profile->'services', '[]'::jsonb))
  loop
    v_position := v_position + 1;
    v_specializations := coalesce(
      array(select jsonb_array_elements_text(coalesce(v_item->'specializations', '[]'::jsonb))),
      array[trim(coalesce(v_item->>'service', v_trade))]
    );
    if cardinality(v_specializations) = 0 then
      v_specializations := array[trim(coalesce(v_item->>'service', v_trade))];
    end if;
    v_specializations := v_specializations[1:2];
    insert into public.provider_service_offers(
      provider_id, family, specialization, specializations, description, position, active
    ) values (
      v_user_id,
      left(trim(coalesce(v_item->>'family', v_trade)), 80),
      left(array_to_string(v_specializations, ' · '), 120),
      v_specializations,
      left(trim(coalesce(v_item->>'description', 'Servicio profesional publicado en LaburApp.')), 240),
      v_position,
      true
    );
  end loop;

  return v_public_id;
end;
$$;

revoke all on function public.save_own_provider_profile(jsonb) from public;
grant execute on function public.save_own_provider_profile(jsonb) to authenticated;

create or replace function public.discover_published_providers()
returns table (
  provider_id uuid,
  public_id text,
  display_name text,
  city text,
  avatar_path text,
  trade_title text,
  skills_text text,
  bio text,
  certifications text[],
  diagnostic_price numeric,
  availability_start time,
  availability_end time,
  completed_jobs integer,
  rating numeric,
  verified boolean,
  works jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pp.user_id,
    p.public_id,
    p.full_name,
    p.city,
    p.avatar_path,
    pp.trade_title,
    pp.skills_text,
    pp.bio,
    pp.certifications,
    pp.diagnostic_price,
    pp.availability_start,
    pp.availability_end,
    pp.completed_jobs,
    pp.rating,
    pp.verified_at is not null,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cw.id,
          'title', cw.service_label,
          'description', cw.description,
          'photos', coalesce((
            select jsonb_agg(pi.storage_path order by pi.photo_position)
            from public.provider_portfolio_items pi
            where pi.work_id = cw.id and pi.provider_id = pp.user_id
          ), '[]'::jsonb)
        ) order by cw.position
      )
      from public.provider_completed_works cw
      where cw.provider_id = pp.user_id
    ), '[]'::jsonb)
  from public.provider_profiles pp
  join public.profiles p on p.id = pp.user_id
  where pp.published = true and p.account_status = 'active'
  order by pp.completed_jobs desc, pp.rating desc nulls last, pp.created_at desc;
$$;

grant execute on function public.discover_published_providers() to anon, authenticated;
