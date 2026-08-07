# Joy Vapers

Sitio web oficial de Joy Vapers Iquitos, con catálogo, compra por WhatsApp, novedades y foro comunitario persistente.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2FTyroneSPR%2FJoy-Vapers)

## Ejecutar localmente

En Windows, abre `INICIAR-SITIO.bat`. También puedes ejecutar:

```bash
npm start
```

Luego visita `http://localhost:4173`.

## Desplegar en Render

El repositorio incluye `render.yaml` para crear un Web Service de Node.js con:

- despliegue automático con cada commit;
- comprobación de salud en `/health`;
- disco persistente de 1 GB montado en `/var/data`;
- almacenamiento permanente del foro en `/var/data/community-data.json`.

En el panel de Render selecciona **New > Blueprint**, conecta este repositorio y confirma la creación del servicio `joy-vapers`.

### Nombres que verás en Render

- `joy-vapers`: servidor principal; conserva este nombre porque genera la dirección `joy-vapers.onrender.com`.
- `datos-foro-joy-vapers`: disco donde se guardan publicaciones, respuestas y likes.
- `/health`: comprobación automática que confirma que la web está funcionando.
- `/var/data`: carpeta privada y persistente utilizada por el foro.
- `DATA_DIR`: nombre técnico de la variable que conecta el servidor con esa carpeta.

> El disco persistente requiere un servicio de pago en Render. El plan gratuito usa un sistema de archivos temporal y perdería publicaciones, respuestas y likes al reiniciarse.

## Datos principales

- Tienda: Calle Nauta N.° 341, distrito de Iquitos, provincia de Maynas, Loreto, Perú.
- WhatsApp: +51 919 013 743.
- Correo para peticiones: joyvapersiquitos@gmail.com.
