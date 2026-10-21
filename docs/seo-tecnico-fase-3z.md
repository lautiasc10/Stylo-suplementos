# Fase 3Z — SEO técnico sin habilitar indexación

Continuación autorizada de la auditoría y de la Fase 3Y. Rama `fase-3z-seo-tecnico`. No incluye publicar, fusionar a main, elegir un dominio, activar cobros ni modificar datos de Supabase.

## Implementación

- Inicio, tienda, nosotros y contacto tienen descripción, canonical, Open Graph y Twitter específicos. Las imágenes compartidas usan los recursos oficiales existentes. Los filtros de tienda apuntan a su canonical común, sin convertir búsquedas y combinaciones de filtros en nuevas páginas de indexación.
- Las fichas respetan título y descripción SEO editoriales cuando están completos. Si falta la descripción SEO, usan el texto existente del producto; si también está vacío, construyen un resumen factual con nombre y marca, sin atribuir beneficios de salud, certificaciones, cuotas o condiciones de entrega. No se sobrescriben los campos administrativos. La descripción de metadatos se limita a 160 caracteres.
- Al compartir una URL con `?variante=`, se usa la foto de ese SKU o una foto general aplicable. Los derivados normalizados se prefieren cuando están registrados. Si falta fotografía se comparte el logo oficial como identidad del sitio; ese logo no se presenta como foto del producto en el esquema comercial. La canonical de la ficha permanece sin selector de variante.
- El HTML de cada ficha incorpora JSON-LD de servidor: `Product` para una sola presentación, `ProductGroup` con sus productos para varias. Se conservan SKU, marca, categorías, contenido, presentación y sabor. Cada SKU tiene su URL propia y disponibilidad según stock. El documento describe todas las variantes públicas, por lo que sigue siendo coherente después del cambio local de sabor sin reescribir scripts ni generar solicitudes adicionales.
- Se representan los dos precios que muestra la ficha, identificando el medio en el nombre de cada oferta y usando importes exactos en ARS. El cálculo reutiliza `productOffers` y `priceLines`: solo rebajas aplicables a una unidad, vigentes y con cupo disponible; no anuncia un combo o descuento mayorista como precio de una unidad. No se declara que los medios de pago ya estén integrados. No se añaden valoraciones, GTIN, condición del envase, políticas de devolución o datos de envío inventados.
- `/sitemap.xml` reúne las cuatro páginas públicas principales y los productos públicos actuales, sin filtros, variantes, búsquedas, carrito, checkout, administración ni vistas de prueba. No inventa fechas de modificación. Ante un fallo de lectura del catálogo responde por la ruta de error, en vez de publicar una lista incompleta como si fuera correcta.

Se mantienen `noindex, nofollow` y `Disallow: /`, las protecciones adicionales del admin y el aislamiento de vistas previas. No se anuncia ni se envía el sitemap a buscadores. Su existencia no autoriza el lanzamiento. Los datos estructurados se serializan escapando `<` antes de insertarlos: un texto como `</script>` no puede cerrar el elemento JSON-LD. No hay cambios de CSS, animaciones, logotipos o reglas de compra. Una variante inexistente en la URL vuelve a la selección pública inicial, sin introducir un SKU inválido en el detalle.

## Verificación

`npm.cmd run check`: lint, TypeScript, build de producción y **122 pruebas unitarias aprobadas**, dos omitidas. Las pruebas nuevas cubren metadatos, fotos por variante, derivados registrados, stock, importes con centavos, promociones, cupos, productos ocultos, selección inválida, fallos de lectura y serialización de texto hostil. También comprueban que la ruta de servidor emita los SKU en el HTML inicial.

En Chromium sobre `next start`, con Supabase desconectado y datos de prueba aislados: **23 pruebas de navegador aprobadas, tres omitidas según dispositivo**, en SEO, precios y estabilidad de carga. Incluye metadata/canonical, sitemap, robots, rutas sin JavaScript, estados privados, promociones y ausencia de desplazamiento al hidratar.

La primera pasada tuvo cuatro fallos de comprobación: dos por comparar literalmente la barra final del origen que Next normaliza y dos por medir geometría antes del primer pintado. Se verificó este último con CSS demorado 400 ms: el DOM todavía sin pintar tenía el margen nativo de 8 px; el HTML ya pintado y el hidratado coincidían en x=0. La prueba ahora espera FCP y fuentes antes de tomar la referencia; mantiene el límite de menos de 1 px e introduce CSS demorado para conservar ese escenario. No se cambió la interfaz para ocultar un salto.

Revisión HTTP de producción local, usando solo lecturas públicas y tres solicitudes concurrentes:

| Comprobación | Resultado |
| --- | --- |
| Fichas válidas revisadas | 53 de 53 |
| SKU representados con URL, stock y ofertas en ARS | 76 de 76 |
| Descripciones de metadatos vacías | 0 |
| SKU con fotografía aplicable | 56 |
| SKU sin fotografía aplicable | 20, los pendientes de Fase 3Y |
| URLs del sitemap | 57, sin rutas privadas ni consultas |
| Incidencias en esa revisión | 0 |

Comprobación adicional de EAA en móvil de 390 px, cambio de sabor y HTML sin JavaScript en escritorio: el esquema conserva todos sus SKU, la selección queda incluida, no hay desbordamiento horizontal ni errores de página en esa pasada. Su JSON-LD mide 7.686 bytes en la muestra. Se revisó la captura temporal `stylo-3z-product-390.png`, fuera del repositorio. No se realizaron compras ni escrituras en servicios reales.

## Límites antes del lanzamiento

- El resumen automático no reemplaza una descripción comercial/editorial completa del fabricante.
- Siguen pendientes las 20 fotografías de [Fase 3Y](legibilidad-compra-fase-3y.md), el dominio definitivo, contacto, condiciones comerciales, cobros y logística.
- Sabor y presentación se expresan como propiedades y términos reales; no se disfrazan de color o material. Google documenta un conjunto limitado de propiedades de variación que no incluye sabor. Este esquema no acredita elegibilidad para sus resultados enriquecidos de variantes. Revisar esa compatibilidad y validar con las herramientas de los buscadores antes de retirar los bloqueos. [Google: variantes de producto](https://developers.google.com/search/docs/appearance/structured-data/product-variants).
- Las pruebas comprueban generación, consistencia y serialización; no se enviaron URLs a Google ni se certificó posicionamiento. Tampoco se atribuye una mejora de Core Web Vitals a esta etapa ni se repite la medición de rendimiento de Fase 3X.
- Retirar los bloqueos de indexación y anunciar el sitemap son decisiones futuras, con validación del dueño; no se añadió un interruptor que los habilite automáticamente.

Referencias de implementación: [JSON-LD en Next.js](https://nextjs.org/docs/app/guides/json-ld), [sitemap de Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), [Product de Schema.org](https://schema.org/Product) y [Offer de Schema.org](https://schema.org/Offer).
