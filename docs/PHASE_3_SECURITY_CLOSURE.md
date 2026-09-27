# Fase 3 — Cierre de seguridad Supabase

Fecha: 2026-09-23. Alcance: repositorio y stack Supabase local. No se consultó ni modificó el proyecto hospedado, no se desplegó y no se ejecutó ninguna migración en producción.

## Resultado ejecutivo

- Las 43 tablas de aplicación conservan RLS habilitado.
- `profiles` ya no tiene lectura pública de la fila completa. La identidad mínima se entrega mediante `discover_published_providers()` y `get_visible_profile_summaries(uuid[])`.
- `reviews` ya no publica UUID internos. `discover_published_reviews()` entrega sólo `provider_public_id`, puntuación, comentario, cualidades y fecha.
- `service_requests` ahora valida inserts y transiciones en base de datos, inmoviliza identidad/contenido protegido y no permite reabrir estados terminales.
- `purge_expired_client_data()` quedó exclusivamente para `service_role` y se eliminó su invocación desde mobile.
- Las 40 funciones `SECURITY DEFINER` locales tienen owner `postgres` y `search_path = ''`; RPC quedó con allowlist explícita por rol.
- Los siete buckets fueron probados con actores reales. Las colas Drive validan ownership, raíz, ruta y registros fuente.
- Auth acepta únicamente el origen HTTPS configurado, localhost en desarrollo y `laburapp://recover-password` para recuperación nativa.
- Supabase local aplicó todas las migraciones; 74 pruebas pgTAP reales pasan.

## Migraciones nuevas

| Migración | Finalidad |
|---|---|
| `202609220002_public_data_minimization.sql` | Retira SELECT público crudo de `profiles`/`reviews` y crea proyecciones mínimas seguras. |
| `202609220003_request_state_machine_and_rpc_closure.sql` | Revoca purga al cliente, endurece INSERT de solicitudes e instala la máquina de estados. |
| `202609220004_storage_and_drive_hardening.sql` | Restringe avatar y outboxes a owner, raíces autorizadas y rutas sin traversal. |
| `202609220005_function_execute_allowlist.sql` | Revoca RPC implícitas a `anon`/`authenticated` y concede sólo las necesarias. |
| `202609220006_review_provider_binding.sql` | Corrige el vínculo reseña–proveedor para que coincida exactamente con el job verificado. |
| `202609220007_admin_premium_conflict_fix.sql` | Elimina una ambigüedad PL/pgSQL en el upsert administrativo de Premium y conserva su control de rol. |

Las constraints de outbox se agregaron `NOT VALID`: protegen toda fila nueva sin bloquear la migración por datos históricos. Antes de validarlas en producción hay que auditar/normalizar filas antiguas y ejecutar `VALIDATE CONSTRAINT` en una ventana controlada.

## Profiles

Clasificación real:

- Público mínimo: `public_id`, `full_name`, `city`, `avatar_path`, únicamente cuando corresponde a un prestador publicado.
- Propietario: su fila completa, excepto que triggers impiden alterar `public_id`, `account_status` y timestamps de control.
- Participantes: resumen mínimo de la contraparte mediante RPC.
- Admin: fila completa a través del rol real en `user_roles`.
- Privado/control: UUID interno, `account_status`, `must_change_password`, `created_at`, `updated_at`.

No hay email ni teléfono en `profiles`; el email permanece en `auth.users`. Ocultar columnas en UI no se usa como control.

## Reviews

La tabla cruda sólo es visible al cliente/proveedor involucrado, moderador o admin. La proyección pública no contiene `id`, `job_id`, `client_id` ni `provider_id`. Se mantiene reputación mediante `provider_public_id`, rating, comentario, cualidades y fecha.

Durante las pruebas apareció y se corrigió un defecto real: una referencia no calificada hacía equivalente `j.provider_id = j.provider_id`. La policy ahora exige `j.provider_id = reviews.provider_id`; un test demuestra que el cliente no puede atribuir su reseña a otro proveedor.

## Máquina de estados de service_requests

Los 18 valores del enum permanecen para compatibilidad, pero el flujo actual sólo permite las transiciones observadas en la aplicación:

| Estado actual | Estado permitido | Actor |
|---|---|---|
| `request_created` | `request_sent` | cliente |
| `request_sent` | `provider_reviewing` | proveedor asignado |
| `request_sent`, `provider_reviewing`, `quote_revision_requested` | `quote_sent` | proveedor asignado |
| `quote_sent` | `quote_revision_requested`, `quote_accepted` | cliente |
| `quote_accepted` | `client_confirmation_pending` | proveedor asignado |
| `client_confirmation_pending` | `completed` | cliente o proveedor del trabajo |
| `request_created`, `request_sent`, `provider_reviewing`, `quote_sent`, `quote_revision_requested` | `cancelled` | participante |
| `cancelled` | `previous_status` | quien canceló, dentro de 10 segundos |

Estados de pagos/disputas (`payment_pending`, `payment_authorized`, `funds_held`, `scheduled`, `in_progress`, `completion_proposed`, `funds_released`, `disputed`, `refunded`) no forman parte del flujo funcional actual y no pueden alcanzarse por escritura cliente. Si se activa pagos, deberá ampliarse la máquina mediante otra migración.

El trigger impide cambiar `id`, `client_id`, `provider_id`, descripción, zona, disponibilidad y `created_at`; valida metadatos de aceptación, finalización y cancelación. Las operaciones normales siguen entrando por las RPC existentes.

## Functions y RPC

- Owner efectivo de las 40 `SECURITY DEFINER`: `postgres`.
- Las 40 fijan `search_path = ''`.
- `anon`: sólo `discover_published_providers()` y `discover_published_reviews()`.
- `authenticated`: helper RLS y RPC de negocio explícitamente enumeradas en la migración `...005`.
- `service_role`: mantenimiento global, incluida purga y revisión anual.
- Funciones trigger: no ejecutables directamente por `anon` o `authenticated`.
- RPC administrativas conservan grant `authenticated` porque PostgREST necesita invocarlas, pero verifican `has_role('admin')` internamente; enviar `admin=true` desde el cliente no concede nada.

## Storage y Drive

Buckets públicos intencionales: `avatars`, `profile-photos`, `portfolio`. `portfolio` sigue público porque el directorio y los perfiles publicados consumen URLs públicas; migrarlo a signed URLs implicaría cambiar el producto y caché. Riesgo residual: conocer una URL válida permite ver el objeto aunque luego el perfil deje de publicarse. El owner es el único que puede insertar/modificar/borrar su ruta.

Buckets privados: `private-documents`, `request-photos`, `provider-credentials`, `private-receipts`. Los tests prueban que A no puede leer, escribir ni borrar objetos de C y que sí puede usar sus siete rutas legítimas.

Outboxes:

- raíz fija por tipo;
- source path bajo el UUID del actor;
- destino relativo sin `..`, backslash, ruta absoluta ni separadores dobles;
- nombre de archivo sin separadores;
- vínculo obligatorio a request/attachment, work/portfolio o receipt real del owner;
- estado inicial `pending`, cero intentos y sin `drive_file_id`;
- el worker vuelve a validar todo antes de acceder a Drive.

## Auth

- Signup/login/refresh/logout conservan Supabase Auth y secure session storage de fases anteriores.
- Web usa `EXPO_PUBLIC_APP_URL` como fuente única. Producción exige HTTPS y no toma `window.location.origin` si existe configuración.
- HTTP sólo se acepta para localhost en desarrollo.
- Nativo acepta exclusivamente `laburapp://recover-password` para recuperación.
- El valor de redirect no proviene de input de usuario.
- `supabase/config.toml` contiene únicamente URLs locales; Site URL y allowlist hospedadas deben configurarse manualmente cuando exista dominio.

## Pruebas reales

Se instaló Supabase CLI `2.117.0` como dependencia de desarrollo local del proyecto (no global). Docker estaba disponible. `supabase start` aplicó todas las migraciones a PostgreSQL local y `supabase test db` ejecutó:

- `phase3_security_rls.test.sql`: anon, usuario A, usuario B, admin real, tablas, RPC, máquina de estados, siete buckets y tres outboxes.
- `phase3_function_security.test.sql`: owner, `search_path` y grants efectivos.

Resultado final: **2 archivos, 74 assertions, PASS**. Las transacciones de test terminan con rollback.

`supabase db lint --local --level warning` no informa errores. Conserva un warning no bloqueante y preexistente: la variable local `selected_quote` de `accept_service_quote` se asigna pero no se vuelve a leer. No se cambió porque no afecta autorización ni el resultado y esta fase no refactoriza lógica.

## Expo Doctor

Resultado: 20/21 checks. El único check fallido es alineación de patches; no hay cambio de major/minor:

| Paquete | Instalado | Esperado SDK 57 | Riesgo |
|---|---:|---:|---|
| `@expo/metro-runtime` | 57.0.14 | ~57.0.16 | tooling/runtime web; bajo, alinear antes del EAS final |
| `expo` | 57.0.18 | ~57.0.24 | fixes acumulados SDK; medio para build final |
| `expo-camera` | 57.0.4 | ~57.0.5 | cámara/QR; bajo pero probar permiso y scanner |
| `expo-constants` | 57.0.16 | ~57.0.19 | config runtime; bajo |
| `expo-image-manipulator` | 57.0.16 | ~57.0.19 | adjuntos; bajo |
| `expo-image-picker` | 57.0.15 | ~57.0.19 | selector de comprobante/fotos; bajo |
| `expo-linking` | 57.0.8 | ~57.0.10 | auth/deep links; prioridad mayor dentro del grupo |
| `expo-router` | 57.0.17 | ~57.0.22 | navegación/deep links; prioridad mayor dentro del grupo |

Recomendación: en una fase de dependencias separada ejecutar `npx expo install` sólo para esos ocho patches, regenerar lockfile y repetir auth, QR, picker, linking, prebuild y EAS preview. No se actualizaron en Fase 3.

## NPM audit

Resultado: 13 moderadas, 0 high, 0 critical. Se agrupan en dos cadenas:

| Grupo | Paquetes reportados | Origen | Superficie | Evaluación |
|---|---|---|---|---|
| Expo build/config | `expo`, `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/metro-config`, `@expo/prebuild-config`, `xcode`, `uuid` | `expo` directo; resto transitivo | CLI/prebuild, especialmente generación iOS | No es una ruta normal del runtime Android/web. `uuid@7.0.3` llega por `xcode@3.0.1`. Tratar en actualización coordinada de Expo, no con downgrade automático. |
| Router/query parsing | `expo-router`, `query-string`, `decode-uri-component` | `expo-router` directo; dos transitivos | parsing de query/deep links en mobile/web | Advisory de DoS por percent-encoding malformado; impacto acotado al proceso/pestaña, pero sí toca runtime. Priorizar actualización compatible y tests de redirects. |

`npm audit fix` propone `expo@46.0.21` y `expo-router@5.1.11`, cambios incompatibles/regresivos para SDK 57. No se ejecutó. Validar nuevamente después de alinear los patches oficiales del SDK.

## Validación de aplicación

- TypeScript: PASS en admin, mobile y shared.
- ESLint admin: PASS.
- Unit tests: 14/14 mobile y 13/13 shared.
- E2E existente: 1/1 PASS.
- Expo config: PASS; esquema `laburapp`, `allowBackup=false`, cámara única permission declarada.
- Expo Web export: PASS.
- Admin production build: PASS.
- Android prebuild: PASS; manifest generado mantiene `allowBackup=false`, reglas Android 11/12+ y guard de release local.
- Worker Drive: sintaxis PASS.
- Secret scan: sin patrones de keys/tokens privados y sin `.env` sensibles versionados.
- `git diff --check`: PASS; sólo avisos informativos LF→CRLF de Git en Windows.
- Visual/browser: PASS sin overflow en 375×812, 430×932, 768×1024, 1366×768 y 1920×1080. Login demo, solicitudes, perfil, navegación inferior, sidebar y logout verificados.

El QA de navegador usa datos demo y valida regresión/layout, no entrega real de emails ni Auth contra el proyecto hospedado.

## Decisiones y riesgos residuales

- No se cambió `portfolio` a privado.
- No se implementó SMTP, CAPTCHA, Play Integrity, pagos ni App/Universal Links.
- Custom scheme puede ser reclamado por otra app; el dominio futuro permitirá migrar recuperación a enlaces HTTPS asociados.
- Las constraints `NOT VALID` requieren auditar datos históricos antes de validarse en producción.
- El proyecto Supabase hospedado puede diferir por cambios manuales; comparar con staging antes de producción.
- El worker Drive depende de credenciales y permisos externos que no se probaron contra Drive real.
