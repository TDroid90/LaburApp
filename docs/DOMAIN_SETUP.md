# Dominio propio de LaburApp

Estado: preparado en código, dominio todavía no definido. No se dejó un dominio ficticio como fallback.

## Punto único de configuración

Definir en el proveedor de hosting/build:

| Variable | Uso | Ejemplo al comprar el dominio |
|---|---|---|
| `PUBLIC_APP_URL` | URL pública canónica para procesos de servidor y documentación operativa | URL HTTPS definitiva, cuando exista |
| `NEXT_PUBLIC_APP_URL` | URL pública cuando una pantalla Next necesite enlazar a la app de usuarios | misma URL pública |
| `EXPO_PUBLIC_APP_URL` | Expo Web, redirects web y llamadas nativas a `/api/*` | misma URL pública |
| `EXPO_PUBLIC_SHEETS_MIRROR_URL` | Endpoint de espejo, si se usa fuera del mismo origen | endpoint HTTPS definitivo, cuando exista |

En mobile, la lectura está centralizada en `apps/mobile/lib/public-app-url.ts`. En web, los endpoints `/api/*` se invocan same-origin. Una build nativa sin `EXPO_PUBLIC_APP_URL` falla de forma explícita al intentar invocar esos endpoints en lugar de usar un host viejo.

## Pasos al comprar el dominio

1. Crear en DNS los registros exigidos por el hosting (normalmente `A`/`AAAA`, `ALIAS` o `CNAME`). No copiar valores de otro proyecto.
2. Asociar el dominio a la aplicación pública Expo Web. Mantener `apps/admin` en un host/subdominio privado distinto; no convertirlo en la web pública.
3. Configurar las variables anteriores en producción y volver a generar la exportación web/build nativa.
4. En Supabase Dashboard > Authentication > URL Configuration:
   - Site URL: la URL HTTPS definitiva.
   - Redirect URL web exacta: la misma URL HTTPS definitiva.
   - Redirect URL nativa de recuperación: `laburapp://recover-password`.
   - Mantener `laburapp://auth/callback` sólo para un callback nativo que efectivamente lo use.
   - Mantener URLs de localhost sólo en desarrollo. No usar `/**` para el dominio productivo.
5. Verificar que el certificado HTTPS esté emitido, que HTTP redirija a HTTPS y que no haya contenido mixto.
6. Registrar una cuenta real y comprobar el enlace de confirmación en Android y navegador.
7. Ejecutar “Olvidé mi contraseña” en Android y navegador. El navegador vuelve al origen público; Android vuelve a `laburapp://recover-password`.

## URLs locales

`supabase/config.toml` es configuración local: usa Expo Web en `http://localhost:8081`, el admin local en `http://localhost:3000` y los dos deep links `laburapp://...`. La URL hospedada de Supabase se configura manualmente en el Dashboard; no se deriva del archivo local.

## App Links y Universal Links

El esquema privado `laburapp://` funciona en builds instaladas. Android App Links e iOS Universal Links todavía no están implementados. Para agregarlos después del dominio se requieren, como mínimo:

- Android `intentFilters` y `https://<dominio>/.well-known/assetlinks.json` con el certificado real de la app.
- iOS `associatedDomains` y `https://<dominio>/.well-known/apple-app-site-association` con Team ID y bundle ID reales.
- Nuevas builds nativas y pruebas con enlaces de correo; Expo Go no sirve para validar un callback estable.

## CORS y endpoints propios

Los endpoints actuales se consumen same-origin en web y con token Bearer desde la app nativa. No hay una allowlist CORS global en el repositorio. Si los endpoints se mudan a otro origen, configurar una allowlist exacta del dominio público; no responder `Access-Control-Allow-Origin: *` en rutas autenticadas.

## Metadata, robots y sitemap

La app pública define título, descripción, robots y canonical mediante `expo-router/head`; canonical sólo se emite cuando existe `EXPO_PUBLIC_APP_URL`. `apps/mobile/public/robots.txt` permite indexación. Generar `sitemap.xml` recién cuando el dominio y las rutas públicas sean definitivos: hoy la aplicación es una sola ruta con navegación interna por estado, por lo que inventar URLs no aporta valor.

## Prueba de cierre

- La URL definitiva devuelve HTTPS sin redirecciones a hosts anteriores.
- El HTML contiene canonical con el dominio definitivo.
- Confirm signup y reset password no redirigen a localhost ni a un preview.
- Los enlaces nativos abren una build de desarrollo/producción, no Expo Go.
- El panel admin no es indexable ni comparte el dominio público sin una decisión explícita.
