# TEKAL Web

Landing page publica para TEKAL, con enlaces a descarga, releases y activacion.

## Configuracion

- WhatsApp comercial en `index.html`.
- API de licencias en la meta tag `tekal-license-api`.
- Descarga publica desde `/downloads/TEKALRestaurant_Setup_2.2.exe`.
- Release publica desde `/api/updates/latest`.

## Estructura esperada

- `https://tekalpos.com` para la pagina publica.
- `https://licencias.tekalpos.com` para el servidor de licencias y actualizaciones.
- El sitio publico debe poder leer el API de licencias por CORS.

## Publicacion

El sitio es estatico y puede publicarse en Cloudflare Pages, GitHub Pages o cualquier hosting que sirva HTML, CSS y JS.
Si cambias el subdominio del API, ajusta la meta tag `tekal-license-api` en `index.html`.

## Verificacion minima

- La pagina carga sin caracteres rotos.
- El boton de instalador apunta al archivo publicado.
- La seccion de releases consulta la version activa.
- El pie de pagina muestra el ano actual.
