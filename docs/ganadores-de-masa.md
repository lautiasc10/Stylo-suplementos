# Ficha de ganadores de masa — prueba visual

Implementada el 16 de octubre de 2026 por pedido del usuario. Afecta únicamente a productos asociados a `ganadores-de-masa`, incluso cuando tienen otra categoría primero. Se puede revisar con el producto real `/producto/mutant-mass`. Las tarjetas, otras fichas y las reglas de compra conservan su comportamiento.

## Composición

- Negro `#0a0a0a` y partículas doradas compartidas con el hero; sin piedra ni panel detrás de la información.
- Envase a la izquierda; marca como texto, título, descripción real, sabores, existencias, precios y compra a la derecha. En celular se apilan.
- Barlow Condensed 700 para título y precio; Inter para etiquetas y controles, desde 14 px. Acción principal con el degradado dorado existente.
- Transferencia destacada y lista secundaria. El ahorro es la diferencia positiva entre ambos totales calculados por el mismo motor de promociones. No se inventan condiciones de envío, avisos de reposición ni beneficios.
- Flechas manuales con el giro existente y etiquetas de sabor con enlaces reales. Los agotados siguen siendo consultables y conservan el botón de compra deshabilitado.

`GainerProductDetail` mantiene la prueba separada de la ficha de Whey Protein. `ProductGallery` decodifica primero la fotografía y después confirma conjuntamente selección, URL, precio, existencias y SKU del carrito. Una foto fallida conserva la selección anterior y permite reintentar. Elegir desde etiquetas en celular funciona aunque la foto quede fuera de pantalla; el giro se omite mientras no se ve la galería. Las etiquetas y el botón aparecen por opacidad, sin desplazarse bajo el dedo durante una pulsación.

## Ingredientes

Recortes originales entregados por el usuario en `public/sabores`, sin recomprimir ni sustituir el envase por una composición. Los ocho archivos utilizados tienen canal alfa y píxeles realmente transparentes y opacos (`min=0`, `max=255`), comprobados nuevamente con Sharp. Pesan **797.804 bytes en total**; cada sabor utiliza dos recursos, reutilizados por las capas:

| Sabor | Recursos | Peso combinado |
| --- | --- | ---: |
| Banana | `banana-rodaja-1.webp`, `banana-rodaja-2.webp` | 145.120 B |
| Frutilla | `frutilla-entera-1.webp`, `frutilla-entera-2.webp` | 225.552 B |
| Vainilla | `vainilla-flor-1.webp`, `vainilla-vaina-1.webp` | 204.578 B |
| Cookies & cream | `galleta-trozo-1.webp`, `galleta-trozo-2.webp` | 222.554 B |

Los sabores sin correspondencia no muestran ingredientes ajenos. Cuatro capas decorativas en escritorio y tres visibles en celular flotan con ±8 px verticales y ±5° en ciclos de 4,6 a 5,8 segundos. Las capas lejanas tienen desenfoque fijo de 1,5 px; todas usan una sombra suave fija. Los filtros no se animan.

La revisión de física utiliza Framer Motion ya instalado: fundido cruzado con entrada de 460 ms y pequeños desfases de 25 ms; salida de 280 ms hacia los bordes con `y: -20`, `scale: 0.8` y opacidad cero. La curva es `[0.16, 1, 0.3, 1]`. El conjunto anterior se limpia en 320 ms; una nueva selección sustituye el anterior sin acumular nodos. Como máximo hay dos conjuntos, sin colas que demoren el sabor elegido. La flotación del elemento interior queda separada de la entrada/salida exterior. Solo se animan transformaciones y opacidad; el HTML inicial presenta ingredientes visibles. Las decoraciones no reciben foco y están ocultas a lectores de pantalla.

Se preparan a baja prioridad los dos ingredientes de los sabores vecinos, junto con sus envases, y los de un chip al recibir foco o puntero. Se reutiliza una caché acotada a cuatro recortes decodificados por ficha. La confirmación del nuevo sabor espera el envase y la preparación decorativa en paralelo; esta última tiene un límite de 180 ms para no bloquear la compra con una decoración lenta o fallida. El fallo del envase conserva la selección anterior; un ingrediente fallido se oculta. Cambios antiguos no pueden sobrescribir el sabor elegido más recientemente. Las solicitudes pendientes se cancelan al ocultar la pestaña o desmontar la ficha.

## Rendimiento y acceso

Se reutiliza `HeroDust` con un perfil de hasta 260 granos y ocho nubes, texturas precalculadas, superficie acotada y dibujo a 30 Hz. El polvo no se reinicia al cambiar de sabor. El botón de pausa detiene polvo e ingredientes; se suspenden fuera de pantalla y en pestañas ocultas. Movimiento reducido y ahorro de datos detectado dejan las decoraciones quietas, sin canvas activo. El contenido y los enlaces de presentación siguen disponibles sin JavaScript. No se añade ninguna dependencia.

Comprobaciones:

- `npm.cmd run check`: compilación, TypeScript, 67 pruebas unitarias y lint aprobados. Lint mantiene cuatro advertencias anteriores, sin errores nuevos.
- Ocho pruebas específicas Chromium, repartidas entre escritorio y celular: fondo transparente, selección por flechas/etiquetas, totales, agotados, carrito, recarga, ausencia de foto, fallo de imagen, teclado, pausa y movimiento reducido en vivo.
- Regresión de catálogo, escena de Whey, galería y hero; los cambios de precios, promociones y permisos conservan su motor existente. Las pruebas de compras y administración usan la vista previa local.
- Revisión del producto real en 1868, 390 y 320 px: sin desbordamiento horizontal. Cambio de presentación sin JavaScript comprobado con lectura pública, sin compras ni escrituras remotas.
- Chromium con Pixel 5 emulado, CPU ×4 e imágenes preparadas: seis cambios de sabor, 403 intervalos entre callbacks; mediana 16,7 ms, p95 16,8 ms, máximo 50,1 ms, cero tareas largas y CLS 0 durante la muestra. Esta medición de laboratorio no acredita teléfonos físicos ni Safari/iOS.

Capturas: [Cookies & cream escritorio](previews/gainer-cookies-1868.jpg), [Frutilla](previews/gainer-frutilla-1868.jpg), [Vainilla](previews/gainer-vainilla-1868.jpg), [Banana agotada](previews/gainer-banana-1868.jpg), [envase móvil](previews/gainer-cookies-390.jpg), [información móvil](previews/gainer-informacion-390.jpg) y [320 px](previews/gainer-cookies-320.jpg).

### Verificación de la física de ingredientes

- Compilación, TypeScript, 69 pruebas unitarias y lint aprobados; permanecen cuatro advertencias anteriores, sin errores nuevos.
- Doce recorridos específicos de ganadores aprobados entre escritorio y móvil, incluidos cambios rápidos, máximo de dos conjuntos, errores de foto, decoraciones lentas/fallidas, teclado, compra, pausa y movimiento reducido en vivo. Otros 19 recorridos de Whey y cierre del giro aprobados; uno de mega menú se omite en móvil por diseño.
- Revisión pública de Mutant Mass a 1868 y 390 px: sin errores JavaScript ni desbordamientos; el escenario de escritorio conserva exactamente 1868 × 840 px antes y después del cambio. Selección de Vainilla sin JavaScript comprobada. No se realizaron compras ni escrituras remotas.
- Chromium con Pixel 5 emulado y CPU ×4, seis cambios con recursos preparados: 299 intervalos, mediana 16,7 ms, p95 16,8 ms, máximo 83,3 ms; tres tareas largas de 83, 77 y 56 ms, CLS 0. La muestra conserva algunos picos y no acredita 60 fps constantes ni pruebas en dispositivos físicos o Safari/iOS.

Capturas actualizadas: [Cookies escritorio](previews/gainer-motion-cookies-1868.jpg), [Frutilla escritorio](previews/gainer-motion-frutilla-1868.jpg), [envase móvil](previews/gainer-motion-cookies-390.jpg) e [información Banana móvil](previews/gainer-motion-banana-390.jpg).
