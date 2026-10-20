# Fase 3R — Ficha, importes y ancho de colecciones

Referencia autorizada: `2026-10-20 14-19-03.mkv`. El usuario confirmó conservar los fondos animados por sabor y aplicar la referencia a la información, precios y compra.

## Resultado

- Selector Transferencia/Mercado Pago compartido por la ficha y Promociones. Conserva la elección al abrir el carrito y al navegar al checkout.
- Precio principal del medio elegido, importe anterior tachado y porcentaje cuando existe una rebaja real. Debajo aparecen el otro medio y el ahorro correspondiente. Se mantienen las reglas de promoción y los precios de las tarjetas del catálogo.
- Contador de importes de 420 ms con desaceleración. Interrumpe cambios rápidos desde el valor que estaba mostrando, sin volver al inicio. El precio accesible se actualiza inmediatamente; solo la representación visual cambia por cuadro. Los formateadores monetarios se reutilizan, sin crear instancias de Intl ni renders de React en cada cuadro. Cambiar de sabor no agrega otro conteo a su coreografía.
- Destello de luz de 720 ms en el botón de compra y en el agregado rápido de promociones, al pasar el cursor o recibir foco de teclado. Solo se animan transform y opacity del destello. Movimiento reducido desactiva destello y contador; el importe final permanece visible sin JavaScript.
- Selector de cantidad junto a compra, limitado por el stock y las unidades que ya están en el carrito. El precio por unidad considera cantidad mínima y cupo: una oferta por cantidad se refleja al alcanzar su umbral, y vuelve al precio habitual si se supera el cupo. El servidor conserva la validación final. No se reservan existencias ni se crean pedidos.
- Título más compacto, chips redondeados con agotados tachados, aviso de promoción compacto y desplegable de información con descripción, marca, contenido, presentación e imágenes reales. Se conservan los logos oficiales.
- En celular se mantiene fija la compra, con cantidad y botón en una sola barra. Los fondos de sabor y sus transiciones permanecen intactos; no se incorporan mensajes de envíos ni cuotas no confirmados.
- `--collection-width: 1280px` alinea Destacados, Novedades y Promociones. El hero y la cabecera conservan su ancho.

## Verificación del 20 de octubre de 2026

- Lint, typecheck y build de producción aprobados. 99 pruebas unitarias aprobadas; dos pruebas previas de integración continúan omitidas.
- 78 recorridos de navegador aprobados en Chromium de escritorio y celular; dos duplicados exclusivos de móvil se omiten en el proyecto de escritorio. Cubren importes intermedios, interrupción del contador, movimiento reducido, cantidad/cupo, SKU, stock, carrito, compra fija a 375 y 768 px, galería, información, selección de sabor, navegación y funcionamiento sin JavaScript.
- Igualdad de ancho y alineación comprobada en las tres colecciones a 375, 1440 y 1920 px; máximo de 1280 px.
- Revisión visual con las publicaciones reales a 1440 y 375 px, sin desbordamiento horizontal ni errores de JavaScript. El panel de precios de la proteína One Fit mantiene 108 px antes y después del cambio de medio.
- Recorrido adicional sobre esa ficha real: selección de Mercado Pago, dos unidades añadidas y totales correctos en carrito ($68.000 Mercado Pago / $60.000 transferencia). Se comprobó el destello `purchase-shimmer`. Sesiones aisladas, sin pedidos ni cambios de stock.
- Sin JavaScript se verificó el importe visible generado por CSS y el agregado de una unidad mediante el formulario nativo, con llegada correcta al carrito.

Capturas: [ficha en escritorio](previews/ficha-fase-3r-desktop.png) · [ficha en celular](previews/ficha-fase-3r-mobile.png) · [promociones](previews/promociones-fase-3r-desktop.png).
