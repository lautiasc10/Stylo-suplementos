# Ficha de ganadores de masa — prueba visual

Implementada el 16 de octubre de 2026 por pedido del usuario. Afecta únicamente a productos asociados a `ganadores-de-masa`, incluso cuando tienen otra categoría primero. Se puede revisar con el producto real `/producto/mutant-mass`. Las tarjetas, otras fichas y las reglas de compra conservan su comportamiento.

## Composición

- Negro y partículas doradas compartidas con el hero; sin piedra ni panel detrás de la información.
- Envase a la izquierda; marca como texto, título, descripción real, sabores, existencias, precios y compra a la derecha. En celular se apilan.
- Barlow Condensed 700 para título y precio; Inter para etiquetas y controles, desde 14 px. Acción principal con el degradado dorado existente.
- Transferencia destacada y lista secundaria. El ahorro es la diferencia positiva entre ambos totales calculados por el mismo motor de promociones. No se inventan condiciones de envío, avisos de reposición ni beneficios.
- Flechas manuales con el giro existente y etiquetas de sabor con enlaces reales. Los agotados siguen siendo consultables y conservan el botón de compra deshabilitado.

`GainerProductDetail` mantiene la prueba separada de la ficha de Whey Protein. `ProductGallery` decodifica primero la fotografía y después confirma conjuntamente selección, URL, precio, existencias y SKU del carrito. Una foto fallida conserva la selección anterior y permite reintentar. Elegir desde etiquetas en celular funciona aunque la foto quede fuera de pantalla; el giro se omite mientras no se ve la galería. Las etiquetas y el botón aparecen por opacidad, sin desplazarse bajo el dedo durante una pulsación.

## Ingredientes

Recortes originales entregados por el usuario en `public/sabores`, sin recomprimir ni sustituir el envase por una composición. Los ocho archivos utilizados tienen canal alfa y píxeles realmente transparentes y opacos (`min=0`, `max=255`), comprobados con Sharp. Pesan **797.804 bytes en total**; cada sabor solicita solo sus dos recursos, reutilizados por las capas:

| Sabor | Recursos | Peso combinado |
| --- | --- | ---: |
| Banana | `banana-rodaja-1.webp`, `banana-rodaja-2.webp` | 145.120 B |
| Frutilla | `frutilla-entera-1.webp`, `frutilla-entera-2.webp` | 225.552 B |
| Vainilla | `vainilla-flor-1.webp`, `vainilla-vaina-1.webp` | 204.578 B |
| Cookies & cream | `galleta-trozo-1.webp`, `galleta-trozo-2.webp` | 222.554 B |

Los sabores sin correspondencia no muestran ingredientes ajenos. Cuatro capas decorativas en escritorio y tres visibles en celular flotan suavemente, mediante transformaciones y sin mover el layout. Un fundido de 250 ms conserva como máximo dos conjuntos al cambiar de sabor. Las decoraciones no reciben foco y están ocultas a lectores de pantalla.

## Rendimiento y acceso

Se reutiliza `HeroDust` con un perfil de hasta 260 granos y ocho nubes, texturas precalculadas, superficie acotada y dibujo a 30 Hz. El polvo no se reinicia al cambiar de sabor. El botón de pausa detiene polvo e ingredientes; se suspenden fuera de pantalla y en pestañas ocultas. Movimiento reducido y ahorro de datos detectado dejan las decoraciones quietas, sin canvas activo. El contenido y los enlaces de presentación siguen disponibles sin JavaScript. No se añade ninguna dependencia.

Comprobaciones:

- `npm.cmd run check`: compilación, TypeScript, 67 pruebas unitarias y lint aprobados. Lint mantiene cuatro advertencias anteriores, sin errores nuevos.
- Ocho pruebas específicas Chromium, repartidas entre escritorio y celular: fondo transparente, selección por flechas/etiquetas, totales, agotados, carrito, recarga, ausencia de foto, fallo de imagen, teclado, pausa y movimiento reducido en vivo.
- Regresión de catálogo, escena de Whey, galería y hero; los cambios de precios, promociones y permisos conservan su motor existente. Las pruebas de compras y administración usan la vista previa local.
- Revisión del producto real en 1868, 390 y 320 px: sin desbordamiento horizontal. Cambio de presentación sin JavaScript comprobado con lectura pública, sin compras ni escrituras remotas.
- Chromium con Pixel 5 emulado, CPU ×4 e imágenes preparadas: seis cambios de sabor, 403 intervalos entre callbacks; mediana 16,7 ms, p95 16,8 ms, máximo 50,1 ms, cero tareas largas y CLS 0 durante la muestra. Esta medición de laboratorio no acredita teléfonos físicos ni Safari/iOS.

Capturas: [Cookies & cream escritorio](previews/gainer-cookies-1868.jpg), [Frutilla](previews/gainer-frutilla-1868.jpg), [Vainilla](previews/gainer-vainilla-1868.jpg), [Banana agotada](previews/gainer-banana-1868.jpg), [envase móvil](previews/gainer-cookies-390.jpg), [información móvil](previews/gainer-informacion-390.jpg) y [320 px](previews/gainer-cookies-320.jpg).
