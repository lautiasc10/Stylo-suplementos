# STYLO SUPLEMENTOS

Ecommerce de una única tienda. Fase 1 en desarrollo local, sin servicios pagos ni dominio contratado.

Repositorio: [lautiasc10/Stylo-suplementos](https://github.com/lautiasc10/Stylo-suplementos). Las entregas se suben por fases, con commits identificados y controles en [GitHub Actions](https://github.com/lautiasc10/Stylo-suplementos/actions). La base inicial se identifica como `fase-1-base`; no representa aceptación completa de los pendientes externos.

## Ejecutar

Requiere Node.js 22 (22.12 o superior) y npm. En PowerShell usar `npm.cmd` si la política del equipo bloquea `npm.ps1`.

```text
npm.cmd ci --ignore-scripts
npm.cmd run dev
```

Abrir http://127.0.0.1:3000. Sin variables de Supabase se puede revisar la interfaz; el administrador permanece bloqueado. No hay productos, carrito ni cobros operativos en esta fase.

## Configuración y verificación

Copiar `.env.example` a `.env.local` y seguir [la configuración de ambientes](docs/configuracion.md). Nunca versionar secretos. Las fuentes se sirven localmente mediante Fontsource, sin descargar tipografías durante cada build.

```text
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Los tests de navegador usan la build de producción con Supabase deshabilitado deliberadamente. El flujo real de contraseña/MFA y las políticas RLS necesitan validación adicional contra un proyecto de pruebas configurado. CI ejecuta los controles locales al subir el repositorio a GitHub.

Documentación: [arquitectura](docs/arquitectura.md), [Fase 1](docs/fase-1.md), [diseño y adaptación de AI Design Skills](docs/diseno.md), [dependencias](docs/dependencias.md). Las especificaciones originales y el manual siguen siendo documentos rectores. No se avanza a Fase 2 sin validación del usuario.

Vista inicial: [escritorio](docs/previews/home-desktop.png) y [móvil](docs/previews/home-mobile.png). Es la base de diseño de Fase 1, pendiente de tu validación.
