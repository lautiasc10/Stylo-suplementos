# Hero editorial — prueba con león interactivo

Revisión del 16 de octubre de 2026, autorizada por el usuario como prueba. Combina la referencia de león sobre tipografía condensada con los medios existentes de STYLO. Reemplaza la introducción de 1,8 segundos: se retiran HeroAtmosphere, su reloj y el logo animado, conservando los archivos originales. No hay generaciones, gastos, fuentes nuevas ni dependencias adicionales.

## Composición

La frase «Potenciá tu mejor versión.» se presenta completa en tres líneas de Barlow Condensed 700. La primera usa contorno dorado; la segunda, blanco cálido; la última, el degradado de marca. El león ocupa la derecha y la frase queda legible a su izquierda. Descripción y acciones se ubican debajo de la composición. El logo oficial de la cabecera se conserva.

En celular el león se ubica debajo de las tres líneas, con descripción y botones a continuación. Se conserva su proporción y el contenido puede crecer sin recortar acciones. El material cinematográfico no se descarga en dispositivos táctiles pequeños, ahorro de datos, conexiones lentas detectadas o movimiento reducido.

La home recibe las categorías públicas ya leídas por el servidor, conservando su orden. Si no hay catálogo disponible se usan los mismos enlaces de categorías base que la navegación. No hay consultas nuevas. El carrusel inferior recorre dos grupos de idéntico ancho; el duplicado queda fuera del orden de teclado y de los lectores de pantalla. Sus enlaces siguen operativos con mouse. Hover pausa el recorrido; foco desactiva el movimiento y permite desplazar la lista. En celular y sin JavaScript hay una sola lista horizontal manual.

## Presentación inmediata y accesibilidad

Título, imagen, cabecera y botones están visibles en el HTML inicial. La mejora de la primera visita desplaza las líneas 16 px y cambia su opacidad de 0,65 a 1 durante 650 ms, con intervalos de 60 ms; nunca bloquea navegación o compra. Volver con el logo o recargar no repite esa entrada. Se conserva el enlace al inicio y no hay scroll fijado.

El control «Pausar animación del hero» pausa conjuntamente partículas, respiración, carrusel y luz ambiental. Los movimientos se suspenden fuera de pantalla y con pestaña oculta. La preferencia de movimiento reducido responde en vivo: retira video y canvas, elimina la luz y deja categorías y contenido estáticos. Los controles mantienen áreas de 48 px o mayores, foco visible y enlaces HTML reales.

## León y cursor

Se conserva /visuals/stylo-lion-motion-v3.mp4 (1916 × 1080, 96 fps, 6.499.065 bytes) y el póster correspondiente a su pose derecha, /visuals/stylo-lion-poster-right-v1.webp (102.280 bytes). Se muestran como medios originales, sin pasarlos por canvas ni reducir su resolución.

El video permanece pausado y su tiempo sigue la posición horizontal del puntero. Se conservan amortiguación, velocidad acotada, acumulador fraccional y una sola búsqueda pendiente. El compositor confirma la pose inicial mediante requestVideoFrameCallback, con respaldo acotado por seeked. En el mismo render que muestra el video se oculta el póster, sin fundir dos ángulos distintos. Esto evita el doble contorno producido por la superposición de capas; no modifica defectos que ya existan dentro del video.

El mate negro se integra mediante un solo grupo mix-blend-mode: screen. Texto, enlaces y controles quedan fuera del grupo. Un fallo de video conserva el póster y las acciones; tampoco bloquea la carga del resto del hero.

La luz dorada es un único gradiente radial estático. El puntero actualiza un destino y requestAnimationFrame desplaza esa capa mediante translate3d, con amortiguación independiente de la cadencia. No hay estado de React por cuadro, filtros animados ni repintado de gradientes por movimiento. El callback termina al alcanzar el destino; observers y listeners se limpian al salir de la ruta.

## Rendimiento

Se elimina toda solicitud del scoop y se simplifican los estados de entrada. Solo se prepara el video del león. Las partículas conservan la textura de bruma preparada por tamaño, superficie máxima 800 × 480 y hasta 120 motas a 24 Hz. La respiración, el carrusel y la luz usan transformaciones; los medios conservan resolución y caché versionada.

La referencia de video es una guía de composición; su grabación de pantalla no se incorpora a la página. La calidad y continuidad del giro siguen limitadas por los fotogramas del recurso entregado. Esta entrega no acredita 60 fps universales ni mediciones en teléfonos físicos o Safari/iOS.

## Comprobación de la prueba

Compilación de producción y TypeScript correctos. Las 69 pruebas unitarias pasan. Lint no presenta errores; conserva cuatro advertencias anteriores de gestión y galería. Pasan 56 recorridos Chromium de hero, navegación, categorías y búsqueda; se omiten 16 casos exclusivos del perfil contrario de escritorio/celular. Incluyen carga lenta y error de video, ausencia de solicitudes del scoop, relevo del póster, cursor lento por el frente, pausa compartida, enlaces repetidos del carrusel, teclado, retorno con logo, movimiento reducido y navegación sin JavaScript.

Revisión visual a 320, 390, 768, 1280 y 1868 px, sin desbordamiento horizontal ni errores de página. Capturas: [1868 px](previews/hero-editorial-trial-1868.jpg), [1280 px](previews/hero-editorial-trial-1280.jpg), [tablet](previews/hero-editorial-trial-768.jpg), [390 px](previews/hero-editorial-trial-390.jpg) y [320 px](previews/hero-editorial-trial-320.jpg).

Muestra local de producción de 3,5 segundos a 1868 × 943, moviendo el puntero sin tomar capturas durante la medición: intervalo mediano de callbacks de 16,7 ms y percentil 95 de 33,4 ms. Con CPU ×4: mediana 16,7 ms y p95 49,9 ms. No se observaron tareas largas durante esas muestras; CLS 0 desde la carga. Hay cuadros demorados y estos datos no acreditan 60 fps constantes. La composición del video con el polvo continúa siendo el principal costo visual; se redujeron superficie y motas del polvo sin modificar los medios. Pendiente validación en dispositivos físicos y Safari/iOS.
