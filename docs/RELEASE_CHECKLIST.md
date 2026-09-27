# Checklist de release de LaburApp

Fecha: 2026-09-26. No ejecutar producción desde este documento; cada bloque expresa el dueño real del pendiente.

## READY

- [x] TypeScript, pruebas mobile/shared/E2E, lint y builds locales incluidos en el gate de Fase 5.
- [x] Expo SDK 57 alineado y configuración EAS separada para development/preview/production.
- [x] Demo habilitable sólo con `EXPO_PUBLIC_DEMO_ACCESS=true` y `EXPO_PUBLIC_APP_ENV=development`.
- [x] Sesión segura, backup Android endurecido, admin fail-closed y guard de firma release local.
- [x] Cámara/QR con estados de permiso, bloqueo, no disponible, background y protección contra doble lectura.
- [x] Imágenes validadas y reducidas antes de upload; OCR lazy con timeout y fallback manual.
- [x] Realtime consolidado, debounce, polling fallback acotado y cleanup.
- [x] Admin con noindex/no-store y web pública con robots, manifest, theme color y canonical configurable.
- [x] Inventario de datos y contrato de ambientes documentados.

## NEEDS PHYSICAL DEVICE

- [ ] Instalar EAS preview en al menos un Android con notch y navegación gestual y otro con botones.
- [ ] Probar cámara real: conceder, rechazar, bloquear, volver de Ajustes, background/resume y doble escaneo.
- [ ] Probar selector Android/iOS, cancelación, imagen rotada/corrupta/grande y proveedores Google Photos/galería.
- [ ] Probar teclado, Back, safe areas, landscape, split-screen, fuentes 100/130/160/200 % y TalkBack/VoiceOver.
- [ ] Confirmar persistencia/refresh/logout tras reinicio y cierre forzado.

## NEEDS SUPABASE STAGING

- [x] Staging exclusivo creado: `laburapp-staging` / `sdxvavgmvuyxtklrjxby`; producción `dlfoahkjcxnugemqgkyl` protegida y no tocada.
- [x] CLI autenticado por flujo oficial, enlazado sólo a staging y sin secretos en Git/chat.
- [x] Auditoría pre-migración, inventario inicial y snapshot completados.
- [x] 38 migraciones aplicadas; history alineada, dry-run vacío, DB lint sin errores y 82/82 pgTAP PASS.
- [x] Login, refresh, logout, refresh revocado/inválido, JWT/session settings y rate limits inspeccionados.
- [x] Siete buckets y Storage cross-user probados con dos usuarios reales temporales.
- [x] QR válido/expirado/usado/manipulado/usuario incorrecto/concurrente probado server-side.
- [x] Cron de purga configurado; anon/authenticated rechazados y backend autorizado.
- [x] Realtime limitado a cinco tablas; A no recibió eventos privados de B.
- [ ] Crear credenciales Drive exclusivas de staging, compartir las carpetas ya creadas y desacoplar IDs históricos por ambiente.
- [ ] Probar confirmación/recovery/cambio de email con SMTP y dominio reales.
- [ ] Elegir/configurar CAPTCHA y probarlo en web y Android.
- [ ] Decidir si el access JWT de 3600 s cumple el SLA de revocación o debe reducirse.

## NEEDS DOMAIN

- [ ] Definir URL HTTPS pública real.
- [ ] Cargar `EXPO_PUBLIC_APP_URL`, Site URL y redirects exactos.
- [ ] Configurar/verificar App Links y Universal Links con archivos de asociación reales.
- [ ] Verificar canonical, recuperación web y navegación desde links externos.

## NEEDS SMTP

- [ ] Configurar remitente/dominio SMTP, DKIM/SPF/DMARC y plantillas.
- [ ] Probar confirmación, recovery y cambio de email en staging y dispositivos.
- [ ] Definir monitoreo de rebotes, límites y fallback operativo.

## NEEDS STORE CONFIGURATION

- [ ] Definir e implementar eliminación de cuenta y URL/instrucciones exigidas por stores.
- [ ] Finalizar política de privacidad usando `DATA_INVENTORY.md` y completar Data Safety/App Privacy.
- [ ] Preparar capturas, descripción, clasificación, contacto, soporte y ficha por plataforma.
- [ ] Confirmar versionCode/buildNumber remoto, firma EAS, package/bundle IDs y owner.
- [ ] Probar AAB/TestFlight o canal interno antes de producción.

## DEFERRED / ACCEPTED RISK

- `index.tsx` sigue siendo grande; sólo se extrajeron límites puros y verificables. Dividir perfiles/solicitudes/reseñas completos queda post-release por riesgo de regresión.
- La lista pública de profesionales y algunas listas internas siguen en `ScrollView`. Deben migrar a virtualización cuando el volumen real lo justifique; no se cambió la UX en esta fase de cierre.
- Bundle web inicial continúa grande por React Native Web/cámara/manipulación; Tesseract ya es import dinámico. Una división agresiva del monolito queda diferida.
- No se configuró `runtimeVersion` porque no se usa EAS Update.
- Play Integrity, pagos reales, publicidad y analítica quedan fuera de alcance explícitamente.
- `slug: trabajapp` difiere del nombre visible `LaburApp`; se preserva por compatibilidad con el proyecto EAS existente.
- Un access JWT emitido antes del logout continúa autorizado por PostgREST hasta expirar; refresh y Auth endpoint sí quedan revocados. Expiry actual: 3600 s.
- Performance Advisor marca optimizaciones de RLS e índices de FK; no se hicieron cambios masivos sin carga real ni plan de medición.
- `supabase db diff --linked` queda pendiente porque Docker no pudo reservar el puerto local `54320`; migration history, dry-run e inventarios remotos sí están alineados.
