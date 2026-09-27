# Fase 6 — Integración y hardening de Supabase staging

Fecha: 2026-09-26. Resultado: **STAGING BACKEND VALIDADO; LISTO PARA EAS PREVIEW CON PENDIENTES EXTERNOS**.

## Identidad y protección operativa

- Producción protegida/no tocada: `laburapp-db`, ref `dlfoahkjcxnugemqgkyl`.
- Staging creado y utilizado: `laburapp-staging`, ref `sdxvavgmvuyxtklrjxby`, región `sa-east-1`.
- El proyecto fue creado dentro del plan disponible sin compra ni upgrade.
- El link local apunta sólo a staging. Cada operación remota verificó explícitamente que el ref fuese el de staging y distinto del ref productivo.
- No se hizo commit, push ni deploy de la aplicación.

## Estado inicial y migraciones

Staging era un proyecto nuevo, sin tablas ni migration history de LaburApp. Se guardó un snapshot previo ignorado por Git en `supabase/.temp/staging-pre-migration.sql`. No había filas legacy ni outboxes que remediar.

Se aplicó toda la cadena versionada y luego tres migraciones nuevas:

- `202609260001_schedule_retention_purge.sql`: programa la purga diaria y cierra acceso al esquema `cron`.
- `202609260002_enable_realtime_app_tables.sql`: publica sólo las cinco tablas consumidas por Realtime.
- `202609260003_fix_service_request_provider_check.sql`: permite validar un prestador activo/publicado sin volver a exponer la fila privada de `profiles`.

`migration list` alinea las 38 versiones repository/local/staging y `db push --dry-run` informa `Remote database is up to date`. El diff estructural automatizado no pudo generarse porque Docker no pudo reservar el puerto local `54320`; no se detuvo ni destruyó el stack que lo ocupaba. Este límite está compensado por history alineado, dry-run vacío, catálogo remoto y pruebas funcionales.

## Evidencia remota

- pgTAP: **82/82 PASS** (baseline 74 más cobertura de alta válida y Premium/Admin).
- RLS y grants: PASS para anon, A, B, admin de prueba y backend.
- Flujo real solicitud → presupuesto → aceptación: PASS con usuarios temporales y cleanup.
- Storage: 7 buckets; 7/7 uploads propios, 7/7 uploads cross-user rechazados, 4/4 lecturas privadas ajenas rechazadas, 7/7 deletes ajenos protegidos.
- Realtime: A recibió 0 eventos privados de B y 1 evento propio.
- QR: válido, binding, usuario incorrecto, manipulado, expirado, replay y doble request concurrente PASS; sólo una confirmación concurrente ganó.
- Auth: login, refresh, global logout, refresh revocado/inválido y `/auth/v1/user` tras revocación PASS.
- Cron: job diario único `laburapp-purge-expired-client-data` a `17 3 * * *`; anon/authenticated no pueden ejecutar purge; backend sí.
- Premium/Admin: anon y usuario normal rechazados; admin real puede crear/actualizar/desactivar; ID inexistente falla controladamente.
- DB lint: sin errores; sólo el warning conocido por `selected_quote` no leído.

## Auth aplicado

- Email/password y signup habilitados; confirmación de email activa.
- Password mínimo 12 con minúscula, mayúscula, dígito y símbolo.
- Secure password change habilitado.
- JWT 3600 s, refresh rotation habilitada, reuse interval 10 s.
- Site URL temporal: `http://localhost:8081`.
- Redirects temporales: Expo local, `laburapp://auth/callback`, `laburapp://recover-password` y admin local.
- CAPTCHA permanece desactivado: requiere proveedor/credenciales y validación nativa.
- Templates versionados no pudieron cargarse con el proveedor email por defecto del plan Free; la API rechazó el cambio de forma atómica y no hubo configuración parcial.

## Advisors

- Security Advisor: 0 errors, 22 warnings y 4 info. Los warnings señalan funciones `SECURITY DEFINER` deliberadamente públicas/autenticadas; sus grants e autorización interna están cubiertos por pgTAP. Los cuatro info son tablas backend con RLS y sin policy cliente por diseño.
- Performance Advisor: 0 errors, 68 warnings y 38 info. Predominan evaluación por fila de `auth.*` en RLS e índices de FK faltantes. Se documentan para optimización con carga real; no se reescribieron policies ni se agregaron decenas de índices especulativos.

## Drive staging

Se creó estructura separada, sin tocar carpetas productivas:

- `LaburApp Staging`: `1YmHYhlgVbuJ8ZlPSy4Lc2qZdBUM63byM`
- `Project Data`: `1URkbrbjYcgK2BGZwJLRQ9a_kttU1CB6y`
- `Professionals`: `1M7HtBk1Z_hPcpU7Oo-TdjVA-Xe7-eQET`
- `Private`: `1WGHECDPhx-k9Oe7vm9Y4po_axeOnvwai`
- `Receipts`: `1O7KtlxTCNbzC7Ry4i4tIKNV1swnzeR3q`

No se desplegó el worker ni se probaron escrituras Drive porque no hay credenciales de servicio staging. La app/migraciones aún contienen IDs históricos cuya procedencia no pudo demostrarse. Hasta desacoplar esos IDs por ambiente y compartir las carpetas con una cuenta de servicio exclusiva, el estado es **DRIVE STAGING PENDING**.

## Riesgo residual de sesión

El logout global revoca refresh tokens y el endpoint Auth rechaza la sesión, pero PostgREST acepta un access JWT ya emitido hasta su expiración (máximo actual: una hora). Es el comportamiento stateless esperado de JWT y no un fallo del cliente. Reducir el expiry requiere una decisión de producto/operación; no se cambió arbitrariamente.

## Regresión de aplicación

- TypeScript admin/mobile/shared: PASS.
- Mobile: 34/34.
- Shared: 13/13.
- E2E shared: 1/1.
- Lint admin: PASS.
- Expo Doctor: 21/21.

## Acciones manuales del propietario

### AHORA

- Ninguna imprescindible para usar el backend de staging sin Drive/email real.
- Para probar Drive: crear una cuenta de servicio Google exclusiva, compartir sólo las carpetas staging y cargar sus secretos fuera de Git.

### CUANDO TENGAMOS DOMINIO

- Reemplazar Site URL/redirects temporales por HTTPS real y configurar App/Universal Links.
- Configurar remitente SMTP, SPF, DKIM y DMARC; cargar/probar los cuatro templates.
- Elegir y configurar CAPTCHA compatible con web y Expo native.

### ANTES DE PRODUCCIÓN

- Ejecutar el mismo pipeline contra un staging restaurado/representativo y revisar advisors con volumen.
- Resolver IDs Drive por ambiente y probar el worker completo.
- Decidir el SLA de revocación de access JWT y, si corresponde, reducir `jwt_expiry`.
- Autorizar de manera explícita un plan productivo separado; esta fase no escribió en producción.
