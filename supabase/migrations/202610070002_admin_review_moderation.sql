create or replace function public.admin_list_reviews()
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then raise exception 'Acceso administrativo requerido'; end if;
  return coalesce((
    select jsonb_agg(row_data order by created_at desc)
    from (
      select r.created_at, jsonb_build_object(
        'id', r.id,
        'created_at', r.created_at,
        'rating', r.rating,
        'comment', r.comment,
        'moderated_at', r.moderated_at,
        'client_name', coalesce(nullif(trim(client.full_name), ''), 'Cliente'),
        'provider_name', coalesce(nullif(trim(provider.full_name), ''), 'Prestador')
      ) as row_data
      from public.reviews r
      join public.profiles client on client.id = r.client_id
      join public.profiles provider on provider.id = r.provider_id
      order by r.created_at desc
      limit 100
    ) recent
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_moderate_review(p_review_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then raise exception 'Acceso administrativo requerido'; end if;
  if p_action not in ('hide', 'restore', 'delete') then raise exception 'Acción inválida'; end if;

  if p_action = 'delete' then
    delete from public.reviews where id = p_review_id;
  else
    update public.reviews set moderated_at = case when p_action = 'hide' then now() else null end
    where id = p_review_id;
  end if;
  if not found then raise exception 'Reseña inexistente'; end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, reason)
  values(auth.uid(), 'review_' || p_action, 'reviews', p_review_id::text, 'Moderación manual');
end $$;

revoke all on function public.admin_list_reviews() from public;
revoke all on function public.admin_moderate_review(uuid, text) from public;
grant execute on function public.admin_list_reviews() to authenticated;
grant execute on function public.admin_moderate_review(uuid, text) to authenticated;
