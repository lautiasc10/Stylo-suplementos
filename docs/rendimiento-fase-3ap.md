# Fase 3AP — Carga y animaciones

Rama de trabajo: `fase-3ap-rendimiento`. Continúa las correcciones locales de 3AO; conserva las entregas anteriores y requiere validación antes de integrar a `main`.

## Cambios y alcance

1. **Hero:** el león conserva su pose principal, calidad, zoom de entrada, fundido entre poses y seguimiento del cursor. La entrada comienza visible y sin la espera de 300 ms ni el desenfoque animado de 12 px. La pose izquierda se descarga con prioridad baja después de la principal y solo cuando puede utilizarse: cursor preciso, movimiento habilitado y sin ahorro de datos. En móvil no se descarga esa pose innecesaria.
2. **Cursor y partículas:** no se reconstruyen los mismos transforms cuando el cursor ya se estabilizó. Las partículas móviles mantienen cantidad, colores y velocidad, con pintura a unos 30 Hz; el seguimiento de escritorio conserva su reloj de pantalla. Se mantiene la suspensión fuera del hero, en pestañas ocultas y bajo paneles modales.
3. **Catálogo:** se elimina la precarga indiscriminada por visibilidad tanto en `VariantSpinner` como en la galería de productos con una sola variante y varias fotos. Los vecinos se preparan tras hover, foco o contacto táctil, respetando visibilidad y ahorro de datos. Se conserva la rotación automática visible, sus intervalos escalonados y la descarga necesaria para cada cambio efectivo; la imagen actual permanece hasta decodificar la siguiente.
   Las tarjetas con una única fotografía normalizada usan un componente estático ligero: mantienen la misma imagen, dimensiones, roca, enlace y hover, sin montar estados, temporizadores, observadores ni cachés de una galería que no necesitan. El detalle y las tarjetas con varias fotos o variantes conservan sus galerías.
4. **Bolsa y buscador:** `ModalActivityProvider` comparte una única suscripción React y un único observador; las tarjetas consultan su contexto mediante `useModalOpen`. Durante la carga normal solo vigila el atributo `open`; escucha inserciones y remociones únicamente mientras hay un modal abierto, evitando inspeccionar el catálogo durante la hidratación. Pausa temporizadores y nuevas precargas en ambas galerías. Un giro ya iniciado se finaliza y limpia; una descarga pendiente puede terminar su selección sin arrancar otra animación detrás del panel. Los diálogos de filtros abiertos en el lateral de escritorio no se consideran modales.
5. **Sabores:** se promueve temporalmente la escena entrante completa durante el reveal, limpiando los hints al terminar o interrumpirlo. Se conservan el círculo de 850 ms, origen del gesto, crossfade, zoom y movimiento ambiente. El movimiento ambiente y las precargas se pausan bajo los paneles; precio, stock y URL siguen respondiendo inmediatamente.

No se modifican precios, stock, fotos originales, tipografías, paleta, pagos, esquema, configuración de Supabase ni despliegue. No se agregan dependencias.

## Verificación funcional

- Compilación de producción con Next.js 16.4.3, Node 22.13.1 y Chromium de Playwright.
- Lint, typecheck y build correctos.
- Unitarias: 153 correctas y las 2 omisiones existentes del CSV externo. Incluyen la regresión SSR de la tarjeta estática para comprobar enlace, dimensiones, srcset y ausencia de una copia duplicada del envase. Se ejecutaron en serie: una ejecución concurrente con build agotó los 5 segundos de dos pruebas de imágenes; la ejecución seriada pasó sin cambiar sus límites ni su implementación.
- Recorridos de Playwright: Home, poses del león, filtros sin JavaScript, card automática, bolsa, buscador, checkout de prueba, reveal de sabores, diez cambios rápidos en ambos sentidos, preferencias reducidas y estabilidad de hidratación.
- La prueba de precarga falló con la versión anterior porque ya había decodificado el vecino sin interacción. La prueba que detiene un giro en curso al abrir la bolsa también falló con la versión anterior y pasó con la corrección.
- La prueba del piloto de normalización utilizaba una clase de precios retirada. Se reprodujo el mismo fallo contra la referencia anterior; se actualizó solo ese selector, manteniendo las comprobaciones de tamaño, alineación y responsive. Las seis pruebas del piloto pasan con la tarjeta ligera.

## Metodología de medición

Se conservan los artefactos en `C:/tmp/stylo-3ap/`. La comparación final utiliza `before-clean/` y `release/`: producción local, tres sesiones nuevas de Chrome por página y dispositivo, con idénticos parámetros de Lighthouse 12.8.2. Se ejecutan en serie y sin pruebas funcionales concurrentes. La referencia es una copia aislada de la primera etapa, con las mismas dependencias y fotografías; no se copiaron archivos de entorno. Las rutas públicas solo se consultan.

Escritorio: 1350×940, CPU 1×, simulación de RTT de 40 ms y 10.240 Kbps. Móvil Lighthouse: 412×823, DPR 1,75, CPU 4×, RTT de 150 ms y 1.638,4 Kbps. Son mediciones de laboratorio; no representan datos reales de usuarios ni INP de campo. Los ensayos exploratorios `before/` y `after/` se conservan, pero no sustituyen la comparación final aislada.

Las interacciones usan viewport 1440×900 y emulación móvil 390×844 con CPU 4×. Se guardan trazas de Chrome, intervalos de `requestAnimationFrame`, tareas largas y commits de React. La frecuencia rAF indica cadencia del hilo principal, no una garantía de FPS efectivamente presentados ni de rendimiento en un teléfono físico. El sondeo introduce una carga igual en ambos recorridos. Los directorios `after/`, `final/`, `final-observer/` y `delivery/` documentan los ajustes intermedios, antes de compartir la suscripción, corregir ambas galerías y retirar su maquinaria de las tarjetas de una sola foto normalizada.

## Resultados finales

Medianas de tres ejecuciones por combinación. La flecha indica **antes → después**. FCP y LCP en segundos; TBT en milisegundos. La compilación y las series comparadas se obtuvieron antes del cierre de esta revisión; no se mezclan sus resultados con métricas de Vercel.

| Página / dispositivo | Performance | FCP | LCP | TBT |
| --- | --- | --- | --- | --- |
| Home / escritorio | 97 → 98 | 0,420 → 0,363 | 1,184 → 0,986 | 19,5 → 64,5 |
| Home / móvil | 79 → 75 | 1,502 → 1,821 | 4,863 → 5,030 | 151,5 → 191,5 |
| Catálogo / escritorio | 96 → 88 | 0,362 → 0,420 | 1,270 → 2,210 | 105 → 91,5 |
| Catálogo / móvil | 64 → 68 | 1,710 → 1,710 | 7,311 → 6,986 | 439 → 305,3 |

| Página / dispositivo | Imágenes, kB decimales | CLS |
| --- | --- | --- |
| Home / escritorio | 915,2 → 915,2 | 0,004434 → 0,004434 |
| Home / móvil | 563,7 → 453,8 | 0 → 0 |
| Catálogo / escritorio | 1.507,5 → 1.427,7 | 0,000576 → 0,000576 |
| Catálogo / móvil | 896,2 → 816,3 | 0,000284 → 0,000284 |

**Mejoras verificadas:** imágenes del Home móvil −19,5%; imágenes del catálogo móvil −8,9%; TBT del catálogo móvil −30,5%. En una observación de 6,5 segundos con la bolsa abierta, los cambios de `src`, `href` o fase de galería pasaron de 16 a 0 tanto en escritorio como en móvil. No se modificó la selección de productos al abrir la bolsa.

**Resultados que no mejoraron:** Home móvil empeora en esta serie, y el catálogo de escritorio muestra un LCP estimado mayor. El TBT de Home de escritorio también sube. Estos resultados no se ocultan ni se atribuyen sin prueba a la red o a la máquina: falta aislar la causa con una comparación alternada y perfiles de carga antes de considerar cerrado el rendimiento global. El menor peso descargado no permite afirmar que todas las páginas carguen más rápido.

Accessibility mediano fue 100 en los cuatro controles finales. El 96 → 100 del catálogo de escritorio no acredita que se haya corregido el contraste transitorio del badge: se conserva ese hallazgo previo.

### Interacciones y animaciones

Una muestra diagnóstica de cada recorrido, con tres cambios de sabor en la muestra de reveal. Scripting y Paint se obtienen de la unión de sus intervalos en el hilo principal de la traza, evitando sumar intervalos anidados; no equivalen al costo total de GPU o rasterización.

| Recorrido | rAF Hz antes → después | Máximo intervalo, ms | Tareas largas antes → después | Scripting, ms | Paint, ms |
| --- | --- | --- | --- | --- | --- |
| Cursor / escritorio | 49,2 → 51,7 | 33,4 → 50,0 | 0 → 0 | 37,4 → 44,9 | 18,5 → 20,4 |
| Scroll catálogo / escritorio | 60,0 → 60,0 | 16,8 → 16,8 | 0 → 0 | 45,6 → 39,0 | 12,5 → 15,0 |
| Reveal / escritorio | 43,2 → 41,7 | 33,5 → 33,5 | 0 → 0 | 73,6 → 71,8 | 5,1 → 5,9 |
| Hero / móvil CPU 4× | 59,5 → 60,0 | 33,3 → 16,8 | 0 → 0 | 234,2 → 172,8 | 141,7 → 129,2 |
| Scroll catálogo / móvil CPU 4× | 57,1 → 52,0 | 33,4 → 66,6 | 0 → 0 | 347,6 → 353,0 | 32,6 → 33,5 |
| Reveal / móvil CPU 4× | 56,9 → 55,5 | 83,4 → 116,7 | 3 → 3 | 627,5 → 631,8 | 35,3 → 33,8 |

Mover el cursor no produjo commits de React en ambas muestras. Los commits durante el scroll del catálogo bajaron de 34 a 12 en escritorio y de 31 a 13 en móvil; son commits de raíz del recorrido, no un conteo de renders individuales. **No se demostró una mejora de fluidez del reveal**, ni se cumple un objetivo general de intervalos menores de 20 ms en estos ensayos. Se conserva la coreografía solicitada y queda pendiente aislar su costo de composición en GPU y validarlo en un dispositivo físico. No se interpreta la emulación como un teléfono real.

### Evidencias y revisión visual

- `C:/tmp/stylo-3ap/medians.json`: medianas sin redondear.
- `before-clean/` y `release/`: 24 informes Lighthouse JSON/HTML en total, con trazas y registros de red de las primeras ejecuciones.
- `before/interaction-summary.json` y `release/interaction-summary.json`: muestras de interacción, tiempos de scripting/pintura y trazas correspondientes.
- `release/visual-checks.json`: Home y catálogo en 320, 375, 768 y 1440 px según la ruta; sin desbordamiento ni errores de página. Las cuatro imágenes de producto comprobadas en cada viewport cargaron y conservaron contenedores cuadrados.
- Capturas revisadas: `release/catalogo-375.png`, `release/catalogo-1440.png`, `release/home-375.png`, `release/desktop-flavor.png`. También se guardan catálogo 320/768, Home escritorio y ficha móvil. Se conservan las fotografías, proporciones y colores existentes.
- Serie principal funcional: 69 pruebas correctas y 9 omisiones por dispositivo. Se suman 14 comprobaciones de catálogo, seis de storefront móvil y seis del piloto de imágenes. Los últimos cambios se volvieron a comprobar en los recorridos afectados.

**Estado de entrega:** cambios funcionales revisables y mejoras de peso/pausa comprobadas. No se considera resuelta la totalidad de los objetivos de rendimiento ni se recomienda presentar esta etapa como una mejora uniforme de toda la web. Prioridad pendiente: aislar el retroceso de carga de Home móvil y catálogo de escritorio, y los picos del reveal/scroll móvil, preservando la composición visual.

## Riesgos y límites

- La primera interacción sobre un sabor no preparado todavía puede esperar a su descarga; se conserva la imagen actual y los controles existentes de error, sin dejar un hueco. Los vecinos del detalle mantienen su preparación anticipada.
- La pausa por modal conserva la selección más reciente y no modifica cantidades ni el carrito.
- Las cifras de Lighthouse varían con la máquina, las respuestas del catálogo y el instante de las animaciones. No se deduce una mejora de todas las métricas a partir de una sola puntuación.
- En la referencia se reprodujo un contraste insuficiente durante el fundido transitorio de la etiqueta de sabor de una card (`product-card-marker-current[data-changing]`). Puede hacer variar Accessibility entre 96 y 100; es anterior a esta etapa y se informa por separado de los resultados de rendimiento.
- La integración a `main`, el despliegue y los demás pendientes de la auditoría quedan fuera de esta entrega.
