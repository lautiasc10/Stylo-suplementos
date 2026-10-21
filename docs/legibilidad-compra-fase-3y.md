# Fase 3Y — Legibilidad y contexto de compra

Continuación autorizada de las mejoras de la auditoría, sobre `fase-3x-estabilidad-rendimiento`. Rama: `fase-3y-legibilidad-compra`. No incluye integración a main, publicación, cambios de inventario, fotografías en la base ni habilitación de pagos.

## Ajustes

- Desde 541 px, el título del hero queda a la izquierda y el león a la derecha. La composición tiene un máximo de 1440 px y tamaños de letra acotados para conservar su relación en monitores anchos. Se refuerza el contorno dorado existente. Se conserva la composición apilada en teléfono, las poses, el movimiento del cursor, las partículas y los controles de pausa.
- La barra fija de compra móvil muestra el precio por unidad y el medio de pago seleccionado encima de cantidad y botón. Usa el mismo `ProductPricing`, con idénticos cálculos de promociones, cupos, cantidad seleccionada y unidades ya agregadas. No crea otro selector ni otra región de anuncios de precio. En escritorio el resumen adicional está oculto.
- Se reserva espacio inferior para la barra: en las capturas a 320 px mide 129 px y a 390/768 px, 113 px, frente a 136 px reservados, sin contar la zona segura del dispositivo. El botón agotado y el control de cantidad mantienen su comportamiento.
- Los enlaces de imágenes pendientes incluyen su mensaje visible en el nombre accesible, tanto en el placeholder directo como en las galerías. El mensaje de galería se centra con texto de 14 px, dentro de la escena existente y separado de los controles. No se sustituye una foto faltante por otra de distinto sabor.

## Fotografías pendientes de asociación

Consulta pública de solo lectura de `catalog_snapshot`, 21/10/2026: 53 productos activos; 20 variantes de 11 productos no tienen foto frontal específica ni una foto general aplicable. Esto identifica asociaciones ausentes en el catálogo, no demuestra que el archivo no exista en Drive u otra carpeta. Las tablas informativas y los ángulos no se usan como portada.

| Producto | Sabores / SKU sin frente asociado |
| --- | --- |
| XBody FIX BCAA 300 g | Frutos rojos XBO-0001; Limón XBO-0002; Uva XBO-0004 |
| XBody Hydroflex 330 g | Ananá XBO-0005; Cereza XBO-0006; Multifruta XBO-0007; Pomelo rosado XBO-0008 |
| XBody Hydrosport 360 g | Cereza XBO-0009; Multifruta XBO-0010; Neutro XBO-0011 |
| XBody Creatina micronizada 1 kg | Sin sabor XBO-0012 |
| XBody Creatina 300 g Doypack | Sin sabor XBO-0013 |
| Star Mutant Mass 1,5 kg | Chocolate suizo STAR-0012 |
| Star Pump V8 285 g | Limón STAR-0017 |
| XBody Whey Blend Protein 2 lbs Doypack | Sin sabor XBO-0015 |
| One Fit Whey Protein 2 lbs Doypack | Dulce de leche ONE-0015 |
| Star Proteína + Creatina 910 g | Vainilla STAR-0027; Chocolate STAR-0028 |
| XBody Vitalmag 300 g | Frutos rojos XBO-0017; Neutro XBO-0018 |

FIX BCAA y Whey One Fit tienen fotografías de otros sabores. Se conservan sus asociaciones. Sigue vigente la decisión de dejar pendientes las fotografías con fondo blanco; no se generan ni se suben reemplazos en esta etapa.

## Verificación

`npm.cmd run check`: lint, TypeScript, 108 pruebas unitarias aprobadas (dos omitidas) y build de producción correctos. Ocho archivos de Playwright sobre `next start` con datos ficticios aislados de Supabase: **82 aprobadas, 20 omitidas según dispositivo**. Incluye sincronización del resumen con medio de pago, variante y umbrales/cupos de promociones; cambios rápidos, swipe, teclado, fondos, scripts demorados, navegación sin JavaScript y movimiento reducido. El test anterior de composición centrada se actualiza para comprobar separación real entre letras y león, reservando además 30 px del parallax.

Inspección local de producción con datos públicos, sin operaciones de compra: home a 320, 390, 768, 1440 y 1920 px; ficha a 320, 390, 768 y 1440 px. Sin desbordamiento horizontal en esas pasadas. Capturas revisadas de home, ficha y placeholders del catálogo, fuera del repositorio, prefijo temporal `stylo-3y-`. La ficha conserva precio y botón visibles con JavaScript desactivado.

No se atribuye una mejora de Core Web Vitals a esta etapa: no se repitió una medición de rendimiento comparable. Los resultados medidos anteriormente están en [Fase 3X](estabilidad-rendimiento-fase-3x.md). Chromium emulado no acredita un teléfono físico, Safari ni conformidad WCAG AA completa. Quedan pendientes las fotografías indicadas y la revisión integral de contraste/zoom de todos los recorridos antes del lanzamiento.
