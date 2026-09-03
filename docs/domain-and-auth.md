# Dominio, enlaces y acceso social

`laburapp.work` es válido como dominio público de la web y como dominio asociado para la aplicación móvil. El proyecto ya declara ese host para enlaces universales de iOS y App Links de Android.

## DNS y Vercel

El dominio está agregado al proyecto `laburapp` de Vercel. Para activarlo falta apuntar el DNS del registrador a Vercel, con el registro que muestre el panel de Vercel en el momento de configurarlo. No se debe cambiar el DNS hasta confirmar que el dominio fue comprado y está bajo control de LaburApp.

## Google

En Google Cloud se debe configurar:

- dominio autorizado: `laburapp.work`;
- origen web: `https://laburapp.work`;
- URL de retorno de Supabase: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`;
- página principal, privacidad y términos servidos por HTTPS en el dominio.

## Apple

En Apple Developer se debe crear un Services ID para acceso web y asociarlo al App ID `com.alsema.laburapp`. El dominio web será `laburapp.work`; la URL de retorno será la indicada por Supabase. Los enlaces universales requieren publicar `/.well-known/apple-app-site-association` con el Team ID real.

## Archivos pendientes de identidad

No se publican archivos `.well-known` con identificadores inventados. Para generarlos correctamente hacen falta:

- Apple Team ID;
- Android SHA-256 del certificado de firma;
- referencia y URL final del proyecto Supabase;
- identificadores OAuth de Google y Apple.
