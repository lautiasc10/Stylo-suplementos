# Anillo de variantes y tilt — Fase 3C

17 de octubre de 2026. Rama: `fase-3c-variant-ring`.

El usuario canceló la Fase 3B antes de guardarla. Se retiraron sus cambios de modelo y procesamiento de secuencias. Esta entrega usa únicamente las portadas existentes, sin imágenes generadas, archivos de ángulos nuevos, migraciones ni escrituras a Supabase.

## Un componente para toda la tienda

`VariantRing` sustituye `VariantSpinner`, `PackageTurn` y la galería anterior. `ProductGallery` queda como adaptador de los datos y las miniaturas existentes. Se eliminan los estilos del giro de carta, caras y fragmentación. No se agregan dependencias; se usa `animate` de Framer Motion ya instalado.

- Tamaños `compact` y `full`: mismo anillo, perspectiva de 1000 px y rotación de 560 ms. El frente conserva escala 1 y opacidad 1; sus vecinas usan escala .55 en tarjetas y .7 en detalle, opacidad .4 y profundidad negativa. En reposo solo existen la activa y hasta dos vecinas. Con dos variantes aparece una sola vecina; cambia de costado después del intercambio para mantener la continuidad. Una variante tiene solo tilt, sin controles de sabor ni contador.
- Los elementos se desplazan sobre un arco mediante `translate3d`, `rotateY` suave y escala. No se voltea ni se espeja la foto. Una elección lejana por chip utiliza la misma transición, sin mostrar todas las variantes intermedias. Las capas temporales son como máximo seis y quedan como máximo tres al finalizar.
- Flechas, teclas ←/→, swipe y chips comparten selección. Si llegan varias solicitudes durante la rotación, se conserva únicamente la última. Se espera descarga y decodificación de la foto y del nodo de destino; la selección se confirma al terminar de colocarlo al frente. Precio, stock, sabor, carrito, miniaturas, contador y URL permanecen juntos. Un error conserva la selección anterior y permite reintentar.
- La tarjeta abre la variante activa al pulsar imagen, nombre, acción o área de precios. Flechas y swipe no navegan. Las miniaturas conservan dorsos y fichas ya cargados con fundido de 250 ms; esas imágenes no participan del anillo. La roca permanece independiente y fija.

## Tilt, brillo y carga

`useTilt` se reutiliza en ambos tamaños. Limita el movimiento a ±5° en tarjetas y ±8° en detalle, con perspectiva de 900 px y retorno de 300 ms. Un solo `requestAnimationFrame` pendiente actualiza `--rx`, `--ry`, `--mx`, `--my` y el desplazamiento inverso de la sombra, sin estado React por movimiento. No hay un bucle de animación mientras el cursor está quieto.

El brillo radial tiene opacidad .15 y mezcla `soft-light`. Su máscara reutiliza el `currentSrc` ya cargado para limitarlo a la silueta del producto; también se inicializa si la imagen llegó antes de hidratar. Un destello breve recorre el envase entrante durante la rotación. Son capas sin interacción. La inclinación vuelve a cero mientras se carga o rota una selección, y el fondo nunca se mueve.

Las tarjetas comienzan con una sola fotografía visible en el HTML. Las vecinas se decodifican después de hover, foco o contacto táctil y entonces asoman; no se descargan dos fotos extra por cada producto al abrir el catálogo. En detalle se preparan al cargar la foto principal y entrar en pantalla. Las precargas comparten caché con las selecciones y conservan como máximo cuatro fotografías por galería. Se libera la caché fuera de pantalla. Ahorro de datos desactiva precarga y alternancia automática. La alternancia previa de tres segundos queda limitada al hover; se pausa al salir, enfocar, ocultar la pestaña o elegir manualmente.

## Accesibilidad y móvil

Los controles tienen nombre accesible, foco visible y área de 44–48 px. Las vecinas están ocultas al lector de pantalla y no reciben eventos. Solo se anuncia la variante confirmada; el tilt no modifica el foco ni el área del enlace.

En touch se admite inclinación al arrastrar y swipe horizontal para elegir variante, con `touch-action: pan-y pinch-zoom`. El gesto vertical conserva el scroll nativo y el tap conserva la navegación. Con movimiento reducido no se muestran vecinas ni brillo, se desactiva el tilt y se utiliza un fundido de 180 ms. Cambiar esa preferencia durante la rotación confirma la imagen ya preparada. Sin JavaScript siguen visibles la portada, los datos, los enlaces nativos de variantes y la compra.

Se mantienen paleta, fuentes, logos, textos comerciales, composición general, medidas de las imágenes y controles de compra. Los archivos pendientes del usuario en `public/sabores` quedan fuera de esta entrega.

## Verificación

Las comprobaciones cubren anillos de una, dos y ocho variantes, poses para hasta cien, tamaño compacto/completo, roca fija, duración, cola, teclado, swipe, tilt acotado, reset, errores, reduced motion y ausencia de precargas antes de la interacción. Los recorridos anteriores siguen verificando catálogo, edición, importador, carrito, promociones, checkout de prueba, normalización, miniaturas y navegación sin JavaScript.

Las pruebas de autoplay adelantan su temporizador y completan por separado las animaciones nativas: el reloj simulado de Playwright no representa el reloj real del compositor que usa Framer Motion. La duración y los fotogramas se comprueban con el reloj real en las pruebas específicas del anillo.

- ESLint sin avisos, TypeScript y build de producción correctos. 82 pruebas unitarias aprobadas y dos omitidas por su configuración existente.
- 134 recorridos Chromium aprobados, con dos omisiones por plataforma. La corrida general aprobó 132 y omitió dos; se adaptaron los dos casos restantes de reloj simulado de autoplay y se repitieron ambos satisfactoriamente. La prueba touch usa entrada táctil real de Chromium para abrir la tarjeta y, al volver, desplazar verticalmente la página.
- Catálogo real de 53 productos a 1800, 768 y 375 px, con cuatro/dos/dos columnas. Fichas de Cafeína 200, Whey y The Best Gainer sin desbordamientos ni errores de consola; Whey confirma el mismo SKU en URL y carrito y conserva la roca. Anillo compacto y completo con tres elementos en 1800 y 375 px; máscara del brillo disponible e inclinación dentro del límite. [Verificación responsive](reviews/variant-ring-fase-3c/verificacion.json).
- Rendimiento con producción local, recursos preparados, Chromium a 375 px y CPU ralentizada 4×: anillo con 142 muestras, percentil 95 de 16,8 ms, máximo de 33,4 ms y ninguna pausa mayor a 50 ms. Tilt con 121 muestras, percentil 95 de 16,7 ms, máximo de 16,8 ms, ninguna pausa mayor a 50 ms y cero cambios de estructura DOM durante el movimiento. [Mediciones](reviews/variant-ring-fase-3c/rendimiento.json). Se midió sin compilaciones ni pruebas concurrentes; es una simulación de laboratorio y no una garantía para todo teléfono o conexión.
- Una nueva lectura pública de `catalog_snapshot` confirma los 53 productos y 76 variantes idénticos a la captura anterior: mismos precios, stock, SKU, relaciones y rutas.

Capturas del anillo: [detalle escritorio](reviews/variant-ring-fase-3c/anillo-detalle-1800.png), [detalle móvil](reviews/variant-ring-fase-3c/anillo-detalle-375.png), [tarjeta escritorio](reviews/variant-ring-fase-3c/anillo-card-1800.png) y [tarjeta móvil](reviews/variant-ring-fase-3c/anillo-card-375.png). Vista general: [catálogo escritorio](reviews/variant-ring-fase-3c/catalogo-1800.png) y [375 px](reviews/variant-ring-fase-3c/catalogo-375.png).
