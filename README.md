# TEKAL Web

Landing page publica para TEKAL, con enlaces a descarga, releases y activacion.
Tambien incluye un panel privado inicial en `admin.html` para consultar licencias, dispositivos, pagos, releases y metricas del servidor.

## Configuracion

- WhatsApp comercial en `index.html`.
- API de licencias en la meta tag `tekal-license-api`.
- La descarga publica se resuelve desde la release activa del API.
- Release publica desde `/api/updates/latest`.
- El panel admin usa la misma meta tag y una `admin key` valida del servidor.

## Estructura esperada

- `https://tekalpos.com` para la pagina publica.
- `https://licencias.tekalpos.com` para el servidor de licencias y actualizaciones.
- El sitio publico debe poder leer el API de licencias por CORS.
- El panel admin puede publicarse en el mismo hosting estatico y consume `/api/admin/*` con `X-Admin-Key`.

## Publicacion

El sitio es estatico y puede publicarse en Cloudflare Pages, GitHub Pages o cualquier hosting que sirva HTML, CSS y JS.
Si cambias el subdominio del API, ajusta la meta tag `tekal-license-api` en `index.html`.

## Verificacion minima

- La pagina carga sin caracteres rotos.
- El boton de instalador apunta al archivo publicado.
- La seccion de releases consulta la version activa.
- El pie de pagina muestra el ano actual.
- `admin.html` permite autenticar con la admin key y consultar el dashboard.
