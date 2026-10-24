# Fase 3AO — Primera etapa de correcciones de la auditoría

Rama: `fase-3ao-auditoria-accesibilidad`, desde `dcc979c`. El usuario autorizó comenzar después del informe del 23 de octubre de 2026. Esta entrega se limita a hidratación de pedidos, semántica accesible y lectura de precios en tarjetas. Pendiente de validación e integración autorizada a `main`.

## Correcciones

- **Ventas y retiros:** el informe había comparado HTML y DOM del mismo pedido: Node producía `09:00 p. m.` y Chrome `09:00 p. m.`. `orderDate` usa partes numéricas, separadores explícitos, formato de 24 horas y la zona `America/Argentina/Buenos_Aires`. Conserva el instante original en `dateTime`; no modifica pedidos. Las fechas inválidas se muestran como `—`.
- **Filtros de catálogo y búsqueda:** se elimina `role="none"` del elemento nativo `dialog`, que no admite ese rol. El diálogo conserva un nombre tanto en escritorio como en móvil; solo el modo modal declara `aria-modal`. Se mantiene el mismo formulario, sus valores, foco y mejora progresiva.
- **Home:** podio y Novedades obtienen el nombre de sus enlaces del contenido existente, sin reemplazar marca o variante con un `aria-label` incompleto.
- **Promociones:** los enlaces de imágenes incluyen el descuento visible en su nombre. La cinta ofrece su texto una vez mediante contenido accesible y mantiene ocultas sus repeticiones. El contador tiene un grupo con nombre válido.
- **Tarjetas:** “con transferencia” permanece completo y separado del importe en móvil. Los combos también conservan una separación explícita en escritorio. No cambian los precios, su orden, descuentos ni textos comerciales.
- **Prueba de placeholder:** se sustituye una comparación obsoleta con el literal `rgb(8,8,8)` por una comprobación del color realmente pintado: opaco y oscuro, independientemente de su serialización CSS Color 4. No se modifica el token de marca.

## Verificación

Producción local con `npm.cmd run build` y `next start`, Next.js 16.4.3. Los recorridos que crean o editan ejemplos utilizan exclusivamente la vista previa local, aislada de Supabase por `playwright.config.ts`.

- Lint, typecheck y build: correctos.
- Unitarias: 152 pasan; 2 omitidas por la condición existente del CSV externo. Los tres nuevos casos de fecha fallaron con el formato anterior antes de aplicar la corrección.
- La regresión de fecha compara el módulo ejecutado en Node con el mismo código ejecutado en Chrome, en dispositivos configurados con UTC y Los Ángeles. Cubre el cambio de día/año y medianoche de Buenos Aires.
- Playwright comprueba edición de prueba, filtros, búsquedas, cambio de tamaño, foco, teclado, precios de productos y combos, promociones, podio, movimiento reducido, hidratación demorada y navegación sin JavaScript.
- Serie final de seis archivos: 46 pruebas correctas y 14 omitidas según dispositivo por las condiciones existentes. Además pasan 10 recorridos de `catalog.spec.ts` relativos a filtros, búsqueda, teclado y uso sin JavaScript. No hubo fallos en estas comprobaciones finales.
- Se inspeccionaron capturas de catálogo real de 320, 375 y 1440 px, y del podio de prueba. El catálogo real solo se consultó; no se guardaron datos comerciales.

### Lighthouse Accessibility

Chrome real, Lighthouse 12.8.2, compilación de producción en `127.0.0.1:3182`. Una comprobación por página y dispositivo, exclusivamente de accesibilidad; **no es una nueva serie de rendimiento ni una certificación WCAG**. Las referencias anteriores corresponden a las medianas de la auditoría inicial.

| Página | Escritorio anterior → control | Móvil anterior → control |
| --- | --- | --- |
| Inicio | 100 → 100 | 100 → 100 |
| Catálogo | 99 → 100 | 100 → 100 |
| Promociones | 96 → 100 | 96 → 100 |

No quedaron auditorías automáticas de accesibilidad fallidas en esas seis comprobaciones. Los JSON y HTML están en `C:/tmp/stylo-3ao-checks/`; `summary.json` recoge los resultados. Hay capturas `catalogo-320.png`, `catalogo-375.png`, `catalogo-768.png` y `catalogo-1440.png`, y el registro `browser-errors.json` sin errores de página en esas visitas.

## Límites y pendientes

No se volvieron a modificar ni consultar pedidos autenticados para provocar el error; la corrección usa la evidencia de la auditoría y la comparación Node/Chrome del formateador, además de los recorridos de administración de prueba. La sesión autenticada de la auditoría anterior no estaba disponible en este navegador.

La siguiente etapa del informe comprende carga inicial, precargas y fluidez móvil. Siguen pendientes los restantes hallazgos del informe. Esta entrega no modifica animaciones, dependencias, configuración de Supabase, base de datos, pagos, despliegues ni `main`. No se afirma una mejora de LCP, INP o FPS por estos cambios.
