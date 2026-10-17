# Hero — adaptación del código de referencia

Revisión del 16 de octubre de 2026. El usuario aportó el ZIP de protein-powerhouse-hub y pidió aplicar su hero conservando el navbar y las categorías superiores de STYLO. La implementación toma LionHero.tsx y styles.css como referencia; no ejecuta ni incorpora sus archivos de configuración, reportes, instrucciones AGENTS o dependencias.

## Composición y fuentes

El escenario centra el león y pone el título detrás. Se conserva la frase aprobada «Potenciá tu mejor versión.»: primera línea en contorno y segunda en degradado dorado. Anton 400 reproduce la tipografía del ejemplo sin negrita sintética; Manrope se usa en texto y botones del hero. Ambas se sirven con next/font/google desde el componente de portada. Barlow Condensed e Inter permanecen en el resto de la web, incluida la cabecera.

Se incorporan el grano estático, el ascenso de las líneas, el degradado que recorre el texto, los botones rectos y la cinta de la referencia. La cinta contiene Proteína, Creatina, Pre-entreno, Aminoácidos, Colágeno y el mensaje de envíos suministrado por el usuario; las categorías conservan enlaces funcionales y el mensaje de envíos es texto. El grupo duplicado no agrega pasos al teclado ni al lector de pantalla. Hover pausa la cinta; foco visible habilita su navegación manual. La pausa compartida y el movimiento reducido detienen el movimiento continuo.

El titular permanece parcialmente cubierto por el león en escritorio, como en la referencia. En celular queda por encima de la ilustración para conservar su lectura. El navbar, el logo oficial, el carrito, la búsqueda y las categorías superiores mantienen estructura, fuentes y navegación. Se conserva el contenido comercial existente; las afirmaciones de marcas y alcance de envíos siguen pendientes de confirmación antes de publicar.

## Movimiento compartido

HeroAmbience coordina partículas, luz y parallax mediante un solo requestAnimationFrame, sin actualizaciones de React por cuadro. La amortiguación reproduce el factor 0,06 a 60 Hz, ajustado por tiempo para otras pantallas. El texto recorre hasta ±15 px horizontalmente y ±10 px verticalmente en sentido contrario al mouse; el león se inclina hasta ±4°/±5°. La luz es un gradiente radial estático que se desplaza mediante transformaciones.

El polvo anterior de la portada se reemplaza por 90 partículas puntuales de dos tonos dorados, con ascenso, oscilación y desplazamiento por profundidad; en dispositivos táctiles son 35. La superficie está limitada a 1600 × 1000 y DPR 1,5. No hay nube de bruma ni imágenes de textura animadas. Los fondos de categorías y ganadores de masa conservan su implementación anterior.

El controlador suspende la actividad fuera de pantalla, con pestaña oculta, pausa manual o movimiento reducido. ResizeObserver mide la escena; los eventos de movimiento no fuerzan lecturas de geometría. Al salir de la ruta se cancelan callbacks y se retiran listeners y observers. Sin JavaScript quedan título, foto y acciones visibles. Móvil conserva el león estático y no descarga su video.

## Recurso del león

Se mantiene stylo-lion-motion-v3.mp4 y su póster derecho, sin reexportar, reducir su resolución ni generar medios. El giro continuo conserva la búsqueda coalescida y la amortiguación; el frente ahora corresponde al centro de pantalla (0,5), acorde con la nueva posición. La pose inicial del video coincide con el póster (aproximadamente 0,849 segundos). Se confirma antes del relevo y nunca se funden dos poses.

La referencia cruza dos imágenes durante 700 ms. Esa parte se conserva mediante el video existente, como se acordó con el usuario, evitando la duplicación de caras. El mate del video utiliza una máscara de borde suave en la presentación. Se retira screen blending porque sumaba el color de las letras sobre la cara. La máscara conserva el centro opaco y suaviza el contorno del medio; no calcula alfa por píxel ni cambia el archivo original. La entrada del león usa escala y opacidad, sin el desenfoque animado de la referencia.

La introducción de scoop y logo sigue retirada. Header y acciones están disponibles desde el HTML inicial; ninguna descarga impone una espera de navegación. La breve entrada visual no se repite al regresar con el logo.

## Verificación

Build de producción y TypeScript correctos; 69 pruebas unitarias aprobadas. Lint sin errores nuevos y con cuatro advertencias anteriores en gestión y galería. La batería de navegación comprende 59 casos aprobados y 17 omitidos por corresponder al perfil contrario de escritorio/celular. Incluye fuentes y aislamiento del navbar, parallax inverso, pausa y movimiento reducido, mirada y cruce frontal, relevo del póster, cargas lentas, fallos de medios, cinta con teclado y mouse, categorías superiores, búsqueda, retorno con logo y navegación sin JavaScript.

Vistas revisadas a 320, 390, 768, 1280 y 1868 px: sin errores de página ni desbordamiento horizontal. Capturas: [1868 px](previews/hero-anton-reference-1868.jpg), [1280 px](previews/hero-anton-reference-1280.jpg), [768 px](previews/hero-anton-reference-768.jpg), [390 px](previews/hero-anton-reference-390.jpg) y [320 px](previews/hero-anton-reference-320.jpg).

Muestra local de producción de 3,5 segundos a 1868 × 943 con el cursor en movimiento, sin capturas durante el muestreo: mediana de intervalos de callbacks de 16,7 ms y p95 de 49,9 ms; sin tareas largas durante esa muestra y CLS 0. Con CPU ×4: mediana 33,3 ms, p95 50 ms y una tarea de 58 ms; CLS 0. Las muestras cortas varían con la carga del equipo. Hay cuadros demorados: estos datos no acreditan 60 fps constantes y requieren validación en hardware físico, especialmente Safari/iOS. No se atribuye a esta prueba un rendimiento universal.
