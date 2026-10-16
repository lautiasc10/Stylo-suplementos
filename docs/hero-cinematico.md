# Hero cinematográfico — 16 de octubre de 2026

Implementación acotada a la portada. Los clips de Kling y el SVG oficial fueron entregados por el usuario. Las versiones para reproducción se preparan localmente, sin generaciones pagas ni dependencias nuevas. Esta revisión prioriza la fluidez y simplifica la presentación anterior.

## Composición y ritmo

El scoop mantiene su encuadre completo y reproduce movimiento nativo a 60 fps, con cuadros intermedios calculados fuera del navegador desde el original de 24 fps. Se elimina el desplazamiento CSS del último cuadro congelado. Durante los últimos 750 ms comienza un fundido de 700 ms mientras el video sigue reproduciéndose; al terminar se libera el reproductor. No se recorta ni se separa el scoop del polvo.

La marca horizontal conserva el SVG oficial, su transparencia y sus proporciones, en una presentación más contenida de hasta 480 px antes de la escala de composición. Aparece al 10 % del clip y permanece legible antes de fundirse con el león en la misma zona derecha. No se animan sus trazos ni se mezclan sus colores con el fondo.

A 1,5 segundos del final empieza el polvo persistente. A 1,15 segundos del final empieza el león, con un único revelado de opacidad de 1,8 segundos. Se retiran la máscara SVG independiente de los ojos, los modos de mezcla `screen` y la salida artificial hacia arriba. El nuevo póster y el primer fotograma interactivo corresponden a la misma pose del clip, mirando a la derecha (cuadro 81, unos 0,849 s); no se espeja la imagen. El póster sostiene el relevo mientras termina el scoop: el decodificador interactivo del león se prepara después de liberar el del scoop, evitando que compitan durante la reproducción.

La mirada responde al cursor al completar el revelado. Conserva el mapeo horizontal y la curva Hermite del cruce frontal, el acumulador fraccionario y una sola búsqueda pendiente; no actualiza React por movimiento. El video está pausado y se busca dentro de cada fotograma. Los cuadros intermedios del león están preparados en el MP4 a 96 fps; no se calculan en la visita. El material original no permite seguimiento vertical.

El fin real de la animación del león inicia línea chica, título y subtítulo a los 0, 180 y 520 ms. Entran «Ver destacados» a los 1000 ms y «Explorar tienda» a los 1220 ms, manteniendo la acción principal a la izquierda. La navegación se habilita a los 1900 ms. La presentación dura unos 6,6 segundos desde el inicio de reproducción; la transferencia y preparación inicial dependen de la conexión y del equipo. El usuario puede adelantarla mediante Tab, Escape o scroll en cualquier momento.

## Tipografía y dorado

Barlow Condensed 700 en el título e Inter para cuerpo y acciones. El título aumenta un 20 %: `clamp(3rem, 7.2vw, 6.6rem)`, interlínea 1,05. «versión.» y «Explorar tienda» usan `--brand-gold-gradient`, con los cinco colores del SVG: `#a97532`, `#c58d42`, `#f2bc65`, `#ffd788` y `#bd8640`. Los botones compartidos `.button-gold` también usan ese token. El color de texto del botón sigue oscuro. El modo de colores forzados conserva el título y los bordes de la acción mediante colores del sistema.

Los textos comerciales permanecen en `hero-copy.ts`. La afirmación de envíos y marcas sigue pendiente de confirmación del dueño antes de publicar. No se modifica información de productos, promociones, stock, permisos ni pagos.

## Presentación única y alternativas

`HomeIntroProvider` conserva la presentación una vez por sesión de pestaña mediante `stylo.home-intro-seen.v1`. Volver con el logo a `/#inicio` o recargar no repite el scoop ni oculta nuevamente la navegación. Entrar primero a una ruta interior tampoco introduce una presentación al volver. Sin almacenamiento se conserva la memoria del layout.

En celular, sin JavaScript, con movimiento reducido, ahorro de datos o conexión 2G/3G detectada se muestra la portada estática, con texto y enlaces disponibles. La preferencia de movimiento reducido se atiende también en vivo. Tab antes de hidratar, Escape, scroll, pestaña oculta o error de medios liberan inmediatamente la espera. El HTML inicial no contiene controles `inert`; la mejora cinematográfica se activa después de hidratar.

Se conservan los enlaces reales, el orden de foco y el acceso a la búsqueda con Ctrl/Cmd K. Las transiciones solo afectan opacidad y transformación, sin animar dimensiones ni desplazar el contenido. El hero continúa disponible sin JavaScript.

## Partículas y categorías

El polvo del hero mantiene hasta 440 motas y 16 parches de bruma, con texturas preparadas una vez y hasta 30 actualizaciones por segundo. La superficie del canvas se limita ahora a 1600 × 900, incluso con DPR alto o pantallas 4K. El bucle se suspende fuera de pantalla, en pestañas ocultas o mediante su control accesible; se limpia al abandonar la ruta.

El mega menú conserva su fondo de partículas en páginas sin escena de sabor. Se retira su botón de pausa, como pidió el usuario: su movimiento decorativo dura cuatro segundos y se detiene, dejando visible el fondo estático. El canvas solo existe mientras el panel está abierto; no añade videos ni otras descargas. Movimiento reducido lo omite. Las fichas de sabores conservan sus fondos y colores.

## Recursos y caché

| Recurso | Archivo público | Entrega |
| --- | --- | --- |
| León interactivo | `stylo-lion-motion-v3.mp4` | 1916 × 1080, 96 fps, H.264, 6.499.065 bytes; GOP 8, sin B-frames, CRF 17 y `faststart`. |
| Póster orientado a la derecha | `stylo-lion-poster-right-v1.webp` | 1916 × 1080, 102.280 bytes; cuadro 81 del mismo clip, WebP calidad 88. |
| Scoop y polvo completos | `stylo-scoop-intro-v3.mp4` | 1280 × 722, 60 fps, H.264, 2.112.998 bytes; unos 3,97 segundos, sin audio; CRF 17, GOP 60, `yuv420p`, `faststart`. |
| Marca | `/branding/stylo-suplementos.svg` | Archivo oficial transparente, sin modificar. |
| Polvo | Canvas 2D local | Sin descarga adicional. |

El scoop original `kling_20261015_VIDEO_A_cinemati_2830_0.mp4` pesa 8.106.162 bytes. La nueva entrega se obtiene con FFmpeg: `scale=1280:-2,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:me=epzs:vsbmc=1`, libx264, preset medium y CRF 17. Conserva el encuadre y reduce un 37 % el peso frente a la entrega anterior de 3.361.137 bytes. Los dos MP4 activos suman 8,61 MB en la primera visita animada de escritorio. La interpolación mejora la cadencia del original; no equivale a una filmación nativa a 60 fps.

Los recursos públicos de `/visuals` llevan nombres versionados y caché de un año (`public, max-age=31536000, immutable`). Cualquier edición posterior debe publicarse con un nombre nuevo. Los archivos anteriores se mantienen para visitas con código en caché, pero la home actual no los solicita. Esto no cambia la caché privada de administración ni de datos comerciales.

La entrada se descarga completa antes de reproducirse, con límite de tamaño, cancelación y plazos de respaldo. Después se libera su fuente, eventos y URL de blob. La mirada libera su reproductor y observadores al salir de la ruta o activar movimiento reducido. No se retienen fotogramas en JavaScript.

## Verificación de esta revisión

Compilación de producción y 67 pruebas unitarias correctas. Pasaron 43 recorridos de navegador de hero, categorías y búsqueda, entre escritorio y móvil. Incluyen seguimiento rápido/lento, cruce frontal, relevo sin congelar el scoop, marca proporcionada, orientación inicial, orden de textos y botones, presentación única, fallos, teclado, foco, movimiento reducido y navegación sin JavaScript.

Revisión visual en Chromium a 1868 × 943, 1280 × 720, 390 × 844 y 320 × 568: sin errores de página ni desbordamiento horizontal. En móvil no se montan videos. Capturas: [hero escritorio](previews/hero-fluido-1868.jpg), [hero móvil](previews/hero-fluido-390.jpg) y [presentación de marca](previews/hero-intro-fluido-1868.jpg).

Medición local de producción en Chromium a 1868 × 943, sin capturas durante la reproducción: intervalo entre cuadros presentados de 16,7 ms en la mediana y 16,8 ms en p95, frente a la cadencia del original de 24 fps. `getVideoPlaybackQuality` registró 2 cuadros descartados de 238 y no hubo reanudaciones por atasco durante la entrada. El único trabajo largo registrado (59 ms) ocurrió antes de comenzar la reproducción; CLS fue 0. La navegación se habilitó unos 6,64 segundos después de empezar el scoop. Una medición separada de la mirada con partículas activas registró búsquedas de 22,7 ms en la mediana y 35,6 ms en p95. Estos resultados no son una garantía para todos los equipos ni sustituyen Safari/iOS o dispositivos físicos.

Las comprobaciones adicionales confirmaron cero solicitudes de MP4 con ahorro de datos o 3G detectado, texto y acción legibles en colores forzados, y respuesta HTTP 200 con caché inmutable de un año para el nuevo scoop. Los cinco colores del degradado mantienen una relación de contraste de al menos 5,12:1 respecto al texto oscuro `#050505` de la acción principal.

### Historial de verificaciones anteriores

Compilación y TypeScript correctos. Las pruebas específicas cubren mirada, cambio rápido de dirección, cruce frontal, reproducción única del scoop, persistencia del polvo, pausa y reanudación con teclado, fallo de descarga, enlaces, movimiento reducido y navegación sin JavaScript. Las tres pruebas unitarias del control verifican que el mapeo sea monótono, conserve las poses laterales y cruce el centro con velocidad continua. La suite unitaria completa reúne 61 pruebas aprobadas.

Revisión visual en Chromium a 1868 × 1050, 1440 × 900, 1280 × 720, 390 × 844 y 320 × 568: sin errores de página ni desbordes. El fondo se solicitó una vez en cada escenario de escritorio y ninguna en móvil. El león siguió respondiendo durante la reproducción del scoop. Las búsquedas registraron promedios de 37–39 ms con y sin fondo en esta prueba local; no representan una garantía para otros equipos ni una medición de usuarios reales.

En una ventana de 1440 × 900, la revisión posterior al video `2026-10-15 15-18-19.mkv` presentó 16 fotogramas consecutivos durante un barrido del cruce frontal, sin saltos ni inversiones en ese recorrido. Con el polvo activo, las búsquedas promediaron 38 ms y los callbacks de animación registraron 0,2 ms en el percentil 95 y 0,4 ms de máximo en esa medición local. Estos resultados tampoco sustituyen pruebas en otros equipos o dispositivos físicos.

La revisión posterior al video `2026-10-15 15-36-20.mkv` añade un recorrido lento del 67 % al 73 % de la pantalla durante casi seis segundos. En la misma ventana local de 1440 × 900, `v2` presentó cinco poses y `v3` presentó 19 consecutivas. El paso temporal máximo pasó de 41,67 a 10,42 ms; las búsquedas promediaron 21,8 ms con el polvo nuevo activo. Los callbacks midieron 0,5 ms en el percentil 95 y 0,8 ms de máximo en esa prueba. La medición no equivale a una garantía para todos los equipos. La prueba de navegador comprueba además la luminosidad real del canvas sobre negro después de la entrada, para que un canvas animado pero prácticamente invisible no vuelva a pasar como resultado válido.

La entrada de cabecera y el fondo de categorías se verificaron con compilación, 61 pruebas unitarias y 29 recorridos de navegador aprobados entre hero, menú y fichas de sabor. Incluyen esperar al final real, igualdad de las medidas del hero antes/después, transparencia, limpieza al cerrar, pausa, teclado, colores por variante, carrito, ausencia de nuevos videos fuera de la home y alternativa sin JavaScript. La revisión visual a 1868 × 1050, 1280 × 720, 390 × 844 y 320 × 568 no registró errores ni desbordes; el hero empieza en Y=0 en escritorio y bajo los 146 px de navegación en móvil. Los desplazamientos acumulados medidos durante carga y escritura fueron inferiores a 0,00002 en esas ventanas de escritorio y cero en móvil; son resultados locales, no datos de campo.

La secuencia de renglones y la vuelta con el logo se verificaron después con compilación, las 61 pruebas unitarias y 17 recorridos de hero y menú aprobados en escritorio/móvil. Se registran las seis señales y su tiempo del video; se cubren la vuelta desde catálogo tras usar `#categorias`, desde otra página y desde el pie de la misma home, además del regreso sin JavaScript. En la revisión local a 1868 × 1050 las señales ocurrieron a 0, 0,87, 2,06, 2,89, 3,27 y 3,68 segundos. Las vistas a 1868, 1280, 390 y 320 px no registraron errores, desbordes ni desplazamientos de diseño durante esta revisión (CLS de laboratorio: 0). No se añadieron recursos ni dependencias.

La revisión de presentación única, orden invertido de acciones y aparición tardía del león pasó la compilación, las 61 pruebas unitarias y 22 recorridos de navegador entre hero y menú. Se comprueba que regresar y recargar no pidan el scoop, que la cabecera vuelva sin transición, que el león siga oculto mientras se reproduce la entrada y alcance opacidad completa después, que cada botón se revele en el orden solicitado y mantenga fondo transparente, y que restaurar la preferencia de movimiento active el polvo sin repetir la presentación. El caso de navegación pendiente usa una respuesta de catálogo retenida para comprobar que un clic posterior en el logo la cancela. No se modificaron los MP4 ni se añadieron dependencias.

La secuencia posterior de scoop, silueta, contenido y navegación se verificó con compilación, 61 pruebas unitarias y 22 recorridos de navegador. Las comprobaciones registran el final real de la aparición del león, el orden de las seis entradas y la espera de navegación; también comprueban que el scoop se desplace lateralmente conservando escala, que haya superposición entre polvo y silueta, y que el hero conserve sus medidas. En la revisión visual local a 1868 × 1050, la salida comenzó a los 2,77 segundos del video, la silueta a los 2,97 y la bienvenida unos 2,45 segundos después. El navbar se habilitó al terminar los textos y botones. No hubo errores de página, desbordes ni desplazamientos de diseño (CLS local: 0). Las vistas de 390 y 320 px conservaron la alternativa estática, sin pedir videos ni desbordar. Los archivos de medios permanecen intactos.


## Revisión tipográfica y comercial del 15 de octubre

El hero conserva la secuencia de scoop, ojos, león y partículas. El texto pasa a una línea chica de marca, título real h1 «Potenciá tu mejor versión.» y subtítulo editable en `src/components/storefront/hero-copy.ts`. El contenido solicitado sobre marcas y envíos necesita confirmación del dueño antes de publicar. Barlow Condensed 600/700 se aplica a titulares e Inter al cuerpo; next/font sirve los archivos localmente. El título usa clamp(2.5rem, 6vw, 5.5rem), interlínea 1,05.

Desde el final real del león, las cinco entradas ocurren a los 0, 350, 950, 1400 y 1680 ms. El secundario «Ver destacados» apunta a `#destacados`; el principal «Explorar tienda» lleva a la tienda, con relleno dorado y texto oscuro. La navegación continúa a los 2300 ms y la sesión conserva la presentación única. El móvil oculta la fila horizontal de categorías y usa un menú nativo con lista vertical; la búsqueda nativa junto al carrito usa el formulario GET existente. El isotipo mantiene el archivo y trazos oficiales, con el fondo negro vuelto transparente en su presentación SVG; el nombre usa la alternativa de texto expresamente solicitada.

Debajo aparecen Productos destacados, Novedades y Promociones, en el orden confirmado. Novedades usa etiquetas editoriales nuevo/novedad/novedades; no se inventan fechas ni productos. Destacados reutiliza el indicador existente. Promociones muestra solo ofertas comprables y vigentes calculadas con las mismas reglas del catálogo. El mega menú muestra hasta tres productos de su categoría, conserva la variante y usa el carrito actual. En vista previa usa exclusivamente sus datos locales.

Capturas de la revisión con datos del proyecto: [inicio de escritorio](previews/inicio-tipografia-1868.jpg), [inicio móvil](previews/inicio-tipografia-390.jpg) y [colección de destacados](previews/colecciones-inicio-1868.jpg). Se revisaron 320, 390, 768, 1280 y 1868 px sin desbordamientos, y las alternativas sin JavaScript y movimiento reducido. La prueba local de Agregar desde el menú confirmó producto, variante y precios del carrito, sin crear pedidos, reservar stock ni registrar cobros. Estas comprobaciones en Chromium no acreditan Safari/iOS físicos ni pagos completos.

Validación de esta revisión: compilación de producción y 63 pruebas unitarias/PostgreSQL aprobadas. Los recorridos Chromium revisaron hero, secuencia única, mirada, navegación, buscador con/sin JavaScript, categorías, variantes, catálogo, carrito, promociones, editor administrativo y movimiento reducido. Se añadió una prueba de Agregar desde el mega menú con aislamiento de vista previa y retorno del foco al cerrar el carrito. Las comprobaciones de precios y variante de la ficha se acotan al contenido principal porque el menú ahora también contiene precios y formularios de compra.


La revisión con SVG y búsqueda reemplaza el nombre horizontal por el archivo transparente entregado por el dueño, conserva el isotipo y retira la cursiva de la alternativa tipográfica. Se suavizan el fundido del cuerpo y el cruce con ojos, y los textos pasan a capas de renglón. Las entradas usan ahora 0/180/520/1000/1220 ms y navegación a 1900 ms desde el final del león. La cabecera recorre 18 px en lugar de 160 px. Ctrl/Cmd K permite buscar durante la presentación, que queda consumida sin reiniciarse al cerrar. Detalles y pruebas: [búsqueda y revisión visual](busqueda.md).
