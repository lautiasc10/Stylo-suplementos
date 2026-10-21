# Fase 3V — Bolsa, buscador y hover de la referencia

Rama de prueba: `prueba-diseno-protein-powerhouse`. Sin integrar a main.

Referencia leída directamente con la conexión de Lovable: proyecto [Protein Powerhouse](https://lovable.dev/projects/75489879-7630-4713-80ff-45d07f32e9bc), commit `dfc06c8cfbc8c5c31f2ede6eb41bc6d3429d68e1`. Componentes `SiteHeader`, `ShopStrip`, tienda, estilos y eventos del carrito. No se envió ningún pedido al agente de Lovable ni se modificó su proyecto.

## Presentación y comportamiento

- Bolsa circular en la cabecera, contador únicamente si contiene unidades y respuesta de escala al llegar la partícula. El enlace conserva `/carrito` como alternativa sin JavaScript.
- Después de confirmar un agregado real, una partícula con degradado dorado viaja desde el botón hasta la bolsa durante 800 ms, con el mismo arco y curva de la referencia. Al llegar, el contador responde durante 500 ms. La bolsa no se abre automáticamente. Una confirmación permite abrirla, incluso si el usuario está lejos de la cabecera.
- Panel lateral de hasta 448 px: título condensado, fotos oscuras de 80 px, marca, nombre, presentación, cantidad y subtotal por línea. Entrada desde la derecha de 500 ms y salida de 300 ms. Conserva quitar/deshacer, límites reales de stock, advertencias y el selector de medio de pago. El total y las promociones salen del cálculo vigente de STYLO.
- Buscador centrado de 672 px con fondo oscurecido, campo superior, Escape/cierre visible y resultados con foto, nombre, marca, importe y acción Agregar. Muestra productos antes de escribir y mantiene el panel abierto al agregar. Hasta 20 resultados visibles; acceso al listado completo si hay más. Conserva búsqueda tolerante por nombre, marca, categoría y sabor, debounce de 175 ms, caché temporal, cancelación de cargas anteriores y reintento.
- El nuevo buscador reemplaza la presentación anterior de recientes, chips populares y grupos separados por la lista directa de productos solicitada. `/buscar`, sus filtros y enlaces compartibles se conservan.
- Hover de tarjetas: elevación de 4 px, envase que sube 8 px, escala 1,05 y rotación de −2°, con halo suave. La roca, etiquetas, contador y controles quedan fijos. No hay seguimiento de mouse ni actualizaciones de React por cuadro.
- El dorado compartido pasa a `oklch(0.8 0.15 75)` y al degradado de la referencia, con acento `oklch(0.72 0.16 60)` y luz `oklch(0.93 0.09 88)`. Los SVG y logos oficiales permanecen intactos. Los paneles usan Anton y Manrope, compartidas con el hero; las tarjetas conservan su tipografía y composición.

## Datos, acceso y rendimiento

Los cambios no alteran productos, variantes, SKU, precios, existencias ni pedidos. No se copian el inventario ficticio, envío gratis, costos de entrega, cuotas ni la confirmación de compra simulada del prototipo. «Finalizar compra» lleva al checkout existente. El carrito sigue sin reservar stock.

La partícula aparece solo si el guardado fue confirmado; no aparece al fallar. Se limpia al terminar y se limita a tres decoraciones simultáneas. No se anima si el destino está fuera de pantalla; la confirmación sigue disponible. Movimiento reducido cancela el vuelo y el rebote, y desactiva entradas y transformaciones del hover. Las imágenes de búsqueda tienen una alternativa durante carga/error. Se corrigió el recorte de fotos verticales dentro del panel.

Los diálogos nativos conservan Escape, cierre exterior, retorno de foco y bloqueo de scroll sin cambiar el ancho de la página. El buscador mantiene combobox, navegación con flechas/Enter, anuncios y contención de foco. En celular se conserva el panel de la referencia dentro de los márgenes, con cierre visible; la bolsa ocupa el ancho disponible. En horizontal, la lista sigue desplazándose mientras el checkout permanece accesible.

En la revisión 3W se eliminó el `backdrop-filter` de los dos diálogos de referencia. La capa negra conserva su opacidad, borde y colores. El filtro de pantalla completa era el costo dominante al abrir el buscador, agregar desde él y abrir la bolsa sobre el catálogo vivo. El halo y las sombras del panel siguen estáticos; las entradas animan transform y opacidad.

Medición A/B local con `next build` + `next start`, Chromium automatizado, escritorio 1440 × 1000 y 90 intervalos `requestAnimationFrame` por acción. Se abrió una vez el buscador para calentar resultados e imágenes visibles antes de medir. El control A usó el CSS anterior; el control B desactivó el filtro temporalmente desde el navegador; el resultado final se midió de nuevo tras compilar el cambio:

| Acción | Antes: p95 / cuadros >32 ms | Final: p95 / cuadros >32 ms |
| --- | --- | --- |
| Abrir buscador | 33,4 ms / 21 | 16,8 ms / 0 |
| Agregar desde buscador | 50,0 ms / 55 | 16,7 ms / 0 |
| Abrir bolsa | 33,4 ms / 37 | 16,7 ms / 0 |

Con emulación iPhone 13 sobre el build final, las tres acciones dieron p95 entre 16,7 y 16,8 ms, sin intervalos superiores a 32 ms ni errores de página. La prueba refleja esta máquina y estas interacciones; no acredita 60 fps constantes en otros dispositivos ni sustituye una medición en teléfono físico.

En la portada, abrir un diálogo detiene el repintado de partículas y los desplazamientos del hero que quedan detrás del panel; al cerrarlo, se reanudan desde su posición anterior. Una prueba de navegador contó los repintados: fallaba antes del ajuste y pasó después en escritorio y móvil. Con la animación inicial ya asentada, abrir buscador, agregar y abrir bolsa dieron p95 de 16,7 ms y cero intervalos superiores a 32 ms en escritorio. Si se abre el buscador durante la entrada inicial del hero, todavía pueden aparecer algunos intervalos de unos 33 ms; no se atribuyen al filtro de los diálogos.

## Verificación

Lint, TypeScript, 105 pruebas unitarias y build de producción aprobados. Recorridos Chromium sobre `next start`: agregados en ficha, tarjetas, promoción y búsqueda; cambios de cantidad hasta el límite, retiro/deshacer, persistencia, precios por medio de pago, combos, cupos, checkout, errores de guardado, imagen vertical, carga fallida, teclado, navegación sin JavaScript y movimiento reducido. La pasada final de buscador y bolsa aprobó 30 recorridos, con dos omitidos por ser exclusivos de escritorio; las regresiones de compra, tarjetas y promociones también quedaron aprobadas.

Revisión en 320, 375, 768 y 1440 px, más bolsa larga a 844 × 390: sin desbordamiento; checkout accesible. Las pruebas antiguas se ajustan al agregado en el mismo lugar y a la apertura explícita de la bolsa; las de compra y cálculo siguen comprobando los importes reales.

Capturas de producción con catálogo público real: [buscador de escritorio](previews/referencia-3v-buscador-desktop.webp), [buscador móvil](previews/referencia-3v-buscador-mobile.webp), [bolsa de escritorio](previews/referencia-3v-bolsa-desktop.webp), [bolsa móvil](previews/referencia-3v-bolsa-mobile.webp), [hover](previews/referencia-3v-hover-desktop.webp).

Reproducir capturas y medición con `npm.cmd run build`, `npm.cmd run start -- --port 3101` y `node scripts/review-reference-commerce.cjs`. El script usa un navegador temporal; agregar modifica únicamente su cookie de carrito. No finaliza compras ni modifica inventario. La medición distingue las fotos ya decodificadas de la carga fría del optimizador remoto. No equivale a una prueba en un teléfono físico.
