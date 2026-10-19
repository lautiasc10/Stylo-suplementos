# Fase 3K — Extensión de fichas y revisión móvil

## Corrección posterior 3L: scroll y compra

El usuario pidió volver al inicio al elegir categorías o marcas y unificar la compra en celular. Rama `fase-3l-scroll-y-compra-mobile`, sobre la entrega 3K.

- `ResultsScrollReset` lleva el scroll a cero después de confirmar los nuevos filtros en tienda o búsqueda. No espera animaciones ni afecta a la selección de sabores dentro de una ficha. Los enlaces de categorías de cabecera también vuelven arriba al navegar, tanto en el menú móvil como en la barra y el desplegable de escritorio.
- La regla que hacía relativa la compra en fichas con coreografía se limita al escritorio. En todas las fichas móviles se reutiliza la barra fija inferior existente, con espacio para el área segura y reserva de página para no tapar el contenido final. Stock, variante y estado deshabilitado se conservan.
- `npm.cmd run check` aprobado: lint, TypeScript, 90 pruebas unitarias y build de producción. Las pruebas de navegador sobre producción local incluyen 51 regresiones de búsqueda, filtros y coreografía, más cuatro casos específicos aprobados: regreso arriba con marca y categoría en escritorio/móvil y compra fija a 375/768 px en tres clases de ficha, antes/después de scroll, cambio de sabor agotado y movimiento reducido. Se corrigió la preparación del caso de escritorio para esperar los productos locales antes de intentar scrollear. Los casos exclusivos de móvil se omiten intencionalmente en escritorio.

Las mediciones y capturas que siguen corresponden a la revisión 3K. Esta corrección no añade medios ni animaciones continuas.

El usuario aprobó la prueba de tres fichas y pidió extenderla a todos los productos sin sabor, además de revisar diseño y rendimiento de tienda, etiquetas, filtros fijos, búsquedas y compra en celular. Rama `fase-3k-revision-mobile`; la integración queda para la revisión de esta entrega.

## Cambios

- Todas las fichas sin sabor reciben la escena negra y dorada aprobada: partículas breves, halo y apoyo fijo. No se añaden imágenes ni videos a estas escenas. Las fichas con sabor conservan sus fondos y coreografía.
- Tienda y resultados comparten un panel móvil de filtros nativo, con formulario persistente, cabecera, cierre y acción inferior visible. El contenido tiene scroll propio y el fondo queda bloqueado. Se conserva selección al cerrar o cambiar de tamaño; Esc, clic exterior y teclado devuelven el foco al disparador. En escritorio los filtros siguen en línea; sin JavaScript queda disponible el formulario GET.
- Sabor, promoción y agotado tienen espacios propios dentro de la tarjeta. En móvil la promoción usa una leyenda compacta, manteniendo el texto completo para lectores de pantalla; las flechas se sitúan entre etiquetas superiores e indicadores inferiores. Se verifica la combinación de promoción por cantidad, sabor largo y dos variantes a 375 px.
- Los resultados mantienen dos columnas en celular y sus filtros no ocupan toda la primera pantalla. Los campos relevantes usan 16 px para evitar el zoom de foco de iOS. Se conserva el buscador de pantalla completa.
- La aparición de grillas largas se dispara al entrar su borde superior: ya no exige que sea visible el 20% de cinco o más filas. El HTML inicial permanece visible sin JavaScript y la preferencia de movimiento reducido se conserva.
- Placeholders y miniaturas del carrito usan el tema oscuro. Se reserva espacio inferior en el placeholder para que su texto no choque con el agotado.
- Los títulos largos sin espacios, como `ZINC+MAGNESIO+VITAMINA`, pueden partir línea en celular: se conserva el texto completo y deja de recortarse en el borde.
- Los precios de sugerencias se memorizan para no recalcular promociones con cada movimiento del resaltado por teclado.
- Quince decoraciones de sabor tienen derivados WebP de 640 px para pantallas menores de 768 px, incluidos los vecinos precargados. Se mantiene el alfa. Originales sin cambios: 2.717.494 B; derivados: 1.395.682 B, un 48,6% menos. [Detalle de archivos](reviews/mobile-storefront/decoraciones.json). Los demás tamaños siguen usando los originales.

No se modifican precios, stock, pedidos, variantes, pagos ni envíos en la base de datos. El carrito de la revisión real vive en una sesión nueva del navegador; no se confirma ningún pedido.

## Capturas

| Vista | 375 px | 390 px | 768 px |
| --- | --- | --- | --- |
| Home | [Ver](reviews/mobile-storefront/after/home-375.webp) | [Ver](reviews/mobile-storefront/after/home-390.webp) | [Ver](reviews/mobile-storefront/after/home-768.webp) |
| Menú móvil | [Ver](reviews/mobile-storefront/after/menu-375.webp) | [Ver](reviews/mobile-storefront/after/menu-390.webp) | [Ver](reviews/mobile-storefront/after/menu-768.webp) |
| Tienda | [Ver](reviews/mobile-storefront/after/catalogo-375.webp) | [Ver](reviews/mobile-storefront/after/catalogo-390.webp) | [Ver](reviews/mobile-storefront/after/catalogo-768.webp) |
| Etiquetas | [Ver](reviews/mobile-storefront/after/etiquetas-375.webp) | [Ver](reviews/mobile-storefront/after/etiquetas-390.webp) | [Ver](reviews/mobile-storefront/after/etiquetas-768.webp) |
| Filtros | [Ver](reviews/mobile-storefront/after/filtros-375.webp) | [Ver](reviews/mobile-storefront/after/filtros-390.webp) | [Ver](reviews/mobile-storefront/after/filtros-768.webp) |
| Buscador | [Ver](reviews/mobile-storefront/after/buscador-375.webp) | [Ver](reviews/mobile-storefront/after/buscador-390.webp) | [Ver](reviews/mobile-storefront/after/buscador-768.webp) |
| Resultados | [Ver](reviews/mobile-storefront/after/resultados-375.webp) | [Ver](reviews/mobile-storefront/after/resultados-390.webp) | [Ver](reviews/mobile-storefront/after/resultados-768.webp) |
| Ficha sin sabor | [Ver](reviews/mobile-storefront/after/sin-sabor-375.webp) | [Ver](reviews/mobile-storefront/after/sin-sabor-390.webp) | [Ver](reviews/mobile-storefront/after/sin-sabor-768.webp) |
| Ficha con sabor | [Ver](reviews/mobile-storefront/after/con-sabor-375.webp) | [Ver](reviews/mobile-storefront/after/con-sabor-390.webp) | [Ver](reviews/mobile-storefront/after/con-sabor-768.webp) |
| Carrito | [Ver](reviews/mobile-storefront/after/carrito-375.webp) | [Ver](reviews/mobile-storefront/after/carrito-390.webp) | [Ver](reviews/mobile-storefront/after/carrito-768.webp) |

También se conservan las capturas previas, el panel del carrito, Nosotros y Contacto en `docs/reviews/mobile-storefront/{before,after}`.

## Verificación

`npm.cmd run check`: lint, TypeScript, 90 pruebas unitarias correctas (2 omisiones intencionales) y build de producción. Los recorridos de catálogo, búsqueda, carrito y edición suman 83 casos aprobados en la pasada final anterior al ajuste del disparador. Tras ese ajuste, 22 casos específicos de móvil, fichas y aparición aprobados, incluidas grillas de diez resultados, foco, modal, transparencia de las decoraciones, ausencia de cruces entre etiquetas y flechas, JavaScript demorado, navegación sin JavaScript y movimiento reducido. Los casos exclusivos de móvil se omiten intencionalmente en el proyecto de escritorio. La revisión anterior de fichas, escenas y coreografía también pasó sus recorridos específicos.

La revisión visual usa ocho rutas reales y el carrito a tres anchos: 27 estados, más overlays de menú, filtros y búsqueda. Las capturas y mediciones se toman en `next build` + `next start`, Chromium con GPU y CPU ×4, viewport de 844 px de alto, DPR 1 y emulación táctil. Es una aproximación reproducible a un equipo limitado; no equivale a probar un teléfono físico ni acredita una frecuencia universal de 60 fps.

Reproducción:

```powershell
npm.cmd run check
npm.cmd run start -- --port 3218
# En otra terminal, con el servidor ya listo:
node scripts/audit-mobile-storefront.mjs after http://127.0.0.1:3218
```

El script registra intervalos RAF, trazas CDP de scripting/pintura/layout, bytes de imágenes transferidos, imágenes rotas, desbordamientos, campos pequeños y tarjetas transparentes dentro del viewport. Los tiempos de scripting/pintura/layout son uniones de intervalos del hilo principal, sin sumar eventos anidados. Las medidas son muestras locales cortas, no INP de usuarios reales.


## Rendimiento antes y después

[Medición anterior](reviews/mobile-storefront/before/verificacion.json) y [medición final](reviews/mobile-storefront/after/verificacion.json). Cada celda muestra **antes → después**; tiempos en milisegundos. Scroll incluye unos 2,1 s de muestreo; búsqueda incluye escritura, respuesta y 350 ms de asentamiento; cambio de sabor incluye clic y 1,15 s de espera. Las variaciones entre pasadas no permiten atribuir toda la diferencia al código.

| Ancho | Acción | RAF p95 | RAF máximo | RAF >32 ms | Scripting | Pintura | Layout/estilos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 375 | Scroll de tienda | 13.5 → 13.4 | 13.5 → 13.5 | 0 → 0 | 173.16 → 136 | 47.25 → 26.27 | 0 → 0 |
| 375 | Búsqueda | 26.7 → 26.8 | 53.5 → 40 | 2 → 2 | 80.49 → 60.4 | 26.61 → 32.81 | 61 → 55.52 |
| 375 | Cambio de sabor | 26.6 → 13.5 | 80.1 → 93.3 | 1 → 1 | 172.43 → 199.4 | 60 → 67.23 | 150.55 → 183.32 |
| 390 | Scroll de tienda | 13.5 → 13.4 | 13.5 → 13.5 | 0 → 0 | 174.8 → 140.53 | 49.62 → 43.67 | 0 → 10.5 |
| 390 | Búsqueda | 26.8 → 40 | 53.4 → 66.8 | 2 → 3 | 73.06 → 90.74 | 42.08 → 36.83 | 56.86 → 76.86 |
| 390 | Cambio de sabor | 13.5 → 13.5 | 80.1 → 80 | 1 → 2 | 171.92 → 155.29 | 59.2 → 65.36 | 163.04 → 157.49 |
| 768 | Scroll de tienda | 13.4 → 13.4 | 53.4 → 40 | 1 → 1 | 213.62 → 169.52 | 43.14 → 36.99 | 2.23 → 2.61 |
| 768 | Búsqueda | 26.6 → 26.7 | 40.1 → 40 | 2 → 1 | 66.4 → 59.51 | 27.34 → 27.61 | 51.45 → 46.24 |
| 768 | Cambio de sabor | 26.6 → 13.5 | 93.4 → 53.3 | 2 → 1 | 191.69 → 146.46 | 62.12 → 63.7 | 176.53 → 170.93 |

| Ancho | Imágenes del recorrido de catálogo, antes → después | Imágenes de ficha con sabor, antes → después |
| --- | --- | --- |
| 375 | 252116 → 268415 B | 929664 → 538714 B |
| 390 | 252114 → 268415 B | 929664 → 538714 B |
| 768 | 311322 → 311322 B | 1093802 → 1093802 B |

La ficha con sabor a 375/390 px baja de 929.664 a 538.714 bytes de imágenes transferidas durante ese recorrido: **42,1% menos**. A 768 px se conservan las decoraciones originales. El recorrido completo de catálogo incluye scroll y búsqueda, no solo la carga inicial: a 375/390 px registra unos 16,3 kB más y a 768 px no cambia; no se presenta como una reducción del catálogo. Las fichas sin sabor no agregan descargas para su nueva escena.

El scroll conserva un p95 de aproximadamente 13,4–13,5 ms. Permanecen intervalos puntuales superiores a 32 ms en interacciones con CPU ×4; las trazas no acreditan 60 fps constantes en todas las acciones. La búsqueda tiene variación entre pasadas, por lo que la memorización evita trabajo redundante pero no acredita por sí sola una mejora universal de latencia.

En los 27 estados finales: cero errores de consola, imágenes rotas, desbordamientos horizontales, títulos visibles recortados o tarjetas transparentes dentro de la zona observada. Los campos de texto/select revisados en móvil tienen al menos 16 px; radios y casillas no se cuentan como entradas que disparan zoom de teclado.
