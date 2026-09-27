# Fase 4 — Estabilización y preparación de build

Fecha: 2026-09-24. Alcance: repositorio, navegador local, prebuild Android y Supabase local. No hubo commit, push, deploy, build EAS remoto ni cambios en Supabase hospedado.

## Resultado ejecutivo

- Expo SDK 57 quedó alineado a los patches recomendados y Expo Doctor aprobó 21/21 controles.
- Se eliminó el polling fijo cada 3 segundos. Realtime dispara una actualización consolidada; sólo hay fallback de 15 segundos mientras el canal no está disponible.
- Las lecturas remotas tienen timeout y retry acotado; las mutaciones no se reintentan automáticamente.
- Hay estado offline, error, reintento y carga en las consultas principales, además de un Error Boundary global.
- Se agregaron etiquetas/roles accesibles, targets táctiles y tolerancia a fuentes grandes sin rediseñar la UI.
- La orientación dejó de estar bloqueada para que tablets funcionen también en landscape.
- Los perfiles EAS `development`, `preview` y `production` validan; producción sigue bloqueada por las condiciones del gate.
- Todas las migraciones se aplicaron desde cero y las 74 assertions pgTAP continúan pasando.

## Expo SDK 57

Versiones alineadas: `expo 57.0.25`, `@expo/metro-runtime 57.0.16`, `expo-camera 57.0.5`, `expo-constants 57.0.19`, `expo-image-manipulator 57.0.20`, `expo-image-picker 57.0.20`, `expo-linking 57.0.11` y `expo-router 57.0.23`. Se agregaron los módulos compatibles `expo-dev-client 57.0.19`, requerido por el perfil development, `expo-system-ui 57.0.4`, requerido por la configuración nativa, y NetInfo `12.0.1` para estado de red.

## NPM audit

Permanecen 13 vulnerabilidades moderadas, 0 altas y 0 críticas:

| Cadena | Superficie | Explotabilidad actual | Mitigación |
|---|---|---|---|
| `expo` → tooling de config/prebuild → `xcode@3.0.1` → `uuid@7.0.3` | Build/config, principalmente iOS | No forma parte del flujo normal de runtime Android/web | Builds controlados, sin input no confiable; actualizar con un patch oficial compatible de Expo cuando exista. |
| `expo-router@57.0.23` → `query-string@7.1.3` → `decode-uri-component@0.2.2` | Runtime de rutas/deep links | Un URI con percent-encoding malformado puede provocar DoS del proceso/pestaña; no concede acceso ni expone secretos | Redirects allowlisted, URL pública centralizada y mensajes seguros; actualizar cuando Expo publique una ruta compatible. |

`npm audit fix` propone downgrades incompatibles (Expo 46/router 5), por lo que no se ejecutó ni se agregó un override inseguro.

## Realtime, red y errores

- `useRequestSync` administra un solo canal por sesión para solicitudes, presupuestos, mensajes, credenciales y suscripciones.
- Los eventos se agrupan con debounce de 250 ms. El fallback consulta cada 15 s únicamente si Realtime está indisponible; se actualiza al reconectar y al volver al foreground.
- Al desmontar se eliminan canal, timer, debounce, listener de red y listener de AppState.
- `resilientRead` limita cada lectura a 12 s y dos intentos ante fallos transitorios. Las mutaciones conservan un único intento para evitar duplicados.
- El directorio no desaparece si falla la consulta complementaria de reseñas.
- Fallos de restauración local, perfil, solicitudes, portfolio, imágenes, cámara y panel salen del estado ocupado y muestran texto seguro, sin SQL ni mensajes crudos del backend.
- `AppErrorBoundary` evita una pantalla blanca ante errores de render; en producción no muestra stack ni datos técnicos.

## Refactor incremental

No se reescribió `index.tsx`. Se extrajeron únicamente responsabilidades aisladas: resiliencia de red, sincronización Realtime/offline y Error Boundary. `index.tsx` continúa siendo grande y debe seguir partiéndose por flujos en fases pequeñas con tests; no fue duplicada la lógica entre layouts.

## Accesibilidad y layouts

- Inputs, botones, iconos interactivos, radios y checkboxes principales tienen roles/labels; estados seleccionados se anuncian donde corresponde.
- Se ampliaron targets táctiles pequeños a 44 dp o mediante `hitSlop`.
- La navegación inferior ajusta altura/padding según `fontScale`; planes de suscripción y controles que antes truncaban ahora permiten wrap.
- La app admite portrait/landscape. Tablet reutiliza correctamente el layout táctil; desktop mantiene sidebar y grilla.
- QA visual local sin overflow horizontal: 375×812, 430×932, 768×1024, 1024×768, 1366×768, 1440×900 y 1920×1080.
- Resize autenticado 1366→768→375→1440 conservó sesión/estado y nunca mostró navegación duplicada o sidebar fantasma.

Limitación: el navegador no reproduce fielmente escalado Android 130/160/200 %, TalkBack ni teclado físico completo. Los cambios se auditaron en código, pero deben verificarse en APK sobre dispositivos/emuladores.

## Auth y estados

El flujo conserva mensajes genéricos para credenciales incorrectas y no agrega enumeración de emails. Signup, confirmación pendiente, login, recovery, cambio obligatorio, sesión expirada y logout mantienen el flujo existente. Solicitudes tienen loading/error/retry/offline; directorio mantiene carga en background, error y vacío sin volver a mostrar “Cargando profesionales”.

## EAS y seguridad nativa

- `eas.json` valida los perfiles development, preview y production; EAS usa credenciales remotas, versionado remoto y auto-incremento productivo.
- No se generó ningún keystore ni credencial. En EAS aún no están configuradas las variables de esos entornos.
- El prebuild Android limpio conserva `allowBackup=false`, reglas legacy/modernas que excluyen SecureStore y bases sensibles, y el guard que impide un release local silenciosamente firmado con debug.
- La sesión sigue usando ciphertext en AsyncStorage y clave separada en SecureStore/Keystore.
- El proxy admin conserva respuesta 503 fail-closed si faltan sus dos variables Basic.

## Supabase local

`supabase db reset --local` aplicó todas las migraciones desde cero. `supabase test db` aprobó 2 archivos y 74 assertions. El lint no informa errores; conserva el warning preexistente de `selected_quote` asignada y no leída en `accept_service_quote`. No se tocó la instancia hospedada.

## Validación

| Control | Resultado |
|---|---|
| TypeScript admin/mobile/shared | PASS |
| ESLint admin | PASS |
| Unit mobile | PASS, 18/18 |
| Unit shared | PASS, 13/13 |
| E2E existente | PASS, 1/1 |
| Expo Doctor | PASS, 21/21 |
| Expo config / web export | PASS |
| Admin production build | PASS |
| Android prebuild limpio | PASS |
| Supabase reset / pgTAP | PASS, 74 assertions |
| DB lint | PASS con 1 warning preexistente |
| Secret scan | PASS, sin patrones de secretos privados |
| `git diff --check` | PASS; avisos LF→CRLF no son errores |
| Gradle Android local | NO EJECUTADO: falta Java/JDK/JAVA_HOME |
| Build EAS remoto | NO EJECUTADO por alcance |

## Rendimiento y deuda residual

La eliminación del polling de 3 s reduce consultas y renders; Tesseract conserva import dinámico y sólo se carga al iniciar OCR. El export web genera un bundle de entrada aproximado de 2.1 MB y la imagen wordmark ronda 285 KB. El listado demo usa ScrollView y puede renderizar decenas de cards; virtualizarlo queda como mejora medible futura, no como cambio especulativo de esta fase. React Native Web emite sólo el warning conocido de estilos `shadow*` deprecados.

## Gate pendiente

Antes de release candidate faltan: dominio HTTPS, variables EAS por entorno, migraciones y pruebas en staging, configuración Auth/SMTP/rate limits/CAPTCHA, cron y monitoreo, QA nativo de fuente/lector de pantalla, build EAS preview instalado, prueba de Drive staging y resolución/aceptación formal de las dependencias moderadas restantes.
