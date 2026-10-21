# Fase 3X — Estabilidad y carga de imágenes

Autorización: «arranca», después de la auditoría integral del 21 de octubre de 2026. Alcance: etapas 1 y 2 del plan, en `fase-3x-estabilidad-rendimiento`, desde la rama de prueba de diseño. No incluye integrar a main, publicar, cambiar datos ni habilitar pagos.

## Estabilidad inicial

El filtro nativo llega cerrado desde el servidor. En móvil no se retira una columna de formulario después del primer paint. En escritorio se abre al hidratar, dentro de su columna ya reservada. Si JavaScript falla, su summary permanece visible y permite abrir el formulario GET. Si la persona ya lo abrió y escribió antes de hidratar, se conserva esa interacción al pasar al modal; un evento `close` pendiente de esa conversión no lo cierra otra vez.

La capa de legibilidad conserva una caja absoluta del tamaño del fondo. Las mediciones de la información posicionan el centro y los radios del degradado dentro de esa caja, sin mover ni redimensionar el elemento al hidratar. Mantiene la geometría visual de la elipse anterior, el reveal circular y el movimiento ambiente.

Las pruebas con scripts retenidos reprodujeron primero un desplazamiento de 762 px de los resultados y 262,5 px en X de la capa de legibilidad. Las comprobaciones nuevas exigen menos de 1 px de diferencia tras hidratar, con las fuentes listas y movimiento reducido para aislar el layout.

## Imágenes

- La primera decoración visible se precarga desde el render del servidor con prioridad alta y condiciones de media iguales a su picture. Móvil solicita solamente la copia compacta.
- Las precargas automáticas vecinas esperan a las imágenes actuales y al tiempo libre del navegador. Hover, foco y elección explícita siguen preparando imágenes sin esperar a ese trabajo secundario. El cambio de SKU, precio, stock y URL sigue siendo inmediato.
- Se omite la variante activa en la descarga secundaria, se reúnen vecinos repetidos y las imágenes decorativas comparten el modo CORS con su caché. Un placeholder no se trata como imagen y un archivo ya cargado no necesita otro decode para programar trabajo secundario.
- El trabajo pendiente se cancela al cambiar de variante o desmontar. No se ejecuta en pestaña oculta; el ahorro de datos evita las precargas automáticas.
- Solo los WebP versionados de sabores y los derivados de las tres colecciones de normalización reciben un año de caché inmutable. PNG originales, informes JSON, datos, administración y documentos HTML no entran en esa regla.

**Regla de publicación de recursos:** cambiar un archivo inmutable exige un nombre/versionado nuevo. Los derivados normalizados incluyen el hash del original y su pipeline no sobreescribe exportaciones. Una futura revisión del algoritmo debe usar otra versión de exportación.

## Medición de producción local

`npm.cmd run build` y `npm.cmd run start -- --port 3101`; Chrome DevTools Performance, viewport 390 × 844, DPR 3, CPU ×4, Slow 4G, caché del navegador desactivada y movimiento normal. Lecturas públicas de tienda y de Whey Protein / Frutilla; ninguna compra ni cambio de datos.

| Ruta | Auditoría inicial | Solo estabilidad | Estabilidad y carga |
| --- | --- | --- | --- |
| Tienda LCP | 5.760–6.363 ms | 3.002 ms | 2.910 ms |
| Tienda CLS | 0,553 | ≈0 | ≈0 |
| Ficha LCP | 5.692–5.726 ms | 5.800 ms | 3.633–3.747 ms |
| Ficha CLS | ≈0,31 | ≈0,01 | ≈0,01 |

Una pasada intermedia, antes de añadir el preload responsivo, dio 5.103 ms de LCP y 1.511 ms de TTFB en la ficha; no se descarta de la evidencia. Las muestras finales muestran una mejora de carga, pero no alcanzan todavía un LCP móvil de 2,5 s bajo estas condiciones. Hay variación del servidor y los recursos son locales: no acreditan Core Web Vitals de usuarios reales, un teléfono físico ni Safari. La caché inmutable beneficia visitas posteriores; no explica por sí sola la mejora con caché desactivada.

## Comprobación

Lint, TypeScript y compilación de producción aprobados. 108 pruebas unitarias aprobadas y dos omitidas. Recorridos Chromium de catálogo, búsqueda, variantes y filtros en escritorio/móvil: 106 aprobados y diez omitidos por dispositivo. Incluye diez cambios rápidos por sentido, fallos de imágenes, movimiento reducido, navegación sin JavaScript y scripts demorados. Las pruebas de sincronización se actualizan al precio por transferencia ya vigente y a la apertura explícita de la bolsa, sin alterar precios reales.

Capturas locales revisadas a 390 y 1440 px, más comprobación de dimensiones a 768 px: no se detectó desbordamiento horizontal en la ficha. Las capturas temporales `stylo-3x-catalog-mobile.webp`, `stylo-3x-product-mobile.webp` y `stylo-3x-product-desktop.webp` quedan fuera del repositorio. Los placeholders pendientes del catálogo y la jerarquía visual móvil pertenecen a etapas siguientes de la auditoría.
