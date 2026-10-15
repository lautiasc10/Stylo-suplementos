# Hero cinematográfico — 15 de octubre de 2026

Implementación acotada a la portada. La referencia de Mainframe fue proporcionada por el usuario como grabación; los dos clips de Kling también fueron entregados por él. No se descargaron recursos de esa referencia ni se generaron videos nuevos.

## Composición e interacción

El león ocupa la derecha y se encuadra completo con `contain`. Su mirada frontal está calibrada al 70 % del ancho de la pantalla. La posición horizontal del cursor selecciona un fotograma, con una transición breve entre destinos, una sola búsqueda pendiente y sin actualizar React por movimiento. El video permanece pausado. La representación no incorpora seguimiento vertical que el clip original no contiene.

La corrección del cruce frontal conserva el movimiento lateral existente y une las pendientes centrales con curvas Hermite de velocidad continua. El filtro mantiene un acumulador fraccionario, sin el salto directo al destino que antes aparecía cerca del reposo. La pose neutral se calcula de forma estable sobre el fotograma 48 y las búsquedas apuntan al interior de cada cuadro, evitando ambigüedades en límites exactos de fotogramas clave. El recurso original de 24 fps no se recodificó ni se agrandó para esta corrección.

La entrada de scoop y polvo aparece tenue debajo del texto y por la zona inferior del león. Una máscara limita su presencia detrás de la información; la mezcla `screen` permite combinar los fondos negros sin dibujar otro león ni alterar los archivos de marca. La entrada comienza a desaparecer durante los últimos 750 ms del clip y libera su video antes de cinco segundos. El scoop no se repite al mover el mouse.

Durante ese fundido aparece una capa independiente de polvo fino que continúa flotando por todo el hero. `HeroDust` dibuja entre 50 y 120 motas con una textura de grano de 40 × 40 px generada localmente. Varían profundidad, tamaño y deriva, sin destellos ni parpadeos. La intensidad baja alrededor de los textos y del rostro. Las motas se reciclan fuera del encuadre para evitar un corte de bucle. Esta capa no descarga imágenes ni videos y no representa el último fotograma del scoop congelado.

Como el polvo permanece en movimiento, hay un botón circular de 48 px con nombre accesible para pausar y reanudar, también con teclado. La pausa conserva las posiciones y la reanudación no recupera de golpe el tiempo transcurrido. Con movimiento reducido, celular, ahorro de datos o sin JavaScript se mantiene la portada estática y no aparece el control.

Los clips conservan las marcas de agua incluidas en los originales del usuario. No se modificaron las fotografías comerciales ni los logos del encabezado.

## Recursos

| Recurso | Archivo público | Entrega |
| --- | --- | --- |
| León interactivo | `stylo-lion-motion-v2.mp4` | 1916 × 1080, 24 fps, H.264, 4.544.783 bytes; fotograma clave cada cuatro cuadros. |
| Póster del león | `stylo-lion-poster-v1.webp` | 50.798 bytes, extraído del clip; se sirve directamente para evitar una segunda compresión. |
| Entrada de scoop | `stylo-scoop-intro-v1.mp4` | 1916 × 1080, 24 fps, H.264, 3.361.137 bytes; unos 4,04 segundos, sin audio. |
| Polvo persistente | Canvas 2D local | Sin descarga; hasta 120 motas, 30 actualizaciones por segundo y superficie máxima de 1920 × 1080. |

El scoop original `kling_20261015_VIDEO_A_cinemati_2830_0.mp4` pesa 8.106.162 bytes. La copia local se codificó con FFmpeg/libx264, preset medium, CRF 18, GOP 24, `yuv420p` y `faststart`, conservando resolución y frecuencia. Se redujo aproximadamente un 59 % el peso. Los dos MP4 suman 7,91 MB en una visita animada completa; el fondo no forma parte de la carga móvil.

## Carga y ciclo de vida

- `HeroAtmosphere` solo se monta cuando el león ya presenta un fotograma y el equipo admite la interacción de escritorio.
- Espera disponibilidad del navegador y presencia suficiente del hero. La petición adicional usa prioridad baja y un límite de 3,5 MB.
- Descarga el clip completo antes de reproducirlo para evitar pausas causadas por transferencia durante la entrada. La carga tiene plazos; si falla, se descarta la decoración.
- No solicita el fondo con movimiento reducido, ahorro de datos, conexiones 2G/3G detectadas, celular ni sin JavaScript. La ausencia de soporte de mezcla o máscara conserva la portada existente.
- Salir del escenario u ocultar la pestaña cancela la entrada. No se reproduce tardíamente al volver.
- Al finalizar o abandonar la ruta se cancelan solicitudes y callbacks, se retiran observadores y eventos, se descarga el reproductor y se revoca la URL del blob.
- El polvo persiste después del video y suspende su bucle al salir de pantalla, ocultar la pestaña o pausarlo. Se limpia al abandonar la ruta. El tamaño de la superficie se limita incluso con DPR alto o monitores 4K; no se crean gradientes ni filtros en cada cuadro.

## Verificación

Compilación y TypeScript correctos. Las pruebas específicas cubren mirada, cambio rápido de dirección, cruce frontal, reproducción única del scoop, persistencia del polvo, pausa y reanudación con teclado, fallo de descarga, enlaces, movimiento reducido y navegación sin JavaScript. Las tres pruebas unitarias del control verifican que el mapeo sea monótono, conserve las poses laterales y cruce el centro con velocidad continua. La suite unitaria completa reúne 61 pruebas aprobadas.

Revisión visual en Chromium a 1868 × 1050, 1440 × 900, 1280 × 720, 390 × 844 y 320 × 568: sin errores de página ni desbordes. El fondo se solicitó una vez en cada escenario de escritorio y ninguna en móvil. El león siguió respondiendo durante la reproducción del scoop. Las búsquedas registraron promedios de 37–39 ms con y sin fondo en esta prueba local; no representan una garantía para otros equipos ni una medición de usuarios reales.

En una ventana de 1440 × 900, la revisión posterior al video `2026-10-15 15-18-19.mkv` presentó 16 fotogramas consecutivos durante un barrido del cruce frontal, sin saltos ni inversiones en ese recorrido. Con el polvo activo, las búsquedas promediaron 38 ms y los callbacks de animación registraron 0,2 ms en el percentil 95 y 0,4 ms de máximo en esa medición local. Estos resultados tampoco sustituyen pruebas en otros equipos o dispositivos físicos.
