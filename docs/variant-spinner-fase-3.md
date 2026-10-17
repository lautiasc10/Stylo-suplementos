# Giro de variantes — Fase 3

17 de octubre de 2026. Rama: `fase-3-variant-spinner`. Continúa la [normalización de Fase 1](normalizacion-imagenes-aplicada.md) y la [revisión visual de Fase 2](revision-visual-fase-2.md), con autorización del usuario. No corresponde a una nueva fase comercial.

## Comportamiento

`src/components/catalog/VariantSpinner.tsx` comparte el giro entre tarjetas y fichas con varias variantes. `ProductGallery` conserva su API y deriva esos productos al nuevo componente; las galerías de una sola variante mantienen el recorrido de fotos mediante fundido.

- Salida: `rotateY(0 → -90deg)`, escala `1 → .92` y opacidad `1 → 0`, durante 200 ms con aceleración. Entrada: `rotateY(90 → 0deg)`, escala `.92 → 1` y opacidad `0 → 1`, durante 280 ms con frenado. Ir atrás invierte ambos giros. Perspectiva: 900 px. Solo se animan transformaciones y opacidad mediante Web Animations API, sin actualizaciones React por cuadro.
- La roca CSS y la sombra de apoyo quedan fuera de las capas del pack. Se conserva el canvas cuadrado, el tamaño normalizado y la base común. Las capas temporales son dos como máximo y queda una al terminar.
- Tarjetas: flechas circulares al hacer hover o enfocar con teclado; siempre disponibles en touch. Swipe horizontal, teclas ←/→ y contador. Los controles no navegan; imagen, nombre, acción y resto de la tarjeta abren el sabor activo mediante `?variante=`. Se conserva la alternancia automática de tres segundos; una elección manual la detiene.
- Detalle: flechas y chips seleccionan variantes por la misma función. Después de decodificar la foto se confirman juntos sabor, pack, precios, disponibilidad, formulario de carrito y URL con `replaceState`, sin recarga ni scroll. El sabor se muestra debajo de la galería. Con una sola variante, las flechas recorren fotos y no aparecen controles de sabor.
- Las miniaturas corresponden a la variante activa: frente, otras fotos, costados/dorsos reales e información al final. Seleccionarlas aplica fundido de 250 ms y conserva el SKU. Las fotos existentes de reverso permanecen accesibles; la nueva secuencia breve de variantes reemplaza el giro anterior que intercalaba esas vistas.

## Carga, errores y accesibilidad

Se espera tanto la descarga y `decode()` de la precarga como la decodificación del elemento que efectivamente se renderiza. Ese mismo nodo, `srcSet` y resolución permanecen al finalizar: no hay sustitución por una imagen de otra calidad al cerrar el giro. Las tarjetas usan `sizes` de media pantalla en celular, coherente con sus dos columnas.

Se preparan las variantes anterior y siguiente después de cargar la foto inicial y cuando la galería está visible. La caché comparte cargas pendientes, conserva como máximo cuatro fotografías y libera referencias al salir de pantalla. Ahorro de datos evita precargas y alternancia automática. La limpieza fuera de pantalla comprueba también el estado inmediato de la solicitud para no cancelar una elección hecha desde un chip situado debajo de la imagen.

Durante una descarga se puede reemplazar la elección pendiente; durante un giro se encola únicamente la última. Si una imagen falla o excede diez segundos, permanecen pack, precio, stock, carrito y URL anteriores, con mensaje accesible y posibilidad de reintento. Las decoraciones no bloquean la compra. Al ocultar la pestaña se termina la transición preparada y se suspende la alternancia; el foco también la pausa.

Con movimiento reducido no hay rotación: se utiliza un fundido breve de 180 ms. Si cambia la preferencia durante el giro, se confirma la imagen ya decodificada. Los botones tienen nombres accesibles, foco visible y áreas de 44–48 px; los cambios manuales se anuncian sin repetir continuamente los automáticos. Swipe conserva el scroll vertical y el zoom del navegador.

El HTML inicial muestra la foto y los datos sin depender de JavaScript. Los controles animados se incorporan después de hidratar; los enlaces de variante y compra conservan sus recorridos nativos. No se añadieron dependencias, videos, imágenes generadas ni escrituras a Supabase. Se mantuvieron precios, stock, SKU, originales, paleta, tipografías y lógica comercial.

## Verificación

- `npm.cmd run check`: ESLint sin avisos, TypeScript, 80 pruebas unitarias aprobadas y compilación de producción. Dos pruebas unitarias omitidas por su configuración existente.
- Chromium: 131 recorridos aprobados y uno omitido por corresponder solo a escritorio. Incluye duraciones/sentido del giro, roca fija, swipe, teclado, cola de última elección, decodificación demorada, error de foto, permanencia del nodo y resolución, etiqueta opaca por comprobación de píxeles, miniaturas, movimiento reducido en vivo, enlaces sin JavaScript, carrito, checkout de prueba, promociones, importador y administración local.
- Catálogo real de 53 productos y fichas de Cafeína 200, Whey Protein y The Best Gainer a 1800, 768 y 375 px: sin desbordamientos ni errores de consola. Cuatro columnas en escritorio y dos en ambos anchos móviles. Cambio real de Whey sincronizado con URL y SKU de carrito, misma roca y una sola capa final. [Medidas y resultados](reviews/variant-spinner-fase-3/verificacion.json).
- Medición de producción local, recursos preparados, Chromium a 375 px y CPU ralentizada 4×, sin compilaciones ni pruebas concurrentes: 142 muestras, percentil 95 de 16,8 ms, máximo de 33,44 ms y ninguna pausa superior a 50 ms durante el cambio. [Medición](reviews/variant-spinner-fase-3/rendimiento.json). Es una simulación de laboratorio, no una medición en un teléfono físico ni una garantía para todas las conexiones.
- Se comparó una nueva lectura pública de `catalog_snapshot` contra la captura anterior: catálogo, relaciones, SKU, stock, precios y rutas originales idénticos.

Capturas: [catálogo escritorio](reviews/variant-spinner-fase-3/catalogo-1800.png), [768 px](reviews/variant-spinner-fase-3/catalogo-768.png), [375 px](reviews/variant-spinner-fase-3/catalogo-375.png), [Whey escritorio](reviews/variant-spinner-fase-3/STAR-0023-1800.png), [Whey móvil](reviews/variant-spinner-fase-3/STAR-0023-375.png), [Cafeína móvil](reviews/variant-spinner-fase-3/STAR-0013-375.png), [ganador móvil](reviews/variant-spinner-fase-3/ONE-0010-375.png).
