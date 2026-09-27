# Estado de preparación para producción

Fecha de revisión: 2026-09-26. Este documento incorpora evidencia local y del proyecto Supabase staging `sdxvavgmvuyxtklrjxby`. Producción `dlfoahkjcxnugemqgkyl` no fue modificada.

## Listo en código

- Sesión nativa cifrada; clave en Keystore/Keychain y ciphertext separado.
- Migración de sesión legacy y borrado fail-closed si falta la clave.
- Backups Android desactivados y reglas explícitas de exclusión.
- Admin fail-closed cuando faltan credenciales Basic.
- Release local no puede usar silenciosamente `debug.keystore`; EAS sigue habilitado.
- Todas las tablas `public` creadas por migraciones tienen RLS habilitado.
- Todas las funciones `SECURITY DEFINER` fijan `search_path = ''` y usan relaciones calificadas.
- Owner `postgres`, `search_path` seguro y allowlist de EXECUTE fueron comprobados para las 40 funciones `SECURITY DEFINER` locales.
- Campos de control del perfil y ownership de solicitudes quedan protegidos por triggers.
- `profiles` y `reviews` se publican mediante RPC de columnas mínimas, sin UUID técnicos de reseñas.
- `service_requests` tiene máquina de estados, actor permitido y campos inmutables validados en base de datos.
- La purga global y el mantenimiento anual son exclusivos de `service_role`.
- Las colas Drive validan owner, raíz autorizada, ruta, estado inicial y entidad fuente; el worker vuelve a validar antes de sincronizar.
- Buckets privados para credenciales, fotos de solicitudes y comprobantes.
- URL pública centralizada y sin fallback a un dominio anterior.
- Layout mobile/desktop seleccionado centralmente y cubierto por tests unitarios.
- Expo SDK 57 alineado: Expo Doctor 21/21.
- Sincronización por Realtime con fallback acotado, reconexión y cleanup; eliminado el polling fijo de 3 segundos.
- Timeout/retry sólo para lecturas, estado offline y mensajes seguros; las mutaciones no se duplican automáticamente.
- Error Boundary global, targets táctiles/labels accesibles y tolerancia mejorada a fuente grande.
- Perfiles EAS development/preview/production configurados y validados, sin credenciales en Git.

## Obligatorio antes de producción

1. Definir un plan explícito y autorización separada para producción; nunca reutilizar el link de staging de forma implícita.
2. Reemplazar Site URL/redirects temporales cuando exista dominio, y decidir CAPTCHA compatible con Expo/native.
3. Configurar SMTP propio antes de volumen real; el proveedor integrado tiene límites bajos y no es una entrega productiva garantizada.
4. Replicar en producción, tras aprobación, el cron de `purge_expired_client_data()` validado en staging; cliente normal no puede invocarlo.
5. Auditar filas históricas productivas de los outboxes antes de aplicar constraints; staging nuevo no tenía filas incompatibles.
6. Definir dominio, HTTPS, App Links/Universal Links y cargar las plantillas versionadas.
7. Ejecutar las 82 pruebas actuales sobre un staging con snapshot representativo antes de planificar producción.
8. Probar el worker contra una cuenta Drive de staging y comprobar permisos/retención.
9. Hacer QA nativo de accesibilidad, fuente 100/130/160/200 %, teclado y TalkBack; el navegador no sustituye esta prueba.
10. Cargar las variables de los entornos EAS, generar un build preview e instalarlo en dispositivos reales antes de autorizar producción.

## No activado intencionalmente

- Pagos reales.
- SMS/WhatsApp.
- AdMob real.
- Play Integrity.
- Publicación Play Store/App Store.
- SMTP externo.

## Gate recomendado

| Gate | Condición |
|---|---|
| Seguridad | Migraciones en staging, tests RLS y secret scan limpios |
| Auth | Confirmación/reset probados en web y build nativa; CAPTCHA/rate limits decididos |
| Storage | Intentos cross-user y overwrite probados en cada bucket |
| Web | Exportación sin overflow en siete viewports y canonical definitivo |
| Android | Build EAS release + prueba en dispositivo; no hace falta release Gradle local |
| Operación | Backups de DB, monitoreo, retención y cron de purga documentados |

## Limitaciones de validación local

- Un análisis del repositorio no puede confirmar toggles del Dashboard, grants modificados manualmente ni policies creadas fuera de migraciones.
- Los tests DB locales no verifican cambios manuales ni toggles del Dashboard hospedado.
- La firma final y los App Links requieren certificados/credenciales reales administrados fuera de Git.

## Cierre de aplicación — Fase 5

La aplicación completó el hardening local de cámara/QR, imágenes, OCR, expiración de sesión, demo, Realtime cleanup, metadata web/admin, assets e inventario de datos. El gate operativo actualizado está en `RELEASE_CHECKLIST.md` y la evidencia detallada en `PHASE_5_FINAL_APPLICATION_CLOSURE.md`.

No se declara “lista para producción”. Sí queda candidata a **EAS preview** una vez cargadas variables de preview reales: la aceptación final depende de dispositivo físico y Supabase staging. Eliminación de cuenta continúa siendo blocker de publicación en stores hasta definir retención/anonimización y aplicar el flujo a Auth, DB, Storage y Drive.

## Fase 6 — staging validado

El 2026-09-26 se creó `laburapp-staging` (`sdxvavgmvuyxtklrjxby`) en `sa-east-1`, se aplicaron 38 migraciones y la history quedó alineada. Producción `laburapp-db` (`dlfoahkjcxnugemqgkyl`) quedó intacta. RLS, cross-user, Storage, Realtime, QR, Auth, Premium/Admin, cron y superficies pública/autenticada fueron probados contra el servicio hospedado.

El backend staging ya no bloquea un EAS preview. Drive real, email real, dominio y CAPTCHA siguen pendientes externos. La revocación de refresh/Auth es inmediata, pero un access JWT ya emitido conserva acceso PostgREST hasta expirar (actualmente hasta una hora).

## Validación ejecutada en esta fase

- TypeScript: correcto en `admin`, `mobile` y `shared`.
- Tests: 34/34 en `mobile`, 13/13 en `shared` y 1/1 E2E correcto.
- Builds: exportación Expo Web y build de producción de `admin` correctos.
- Expo: configuración pública y prebuild Android correctos; el manifest generado conserva `allowBackup=false` y las reglas de exclusión. Expo Doctor aprobó 21/21 controles.
- Dependencias: `npm audit` informó 13 vulnerabilidades moderadas y ninguna alta o crítica. No se aplicó `audit fix` porque proponía cambios incompatibles/downgrades del stack Expo.
- Visual: sin overflow horizontal en 375x812, 430x932, 768x1024, 1024x768, 1366x768, 1440x900 ni 1920x1080. El resize dinámico conservó sesión y una sola navegación. Login demo, perfil, solicitudes, navegación y logout fueron comprobados localmente.
- Integridad: `git diff --check` correcto y búsqueda de dominio anterior/secretos conocidos sin resultados.
- Supabase CLI `2.117.0`; migration history local/staging alineada, dry-run remoto vacío, DB lint sin errores y 82 assertions pgTAP remotas pasaron.
- Gradle local continúa no disponible porque este equipo no tiene Java/JDK. El prebuild/config de Expo no requiere firmar ni publicar.
