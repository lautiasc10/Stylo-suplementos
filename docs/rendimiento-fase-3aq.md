# Fase 3AQ — Comprobación alternada y costos del cambio de sabor

Continuación autorizada de rendimiento en `fase-3aq-regresiones-rendimiento`. Conserva los cambios locales de 3AO/3AP. El usuario autorizó su consolidación y subida a `main` el 24 de octubre. No escribe datos comerciales ni cambia dependencias.

## Cambios implementados

- `product-card.tsx`: la roca común de las primeras tarjetas normalizadas se anuncia mediante `react-dom/preload` en el HTML, con `media="(min-width: 960px)"`. En escritorio la petición pasa de prioridad Low a High; móvil conserva su descubrimiento y prioridad anteriores. Es el mismo WebP compartido; las tarjetas con reflejo no lo precargan. No se precargan nuevas variantes.
- `store-particles.tsx`: cada partícula conserva sus coordenadas, radio, tamaño y opacidad. Se almacenan seno/coseno de su ángulo inicial y se aplica la identidad de suma de ángulos. Se evitan 320 llamadas trigonométricas por cuadro, reemplazadas por dos; la opacidad común se escribe una vez. Cada disco sigue pintándose individualmente para conservar la transparencia en sus solapamientos. No se reduce cantidad ni frecuencia de cuadros.
- `flavor-hero-scene.tsx`: reutiliza las dimensiones que ya registra el observador del hero, evitando leer su geometría después de insertar/promover la escena entrante dentro del commit de React.
- `use-flavor-details-motion.ts`: mide los chips juntos y reutiliza sus rectángulos al seleccionar. Los observadores de tamaño de chips y contenedor actualizan esas medidas al cambiar ancho o fuente. Conserva la lectura de la posición interpolada al interrumpir una animación.
- `flavor-detail.spec.ts`: comprueba que el indicador coincide con el chip seleccionado y que fondo/URL siguen correctos al recorrer sabores y redimensionar entre 375, 768, 1440 y 390 px.

No cambian composición, tipografías, colores, fotografías, tiempos del reveal, movimiento ambiente, stock, precios ni reglas de compra. El círculo sigue durando 850 ms, con zoom y continuidad entre la escena anterior y la nueva.

## Método y referencias

Se conservaron dos referencias independientes:

1. **3AO frente a 3AP:** compilación anterior en 3183 y copia de 3AP en 3182, alternando el orden AB/BA/AB. Permite revisar la supuesta regresión de la serie previa.
2. **3AP frente a 3AQ:** copia congelada de la compilación 3AP en 3184 y la nueva en 3182, con el mismo orden alternado. Es la comparación de los cambios de esta entrega.

Next.js 16.4.3 en producción, Node 22.13.1 y Chromium de Playwright. Lighthouse 12.8.2, tres sesiones nuevas por combinación, informes JSON/HTML y trazas de cada ejecución. No se hicieron compilaciones ni pruebas funcionales mientras se tomaban métricas. Los servidores se visitaron antes de la segunda serie para preparar sus recursos; cada medición mantiene una caché nueva de navegador.

Escritorio: 1350×940, DPR 1, CPU 1×, simulación de RTT 40 ms y 10.240 Kbps. Móvil Lighthouse: 412×823, DPR 1,75, CPU 4×, RTT 150 ms y 1.638,4 Kbps. Laboratorio local; no son métricas de usuarios ni INP de campo. El equipo no es un banco de pruebas de hardware dedicado. Tres muestras permiten comparar recorridos, pero no establecer significación estadística ni atribuir cualquier diferencia pequeña a una línea de código.

Las interacciones se grabaron por CDP con viewport 390×844, DPR 3 y CPU 4×. Se calculó la posición del botón antes de grabar y se enviaron clics de puntero a esas coordenadas, evitando búsquedas de accesibilidad/actionability durante la muestra. Aun así persisten tareas largas del proyecto; la carga del automatizador no explica todos los picos.

## Comprobación de las regresiones anteriores

Medianas de tres ejecuciones; FCP/LCP en segundos y TBT en ms:

| Página | Versión | Performance | FCP | LCP estimado | LCP observado local | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| Home móvil | 3AO | 72 | 1,560 | 5,952 | 1,841 | 142 |
| Home móvil | 3AP | 77 | 1,560 | 5,551 | 1,097 | 169,5 |
| Catálogo escritorio | 3AO | 86 | 0,420 | 1,971 | 1,443 | 130,5 |
| Catálogo escritorio | 3AP | 87 | 0,420 | 2,245 | 1,182 | 137 |

No se reproduce el empeoramiento de LCP de Home móvil comunicado en la serie secuencial anterior. Sí persiste mayor TBT. El catálogo ofrece un LCP simulado peor aunque su LCP observado local sea menor: no son la misma métrica ni deben intercambiarse para favorecer una conclusión.

## Resultado de los ajustes de carga

Serie `final/`: 3AP → 3AQ, tres ejecuciones por versión.

| Página | Performance | FCP, s | LCP estimado, s | TBT, ms | CLS |
| --- | --- | --- | --- | --- | --- |
| Catálogo escritorio | 92 → 94 | 0,420 → 0,371 | 1,671 → 1,451 | 106 → 132,5 | 0,000576 → 0,000576 |
| Home móvil | 75 → 73 | 1,908 → 1,917 | 5,637 → 5,669 | 141 → 163 | 0 → 0 |

La reducción mediana del LCP estimado del catálogo es del 13,2%. Chrome confirma el cambio de descubrimiento y prioridad de la roca. Los tiempos individuales siguen variando: no se afirma que toda ejecución sea más rápida. Los bytes de imágenes no aumentan: catálogo escritorio 1.427.674 y Home móvil 453.799 en ambas versiones. Accessibility mediano: 100 en los cuatro grupos.

El ajuste del lienzo no demuestra una mejora de carga del Home móvil ni de TBT global. Estas cifras se conservan completas y **no se considera cerrado el rendimiento global**. No se atribuye la variación a la red o al equipo sin evidencia de causalidad.

Esta serie se tomó después del preload y del ajuste del lienzo. Los cambios posteriores de geometría solo afectan al detalle; se midieron por separado en ese recorrido. No se mezclan con las cifras de carga.

La prueba posterior `mobile-final/`, aún con preload sin restricción de pantalla, dio LCP móvil mediano 5,770 → 6,970 s y TBT 303,5 → 274,5 ms. Se restringió entonces el preload a escritorio: no hay evidencia suficiente para promover esa decoración en móvil. La serie adicional `mobile-scoped-final/` quedó incompleta al solicitar el usuario cerrar las mediciones y subir las mejoras; no se calcula una mediana ni se afirma una mejora móvil con esa serie. Las cifras de escritorio anteriores conservan la misma política efectiva de carga que la versión entregada; no se presentan como otra medición posterior a ese último atributo.

## Reveal y scroll

La traza localiza una lectura costosa de `getBoundingClientRect` en el efecto de la escena del sabor, dentro del commit de React: 76,6 ms de muestras de CPU en una grabación de tres cambios. Ese dato es de una muestra y no equivale al tiempo total de una interacción.

Serie final `geometry-final/`: tres grabaciones alternadas por versión, cada una con tres cambios de sabor. Scripting y Paint se calculan como unión de intervalos del hilo principal, sin sumar dos veces eventos anidados.

| Reveal móvil CPU 4× | 3AP | 3AQ |
| --- | --- | --- |
| Scripting mediano del recorrido | 681,3 ms | 529,1 ms |
| Paint mediano del recorrido | 43,4 ms | 33,0 ms |
| Cadencia rAF mediana | 55,2 Hz | 55,2 Hz |
| Intervalo rAF máximo mediano | 133,4 ms | 133,3 ms |
| Tareas largas por grabación | 3 | 3 |

Se reduce el scripting medido un 22,4% y la pintura del hilo principal un 23,9%, sin demostrar una mejora de cadencia. Persisten picos al seleccionar sabores. rAF y Paint no miden los cuadros efectivamente presentados por la GPU; estos ensayos headless no garantizan 60 FPS en un teléfono físico ni intervalos menores de 20 ms.

La serie anterior a la caché de geometría (`interactions/`) midió tres recorridos de scroll por versión: rAF mediano 57,1 → 58,8 Hz; scripting 288,6 → 270,5 ms; sin tareas largas en ninguno. La mejora es pequeña y variable; no se presenta como una solución definitiva del scroll móvil. Esa serie permite comparar preload/lienzo, no atribuirle beneficios a la caché posterior.

### Experimento descartado

Se probó limitar la herencia del color de sabor a ficha, cabecera y categorías mediante una modificación temporal de CSS en el navegador. No produjo una mejora consistente de los picos. No se incorporó al código. No se simplificaron ni retiraron animaciones para mejorar una puntuación.

## Verificación y límites de entrega

- Build de producción, lint y typecheck correctos.
- 153 pruebas unitarias correctas; las 2 omisiones existentes del CSV externo se mantienen.
- 58 pruebas de navegador correctas y 4 omisiones por dispositivo: sabores, resize, diez cambios rápidos en ambos sentidos, chips, flechas, teclado, swipe, precios/stock/URL, fondo/zoom sin corte, movimiento reducido, precarga vecina, pausa bajo bolsa/buscador, hidratación y navegación sin JavaScript, promociones y partículas.
- La caché de geometría introduce el riesgo de medidas desactualizadas: se observa contenedor y chips y se comprueba el cambio de viewport en ambos proyectos de Playwright. Interrumpir una transición conserva la lectura de su posición real.
- El siguiente cuello de botella es la actualización de estilos/composición durante el reveal y la carga/hidratación inicial móvil. Quedan pendientes una optimización específica y validación en hardware físico; no se da por resuelto a partir de las mejoras parciales de esta entrega.

## Evidencias

Artefactos fuera del repositorio, en `C:/tmp/stylo-3aq/`, sin archivos de entorno:

- `paired/`: 12 informes Lighthouse JSON/HTML, trazas y registros de red de la comparación 3AO/3AP.
- `final/`: 12 informes Lighthouse JSON/HTML y `medians.json` de la comparación de carga 3AP/3AQ.
- `interactions/`: tres recorridos de scroll/reveal por versión, perfiles CPU, trazas y errores de página.
- `geometry-final/`: tres recorridos finales de reveal por versión, perfiles CPU, trazas y capturas.
- `scoped-experiment/`: experimento descartado, conservado para distinguirlo de la versión entregada.
- `visual/`: Home y catálogo entre 320 y 1440 px, sin errores de página ni desbordamiento en las capturas; primeras imágenes comprobadas cargadas y cuadradas. Se revisaron Home 375, catálogo 375/1440 y ficha móvil de `geometry-final/`.
- `mobile-final/`: seis mediciones móviles con preload sin restricción, conservadas como experimento; `mobile-scoped-final/` es una serie interrumpida, no una comparación final válida.

No se hicieron compras, reservas ni escrituras en Supabase. Se cierra la investigación adicional por pedido del usuario y se consolidan las mejoras verificadas para su integración autorizada a `main`. Persisten los límites de rendimiento indicados arriba.
