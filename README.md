# Sitio web TEKAL

Sitio web estatico listo para publicar en Cloudflare Pages.

## Publicar en Cloudflare Pages

1. Sube este directorio a un repositorio de GitHub.
2. En Cloudflare, entra a **Workers & Pages**.
3. Selecciona **Create application** y despues **Pages**.
4. Conecta tu cuenta de GitHub desde Cloudflare usando el flujo oficial de autorizacion.
5. Elige el repositorio.
6. Usa esta configuracion:
   - Framework preset: `None`
   - Build command: dejar vacio
   - Build output directory: `/`
7. Publica el proyecto.

## Credenciales

No guardes usuarios, contrasenas, tokens o llaves privadas dentro del repositorio ni las pegues en chats.
Cloudflare se conecta con GitHub mediante autorizacion segura desde el panel de Cloudflare.

## Personalizacion rapida

- Cambia textos y correo en `index.html`.
- Ajusta colores y estilo en `styles.css`.
- Reemplaza la imagen principal cambiando la URL del fondo en `.hero`.
