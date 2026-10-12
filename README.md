# STYLO SUPLEMENTOS

Ecommerce de una única tienda. Fase 3 de comercio implementada para revisión, sin servicios pagos ni dominio contratado. El usuario ya creó Supabase; su conexión y validación remota están en preparación.

Repositorio: [lautiasc10/Stylo-suplementos](https://github.com/lautiasc10/Stylo-suplementos). Las entregas se suben por fases, con commits identificados y controles en [GitHub Actions](https://github.com/lautiasc10/Stylo-suplementos/actions). La base inicial se identifica como `fase-1-base`; no representa aceptación completa de los pendientes externos.

## Ejecutar

Requiere Node.js 22 (22.12 o superior) y npm. En PowerShell usar `npm.cmd` si la política del equipo bloquea `npm.ps1`.

```text
npm.cmd ci --ignore-scripts
npm.cmd run dev
```

Abrir http://127.0.0.1:3000. Sin variables de Supabase, el catálogo real queda vacío y el administrador permanece bloqueado. Revisar el catálogo con datos ficticios en http://127.0.0.1:3000/vista-previa y su gestión en http://127.0.0.1:3000/vista-previa/gestion. Los cambios de prueba se guardan en ese navegador. Carrito, checkout de revisión, promociones y registros manuales están disponibles en las rutas de [Fase 3](docs/fase-3.md); los cobros online todavía no están habilitados.

## Configuración y verificación

Copiar `.env.example` a `.env.local` y seguir [la configuración de ambientes](docs/configuracion.md). Nunca versionar secretos. Las fuentes se sirven localmente mediante Fontsource, sin descargar tipografías durante cada build.

```text
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Los tests de navegador usan la build de producción con Supabase deshabilitado deliberadamente. Para probar en otro puerto sin interferir con un servidor abierto, configurar `PLAYWRIGHT_PORT`. El flujo real de contraseña/MFA, las políticas RLS y Storage necesitan validación adicional contra un proyecto de pruebas configurado. CI ejecuta los controles locales al subir el repositorio a GitHub.

Documentación: [arquitectura](docs/arquitectura.md), [Fase 1](docs/fase-1.md), [Fase 2 y guía de importación](docs/fase-2.md), [Fase 3](docs/fase-3.md), [diseño y adaptación de AI Design Skills](docs/diseno.md), [dependencias](docs/dependencias.md). Las especificaciones originales y el manual siguen siendo documentos rectores. La Fase 3 fue autorizada; la integración de las ramas a `main` sigue pendiente de validación.

Capturas: [inicio](docs/previews/home-desktop.png), [catálogo](docs/previews/catalog-desktop.png) y [ficha móvil](docs/previews/product-mobile.png). Catálogo y ficha usan datos de prueba, pendientes de validación visual.
