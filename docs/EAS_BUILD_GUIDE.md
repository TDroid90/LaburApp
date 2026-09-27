# Guía de builds EAS

Fecha: 2026-09-24. Esta guía prepara builds internas y de producción; no autoriza publicar ni reemplaza el gate de `PRODUCTION_READINESS.md`.

## Perfiles

| Perfil | Uso | Artefacto Android |
|---|---|---|
| `development` | Cliente de desarrollo para QA interno | APK, distribución interna |
| `preview` | Candidato instalable para pruebas finales | APK, distribución interna |
| `production` | Binario firmado para tienda, sólo después del gate | AAB administrado por EAS |

Comandos manuales, desde `apps/mobile`:

```text
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform android --profile production
```

No se ejecutó ninguno durante Fase 4. El perfil `production` usa versionado remoto y `autoIncrement`. EAS administra la firma remota; ningún keystore de producción debe guardarse en Git. El guard nativo impide que un release Gradle local quede firmado silenciosamente con `debug.keystore`.

## Variables esperadas en EAS

Configurar por entorno y nunca copiar valores secretos al repositorio:

| Variable | Development | Preview | Production |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | requerida | requerida | requerida |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | requerida | requerida | requerida |
| `EXPO_PUBLIC_APP_URL` | localhost permitido según el flujo | HTTPS real | HTTPS real |
| `EXPO_PUBLIC_DEMO_ACCESS` | opcional | `false`, salvo QA expresamente aislado | `false` |
| `EXPO_PUBLIC_SHEETS_MIRROR_URL` | sólo si se usa el espejo | sólo si se usa | sólo si se usa |

`EXPO_PUBLIC_APP_URL` no tiene un valor productivo todavía porque el dominio no fue definido. No crear un dominio ficticio para completar el build.

### Contrato por alcance

| Variable | Clase | Development | Preview | Production |
|---|---|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | PUBLIC | `development` | `preview` | `production` |
| `EXPO_PUBLIC_DEMO_ACCESS` | PUBLIC | `true` sólo para QA demo | `false` | `false` |
| `EXPO_PUBLIC_SUPABASE_URL` | PUBLIC | local/dev | staging | producción |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` o publishable key compatible | PUBLIC | dev | staging | producción |
| `EXPO_PUBLIC_APP_URL` | PUBLIC | localhost permitido | HTTPS staging | HTTPS definitivo |
| `EXPO_PUBLIC_SHEETS_MIRROR_URL` | PUBLIC opcional | si se prueba | normalmente vacío | sólo si se habilita |
| `SUPABASE_URL` | SERVER ONLY | API dev | API staging | API producción |
| `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` | SERVER ONLY pública | según API | según API | según API |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` | SECRET | secreto dev | secreto staging | secreto producción |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` | SECRET/SERVER ONLY | cuenta dev | cuenta staging | cuenta producción |
| `GOOGLE_DRIVE_PRIVATE_KEY` | SECRET/SERVER ONLY | secreto | secreto | secreto |
| `GOOGLE_DRIVE_PROJECT_ROOT_FOLDER_ID`, `GOOGLE_DRIVE_PROFESSIONALS_FOLDER_ID` | SERVER ONLY | carpetas dev | carpetas staging | carpetas producción |
| `SHEETS_WEBHOOK_URL`, `SHEETS_WEBHOOK_SECRET` | SECRET/SERVER ONLY | opcional | opcional | opcional |
| `CRON_SECRET` | SECRET/SERVER ONLY | local | staging | producción |
| `ADMIN_BASIC_USER`, `ADMIN_BASIC_PASSWORD` | SECRET/SERVER ONLY | local | staging | producción |

Toda variable `EXPO_PUBLIC_*` termina embebida en el cliente y **no puede contener secretos**. Las credenciales service-role, Drive, cron, admin y webhooks no deben llevar ese prefijo ni configurarse como variables del bundle móvil. Los perfiles EAS ya fuerzan demo desactivada en preview/production.

## Seguridad nativa conservada

- La sesión completa se cifra; la clave queda en SecureStore/Keystore con acceso sólo en este dispositivo y el ciphertext separado en AsyncStorage.
- `allowBackup=false` y las reglas de Android 11 y Android 12+ excluyen bases de datos, AsyncStorage sensible y SecureStore tanto de backup como de transferencia de dispositivo.
- El plugin de SecureStore mantiene `configureAndroidBackup=false`.
- La aplicación solicita únicamente cámara; el selector de documentos/fotos usa el flujo del sistema.

## Runtime y actualizaciones

No se configuró `runtimeVersion` porque este proyecto no usa EAS Update actualmente. Antes de habilitar actualizaciones OTA, definir una política de runtime compatible con cambios nativos y probar rollback; no agregarla sólo para satisfacer un checklist.

`version` permanece en `0.9.0`. Con `appVersionSource: remote`, EAS es la autoridad de `android.versionCode` y `ios.buildNumber`; producción usa `autoIncrement`. No incrementar números manualmente hasta crear un candidato autorizado. Development/preview no deben modificar la versión comercial. El package y bundle ID son `com.alsema.laburapp`, el scheme es `laburapp` y el slug EAS heredado es `trabajapp`.

## Checklist antes de un preview

1. Crear las variables de los entornos `development` y `preview` en EAS sin pegarlas en archivos versionados.
2. Confirmar que `EXPO_PUBLIC_DEMO_ACCESS=false` fuera del QA demo explícito.
3. Ejecutar TypeScript, ESLint, tests mobile/shared/E2E, Expo Doctor, Expo config y prebuild limpio.
4. Repetir `supabase db reset --local`, pgTAP y DB lint.
5. Verificar en el APK: login, refresh de sesión, logout, recuperación, QR/cámara, selector de imágenes, offline/reconexión, rotación, fuente 100–200 % y navegación atrás.
6. Confirmar que el manifest final conserva las reglas de backup y que release no usa firma debug.

## Checklist adicional antes de producción

1. Definir dominio HTTPS y configurar Site URL/redirects exactos en Supabase.
2. Validar migraciones, RLS y buckets en staging, no directamente en producción.
3. Configurar SMTP, rate limits/CAPTCHA, cron de retención, monitoreo y recuperación operativa.
4. Probar Drive con una cuenta de staging y confirmar acceso mínimo.
5. Crear primero un build `preview`, probarlo en dispositivos reales y recién después autorizar el build `production`.
