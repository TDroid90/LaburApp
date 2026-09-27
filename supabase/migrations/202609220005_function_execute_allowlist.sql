-- Close implicit PostgREST RPC exposure. Trigger functions do not need client EXECUTE.
-- Future functions must be granted deliberately to the smallest required role set.
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Public directory projections contain no private UUIDs or control fields.
grant execute on function public.discover_published_providers() to anon, authenticated;
grant execute on function public.discover_published_reviews() to anon, authenticated;

-- Authorization helper used by authenticated RLS policies.
grant execute on function public.has_role(public.app_role) to authenticated;

-- Authenticated application RPC allowlist. Each function performs its own actor checks.
grant execute on function public.get_visible_profile_summaries(uuid[]) to authenticated;
grant execute on function public.enable_provider_mode() to authenticated;
grant execute on function public.mark_service_request_quote_sent(uuid) to authenticated;
grant execute on function public.cancel_service_request(uuid, text) to authenticated;
grant execute on function public.undo_cancel_service_request(uuid) to authenticated;
grant execute on function public.complete_password_change() to authenticated;
grant execute on function public.admin_review_credential(uuid, text, text, text, jsonb, text, text, jsonb) to authenticated;
grant execute on function public.accept_service_quote(uuid) to authenticated;
grant execute on function public.request_quote_revision(uuid, text) to authenticated;
grant execute on function public.issue_completion_token(uuid) to authenticated;
grant execute on function public.confirm_completion_token(text) to authenticated;
grant execute on function public.confirm_completion_token(text, text) to authenticated;
grant execute on function public.provider_confirm_completion(uuid) to authenticated;
grant execute on function public.save_own_provider_profile(jsonb) to authenticated;
grant execute on function public.admin_platform_metrics() to authenticated;
grant execute on function public.admin_set_premium_by_public_id(text, boolean) to authenticated;

-- Maintenance entry points are backend-only. Internal trigger calls are unaffected.
grant execute on function public.purge_expired_client_data() to service_role;
grant execute on function public.apply_annual_credential_review_due() to service_role;
