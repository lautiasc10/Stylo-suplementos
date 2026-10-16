# Hero cinematográfico — entrada de 1,8 segundos

Revisión del 16 de octubre de 2026. Sustituye la secuencia anterior de unos 6,6 segundos por la entrada breve solicitada por el usuario. React coordina un único reloj y CSS anima opacidad y transformaciones; no se añade GSAP ni otra dependencia. Se conservan los archivos originales públicos, los logos oficiales, la tipografía y el dorado de marca.

## Secuencia

Los tiempos se cuentan desde la activación de la mejora tras hidratar; no son una promesa sobre el tiempo de descarga del HTML o JavaScript.

| Tiempo | Presentación |
| --- | --- |
| 0–600 ms | Scoop desde la izquierda, curva `cubic-bezier(0.16, 1, 0.3, 1)`. SVG oficial con opacidad y escala de 0,96 a 1. |
| 600–1200 ms | Aparece el polvo persistente. Scoop y marca se desvanecen; el león emerge mediante opacidad durante 600 ms. |
| 1200 ms | Sale definitivamente el scoop. Entra la línea STYLO SUPLEMENTOS. |
| 1300 / 1400 ms | Entran el título «Potenciá tu mejor versión.» y la descripción. |
| 1500 / 1600 ms | Entran Explorar tienda y Ver destacados, conservando sus ubicaciones. La navegación comienza su aparición de 200 ms a los 1600 ms. |
| 1800 ms | Contenido y acciones asentados. Empieza la respiración del león y se prepara su video interactivo. |

La cascada usa separaciones de 100 ms y apariciones de 200 ms hacia arriba. Los temporizadores compensan el tiempo transcurrido desde el mismo inicio, en lugar de encadenar esperas. Un bloqueo del hilo principal puede demorar cualquier animación del navegador; no se garantiza 60 fps universales.

## Medios y continuidad

`HeroAtmosphere` reutiliza un fragmento del MP4 existente desde aproximadamente 2,2 s, a velocidad normal. No acelera el clip completo, recorta un archivo nuevo ni fabrica cuadros. Su descarga y preparación tienen un presupuesto de 300 ms: si no puede estar listo en el primer tramo, se omite esa decoración. El logo, las partículas, el león y la compra continúan a tiempo; el video no aparece tarde ni reinicia la secuencia. Al llegar a 1200 ms se cancela y libera la entrada.

El póster del león y su primer cuadro corresponden a la misma pose mirando a la derecha, alrededor de 0,849 s. El póster sostiene la presentación mientras se prepara el decodificador interactivo después de los 1800 ms, para evitar competir con la aparición del contenido. Se prefiere confirmación de `requestVideoFrameCallback`; si un compositor omite ese callback en un video transparente, existe un respaldo con `seeked`, datos decodificados y comprobación de posición tras 160 ms. El video se resuelve sobre el póster mediante opacidad de 240 ms.

La revisión del video `2026-10-16 15-50-48.mkv` identificó un mate negro opaco que tapaba el polvo. Un solo grupo `mix-blend-mode: screen`, limitado al león de escritorio y aislado dentro del hero, evita ese rectángulo durante el cruce. Texto, botones y logos quedan fuera del grupo. No hay keying por píxel, máscaras nuevas ni videos superpuestos adicionales.

El seguimiento conserva posiciones absolutas y una sola búsqueda pendiente. `advanceGaze` añade amortiguación y una velocidad máxima de 2,4 segundos de material por segundo real, evitando saltos al entregar el control a un cursor lejano. El material mantiene sus límites: no proporciona seguimiento vertical ni geometría 3D real.

## Microinteracciones y rendimiento

La respiración tiene un ciclo de seis segundos: escala 1 → 1,02 → 1, separado del fundido de aparición. Se detiene con el control de pausa compartido, fuera de pantalla, en pestañas ocultas y con movimiento reducido. El botón principal conserva el gradiente metálico de marca y suma destello de 650 ms y halo dorado al hacer hover; el foco es visible y la reducción de movimiento elimina el destello.

La bruma del hero se prepara una sola vez por tamaño y se dibuja como una textura desplazada. Los granos mantienen su movimiento individual. El perfil del hero limita la superficie a 1000 × 600 y las motas a 220; la actualización del polvo sigue a 30 Hz, mientras las transiciones CSS y la respiración pueden componerse a la cadencia de pantalla. Las fotos y videos mantienen su resolución. Los perfiles del mega menú y de ganadores de masa conservan sus presupuestos anteriores.

No se actualiza React por cuadro ni por movimiento del mouse. Se limpian reproductores, eventos, observadores, temporizadores y URLs de blobs al abandonar la ruta. No hay scroll fijado ni rueda interceptada.

## Acceso y presentación única

`HomeIntroProvider` conserva `stylo.home-intro-seen.v1`: volver con el logo o recargar no repite la introducción. Entrar desde una ruta interior tampoco introduce una espera al volver. Tab, Escape, scroll y Ctrl/Cmd K pueden adelantar la presentación.

En móvil, con movimiento reducido, ahorro de datos o 2G/3G detectado se conserva la portada estática y el acceso inmediato, sin descargar videos. Sin JavaScript siguen disponibles título, enlaces, categorías y navegación. El bucle decorativo tiene control de pausa y responde en vivo al movimiento reducido. No se cambia información comercial, stock, promociones, pagos o permisos.

## Recursos conservados

| Recurso | Archivo |
| --- | --- |
| Scoop y polvo | `/visuals/stylo-scoop-intro-v3.mp4`: 1280 × 722, 60 fps, 2.112.998 B. |
| León interactivo | `/visuals/stylo-lion-motion-v3.mp4`: 1916 × 1080, 96 fps, 6.499.065 B. |
| Póster derecho | `/visuals/stylo-lion-poster-right-v1.webp`: 102.280 B. |
| Marca | `/branding/stylo-suplementos.svg`, oficial. |

## Límites del material y alternativas

CSS y el controlador actual resuelven la composición del negro, los fundidos, el orden y la suavidad del seguimiento. GSAP puede organizar una timeline más extensa y ScrollTrigger puede vincularla al desplazamiento, pero no corrigen cuadros, iluminación o deformaciones grabadas. Para esta entrada breve no aportan una ventaja que justifique añadirlos o buscar video en cada evento de scroll.

Un polvo que realmente se transforme en el león, un giro 3D con luz perfectamente estable o una salida exclusiva del scoop separado del polvo requieren otra toma continua o composición previa con capas compatibles. Eso queda pendiente de consulta con el usuario; esta entrega no genera ni reemplaza recursos.

Referencias técnicas: [composición CSS en MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode) y [ScrollTrigger oficial](https://gsap.com/docs/v3/Plugins/ScrollTrigger/). Las decisiones anteriores corresponden a la implementación local.

## Revisión

Compilación, TypeScript y 69 pruebas unitarias aprobadas. Lint sin errores nuevos; mantiene cuatro advertencias anteriores. Pasaron 39 recorridos Chromium de hero, categorías y búsqueda; otros 15 se omiten por corresponder al perfil contrario de escritorio/celular. Comprueban fases a 600/1200/1800 ms, cascada de 100 ms, medios lentos, navegación sin JavaScript, teclado, retorno al home, mirada, pausa, movimiento reducido y búsqueda. La comprobación de píxeles verifica que el mate negro del león conserve el fondo detrás.

Medición de producción en Chromium a 1868 × 943, sin capturas durante la muestra: el reloj de 1800 ms se reflejó en el DOM a los 1812 ms; los intervalos de callbacks tuvieron mediana de 16,7 ms y p95 de 33,4 ms, sin tareas largas y con CLS 0. Con CPU ×4, el final se observó a los 1835 ms, mediana de 16,7 ms, p95 de 50 ms y dos tareas de 58/54 ms cerca del relevo al decodificador; CLS 0. La muestra incluye el arranque, y no acredita 60 fps constantes: hubo cuadros demorados, especialmente en la simulación lenta. El diseño utiliza un presupuesto de 1,8 s, pero el navegador y el equipo determinan el instante efectivo de pintura. Se necesita validar en hardware real antes de afirmar fluidez sostenida en equipos modestos.

Vistas revisadas a 1868, 1280 y 390 px, sin desbordamiento horizontal ni errores de página. El móvil no monta videos. Capturas: [inicio](previews/hero-1800-180.jpg), [relevo](previews/hero-1800-780.jpg), [contenido](previews/hero-1800-1430.jpg), [final escritorio](previews/hero-1800-final-1868.jpg), [1280 px](previews/hero-1800-final-1280.jpg) y [móvil](previews/hero-1800-final-390.jpg). Pendiente validación en teléfonos físicos y Safari/iOS.
