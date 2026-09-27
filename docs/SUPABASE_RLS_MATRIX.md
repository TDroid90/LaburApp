# Matriz RLS efectiva

Fecha: 2026-09-23. Fuente: migraciones aplicadas en Supabase local y `pg_policies`. `owner` significa el usuario dueño de la fila o participante explícito; `other` es otro autenticado sin relación. `admin` exige una fila real en `user_roles`, nunca un flag del cliente. `service_role` no se incluye: es backend privilegiado y omite RLS.

| Tabla | Operación | Anon | Auth owner/participante | Auth other | Admin | Policy / función responsable | Estado |
|---|---|---:|---:|---:|---:|---|---|
| `app_settings` | todas | no | no | no | no | sin policy; backend | CERRADO |
| `audit_logs` | SELECT | no | no | no | sí | `admin ve auditoria` | OK |
| `audit_logs` | I/U/D | no | no | no | no | backend/triggers | CERRADO |
| `categories` | SELECT activo | sí | sí | sí | sí | `catalogo publico` | OK PÚBLICO |
| `categories` | I/U/D | no | no | no | no | backend | CERRADO |
| `certification_types` | SELECT activo | sí | sí | sí | sí | `diccionario certificaciones publico` | OK PÚBLICO |
| `certification_types` | I/U/D | no | no | no | sí | `administracion gestiona certificaciones` | OK |
| `client_drive_media_outbox` | SELECT | no | sí | no | sí | `cliente ve copia...` | OK |
| `client_drive_media_outbox` | INSERT | no | sí, request+attachment propio, root/path fijos | no | no por cliente | `cliente registra...` + constraints | OK PROBADO |
| `client_drive_media_outbox` | U/D | no | no | no | no | worker/backend | CERRADO |
| `client_memberships` | SELECT | no | sí | no | sí | `cliente ve su membresia` | OK |
| `client_memberships` | I/U/D | no | no | no | sí | `admin administra...` | OK |
| `client_request_attachments` | SELECT | no | sí | no | sí | `participantes ven fotos...` | OK |
| `client_request_attachments` | INSERT/DELETE | no | cliente dueño | no | DELETE sí | policies de attachment | OK |
| `client_request_attachments` | UPDATE | no | no | no | no | sin policy | CERRADO |
| `completion_confirmations` | SELECT | no | sí | no | sí | `participantes ven confirmacion` | OK |
| `completion_confirmations` | I/U/D | no | no | no | no | RPC/backend | CERRADO |
| `completion_tokens` | todas | no | no | no | no | RPC `issue/confirm_completion_token` | CERRADO |
| `credentials` | SELECT | no | dueño | no | admin/mod | `credenciales privadas` | OK |
| `credentials` | INSERT | no | dueño | no | no | `proveedor carga credencial` | OK |
| `credentials` | UPDATE/DELETE | no | dueño, control protegido | no | admin/mod según operación | policies + trigger | OK |
| `drive_media_outbox` | SELECT | no | proveedor dueño | no | sí | `prestador ve copia...` | OK |
| `drive_media_outbox` | INSERT | no | dueño de work+portfolio, root/path fijos | no | no por cliente | `prestador registra...` + constraints | OK PROBADO |
| `drive_media_outbox` | U/D | no | no | no | no | worker/backend | CERRADO |
| `job_events` | SELECT | no | participantes | no | sí | `participantes ven eventos` | OK |
| `job_events` | I/U/D | no | no | no | no | backend | CERRADO |
| `jobs` | SELECT | no | participantes | no | sí | `participantes ven trabajos` | OK |
| `jobs` | I/U/D | no | no | no | no | RPC/backend | CERRADO |
| `membership_plans` | SELECT activo | sí | sí | sí | sí | `planes publicos` | OK PÚBLICO |
| `membership_plans` | I/U/D | no | no | no | no | backend | CERRADO |
| `messages` | SELECT | no | participantes | no | admin/mod | `participantes ven mensajes` | OK |
| `messages` | INSERT | no | participante y sender propio | no | sólo si participante | `participantes envian mensajes` + trigger | OK |
| `messages` | U/D | no | no | no | no | sin policy | CERRADO |
| `notifications` | SELECT/UPDATE | no | dueño | no | SELECT sí | policies de notificación | OK |
| `notifications` | INSERT/DELETE | no | no | no | no | backend | CERRADO |
| `payment_disputes` | SELECT/INSERT | no | participantes | no | SELECT sí | policies de disputas | OK |
| `payment_disputes` | UPDATE | no | no | no | sí | `admin resuelve disputas` | OK |
| `payment_refunds` | SELECT | no | participantes | no | sí | `participantes ven reintegros` | OK |
| `payment_refunds` | I/U/D | no | no | no | no | backend | CERRADO |
| `payments` | SELECT | no | participantes | no | sí | `participantes ven pagos` | OK |
| `payments` | I/U/D | no | no | no | no | backend | CERRADO |
| `platform_fee_snapshots` | todas | no | no | no | no | backend | CERRADO |
| `profiles` | SELECT fila cruda | no | sólo propia | no | sí | `perfil propio` | OK MINIMIZADO |
| `profiles` | SELECT público/contraparte | RPC mínima | RPC mínima | sólo proveedor publicado | sí | `discover_published_providers`, `get_visible_profile_summaries` | OK PROBADO |
| `profiles` | I/U/D | no | propia, campos control protegidos | no | sí | `perfil propio` + trigger | OK PROBADO |
| `provider_availability` | SELECT | publicado disponible | dueño | publicado disponible | sí | `disponibilidad publicada` | OK PÚBLICO |
| `provider_availability` | I/U/D | no | proveedor dueño | no | sí | `prestador administra...` | OK |
| `provider_completed_works` | SELECT | si proveedor publicado | dueño | si publicado | sí | `trabajos realizados publicados` | OK PÚBLICO |
| `provider_completed_works` | I/U/D | no | proveedor dueño | no | sí | `prestador administra...` | OK |
| `provider_followers` | SELECT | no | seguidor/proveedor | no | sí | `seguimientos propios` | OK |
| `provider_followers` | INSERT/DELETE | no | seguidor propio | no | DELETE sí | policies de seguimiento | OK |
| `provider_memberships` | SELECT | no | proveedor dueño | no | sí | `membresia propia` | OK |
| `provider_memberships` | I/U/D | no | no | no | sí | `admin administra membresias` | OK |
| `provider_portfolio_items` | SELECT | si proveedor publicado | dueño | si publicado | sí | `portfolio publicado` | OK PÚBLICO |
| `provider_portfolio_items` | I/U/D | no | proveedor dueño | no | sí | `prestador administra portfolio` | OK |
| `provider_profiles` | SELECT | sólo publicados | dueño | sólo publicados | sí | `prestadores publicados` | OK PÚBLICO |
| `provider_profiles` | I/U/D | no | proveedor dueño | no | sí | `prestador administra perfil` + trigger | OK |
| `provider_quote_templates` | todas | no | proveedor dueño | no | sí | `plantillas privadas` | OK PRIVADO |
| `provider_rate_items` | todas | no | proveedor dueño | no | sí | policies tarifario | OK PRIVADO |
| `provider_service_offers` | SELECT | activos | dueño | activos | sí | `servicios publicados` | OK PÚBLICO |
| `provider_service_offers` | I/U/D | no | proveedor dueño | no | sí | `prestador administra servicios` | OK |
| `provider_services` | SELECT | activos | dueño | activos | sí | `oficios publicados` | OK PÚBLICO |
| `provider_services` | I/U/D | no | proveedor dueño | no | sí | `prestador administra oficios` | OK |
| `push_tokens` | todas | no | dueño | no | no | `usuario administra push` | OK PRIVADO |
| `quotes` | SELECT | no | participantes | no | sí | `participantes ven presupuestos` | OK |
| `quotes` | INSERT | no | proveedor asignado | no | no | `prestador crea presupuestos` | OK |
| `quotes` | U/D | no | no | no | no | lifecycle RPC/backend | CERRADO |
| `rank_definitions` | SELECT | sí | sí | sí | sí | `rangos publicos` | OK PÚBLICO |
| `rank_definitions` | I/U/D | no | no | no | no | backend | CERRADO |
| `receipt_drive_outbox` | SELECT | no | dueño | no | sí | `titular ve copia...` | OK |
| `receipt_drive_outbox` | INSERT | no | receipt real propio, root/path seguro | no | no por cliente | policy + constraints | OK PROBADO |
| `receipt_drive_outbox` | U/D | no | no | no | no | worker/backend | CERRADO |
| `reports` | SELECT | no | reportante | no | admin/mod | `moderacion ve denuncias` | OK |
| `reports` | INSERT | no | reporter propio | no | no | `cliente denuncia` | OK |
| `reports` | U/D | no | no | no | no | backend | CERRADO |
| `reviews` | SELECT fila cruda | no | cliente/proveedor | no | admin/mod | `participantes ven sus resenas` | OK MINIMIZADO |
| `reviews` | SELECT público | RPC mínima | RPC mínima | RPC mínima | sí | `discover_published_reviews` | OK PROBADO |
| `reviews` | INSERT | no | cliente de job verificado y proveedor exacto | no | no | `cliente crea resena verificada` | OK PROBADO |
| `reviews` | UPDATE | no | autor ≤5 min, identidad inmutable | no | trigger permite admin | policy + `protect_review_identity` | OK |
| `reviews` | DELETE | no | no | no | no | sin policy | CERRADO |
| `service_dictionary` | SELECT activo | sí | sí | sí | sí | `diccionario publico` | OK PÚBLICO |
| `service_dictionary` | I/U/D | no | no | no | no | backend | CERRADO |
| `service_requests` | SELECT | no | participantes | no | admin/mod | `participantes ven solicitudes` | OK |
| `service_requests` | INSERT | no | cliente, proveedor publicado, estado inicial limpio | no | no por cliente | `cliente crea solicitud` | OK PROBADO |
| `service_requests` | UPDATE | no directo; RPC | no directo; RPC | no | RPC admin/service | máquina de estados trigger | OK PROBADO |
| `service_requests` | DELETE | no | no | no | no | sin policy | CERRADO |
| `sheet_mirror_outbox` | todas | no | no | no | no | triggers/worker | CERRADO |
| `skills` | SELECT | sí | sí | sí | sí | `skills publicas` | OK PÚBLICO |
| `skills` | I/U/D | no | no | no | no | backend | CERRADO |
| `subscription_requests` | SELECT | no | dueño | no | sí | `titular y admin ven...` | OK |
| `subscription_requests` | INSERT | no | dueño, pending, receipt propio | no | no | `titular solicita suscripcion` | OK |
| `subscription_requests` | U/D | no | no | no | RPC admin para premium | CERRADO |
| `user_roles` | SELECT | no | rol propio | no | sí | `roles propios lectura` | OK |
| `user_roles` | I/U/D | no | no | no | no directo | trigger/backend | CERRADO |

## Storage (`storage.objects`)

| Bucket | Operación | Anon | Auth owner/participante | Auth other | Admin/mod | Policy | Estado |
|---|---|---:|---:|---:|---:|---|---|
| `avatars` | SELECT | sí | sí | sí | sí | `fotos publicas` | PÚBLICO INTENCIONAL |
| `avatars` | I/U/D | no | sólo `uid/perfil.jpg` | no | no por cliente | policies avatar exacto | OK PROBADO |
| `profile-photos` | SELECT | URL bucket público | URL pública | URL pública | sí | bucket público | PÚBLICO INTENCIONAL |
| `profile-photos` | I/U/D | no | carpeta propia | no | no por cliente | policies foto perfil | OK PROBADO |
| `portfolio` | SELECT | sí | sí | sí | sí | `fotos publicas` | PÚBLICO INTENCIONAL |
| `portfolio` | I/U/D | no | carpeta propia | no | no por cliente | policies portfolio | OK PROBADO |
| `private-documents` | todas | no | owner; lectura admin/mod | no | lectura/admin/mod | `documentos privados propios` | OK PROBADO |
| `request-photos` | SELECT | no | participantes del request | no | admin | `participantes leen...` | OK PROBADO |
| `request-photos` | INSERT/DELETE | no | carpeta propia | no | DELETE admin | policies request storage | OK PROBADO |
| `provider-credentials` | SELECT | no | dueño | no | admin/mod | `comprobantes privados` | OK PROBADO |
| `provider-credentials` | I/U/D | no | carpeta propia | no | admin según policy | policies credenciales | OK PROBADO |
| `private-receipts` | SELECT | no | dueño; proveedor relacionado sólo finalización | no | admin | policies comprobantes | OK PROBADO |
| `private-receipts` | INSERT | no | carpeta propia | no | no por cliente | `titular carga comprobantes` | OK PROBADO |
| `private-receipts` | UPDATE/DELETE | no | no | no | no | sin policy cliente | CERRADO |

## RPC fuera de RLS

- `anon`: sólo las dos RPC públicas de discovery minimizado.
- `authenticated`: allowlist explícita de negocio; las RPC administrativas vuelven a validar `user_roles`.
- `purge_expired_client_data()` y `apply_annual_credential_review_due()`: sólo `service_role`.
- Funciones trigger: no tienen EXECUTE para `anon` ni `authenticated`.

