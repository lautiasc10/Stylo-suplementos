# Fichas compartidas por sabor — 17 de octubre de 2026

Entrega en `fase-3e-fichas-sabores`, sin integrar a `main`. Autorizada por el usuario para combinar el fondo de sabor del antiguo experimento de Whey con la información de Ganadores de masa en todos los productos. Los productos sin sabor mantienen su fondo oscuro, pendiente de una decisión posterior.

## Cambio aplicado

- Se deshacen los commits `fa07641` y `36808a1` sin reiniciar el repositorio: se retiran el anillo, tilt, sus pruebas y derivados experimentales. Se recuperan `VariantSpinner` y los recursos de la normalización anterior. Los originales de Storage y los cambios locales del usuario en `public/sabores` permanecen intactos.
- `ProductDetail` reemplaza las dos implementaciones de información. Conserva logos oficiales, nombres, descripciones, variantes, precio de lista, precio por transferencia, ahorro real y formulario de compra. El componente comercial sigue calculando las promociones existentes.
- El fondo responde al sabor activo en cualquier categoría, incluso en productos con una sola variante. La barra de categorías, el mega menú y el menú móvil comparten el mismo color. La información se presenta directamente sobre la escena, sin panel opaco; el desplegable informativo y su ampliación conservan contraste.
- Flechas y chips usan el giro anterior con imágenes decodificadas. Foto, precio, stock, formulario y `?variante=` se confirman juntos; los errores conservan la variante anterior y los clics rápidos conservan solo la última elección pendiente. Las miniaturas continúan recorriendo fotos dentro de la variante.
- Banana, Frutilla y Vainilla utilizan los WebP decorativos existentes. Chocolate, Cookies, Dulce de leche, frutas rojas, cítricos, limón, naranja, ananá, cereza, sandía, uva, pomelo y multifruta tienen colores propios. No se generan imágenes para sabores sin recurso. Los nombres desconocidos tienen un color neutro; vacío, Sin sabor, Neutro y Natural conservan el fondo oscuro.
- Sin JavaScript, los chips son enlaces GET a la misma ruta y conservan el formulario de compra. Movimiento reducido elimina el giro y el desplazamiento decorativo. En móvil, la acción de compra permanece visible incluso si el bloque de información aún no entró en pantalla.

## Verificación

- `npm.cmd run check`: lint, TypeScript y build de producción correctos; 82 pruebas unitarias aprobadas y 2 omitidas según su configuración.
- Pruebas de navegador de `flavor-detail`, `gainer-detail`, `variant-spinner` y `product-visual-review`: 47 aprobadas y una omitida (hover de escritorio en dispositivo móvil).
- Verificación de lectura con catálogo real, a 1800, 768 y 375 px: Whey STAR, Whey One Fit, Mutant Mass y EEAA One Fit. Fondo y navegación coinciden, el escenario no conserva una roca opaca en sabores, no hay anillo, errores de JavaScript ni desbordamiento horizontal. Se probó también selección por enlace sin JavaScript en la ruta pública.
- Se mantienen las verificaciones de carrito en la vista previa local; no se crean pedidos ni se modifican registros de Supabase.
- Capturas y resultado de navegador: [revisión](reviews/fichas-sabores/verification.json), [escritorio](reviews/fichas-sabores/star-nutrition-proteina-whey-protein-x-2-lbs-dp-frutilla-1800.png), [móvil](reviews/fichas-sabores/star-nutrition-proteina-whey-protein-x-2-lbs-dp-vainilla-375.png), [tablet](reviews/fichas-sabores/onefit-proteina-whey-protein-2lbs-dp-frutilla-768.png).
- La revisión móvil separa la galería de la [información a 375 px](reviews/fichas-sabores/star-nutrition-proteina-whey-protein-x-2-lbs-dp-vainilla-375-info.png); la compra queda fija al pie en ambas vistas.

El hero y su secuencia no se rediseñan en esta entrega. No se agregan dependencias, videos ni recursos generados.
