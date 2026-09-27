# Fase 5 — Cierre final de aplicación

Fecha: 2026-09-24. Alcance: repositorio local, sin commit, push, deploy, Supabase Hosted, dominio, SMTP ni producción.

## Resultado

El código queda preparado para el siguiente paso controlado: EAS preview y QA en dispositivo, seguido de Supabase staging e infraestructura externa. Los pendientes restantes están clasificados en `RELEASE_CHECKLIST.md`; no se abrieron features ni se cambiaron reglas de negocio.

## Cambios de aplicación

- Se extrajeron helpers puros de autenticación, QR, seguridad de imágenes y scheduler Realtime desde el monolito sin reescribir pantallas.
- Cámara: disponibilidad explícita, permiso bloqueado hacia Ajustes, error de montaje, desactivación en background/modal y salida manual.
- QR: parser limitado a `laburapp://complete`, validación de payload, lock sincrónico contra scans repetidos y autoridad final en RPC/DB.
- Imágenes: validación de MIME informado, dimensiones y peso; límites separados para fotos/documentos; avatar 512 px, portfolio 900 px, solicitudes 1280 px, credenciales/comprobantes 1600 px.
- OCR: import dinámico conservado, timeout de 30 s, terminación del worker y continuidad manual ante error.
- Realtime: eventos rápidos se agrupan y el scheduler/timers/listeners/canal se limpian.
- Sesión: `SIGNED_OUT` limpia estado sensible y vuelve a Auth con mensaje, sin afectar demo aislada.
- Formularios: guards de mutaciones principales y estado ocupado en presupuesto modular.
- Modales web: cierre por Escape; Android conserva `onRequestClose`.
- Admin: headers `noindex`, `no-store`, `nosniff`, `no-referrer`, `DENY`, metadata robots y `robots.txt` bloqueante.
- Web pública: manifest, theme color, robots y canonical sólo cuando existe URL configurada.
- Accesibilidad: labels de imágenes relevantes y elementos decorativos excluidos.
- Assets: wordmark de 1129×286 / 284.972 bytes a 565×143 / 90.002 bytes, misma proporción y apariencia.

## Deuda revisada

- No se encontraron TODO/FIXME/HACK/`ts-ignore` ni logs de consola en código de aplicación.
- Los fixtures demo son deliberados, ahora imposibles de habilitar en preview/production sólo con el flag demo.
- Las URLs externas encontradas corresponden a fuentes oficiales/Google o fixtures visuales demo.
- El `any` y el tamaño restante de `index.tsx` se documentan; una extracción mayor no era segura dentro de un cierre.
- No existe eliminación integral de cuenta: blocker explícito de publicación, no improvisado.

## Rendimiento y arquitectura

- OCR no entra al arranque porque `tesseract.js` se importa dentro de la acción administrativa.
- La optimización del wordmark reduce transferencia/memoria estática.
- Se conservan listas pequeñas; directorio público y crecimiento futuro requieren FlatList/SectionList en una fase medida con datos reales.
- No se persigue un tamaño arbitrario del bundle: dividir cámara/manipulación de un único route grande exige una separación arquitectónica posterior.

## Límites de la validación

La cámara nativa, proveedores reales de galería, navegación gestual, TalkBack/VoiceOver, firma EAS y comportamiento de OEM requieren dispositivo/build preview. Los toggles de Auth/Realtime/Storage y políticas aplicadas requieren staging. App Links, canonical definitivo y correo requieren dominio/SMTP reales.
