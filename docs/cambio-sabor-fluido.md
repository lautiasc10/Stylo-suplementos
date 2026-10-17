# Fichas: respuesta de sabores y miniaturas — 17 de octubre de 2026

Rama `fase-3f-cambio-sabor-fluido`. El usuario pidió recuperar la respuesta del video `2026-10-16 16-02-41.mkv`, tachar también el sabor agotado seleccionado y quitar la tira de miniaturas. El video se revisó como referencia de movimiento; conserva la escena de color y la información aprobadas en la entrega anterior.

## Cambios

- El detalle confirma sabor, foto activa, precio, stock, formulario y URL al iniciar el giro, después de preparar y decodificar la imagen. Antes esperaba los 200 ms de salida antes de confirmar los datos.
- Las dos mitades del giro arrancan desde el mismo reloj: salida de 140 ms y entrada de 260 ms con inicio a los 100 ms. Duran 360 ms en total, frente a los 480 ms anteriores; el solapamiento evita esperar una promesa y un render entre ambas mitades. Solo se animan `transform` y `opacity`. Se conserva el giro de tarjetas de 200 + 280 ms.
- El nombre del sabor agotado tiene un selector propio de tachado que también alcanza al chip activo. Los chips muestran únicamente el nombre y su punto de color: se elimina el texto «Sin stock» que se montaba y retiraba al seleccionar, evitando cambios de ancho y redistribución de filas. El estado sigue en el nombre accesible del enlace. La selección mantiene su borde y el botón de compra conserva el stock real.
- `showThumbnails={false}` retira el componente y sus observadores de todas las fichas. No borra fotografías ni información del fabricante. Una variante única conserva las flechas para recorrer sus fotos y el bloque «Información del producto» sigue disponible.
- Se conservan precarga de vecinos, imágenes responsivas, caché acotada, protección ante fotos fallidas y una sola elección pendiente. No se adelanta un SKU cuya imagen no pudo cargarse. Movimiento reducido mantiene el fundido sin giro; sin JavaScript los chips continúan como enlaces GET.

## Verificación

- `npm.cmd run check`: lint, tipos y build de producción aprobados; 82 pruebas unitarias aprobadas, 2 omitidas según configuración.
- Seis archivos de pruebas de navegador: sabores, ganadores, revisión visual, spinner, normalización y ángulos. 57 casos aprobados entre escritorio y móvil; el caso exclusivo de hover de escritorio se omite en móvil. Se ajustó la expectativa del comparador de normalización, que conserva deliberadamente la roca independiente; ambos casos corregidos se volvieron a ejecutar y aprobaron.
- Pruebas de compra en vista previa, diez elecciones rápidas, sentido inverso, errores de imagen, decodificación demorada, movimiento reducido y enlaces sin JavaScript. No se escriben registros en Supabase.
- Catálogo real en producción local, diez cambios secuenciales a 1800 y 375 px con fotos vecinas preparadas: confirmación de selección entre 2,0 y 5,3 ms. Cero errores de JavaScript y cero tareas largas detectadas por `PerformanceObserver` durante esa medición.

| Vista | Mayor intervalo de rAF | Intervalos >32 ms | Tareas largas JS |
| --- | ---: | ---: | ---: |
| 1800 px | 33,4 ms | 2 de 643 | 0 |
| 375 px | 16,8 ms | 0 de 649 | 0 |

Estos intervalos y latencias se midieron en Chromium de la máquina de prueba con `next build` + `next start`; 375 px es una ventana móvil, no hardware de un teléfono. Los 200/480 ms anteriores son los tiempos configurados en el código previo, no una grabación de rendimiento anterior.

Resultados completos: [medición](reviews/cambio-sabor-fluido/verification.json). Capturas: [escritorio](reviews/cambio-sabor-fluido/producto-1800.png), [móvil](reviews/cambio-sabor-fluido/producto-375.png), [información y tachados](reviews/cambio-sabor-fluido/informacion-375.png).
