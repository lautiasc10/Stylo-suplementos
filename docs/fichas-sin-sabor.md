# Fase 3J — Prueba de fichas sin sabor

Autorizada el 19 de octubre de 2026 después de integrar la versión anterior en `main`. Rama `fase-3j-fichas-sin-sabor`; la extensión al resto de productos y su integración quedan para después de revisar estos tres casos.

| Producto | Ruta | Escritorio | Celular |
| --- | --- | --- | --- |
| Creatina One Fit 200 g | `/producto/onefit-creatina-micronizada-poweraded-x-200gr` | [1440 px](reviews/fichas-sin-sabor/creatina-1440.webp) | [375 px](reviews/fichas-sin-sabor/creatina-375.webp) |
| ZMA XBody 90 cápsulas | `/producto/xbody-zinc-magnesio-vitamina-b6-zma-90-capsulas` | [1440 px](reviews/fichas-sin-sabor/zma-1440.webp) | [375 px](reviews/fichas-sin-sabor/zma-375.webp) |
| Cafeína Star 200 | `/producto/star-nutrition-cafeina-200-x-30-caps` | [1440 px](reviews/fichas-sin-sabor/cafeina-1440.webp) | [375 px](reviews/fichas-sin-sabor/cafeina-375.webp) |

## Presentación

- Fondo negro continuo, halo dorado suave detrás del envase y una elipse de apoyo fija en la base normalizada. Se retira únicamente la roca de estas tres galerías; las tarjetas del catálogo conservan su presentación.
- Fotografías, logos oficiales, tipografías, títulos, precios, ahorro, stock, información y compra se reutilizan. No se escriben productos ni imágenes en Supabase.
- Dos superficies CSS de partículas decorativas se desplazan durante 4,2 y 4,8 segundos y quedan quietas. En celular solo se mueve la capa cercana. No hay animación continua ni hace falta añadir un control de pausa.
- El movimiento se pausa al salir de pantalla o esconder la pestaña. Movimiento reducido y ahorro de datos conservan la escena estática. El HTML inicial incluye toda la decoración y el contenido; la activación después de hidratar conserva los atributos iniciales del servidor.
- La escena no pide imágenes, videos, canvas ni recursos externos adicionales. Usa los tokens de negro y dorado. `will-change` se retira al terminar la breve deriva.

## Verificación

`npm.cmd run check`: lint, TypeScript, 89 pruebas unitarias y build de producción correctos. Diez recorridos específicos de la prueba aprobados en escritorio y celular; la pasada móvil final de catálogo, búsqueda y fichas suma 38 casos aprobados. Comprueban compra, variante, agotados, alcance de los tres productos, teclado, foco y movimiento reducido. Las compras de esas pruebas se realizan únicamente en el catálogo ficticio local.

Revisión visual de productos reales en producción local a 1440, 768 y 375 px, sin envío de formularios de compra: fotos completas, acción móvil visible, sin desbordamientos ni errores de consola. También se revisan [HTML sin JavaScript](reviews/fichas-sin-sabor/sin-javascript-375.webp) y [movimiento reducido](reviews/fichas-sin-sabor/movimiento-reducido-375.webp).

Las mediciones y capturas se reproducen con `node scripts/review-neutral-products.mjs http://127.0.0.1:3216` después del build y de iniciar el servidor en ese puerto. Se comparan galería estática y prueba activada en la misma página con CPU ×4. Los intervalos RAF son muestras locales cortas, no INP de usuarios reales ni garantía de frecuencia en teléfonos físicos. Se conservan [la primera pasada](reviews/fichas-sin-sabor/verificacion-inicial.json) y [la pasada final](reviews/fichas-sin-sabor/verificacion.json).

En las siete muestras finales, p95 de 13,4–13,5 ms tanto con la galería estática como con la prueba, sin intervalos superiores a 32 ms ni tareas largas durante el muestreo del ambiente. La primera pasada tuvo dos intervalos demorados en Creatina móvil, máximo de 79,9 ms; se simplificó el movimiento móvil a una sola superficie y se volvió a medir. Las variaciones de una pasada a otra también dependen de la carga del equipo: no se atribuye toda la diferencia al ajuste CSS.

La escena agregó cero bytes de imágenes; el total inicial de imágenes de página, medido con CDP e incluidos logos y envase, fue de 70–123 kB según ficha y tamaño. El campo `photoBytes` de la primera pasada solo usa Resource Timing y no incluye recursos externos sin permiso de timing: no es un total comparable. CLS desde la carga fue de 0,0006–0,0104 en la última pasada; al alternar artificialmente entre la presentación anterior y la prueba, el máximo adicional fue de 0,000134. La galería real llega con su presentación definitiva desde el HTML inicial.
