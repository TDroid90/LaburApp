# LaburApp

Foundation local de una plataforma argentina para encontrar, contratar y pagar de forma protegida a prestadores de servicios. Incluye una app Expo, un panel Next.js, reglas de dominio probadas y una base Supabase con RLS.

> Estado: foundation ejecutable en modo demo. Los perfiles visibles son ficticios; pagos, publicidad y verificaciones externas no mueven dinero ni consultan servicios reales.

El modo demo permite recorrer registro, recuperación de cuenta, perfil de prestador, solicitud y revisión de presupuesto, pago protegido ficticio, coordinación, trabajo en curso, conversación con bloqueo de contacto, finalización y reseña verificada. En “Trabajos” se pueden cargar tres escenarios ficticios para probar el circuito.

Los prestadores pueden armar presupuestos modulares por ítems, precio fijo u honorarios “desde”, usando plantillas editables por oficio. La integración preparada con Google Sheets refleja usuarios, contactos y presupuestos sin copiar contraseñas, documentos ni conversaciones privadas.

## Inicio rápido en Windows

Requisitos: Node.js 22 o posterior, Git y, solo para Supabase local, Docker Desktop abierto.

```powershell
cd LaburApp
npm install
npm run dev
```

Esto inicia:

- app móvil Expo: `http://localhost:8081` y un QR en la consola;
- administración: `http://localhost:3000`.

Para detener ambos procesos, presioná `Ctrl+C` en esa misma ventana.

## Ejecutar cada parte por separado

```powershell
npm run mobile
npm run admin
```

En un celular Android o iPhone, instalá Expo Go, conectá el teléfono a la misma red y escaneá el QR. Esta foundation no invoca APIs exclusivas de Expo Go. Para un Development Build real, instalá EAS CLI y ejecutá `npx eas build --profile development --platform android` dentro de `apps/mobile`.

## Supabase local

Con Docker Desktop abierto:

```powershell
cd LaburApp
npx supabase start
npx supabase db reset
```

Copiá `.env.example` como `.env.local` en cada aplicación y completá la URL local y la clave `anon` que muestra Supabase. La interfaz demo funciona aunque no lo hagas: sesión demo, solicitudes y perfil profesional se guardan en el dispositivo. Cuando las variables están configuradas, queda disponible el cliente de Supabase con sesión persistente para conectar los flujos reales.

## Verificación

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Preview Android

```powershell
cd apps\mobile
npx eas login
npx eas build --profile preview --platform android
```

EAS entrega un enlace a un APK interno. No se publica automáticamente en Google Play.

## Modo seguro de desarrollo

- `PAYMENT_PROVIDER=mock`: aprobaciones, rechazos, liberaciones y reembolsos simulados.
- `ADS_PROVIDER=mock`: sin IDs comerciales de AdMob.
- documentos privados: bucket no público con acceso sujeto a RLS.
- administración: la pantalla local es demostrativa; las mutaciones reales deben pasar por un usuario `admin` asignado de forma privilegiada.

La arquitectura y límites actuales están documentados en [docs/architecture.md](docs/architecture.md), [docs/security.md](docs/security.md), [docs/google-sheets-mirror.md](docs/google-sheets-mirror.md) y [docs/known-limitations.md](docs/known-limitations.md).
