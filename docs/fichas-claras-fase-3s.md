# Fase 3S — Precios y promociones claros en las fichas

Pedido del 20 de octubre: simplificar todas las fichas, quitar «Sabor: …» y el ahorro en pesos, acercar los precios y aclarar que DP significa Doypack.

- Los chips conservan la selección, el tachado de agotados, las flechas y el fondo por sabor. Se retira la línea de sabor duplicada sobre ellos.
- El selector de pago tiene debajo un único precio por unidad, con el medio elegido escrito explícitamente. Se retiran el importe del otro medio y «Ahorrás». Una rebaja real conserva solo su precio anterior tachado, del mismo medio de pago; el tachado también se aplica a la capa visual del contador.
- La promoción individual aplicada se resume en «Precio promocional aplicado». Combos y descuentos por cantidad quedan en desplegables nativos, con condiciones, componentes y un solo importe según el medio seleccionado. «Total del combo» distingue ese importe del precio por unidad de la ficha. El botón «Agregar combo completo» reutiliza el guardado atómico existente y abre el carrito; el botón principal sigue agregando el producto individual.
- DP se expande a Doypack al presentar títulos de ficha y tarjeta, etiquetas de variantes, componentes del combo e información del producto. No se modifica el catálogo persistido, sus nombres originales, identificadores, SKU, precios ni existencias.
- Se retira la altura mínima sobrante del precio y se compactan los espacios entre stock, pago, precio, promoción y compra. El botón fijo móvil se conserva.

## Verificación

`npm.cmd run check`: lint, TypeScript, 100 pruebas unitarias aprobadas (dos omitidas) y build de producción.

74 recorridos aprobados de Chromium en escritorio y móvil (dos casos exclusivos de móvil omitidos en escritorio): fichas con y sin sabor, cambios de variante, movimiento reducido, precios animados, cantidades/cupos, combo completo, carrito, búsqueda, administración local y navegación sin JavaScript. Los nuevos casos verifican ausencia del sabor duplicado y del ahorro en la ficha, un único precio según pago y total del combo separado. La revisión visual sobre el catálogo público usa 1440 × 1000 y 375 × 812, sin desbordamientos ni errores de página. Las pruebas de compra escriben solo en la vista previa local; no se alteró la base de datos.

Capturas: [escritorio](previews/ficha-fase-3s-desktop.png), [móvil](previews/ficha-fase-3s-mobile.png).

Entrega en `fase-3s-fichas-precios-claros`, pendiente de revisión antes de integrar a main.
