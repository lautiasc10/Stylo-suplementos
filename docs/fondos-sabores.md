# Ampliación de fondos por sabor — 17 de octubre de 2026

Rama `fase-3g-fondos-sabores`. Autorizada al agregar el usuario los sabores faltantes en `public/sabores` y pedir utilizarlos. Se reutilizan sus imágenes; no se generan ingredientes ni se modifica la lógica comercial.

## Recursos y asociaciones

Se incorporan Ananá, Cereza, Chocolate, Cookies, Dulce de leche, Frutos rojos, Limón, Multifruta, Naranja, Pomelo, Sandía y Uva. `ceresa.png` se vincula con Cereza sin renombrar el original. Chocolate y choco suizo comparten imagen; también pomelo/pomelo rosado y las distintas escrituras de frutos rojos y limón. Citrus combina las imágenes disponibles de limón y naranja en capas independientes.

Los doce PNG nuevos tienen canal alfa y transparencia real (aproximadamente 50–54 % de píxeles transparentes en la muestra reducida; esquinas transparentes). Los PNG locales de Frutilla y Vainilla son opacos: no se incorporan en las capas; continúan sus WebP transparentes anteriores, al igual que Banana. Los productos neutros y sin sabor conservan su fondo pendiente de definición.

`scripts/prepare-flavor-scenes.mjs` crea derivados de 960 × 640 px con alfa preservado y WebP calidad 82. Cada recurso pesa entre 177.578 y 210.794 bytes, frente a PNG de 2,3–2,6 MB. Los originales quedan intactos y locales; se versionan los derivados utilizados en la web. Regeneración manual con los PNG presentes: `node scripts/prepare-flavor-scenes.mjs`. Procedencia, SHA-256 y tamaños: [informe de recursos](reviews/fondos-sabores-assets.json).

## Interacción y rendimiento

Un registro común asocia los nombres normalizados con sus recursos. Solo se muestran el sabor activo y, durante la transición, el anterior; no se descarga todo el conjunto al abrir una ficha. Se conserva la preparación de recursos vecinos con baja prioridad y caché acotada. Citrus prepara sus dos imágenes; una decoración lenta o fallida no retrasa el envase ni la compra.

Cada superficie de color toma el mismo token CSS que su sabor en la barra de categorías. Esto evita el amarillo predeterminado al incorporar sabores nuevos y permite que la capa anterior conserve su propio color al salir. Se mantienen las animaciones breves, la suspensión fuera de pantalla y con la pestaña oculta, y el respeto por movimiento reducido. No se modifica el giro de 260 ms ni la corrección de la imagen oculta durante el movimiento. Los chips siguen tachados sin texto adicional de stock y no se recupera la tira de miniaturas.

## Verificación

- `npm.cmd run check`: lint, tipos y build de producción correctos; 84 pruebas unitarias aprobadas y dos omitidas según configuración.
- Spinner, fondos y ganadores: 41 pruebas de navegador aprobadas y una omitida (hover exclusivo de escritorio en móvil). La prueba de todos los fondos recorre 16 familias, comprueba imágenes cargadas, igualdad del color de escena/categorías y composición Citrus en escritorio y móvil. Se conserva la cobertura de decodificación, errores de foto, clics rápidos, carrito de prueba y movimiento reducido.
- Catálogo real consultado sin escribir en Supabase: 15 familias presentes, incluida Citrus y variantes únicas. Todas cargaron su decoración correspondiente, con igual color de fondo, superficie y categorías, sin errores de JavaScript ni desbordamiento horizontal. Banana se verifica con el catálogo sintético porque no figura en el catálogo real actual. Resultado: [verificación](reviews/fondos-sabores/verification.json).
- Capturas revisadas: [Cookies](reviews/fondos-sabores/cookies-1800.png), [Uva](reviews/fondos-sabores/uva-1800.png), [Citrus](reviews/fondos-sabores/citrus-1800.png), [Limón móvil](reviews/fondos-sabores/limon-375.png) e [información móvil](reviews/fondos-sabores/limon-375-info.png).

No se cambian precios, stock, SKU, fotografías de envases, marcas, fuentes, permisos ni integraciones de compra. No se agregan dependencias.
