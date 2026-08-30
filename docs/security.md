# Seguridad

Todas las tablas expuestas tienen RLS activada. No existe una política de escritura abierta para roles, auditoría, pagos ni contadores. `has_role` es una función con `security definer`, búsqueda fijada y ejecución limitada a usuarios autenticados. La service role nunca debe llegar al navegador o a la aplicación móvil.

Los documentos se guardan en un bucket privado; portfolio y avatar aceptan únicamente imágenes y tienen límites de tamaño. En producción, una Edge Function debe validar bytes reales, eliminar metadatos y emitir URLs firmadas cortas.

La detección de contacto incluida en el paquete compartido es una primera barrera probada. La persistencia productiva debe ejecutar la misma política del lado servidor y registrar el evento de moderación. No se deben registrar chats completos, direcciones, documentos, tokens ni medios de pago en analytics.
