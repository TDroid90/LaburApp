# Decisión de vencimiento de access JWT

No se modificó staging ni producción. El valor actual es 3600 segundos.

| Opción | Seguridad tras logout/revocación | Refresh/carga | UX |
|---|---|---|---|
| 3600 s | ventana residual máxima de 1 hora para un access token ya emitido | menor frecuencia | mejor tolerancia a red inestable |
| 1800 s | reduce a la mitad la ventana | carga moderada; equilibrio razonable | impacto bajo con refresh automático |
| 900 s | ventana máxima de 15 minutos | cuatro veces más refresh que 3600 | más sensible a cortes/clock drift |

Recomendación técnica para el lanzamiento: **1800 s** si las pruebas de reconexión física pasan; mantiene refresh automático y reduce materialmente la exposición. Usar 900 s sólo si el modelo de riesgo exige revocación rápida y se mide el comportamiento bajo mala conectividad. La decisión debe tomarse antes de producción y probarse en staging, no cambiarse durante este RC.
