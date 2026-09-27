# Supabase staging — auditoría previa a migraciones

Fecha: 2026-09-26. Estado: **COMPLETADA**.

## Identidad verificada

- Producción protegida: `laburapp-db` / `dlfoahkjcxnugemqgkyl`.
- Target exclusivo: `laburapp-staging` / `sdxvavgmvuyxtklrjxby`.
- Región: `sa-east-1`.
- CLI: `2.117.0`, autenticado por flujo oficial y enlazado sólo a staging.

## Inventario inicial

El proyecto staging era nuevo: no contenía migration history de LaburApp, tablas `public` de la aplicación, policies, funciones, buckets ni filas de outbox. Se generó un dump previo local ignorado por Git. Al no existir datos de negocio, las migraciones `NOT VALID`, normalizaciones y constraints no encontraron filas incompatibles ni requirieron borrado o corrección.

## Revisión de riesgo

| Grupo | Clasificación | Resultado |
|---|---|---|
| Cadena fundacional a `202609210001` | SAFE sobre proyecto vacío | aplicada |
| `202609220001` grants/trigger hardening | SAFE, HIGH IMPACT | aplicada y probada |
| `202609220002` minimización pública | SAFE, HIGH IMPACT | aplicada; discovery mínima probada |
| `202609220003` state machine/RPC | SAFE, HIGH IMPACT | aplicada; pruebas negativas y flujo real PASS |
| `202609220004` Storage/Drive | SAFE en DB vacía; Drive externo pendiente | aplicada; constraints/policies PASS |
| `202609220005` allowlist EXECUTE | SAFE, HIGH IMPACT | aplicada; superficie exacta inventariada |
| `202609220006` review binding | SAFE | aplicada |
| `202609220007` Premium fix | SAFE | aplicada; admin/normal/anon PASS |
| `202609260001` cron purge | SAFE | aplicada; 5/5 probe PASS |
| `202609260002` Realtime allowlist | SAFE | aplicada; 6/6 probe PASS |
| `202609260003` provider eligibility helper | SAFE | aplicada; alta cliente real PASS |

## Resultado post-migración

- 38 migraciones alineadas local/remoto.
- Dry-run sin pendientes.
- 82/82 pgTAP PASS.
- Siete buckets y cinco tablas Realtime exactas.
- Outboxes y datos temporales de prueba limpios.
- No se manipuló history para ocultar diferencias.

## Drift

`supabase db diff --linked --schema public,storage` no pudo iniciar la shadow DB porque el puerto Docker local `54320` estaba ocupado/restringido. No se forzó ni destruyó el proceso existente. La ausencia de migraciones pendientes, la igualdad de history, los inventarios de catálogo y las pruebas remotas reducen el riesgo, pero el diff SQL completo queda como verificación futura cuando el puerto esté disponible.

## Hallazgo funcional corregido

La policy de INSERT de `service_requests` comprobaba el `account_status` mediante la tabla privada `profiles`. Después de la minimización pública, el cliente no podía ver esa fila y un alta legítima fallaba. `202609260003` encapsula únicamente el booleano de elegibilidad en una función segura; no expone PII ni amplía lectura raw.

## Drive

Los IDs históricos de Drive no se consideraron staging. Se creó una estructura separada, pero la integración sigue deshabilitada por falta de cuenta de servicio staging y porque el cliente/outbox aún usan IDs históricos. No se usaron carpetas productivas para tests.
