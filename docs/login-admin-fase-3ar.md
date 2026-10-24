# Fase 3AR — Login administrativo

Mejora visual solicitada para escritorio. Desarrollada en `fase-3ar-login-admin`; el usuario autorizó su integración y subida a `main` el 24 de octubre de 2026.

## Causa y solución

La regla de Premium Admin fijaba dos columnas de 256 px y contenido incluso sin menú lateral. Por orden y especificidad, anulaba el comportamiento de una columna de la pantalla de acceso. La tarjeta terminaba dentro del espacio reservado al menú.

`admin-auth.css`, importado después de Premium Admin, restaura una columna cuando no hay navegación. Centra la tarjeta de acceso, con ancho máximo de 480 px, campos y botón de 52 px, contraste estable, radios del panel y una línea dorada superior. Ajusta las proporciones del logo oficial en la cabecera. Usa las fuentes y tokens actuales, sin añadir imágenes, dependencias ni animaciones.

Los estilos del formulario se limitan a las tarjetas de autenticación, compartidas con MFA. No cambian acciones, credenciales, validaciones, permisos ni configuración de Supabase. Los paneles con menú lateral conservan su distribución.

## Verificación

- La prueba de distribución falló antes de la corrección: el centro de la tarjeta estaba desplazado 592 px en escritorio. Pasa después.
- Build de producción, lint y typecheck correctos.
- Seis pruebas Playwright correctas: distribución, bloqueo administrativo/MFA sin configuración y recorrido de Productos, Ventas y Promociones de ejemplo, en escritorio y móvil.
- Capturas reales del acceso a 1920×1080, 1440×900, 1366×768, 375×812 y 320×760. Sin errores de página ni desbordamiento horizontal; tarjeta de 480 px en los tres escritorios.
- Sin JavaScript, la tarjeta mantiene posición y dimensiones a 1440×900. Movimiento reducido activo durante la revisión visual; no se incorporó movimiento nuevo.
- Evidencias en `C:/tmp/stylo-3ar/`: capturas y `visual.json`. Revisadas las imágenes de 1920, 1440 y 375 px. Las cancelaciones de precarga al cerrar contextos y el bloqueo de scripts con JavaScript deshabilitado no se interpretan como fallos funcionales de carga.

No se enviaron formularios de autenticación ni se accedió a datos privados durante la revisión visual.
