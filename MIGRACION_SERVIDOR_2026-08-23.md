# Migración de servidores TEKAL POS

Fecha de cierre técnico: 2026-08-23

Este documento resume la migración realizada del servidor anterior al servidor nuevo. No contiene contraseñas, claves privadas, códigos TOTP, admin keys ni tokens de Cloudflare.

## 1. Servidores

### Servidor anterior

- IP: `161.22.40.204`
- Usuario SSH: `tekal-admin`
- Acceso: llave SSH + TOTP
- Sistema: Ubuntu 24.04.4 LTS
- Servicios originales: PostgreSQL, TEKAL Platform, TEKAL Licensing, Nginx y Leadflow

### Servidor nuevo

- IP Tailscale: `100.102.18.122`
- Usuario: `zpartmax`
- Sistema: Ubuntu 24.04.4 LTS
- PostgreSQL 16 activo
- Cloudflare Tunnel activo

## 2. Migración PostgreSQL

La base principal del servidor anterior era `tekal_platform`.

Respaldo utilizado:

- Formato: dump PostgreSQL custom
- Archivo original: `tekal_platform.dump`
- Tamaño aproximado: 233 KB
- Base destino: `tekal_platform`

La restauración se realizó mediante `pg_restore` y terminó correctamente.

Se recuperaron 23 tablas, entre ellas:

- `Tenants`
- `Users`
- `Customers`
- `Products`
- `Categories`
- `Orders`
- `OrderItems`
- `Payments`
- `InventoryItems`
- `InventoryTransactions`
- `RecipeDetails`
- `Tables`
- `Terminals`
- `CashRegisters`
- `CashDrawerMovements`
- `__EFMigrationsHistory`

También se restauraron índices, claves foráneas y políticas de seguridad por fila (RLS).

## 3. Migración de licencias

El servicio de licencias no utiliza PostgreSQL. Utiliza SQLite.

Ruta original:

```text
/opt/tekal-licensing/data/tekal-licensing.db
```

Ruta final:

```text
/opt/tekal-licensing/data/tekal-licensing.db
```

Checksum SHA-256 verificado antes y después de la transferencia:

```text
535a963704bb95981351673f50bc0b66d9c3820393e28c2f5fb3e73dbcb26237
```

La base de licencias quedó íntegra y disponible en el servidor nuevo.

## 4. Servicios instalados

### TEKAL Licensing

- Unidad systemd: `tekal-licensing.service`
- Usuario del proceso: `tekal-licensing`
- Puerto local: `127.0.0.1:5088`
- Datos: `/opt/tekal-licensing/data`
- Variable de datos: `TEKAL_DATA_DIR`
- Admin key: configurada mediante `TEKAL_ADMIN_KEY` en un archivo protegido del servidor

Validación realizada:

```text
systemctl is-active tekal-licensing → active
```

El endpoint administrativo respondió correctamente con la admin key:

```text
GET /api/admin/dashboard → HTTP 200
```

### TEKAL Platform

- Unidad systemd: `tekal-platform.service`
- Usuario del proceso: `tekal-platform`
- Puerto local: `127.0.0.1:5090`
- Base de datos: `tekal_platform`
- Entorno: `Production`
- Licencias configuradas mediante:

```text
https://licencias.tekalpos.com
```

Validación realizada:

```text
http://127.0.0.1:5090/admin → HTTP 200
https://tekalpos.com/admin → HTTP 200
```

## 5. Cloudflare Tunnel

Se configuró Cloudflare Tunnel para evitar exponer puertos entrantes del servidor.

### Licencias

```text
licencias.tekalpos.com → http://127.0.0.1:5088
```

La conexión pública utiliza HTTPS administrado por Cloudflare.

Validación:

```text
https://licencias.tekalpos.com/api/licenses/validate → HTTP 405 Allow: POST
```

El código `405` es correcto porque el endpoint sólo acepta `POST`.

### Plataforma

```text
tekalpos.com → http://127.0.0.1:5090
```

Validación:

```text
https://tekalpos.com/admin → HTTP 200
```

## 6. Archivos y rutas importantes

```text
/opt/tekal-licensing/app
/opt/tekal-licensing/data/tekal-licensing.db
/opt/tekal-platform/current
/etc/tekal-licensing/tekal-licensing.env
/etc/tekal-platform/tekal-platform.env
/etc/systemd/system/tekal-licensing.service
/etc/systemd/system/tekal-platform.service
```

Los archivos `.env` contienen secretos y no deben copiarse al repositorio ni publicarse en `TEKAL_webpage`.

## 7. Comandos de diagnóstico

```bash
sudo systemctl status tekal-licensing --no-pager -l
sudo systemctl status tekal-platform --no-pager -l
sudo journalctl -u tekal-licensing -n 80 --no-pager
sudo journalctl -u tekal-platform -n 80 --no-pager
ss -ltnp | grep -E ':5088|:5090'
sudo sha256sum /opt/tekal-licensing/data/tekal-licensing.db
curl -i http://127.0.0.1:5088/api/licenses/validate
curl -i http://127.0.0.1:5090/admin
```

## 8. Pendientes

1. Migrar y publicar el almacenamiento de uploads si todavía se requiere conservar archivos del servidor anterior.
2. Confirmar copias de seguridad automáticas del nuevo servidor.
3. Rotar las credenciales temporales usadas durante la migración.
4. Mantener el servidor anterior sin eliminar hasta confirmar que no quedan uploads u otros archivos necesarios.
5. Probar una activación real de licencia desde un cliente y una operación real de clientes/productos desde la plataforma web.

## 9. Estado final

La información crítica solicitada quedó migrada:

- Clientes: migrados en PostgreSQL.
- Datos operativos POS: migrados en PostgreSQL.
- Licencias: migradas en SQLite y checksum verificado.
- Servicio de licencias: activo.
- Plataforma web: publicada.
- HTTPS y acceso externo: funcionando mediante Cloudflare Tunnel.
