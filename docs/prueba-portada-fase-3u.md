# Prueba Fase 3U — Portada de protein-powerhouse-hub

Rama de prueba: `prueba-diseno-protein-powerhouse`, creada desde la entrega 3T. No integrada a main.

La referencia es el repositorio del usuario [protein-powerhouse-hub, commit 98be6a1](https://github.com/lautiasc10/protein-powerhouse-hub/tree/98be6a18035296afb077d5d6921d5a7706c980ed): `LionHero`, `ProductReveal`, `GoalPicker` y sus estilos. Se adapta a Next.js sin sustituir el framework ni instalar dependencias.

## Resultado

- Hero con león centrado delante de tipografía gigante Anton, contorno/degradado, parallax del titular, luz al cursor, partículas y cinta de categorías de 30 segundos. El usuario confirmó reutilizar el león actual: se conserva el video de mirada, su póster y el control existente de movimiento. No hay recursos generados ni se requieren las imágenes externas de Lovable.
- Cabecera transparente sobre la portada, enlaces reales, logos oficiales, búsqueda y carrito. La barra superior de categorías queda en las páginas interiores; la portada conserva las categorías en la cinta y en el menú móvil, siguiendo la estructura de la referencia. El logo vuelve al inicio sin reiniciar la presentación.
- Un producto real aparece al hacer scroll: el polvo converge, entra el envase y después la información lateral. La selección prioriza Whey/Star con una imagen y una presentación disponible. Precios, variante y enlace provienen del catálogo; se incluyen las rebajas individuales vigentes. Los cuatro cuadros muestran datos reales de compra en lugar de copiar cifras nutricionales o afirmaciones del prototipo. Sin datos o fotos se muestra un acceso a la tienda, sin fabricar productos.
- «Elegí tu objetivo» utiliza las tres fotografías adjuntas, copiadas intactas a `public/reference`. El hover pasa de gris a color con capas de opacidad y mueve el título para revelar descripción y etiquetas. Los objetivos llevan a colecciones de categorías reales mediante `?objetivo=`, combinables con los filtros existentes.
- La tienda, sus productos, fichas, promociones, stock, SKU, precios, administración y compra conservan su implementación. Debajo de los bloques nuevos permanecen Destacados, Novedades y Promociones del ecommerce.

La frase aprobada «Potenciá tu mejor versión.» se conserva. Anton y Manrope se comparten entre el hero y las nuevas secciones; las páginas comerciales mantienen su tipografía. Las fotografías de objetivos se sirven mediante Next Image con dimensiones, tamaños responsivos y carga diferida.

## Movimiento y acceso

El efecto de producto usa scroll nativo, transform y opacidad. En escritorio, la sección se fija por tres alturas de pantalla, como en la referencia, solo si puede prepararse antes de entrar en vista. No se inserta una sección larga alrededor de una persona que ya empezó a leer. El reloj se detiene al asentarse el movimiento, fuera de pantalla y en pestañas ocultas. No hay actualizaciones de estado de React por cuadro.

En celular, ahorro de datos, movimiento reducido o ausencia de JavaScript, el producto y sus datos permanecen visibles y el bloque no obliga a atravesar tres pantallas. El foco del teclado también revela la información. Las tarjetas de objetivos mantienen su descripción visible en móvil. Se corrigieron las posiciones heredadas del hero anterior que superponían botones y descripción en celular.

Vista previa local con datos de prueba: `/vista-previa/portada`. Sus enlaces de producto permanecen dentro de la vista previa y no habilitan administración real.

## Validación

`npm.cmd run check`: lint, TypeScript, 105 pruebas unitarias aprobadas (dos omitidas) y build de producción.

Recorridos Chromium de hero, navegación, póster/video lento o fallido, mirada frontal lenta, teclado, pausa, movimiento reducido, navegador sin JavaScript, objetivos, scroll de producto, compra de la variante elegida, tarjetas compactas, cantidad, promociones y carrito aprobados en escritorio y móvil. Se ajustan las expectativas de las pruebas anteriores al león centrado y a la cinta de categorías de la nueva portada. Las pruebas nuevas comprueban el filtrado por objetivos y que el bloque no copie datos nutricionales ficticios.

Revisión visual sobre el catálogo público a 1440 × 1000, 375 × 812 y 320 × 780: sin desbordamientos ni errores de página. Capturas: [hero de escritorio](previews/referencia-3u-hero-desktop.png), [hero móvil](previews/referencia-3u-hero-mobile.png), [producto real](previews/referencia-3u-producto.png), [objetivos](previews/referencia-3u-objetivos.png).

Comprobación de scroll en build de producción, Chromium 1440 × 900, 180 intervalos de requestAnimationFrame (aproximadamente tres segundos): mediana 16,7 ms y p95 16,7 ms en la última pasada, sin intervalos superiores a 32 ms; una pasada previa tuvo uno. Scripting acumulado: 43,0 ms; layout: 0,4 ms; recálculo de estilos: 180,0 ms. Imágenes transferidas durante el recorrido: 564.200 bytes, sin contar fuentes ni video. Es una muestra local, no una garantía de FPS en hardware móvil físico.

Reproducir con `npm.cmd run build`, `npm.cmd run start -- --port 3101` y, en otra terminal, `node scripts/review-reference-performance.cjs`. La medición necesita catálogo público configurado y usa solo lecturas.

No se modificó la base de datos ni se publicaron cambios en main.
