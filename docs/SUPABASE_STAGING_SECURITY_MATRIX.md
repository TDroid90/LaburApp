# Matriz de seguridad de Supabase staging

Fecha: 2026-09-26. Proyecto: `laburapp-staging` (`sdxvavgmvuyxtklrjxby`).

| Área | Garantía | Evidencia staging | Estado |
|---|---|---|---|
| Profiles | raw propio/admin; discovery mínima y contraparte legítima | pgTAP remoto + surface probe | PASS |
| Reviews | raw no público; RPC mínima; provider del job | pgTAP remoto | PASS |
| Requests | participantes; ownership inmutable; state machine | 82 pgTAP + flujo real cliente/provider | PASS |
| Messages | sólo participantes; sin mutación ajena | pgTAP cross-user | PASS |
| User roles | sin autoconcesión | pgTAP A/admin | PASS |
| Admin Premium | autorización interna por rol | anon/normal/admin/nonexistent/upsert/update | PASS |
| Purge | sólo backend | cron probe 5/5 | PASS |
| Functions | owner/search_path/allowlist | function suite + catálogo EXECUTE | PASS |
| Storage público | lectura pública; mutación owner-only | E2E dos usuarios | PASS |
| Storage privado | aislamiento por owner/participante | 4/4 lecturas y 7/7 deletes ajenos protegidos | PASS |
| Realtime | RLS filtra eventos | A recibió 0 eventos de B y 1 propio | PASS |
| QR | expiración, un uso, binding y concurrencia | hosted E2E | PASS |
| Outboxes | owner, entidad, raíz y paths | pgTAP; worker externo no ejecutado | DB PASS / DRIVE PENDING |
| Auth refresh/logout | refresh revocado y Auth fail-closed | hosted E2E | PASS |
| Access JWT revocado | invalidación inmediata en PostgREST | JWT sigue válido hasta expiry | RIESGO ACEPTADO/PENDIENTE |

## Superficie ANON efectiva

### Policies de lectura pública

`categories`, `certification_types`, `membership_plans`, `provider_availability`, `provider_completed_works`, `provider_portfolio_items`, `provider_profiles`, `provider_service_offers`, `provider_services`, `rank_definitions`, `service_dictionary` y `skills`.

Aunque el rol tiene grants de tabla heredados por PostgREST, RLS bloquea las demás filas. Las únicas RPC ejecutables sin login son:

- `discover_published_providers()`
- `discover_published_reviews()`

Storage público: `avatars`, `profile-photos`, `portfolio`. No hay suscripción Realtime útil sin que RLS permita la fila.

## Superficie AUTHENTICATED efectiva

RPC cliente permitidas:

- `accept_service_quote`, `cancel_service_request`, `complete_password_change`;
- ambos overloads de `confirm_completion_token`;
- discovery pública, `enable_provider_mode`, `get_visible_profile_summaries`, `has_role`;
- `is_active_published_provider`, `issue_completion_token`, `mark_service_request_quote_sent`;
- `provider_confirm_completion`, `request_quote_revision`, `save_own_provider_profile`, `undo_cancel_service_request`.

RPC administrativas visibles por grant pero con autorización interna obligatoria:

- `admin_platform_metrics`;
- `admin_review_credential`;
- `admin_set_premium_by_public_id`.

La suite confirma que un authenticated normal no obtiene privilegios administrativos.

## Realtime exacto

Sólo: `service_requests`, `quotes`, `messages`, `credentials`, `subscription_requests`.

## Buckets exactos

- Públicos: `avatars`, `profile-photos`, `portfolio`.
- Privados: `private-documents`, `request-photos`, `provider-credentials`, `private-receipts`.

## Service role

Se usó sólo dentro de runners temporales del backend para preparar/limpiar fixtures. No se imprimió, no se guardó en Git y no aparece en `EXPO_PUBLIC_*`, bundle, AsyncStorage ni SecureStore cliente.
