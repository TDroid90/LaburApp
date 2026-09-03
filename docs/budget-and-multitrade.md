# Presupuestos, tarifarios y perfiles multioficio

## Flujo acordado

1. El cliente busca un profesional y envía una solicitud con descripción, zona aproximada y fecha deseada.
2. El profesional recibe una notificación interna con la acción **Responder presupuesto**.
3. El formulario carga los conceptos activos de su tarifario para el oficio solicitado.
4. El profesional elige, agrega o quita conceptos; modifica cantidades, unidades, valores, plazo, vigencia y observaciones.
5. Puede usar precio por ítems, precio fijo u honorarios desde.
6. Antes de enviar se genera una vista previa y una nueva versión inmutable del presupuesto.
7. El cliente acepta, solicita cambios o rechaza. Cada cambio conserva el historial.

## Diccionario de servicios

El diccionario de LaburApp propone nombres y unidades comunes por oficio. Los importes son orientativos y editables: nunca deben mostrarse como tarifas obligatorias. Cada profesional puede guardar conceptos propios y ocultar los que no utiliza.

Pendiente de expansión: agregar todos los oficios publicados, sinónimos de búsqueda, unidades válidas, requisitos de matrícula y ejemplos de alcance/exclusiones.

## Tarifario del profesional

Cada ítem guarda oficio, servicio, unidad, precio, modalidad y estado activo. El tarifario es privado para edición y se usa únicamente como base al responder. El cliente solo ve los conceptos incorporados al presupuesto enviado.

## Multioficio y membresía

- Plan gratuito: hasta 2 oficios publicados.
- Futuro plan Multioficio: desde el tercer oficio, hasta 10 oficios.
- No cobrar por responder presupuestos, guardar el tarifario ni recibir solicitudes.
- El precio de la membresía queda en cero hasta validar demanda, conversión y disposición de pago.
- Los oficios regulados siguen requiriendo verificación individual de matrícula.

## Pendientes para producción

- Definir precio, prueba y beneficios adicionales de Multioficio.
- Añadir vista previa del presupuesto antes de enviar.
- Permitir varias plantillas guardadas por oficio.
- Implementar push y correo para nuevas solicitudes y vencimientos.
- Medir tiempo de respuesta, aceptación por plantilla y uso de conceptos del tarifario.
- Moderar nombres de servicios y evitar datos de contacto en textos personalizados.
