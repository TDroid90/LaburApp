# Arquitectura de doble layout

## Arquitectura real

La aplicación pública sigue siendo Expo Router + React Native/Expo Web. El panel `apps/admin` continúa siendo una aplicación Next independiente y privada.

```text
app/index.tsx (estado y orquestación todavía monolítica)
  ├─ componentes de funciones existentes
  ├─ servicios/lib compartidos (Supabase, persistencia, mirror, demo)
  └─ AppShell
      ├─ MobileLayout + navegación inferior
      └─ DesktopLayout + sidebar persistente

Supabase client → RLS/RPC/Storage
packages/shared → validaciones y reglas de dominio reutilizadas
```

No hay dos copias de autenticación, queries o mutations. `AppShell` cambia estructura y navegación visual; recibe el mismo contenido, tab activo y callbacks.

## Breakpoints centrales

Definidos en `apps/mobile/src/layouts/responsive.ts`:

| Layout | Ancho |
|---|---:|
| mobile | `< 600px` |
| tablet | `600–1023px` |
| desktop | `>= 1024px` |

`useResponsiveLayout()` es el único punto de medición de ventana usado por la pantalla principal. Tablet reutiliza inicialmente la estructura móvil/táctil, pero tiene identidad propia en la API para especializarlo sin modificar reglas de negocio.

## Experiencia mobile

- Conserva header, contenido, modales, acciones y navegación inferior.
- Mantiene espacio seguro para la barra de navegación nativa de Android.
- La navegación inferior se movió a un componente presentacional; el tab y la lógica continúan en `index.tsx`.
- El layout compacto se decide por la abstracción responsive, no por un `width < X` local.

## Experiencia desktop

- Sidebar persistente después de iniciar sesión.
- Área de trabajo separada y redimensionable.
- Ancho útil máximo de 1440 px.
- Grilla de profesionales en dos columnas cuando existe espacio.
- Secciones operativas admiten hasta 1180 px, evitando una “pantalla de teléfono gigante”.
- El header desktop se convierte en barra de acciones; la identidad/navegación principal está en la sidebar.

## Navegación

Expo Router sólo contiene hoy la ruta raíz y un `Stack`; la navegación funcional (`Inicio`, `Solicitudes`, `QR`, `Contratados`, `Perfil`, `Panel`) es estado local. Migrarla masivamente ahora tendría alto riesgo porque modales, polling, realtime y flujos de rol dependen del mismo árbol.

Próximo paso recomendado: extraer primero un controlador de sesión y stores/hooks de solicitudes; luego convertir cada tab en una ruta sin duplicar queries. Hasta entonces, `AppShell` es la frontera estable.

## Refactor incremental realizado

- `src/layouts`: política de breakpoints, hook, shell y layouts.
- `src/navigation`: navegación visual compartida.
- `lib/secure-session-storage.ts`: adaptador testeable separado de la creación del cliente Supabase.
- `lib/public-app-url.ts`: configuración de URL y redirects.

`app/index.tsx` continúa siendo grande. No se movió lógica sólo por estética ni se reescribieron flujos. Próximas extracciones útiles:

1. `features/auth`: estados, submit, recovery y bootstrap de sesión.
2. `features/requests`: carga realtime/polling, normalización y acciones RPC.
3. `features/provider-directory`: discovery, reseñas y filtros.
4. `features/profile`: perfil, portfolio, credenciales y suscripción.
5. `features/admin`: métricas/revisiones, sin mezclarlo con `apps/admin`.

## Accesibilidad y límites conocidos

La navegación expone nombre y estado seleccionado, los botones mantienen etiquetas y la grilla se adapta al resize. Quedan pendientes una prueba formal con lector de pantalla, escalado de fuente grande y focus trapping de todos los modales web. La orientación nativa continúa en portrait para no cambiar la experiencia móvil en esta fase; Expo Web no queda limitado por esa preferencia.
