# Fase 3T — Tienda y tarjetas compactas

Autorizada el 20 de octubre a partir de la referencia adjunta. La aclaración posterior del usuario conserva la jerarquía y los nombres actuales de los precios; no se incorpora el selector superior Transferencia/Mercado Pago.

- Tienda con título visible, ancho máximo de 1440 px, lateral de 248 px y cuatro tarjetas por fila desde 1200 px. Entre 960 y 1199 px usa tres; en celular y tablet conserva dos columnas y el panel modal de filtros existente.
- Categorías abiertas con cantidades reales de productos, selección dorada y opción Todas. Marcas reales con casillas combinables; precio máximo con deslizador; Solo con stock y Solo promociones visibles. Sabor y precio mínimo siguen disponibles. Los parámetros, el orden y la selección se conservan en la URL. Se mantiene el regreso al inicio al filtrar.
- «Ordenar por» arriba a la derecha: Destacados, Nombre, Menor precio y Mayor precio. El control pertenece al mismo formulario nativo del lateral, aunque esté fuera de él visualmente; funciona con teclado y sin JavaScript.
- Tarjetas con espacios, títulos y logos más compactos, fotos y piedra intactas. Los títulos largos se limitan visualmente a dos líneas en escritorio y tres en celular; el texto completo sigue en el enlace accesible y su título. Se conserva Barlow Condensed e Inter, sin escalar mapas de bits ni cambiar archivos de marca.
- «Ver variantes» lleva a la variante visible. El botón dorado + agrega una unidad de esa variante mediante la acción existente, abre el carrito y se desactiva cuando el stock ya está agregado. No navega al detalle al pulsarlo. Se conservan las flechas, precios, promociones, nombres y SKU.
- Los precios conservan su orden y leyendas anteriores: importe principal, con transferencia y ahorro. Solo se compactan su tipografía y sus espacios.

## Verificación

`npm.cmd run check`: lint, typecheck, 101 pruebas unitarias aprobadas (dos omitidas) y build de producción.

Recorridos Chromium de catálogo, administración local, carrito, búsqueda, cambio de variante, disponibilidad, movimiento reducido, panel móvil, foco, regreso al inicio y navegación sin JavaScript aprobados. Las pruebas nuevas cubren combinación de marcas, persistencia de orden, agregado de la variante visible, stock máximo, ausencia del selector superior de pago y grilla sin desbordamientos. Se actualizan dos fixtures previos: el caso de stock bajo usa la búsqueda administrativa para encontrar la marca recién creada, y el caso de lateral fijo usa un catálogo largo, porque cuatro tarjetas ahora caben en una sola fila.

Medición visual sobre el mismo catálogo público y build de producción, sin errores de página:

| Ancho de pantalla | Primera tarjeta antes | Primera tarjeta después | Columnas |
| --- | --- | --- | --- |
| 1440 px | 333 × 673 px | 254 × 508 px | 4 |
| 1920 px | — | 278 × 532 px | 4 |
| 768 px | — | 362 × 588 px | 2 |
| 375 px | 166 × 486 px | 166 × 434 px | 2 |
| 320 px | — | 138 × 422 px | 2 |

El menor tamaño de escritorio incluye el cambio de tres a cuatro columnas. No se modifican recursos de producto ni su resolución. La revisión confirma ausencia de desbordamiento horizontal entre 320 y 1920 px; no equivale a una medición de FPS en hardware móvil físico.

Capturas: [tienda de escritorio](previews/tienda-fase-3t-1440.png), [celular](previews/tienda-fase-3t-375.png), [filtros móviles](previews/tienda-fase-3t-filtros-375.png).

Entrega en `fase-3t-tienda-compacta`, pendiente de revisión antes de integrar a main. No se modificaron registros remotos del catálogo.
