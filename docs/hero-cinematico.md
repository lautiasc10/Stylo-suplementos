# Hero cinematográfico — 15 de octubre de 2026

Implementación acotada a la portada. La referencia de Mainframe fue proporcionada por el usuario como grabación; los dos clips de Kling también fueron entregados por él. No se descargaron recursos de esa referencia ni se generaron videos nuevos.

## Composición e interacción

El león ocupa la derecha y se encuadra completo con `contain`. Su mirada frontal está calibrada al 70 % del ancho de la pantalla. La posición horizontal del cursor selecciona un fotograma, con una transición breve entre destinos, una sola búsqueda pendiente y sin actualizar React por movimiento. El video permanece pausado. La representación no incorpora seguimiento vertical que el clip original no contiene.

La corrección del cruce frontal conserva el recorrido lateral existente y une las pendientes centrales con curvas Hermite de velocidad continua. El filtro mantiene un acumulador fraccionario, sin el salto directo al destino que antes aparecía cerca del reposo. La pose neutral sigue calibrada sobre el segundo 2 del original. Las búsquedas apuntan al interior de cada cuadro, evitando ambigüedades en límites exactos de fotogramas clave.

La revisión posterior al movimiento muy lento detectó que los pasos del original de 24 fps seguían siendo visibles cerca del frente. La versión `v3` parte del MP4 original del usuario y calcula fotogramas intermedios mediante compensación de movimiento de FFmpeg (`minterpolate`, MCI, AOBMC, estimación bidireccional EPZS y VSBMC). Conserva 1916 × 1080 y 4,04 segundos, con 388 cuadros a 96 fps; no usa un fundido entre dos caras ni duplica cuadros para simular interpolación. Es una preparación local del recurso, sin procesamiento de flujo óptico en el navegador ni generaciones pagas. El control usa esa precisión temporal mayor y sigue pausando el video entre búsquedas; esto no promete una presentación de 96 fps en pantalla.

La entrada de scoop y polvo aparece tenue debajo del texto y por la zona inferior del león. Una máscara limita su presencia detrás de la información; la mezcla `screen` permite combinar los fondos negros sin dibujar otro león ni alterar los archivos de marca. La entrada comienza a desaparecer durante los últimos 750 ms del clip y libera su video antes de cinco segundos. El scoop no se repite al mover el mouse.

El polvo independiente comienza a aparecer 1,6 segundos antes del final de la entrada, mientras el polvo filmado todavía es visible. El fundido de 900 ms evita dejar un intervalo negro al retirarse el scoop. `HeroDust` dibuja entre 220 y 440 motas con una textura de grano de 40 × 40 px y 16 parches de bruma con una segunda textura de 192 × 128 px, ambas generadas localmente una vez. Se amplían la huella y el contraste de los granos para que sobrevivan sobre negro y en una grabación comprimida. Varían profundidad, tamaño y deriva, sin destellos ni parpadeos. La intensidad baja alrededor de los textos y del rostro. Las motas y los parches se reciclan completamente fuera del encuadre para evitar un corte de bucle. Esta capa no descarga imágenes ni videos y no representa el último fotograma del scoop congelado.

Como el polvo permanece en movimiento, hay un botón circular de 48 px con nombre accesible para pausar y reanudar, también con teclado. La pausa conserva las posiciones y la reanudación no recupera de golpe el tiempo transcurrido. Con movimiento reducido, celular, ahorro de datos o sin JavaScript se mantiene la portada estática y no aparece el control.

Los clips conservan las marcas de agua incluidas en los originales del usuario. No se modificaron las fotografías comerciales ni los logos del encabezado.

## Entrada de la navegación y categorías

La home de escritorio empieza en el borde superior y ocupa al menos un viewport. Cabecera de 96 px y categorías de 50 px se superponen al campo de partículas, sin superficies opacas. El león y el scoop conservan un área bajo esa navegación. La franja de Rosario se retira de toda la tienda.

`HomeIntroProvider` comparte únicamente el estado de espera visual entre cabecera y hero. La aparición del polvo (`onSettled`) y el final de la entrada (`onComplete`) son señales independientes: la navegación espera a la segunda. Entra con opacidad y desplazamiento durante 760 ms, con 100 ms de desfase para categorías. No se anima altura ni se mueve el contenido. Durante la espera se ocultan las superficies y se usa `inert` para evitar foco invisible.

No se exige esperar para comprar: las acciones HTML del hero siguen disponibles; Tab, Escape y scroll adelantan la navegación. Con un error, medios omitidos o un plazo de respaldo de 8,5 segundos se libera la espera. En móvil, con movimiento reducido y sin JavaScript la cabecera está disponible inmediatamente. La alternativa sin JavaScript conserva enlaces y foco: el HTML inicial no contiene `inert` y un bloque `noscript` desactiva la ocultación visual.

El menú de categorías comparte `HeroDust` con configuración `menu`, hasta 180 granos y ocho parches; se monta solo al abrir, se pausa al ocultar pestaña y libera canvas, observadores y callbacks al cerrar. No añade solicitudes de medios. Un control propio permite pausarlo con teclado. En las fichas que ya presentan `.flavor-product-detail` se excluye el canvas y el menú hereda el color actual de Banana, Frutilla, Vainilla o neutral. Esta entrega no amplía aún la prueba de sabores a otros productos.

## Recursos

| Recurso | Archivo público | Entrega |
| --- | --- | --- |
| León interactivo | `stylo-lion-motion-v3.mp4` | 1916 × 1080, 96 fps, H.264, 6.499.065 bytes; GOP 8, sin B-frames, CRF 17 y `faststart`. |
| Póster del león | `stylo-lion-poster-v1.webp` | 50.798 bytes, extraído del clip; se sirve directamente para evitar una segunda compresión. |
| Entrada de scoop | `stylo-scoop-intro-v1.mp4` | 1916 × 1080, 24 fps, H.264, 3.361.137 bytes; unos 4,04 segundos, sin audio. |
| Polvo persistente | Canvas 2D local | Sin descarga; hasta 440 motas y 16 parches de bruma, 30 actualizaciones por segundo y superficie máxima de 1920 × 1080. |

El scoop original `kling_20261015_VIDEO_A_cinemati_2830_0.mp4` pesa 8.106.162 bytes. La copia local se codificó con FFmpeg/libx264, preset medium, CRF 18, GOP 24, `yuv420p` y `faststart`, conservando resolución y frecuencia. Se redujo aproximadamente un 59 % el peso. Los dos MP4 activos suman 9,86 MB en una visita animada completa; la mayor precisión del león añade unos 1,95 MB frente a `v2`. La versión anterior permanece disponible para visitas abiertas con código en caché, pero el componente actual solo solicita `v3`. El fondo no forma parte de la carga móvil.

## Carga y ciclo de vida

- `HeroAtmosphere` solo se monta cuando el león ya presenta un fotograma y el equipo admite la interacción de escritorio.
- Espera disponibilidad del navegador y presencia suficiente del hero. La petición adicional usa prioridad baja y un límite de 3,5 MB.
- Descarga el clip completo antes de reproducirlo para evitar pausas causadas por transferencia durante la entrada. La carga tiene plazos; si falla, se descarta la decoración.
- No solicita el fondo con movimiento reducido, ahorro de datos, conexiones 2G/3G detectadas, celular ni sin JavaScript. La ausencia de soporte de mezcla o máscara conserva la portada existente.
- Salir del escenario u ocultar la pestaña cancela la entrada. No se reproduce tardíamente al volver.
- Al finalizar o abandonar la ruta se cancelan solicitudes y callbacks, se retiran observadores y eventos, se descarga el reproductor y se revoca la URL del blob.
- El polvo persiste después del video y suspende su bucle al salir de pantalla, ocultar la pestaña o pausarlo. Se limpia al abandonar la ruta. El tamaño de la superficie se limita incluso con DPR alto o monitores 4K; las dos texturas se preparan una vez, sin crear gradientes ni filtros en cada cuadro.

## Verificación

Compilación y TypeScript correctos. Las pruebas específicas cubren mirada, cambio rápido de dirección, cruce frontal, reproducción única del scoop, persistencia del polvo, pausa y reanudación con teclado, fallo de descarga, enlaces, movimiento reducido y navegación sin JavaScript. Las tres pruebas unitarias del control verifican que el mapeo sea monótono, conserve las poses laterales y cruce el centro con velocidad continua. La suite unitaria completa reúne 61 pruebas aprobadas.

Revisión visual en Chromium a 1868 × 1050, 1440 × 900, 1280 × 720, 390 × 844 y 320 × 568: sin errores de página ni desbordes. El fondo se solicitó una vez en cada escenario de escritorio y ninguna en móvil. El león siguió respondiendo durante la reproducción del scoop. Las búsquedas registraron promedios de 37–39 ms con y sin fondo en esta prueba local; no representan una garantía para otros equipos ni una medición de usuarios reales.

En una ventana de 1440 × 900, la revisión posterior al video `2026-10-15 15-18-19.mkv` presentó 16 fotogramas consecutivos durante un barrido del cruce frontal, sin saltos ni inversiones en ese recorrido. Con el polvo activo, las búsquedas promediaron 38 ms y los callbacks de animación registraron 0,2 ms en el percentil 95 y 0,4 ms de máximo en esa medición local. Estos resultados tampoco sustituyen pruebas en otros equipos o dispositivos físicos.

La revisión posterior al video `2026-10-15 15-36-20.mkv` añade un recorrido lento del 67 % al 73 % de la pantalla durante casi seis segundos. En la misma ventana local de 1440 × 900, `v2` presentó cinco poses y `v3` presentó 19 consecutivas. El paso temporal máximo pasó de 41,67 a 10,42 ms; las búsquedas promediaron 21,8 ms con el polvo nuevo activo. Los callbacks midieron 0,5 ms en el percentil 95 y 0,8 ms de máximo en esa prueba. La medición no equivale a una garantía para todos los equipos. La prueba de navegador comprueba además la luminosidad real del canvas sobre negro después de la entrada, para que un canvas animado pero prácticamente invisible no vuelva a pasar como resultado válido.

La entrada de cabecera y el fondo de categorías se verificaron con compilación, 61 pruebas unitarias y 29 recorridos de navegador aprobados entre hero, menú y fichas de sabor. Incluyen esperar al final real, igualdad de las medidas del hero antes/después, transparencia, limpieza al cerrar, pausa, teclado, colores por variante, carrito, ausencia de nuevos videos fuera de la home y alternativa sin JavaScript. La revisión visual a 1868 × 1050, 1280 × 720, 390 × 844 y 320 × 568 no registró errores ni desbordes; el hero empieza en Y=0 en escritorio y bajo los 146 px de navegación en móvil. Los desplazamientos acumulados medidos durante carga y escritura fueron inferiores a 0,00002 en esas ventanas de escritorio y cero en móvil; son resultados locales, no datos de campo.
