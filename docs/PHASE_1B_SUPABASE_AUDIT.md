# Auditoría Supabase — Fase 1B

Fecha: 2026-09-22. Alcance: `supabase/config.toml`, todas las migraciones, templates, cliente mobile, APIs serverless y configuración versionada. No se consultó ni modificó producción; los valores efectivos del Dashboard quedan marcados como verificación manual.

## Resumen

- 43 tablas de aplicación en `public`; las 43 habilitan RLS en las migraciones.
- 7 buckets: 3 públicos/intencionalmente públicos y 4 privados, incluido `private-documents`.
- Todas las funciones `SECURITY DEFINER` encontradas fijan `search_path = ''`.
- Riesgo corregido en migración pendiente de aplicar: EXECUTE implícito para `PUBLIC` en funciones PostgreSQL.
- Riesgos pendientes: exposición por columna en `profiles`/`reviews`, RPC global de purga autenticado, actualización amplia de solicitudes y parámetros de outboxes de Drive.
- No se encontraron secretos con valor versionados. Sólo nombres de variables/placeholders y IDs de carpetas no secretos.

## Auth

| Control | Estado en repositorio | Riesgo/acción |
|---|---|---|
| Email/password | Usado con `signUp` y `signInWithPassword` | Correcto; contraseña cliente exige 12 caracteres, mayúscula/minúscula, número y símbolo. Confirmar la misma policy en Dashboard. |
| Confirmación de email | La UI contempla `signUp` sin sesión y pide confirmar | Confirmar que “Confirm email” esté activo en el proyecto hospedado. |
| Recuperación | `resetPasswordForEmail`; web vuelve al origin configurado y Android a `laburapp://recover-password` | Redirect nativo agregado a config local. Probar links reales en build instalada. |
| Sesión/refresh | Supabase JS con `persistSession` y `autoRefreshToken`; storage seguro nativo | Cubierto por tests del adaptador; web usa almacenamiento del navegador y requiere mitigaciones XSS/CSP del hosting. |
| Logout | `supabase.auth.signOut()`; adapter borra ciphertext y clave | Cubierto por test unitario. |
| Redirect abierto | Redirects construidos desde origin actual, env o `Linking.createURL`; no aceptan URL del usuario | Bien en código. En producción registrar URLs exactas, no `/**`. |
| Site URL | `config.toml` quedó sólo para localhost | Configurar manualmente el dominio HTTPS en Dashboard. |
| Deep links | Esquema `laburapp`; recuperación implementada | App Links/Universal Links no implementados. Custom scheme puede ser reclamado por otra app; usar enlaces HTTPS asociados después del dominio. |
| Enumeración | Login es genérico; recuperación confirma siempre envío; registro ya no confirma explícitamente que el correo existe | Verificar comportamiento real de “secure email change” y signup obfuscation del proyecto. |
| Rate limiting | Supabase dispone de límites, pero no están versionados aquí | Leer/configurar Authentication > Rate Limits. Probar 429 y mensajes. |
| CAPTCHA | No hay widget/token CAPTCHA | Pendiente antes de apertura pública; requiere hCaptcha o Turnstile y configuración Dashboard, no se inventaron claves. |
| Token expiry | No aparece en repo | Verificar JWT expiry, refresh token reuse interval y session time-boxing en Dashboard según riesgo. |

## Plantillas de email necesarias

| Plantilla | ¿Se usa? | Archivo/variables |
|---|---|---|
| Confirm signup | Sí | `supabase/templates/confirmation.html`: `{{ .Data.full_name }}`, `{{ .ConfirmationURL }}` |
| Reset password | Sí | `recovery.html`: `{{ .Email }}`, `{{ .ConfirmationURL }}` |
| Change email | Preparada; no hay pantalla actual de cambio | `email-change.html`: `{{ .NewEmail }}`, `{{ .ConfirmationURL }}`. Mantener si Supabase permite cambio de email. |
| Password changed notification | Sí, defensa en profundidad | `password-changed.html`: `{{ .Email }}`; debe estar habilitada en Dashboard. |
| Magic link/OTP | No usado | No personalizar/activar por esta fase. |
| Invite user | No usado | No necesario. |
| Reauthentication | No usado | Evaluar sólo si se agregan operaciones sensibles que lo requieran. |

Las plantillas dejaron de depender de una imagen alojada en el host anterior; el branding usa texto/CSS y `ConfirmationURL` generado por Supabase. No se configuró SMTP.

## Matriz RLS completa

Convenciones: “RPC/servidor” significa que no existe policy cliente para esa operación; RLS deniega por defecto. Las policies `ALL` cubren SELECT/INSERT/UPDATE/DELETE además de policies más específicas.

| Tabla | RLS | SELECT | INSERT | UPDATE | DELETE | Actor/condición | Riesgo / acción |
|---|---|---|---|---|---|---|---|
| `app_settings` | Sí | — | — | — | — | RPC/servidor | Bien cerrada. |
| `audit_logs` | Sí | admin | — | — | — | `has_role(admin)` | Escritura por triggers/RPC. |
| `categories` | Sí | público activo | — | — | — | `active` | `USING(active)` intencional. |
| `certification_types` | Sí | público activo/admin | admin | admin | admin | admin con `ALL` | Correcto. |
| `client_drive_media_outbox` | Sí | dueño/admin | dueño/admin | — | — | `client_id=auth.uid()` | **Pendiente:** validar raíz/ruta contra allowlist antes del worker. |
| `client_memberships` | Sí | dueño/admin | admin | admin | admin | admin `ALL` | Correcto. |
| `client_request_attachments` | Sí | participantes/admin | cliente dueño de solicitud | — | cliente/admin | join a solicitud | Correcto. |
| `completion_confirmations` | Sí | participantes/admin | — | — | — | cliente/proveedor del trabajo | Escritura sólo RPC. |
| `completion_tokens` | Sí | — | — | — | — | RPC/servidor | Correcto: hashes no visibles. |
| `credentials` | Sí | dueño/mod/admin | dueño | dueño/mod/admin | dueño/admin | trigger protege campos de revisión | Revisar tests negativos; diseño razonable. |
| `drive_media_outbox` | Sí | dueño/admin | dueño/admin | — | — | `provider_id=auth.uid()` | **Pendiente:** policy no limita raíz/ruta/estado como `receipt_drive_outbox`. |
| `job_events` | Sí | participantes/admin | — | — | — | join a job | Escritura servidor. |
| `jobs` | Sí | participantes/admin | — | — | — | IDs de participantes | Mutación por RPC. |
| `membership_plans` | Sí | público activo | — | — | — | `active` | Catálogo público intencional. |
| `messages` | Sí | participantes/mod/admin | participante remitente | — | — | join a solicitud | Trigger bloquea contacto/precio; falta test RLS automatizado. |
| `notifications` | Sí | dueño/admin | — | dueño | — | sólo propia; UPDATE propia | `WITH CHECK` conserva dueño. |
| `payment_disputes` | Sí | participantes/admin | participante/opened_by propio | admin | — | join a job | Correcto para modelo actual. |
| `payment_refunds` | Sí | participantes/admin | — | — | — | payment→job | Mutación servidor. |
| `payments` | Sí | participantes/admin | — | — | — | job | Pagos reales no activos. |
| `platform_fee_snapshots` | Sí | — | — | — | — | servidor | Correcto. |
| `profiles` | Sí | propio/admin; participante; identidad de proveedor publicado | propio/admin | propio/admin | propio/admin | `id=auth.uid()` y policies adicionales | **Riesgo:** SELECT público de proveedor devuelve todas las columnas; UPDATE propio abarca `must_change_password`. Trigger nuevo protege `public_id`, `account_status`, `created_at`, no todo. Crear proyección pública y RPC específico en fase posterior. |
| `provider_availability` | Sí | dueño/admin o disponible+publicado | dueño/admin | dueño/admin | dueño/admin | owner | Público intencional. |
| `provider_completed_works` | Sí | dueño/admin o perfil publicado | dueño/admin | dueño/admin | dueño/admin | owner | Público intencional. |
| `provider_followers` | Sí | proveedor/seguidor/admin | seguidor propio | — | seguidor/admin | `follower_id=auth.uid()` | Correcto. |
| `provider_memberships` | Sí | dueño/admin | admin | admin | admin | admin `ALL` | Correcto. |
| `provider_portfolio_items` | Sí | dueño/admin o perfil publicado | dueño/admin | dueño/admin | dueño/admin | owner | Público intencional. |
| `provider_profiles` | Sí | publicado/dueño/admin | dueño/admin | dueño/admin | dueño/admin | owner; trigger protege verificación | Correcto, pero preferir RPC público de columnas mínimas. |
| `provider_quote_templates` | Sí | dueño/admin | dueño/admin | dueño/admin | dueño/admin | owner | Privada. |
| `provider_rate_items` | Sí | dueño/admin | dueño/admin | dueño/admin | dueño/admin | owner | Privada. |
| `provider_service_offers` | Sí | activo/dueño/admin | dueño/admin | dueño/admin | dueño/admin | owner | Catálogo público intencional. |
| `provider_services` | Sí | activo/dueño/admin | dueño/admin | dueño/admin | dueño/admin | owner | Catálogo público intencional. |
| `push_tokens` | Sí | dueño | dueño | dueño | dueño | `user_id=auth.uid()` | Correcto; bucket/tablas de backup excluidos en nativo. |
| `quotes` | Sí | participantes/admin | proveedor asignado | — | — | join a solicitud | Versiones nuevas por INSERT; lifecycle por RPC. |
| `rank_definitions` | Sí | público | — | — | — | `USING(true)` | Datos de catálogo, aceptable. |
| `receipt_drive_outbox` | Sí | dueño/admin | dueño con receipt existente/path seguro | — | — | checks de estado/path y FK lógica | Es el outbox más endurecido. |
| `reports` | Sí | reportante/mod/admin | reportante propio | — | — | `reporter_id=auth.uid()` | Correcto. |
| `reviews` | Sí | público si no moderada | cliente de job verificado | cliente ≤5 min | — | una por job (unique), límites plan | **Riesgo:** SELECT público expone IDs técnicos/linkables. Proyectar sólo campos públicos. |
| `service_dictionary` | Sí | público activo | — | — | — | `active` | Catálogo público. |
| `service_requests` | Sí | participantes/mod/admin | cliente propio | proveedor asignado/admin | — | provider policy de UPDATE | Trigger nuevo inmoviliza IDs/participantes/created_at. **Pendiente:** limitar columnas/transiciones restantes. |
| `sheet_mirror_outbox` | Sí | — | — | — | — | triggers/service role | Correcto, pero payload puede contener PII: asegurar destino y retención. |
| `skills` | Sí | público | — | — | — | `USING(true)` | Catálogo público. |
| `subscription_requests` | Sí | dueño/admin | dueño, `pending`, path propio | — | — | checks explícitos | Aprobación sólo RPC admin. |
| `user_roles` | Sí | propio/admin | — | — | — | propio/admin | Roles se crean por trigger/RPC. |

## Funciones y triggers

- Todas las definiciones `SECURITY DEFINER` inspeccionadas fijan `search_path = ''` y califican tablas/esquemas.
- RPCs de cliente con grants explícitos: aceptar/revisar/cancelar solicitudes, habilitar modo prestador, emitir/confirmar QR, guardar perfil, confirmar contraseña, discovery público y operaciones administrativas que vuelven a verificar `has_role(admin)`.
- `202609220001_function_execute_hardening.sql` revoca EXECUTE de `PUBLIC` para todas las funciones actuales y cambia el default para funciones futuras; conserva grants directos `anon`/`authenticated`.
- `admin_review_credential`, `admin_platform_metrics` y `admin_set_premium_by_public_id` verifican rol admin dentro de la función, además del grant authenticated.
- `discover_published_providers` es público por diseño y proyecta columnas concretas; no devuelve membership, credenciales ni campos de control.
- **Pendiente:** `purge_expired_client_data()` está concedida a cualquier autenticado y borra globalmente filas vencidas. No permite elegir parámetros, pero traslada mantenimiento al cliente y habilita abuso de carga. Mover a cron/service role y retirar el grant después de eliminar la llamada del cliente.
- Los nuevos triggers protegen `profiles.public_id/account_status/created_at` y ownership temporal de `service_requests`; no alteran flujos legítimos actuales.

## Storage

| Bucket | Público | Límite/MIME | Escritura | Lectura | Riesgo/acción |
|---|---|---|---|---|---|
| `avatars` | Sí | 5 MiB; JPEG/PNG/WebP | carpeta `auth.uid()`; no update/delete | público | Parece legado frente a `profile-photos`; confirmar uso y plan de limpieza. |
| `profile-photos` | Sí | 5 MiB; JPEG/PNG/WebP | insert/update/delete en carpeta propia | URL pública por diseño | Adecuado para avatar público. |
| `portfolio` | Sí | 10 MiB; JPEG/PNG/WebP | carpeta propia, incluido update/delete | público | Archivos de perfiles no publicados siguen accesibles por URL pública. Si eso no es aceptable, migrar a privado + signed URLs. |
| `private-documents` | No | 10 MiB; JPEG/PNG/PDF | carpeta propia | dueño/mod/admin | Policy `ALL` exige owner en WITH CHECK; correcta, pero confirmar si sigue usada. |
| `request-photos` | No | 2 MiB; sólo JPEG | carpeta propia | participantes/admin mediante attachment | Correcto. Signed URLs deben ser breves; el cliente actual usa 5 días acorde al flujo. |
| `provider-credentials` | No | 3 MiB; sólo JPEG | carpeta propia; update/delete dueño/admin | dueño/mod/admin | Correcto; retención depende del job/API externo y debe monitorizarse. |
| `private-receipts` | No | 3 MiB; sólo JPEG | carpeta propia | dueño/admin y proveedor sólo si comprobante de finalización relacionado | Sin update/delete cliente, apropiado. Verificar purga y Drive. |

Los buckets privados no dependen de URLs oscuras; las policies verifican usuario/relación. No se encontraron policies de overwrite cross-user.

## Secrets

- No hay valores `service_role`, JWT secret, contraseña de DB, claves privadas o credenciales admin versionados.
- `.env`, `.env.*` y variantes de apps están ignorados; `.env.example` sólo contiene nombres vacíos.
- `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY` se leen sólo en `api/*.mjs`, nunca desde variables `EXPO_PUBLIC_*`/`NEXT_PUBLIC_*`.
- IDs de carpetas Drive aparecen hardcodeados en código/migraciones. No son secretos, pero sí configuración de despliegue y deberían centralizarse antes de usar otro proyecto Drive.
- La anon/publishable key está permitida en cliente; su seguridad depende de RLS.

## Cambios aplicados en esta fase

1. Migración SQL no destructiva que revoca ejecución implícita de funciones y protege campos de ownership/control.
2. Redirect local nativo de recuperación agregado y host productivo viejo eliminado de config local.
3. Mensaje de registro deja de confirmar explícitamente existencia de cuenta.
4. Templates dejan de cargar branding desde un host anterior.

La migración fue creada, no aplicada a ninguna base.

## Acciones manuales en Supabase

1. Aplicar migraciones en staging y ejecutar casos owner/tercero/anon/admin/service role.
2. Revisar lista real de tablas/policies/functions con el Database Linter y compararla con estas migraciones.
3. Configurar Site URL y redirects exactos del dominio.
4. Confirmar email verification, secure email change, JWT expiry y refresh token reuse protection.
5. Configurar/medir rate limits; habilitar CAPTCHA antes de tráfico abierto.
6. Instalar SMTP sólo cuando exista remitente/dominio verificado.
7. Programar purga mediante cron/backend antes de retirar el RPC al cliente.
8. Verificar retención efectiva de credenciales, OCR, recibos y outboxes.
