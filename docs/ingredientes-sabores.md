# Primera versión de ingredientes por sabor — Fase 3

El usuario agregó `public/sabores/banana.png`, `frutilla.png` y `vainilla.png` y autorizó preparar copias transparentes después de la revisión. Banana ya tenía canal alfa con píxeles transparentes. Frutilla y Vainilla eran RGB opacos: su cuadrícula estaba dibujada dentro del archivo. Sus recortes se prepararon con la herramienta integrada `imagegen`, solicitando conservar ingredientes, disposición, iluminación y centro abierto, y eliminar la cuadrícula con transparencia real. Los tres PNG originales permanecen intactos.

Las exportaciones usadas por la tienda son WebP de 768 × 512 px, calidad 82 y calidad alfa 100. Se verificó en los tres archivos canal alfa y valores de 0 a 255, además de revisar la composición sobre el fondo real.

| Sabor | Exportación | Peso |
| --- | --- | --- |
| Banana | [banana-decor-v1.webp](../public/sabores/banana-decor-v1.webp) | 115.090 bytes |
| Frutilla | [frutilla-decor-v1.webp](../public/sabores/frutilla-decor-v1.webp) | 144.416 bytes |
| Vainilla | [vainilla-decor-v1.webp](../public/sabores/vainilla-decor-v1.webp) | 126.732 bytes |

Cada composición se presenta como dos mitades laterales independientes y una capa inferior sobre la piedra, detrás de la imagen del producto. Opacidad y transformaciones CSS producen entrada de 750 ms con 45 ms de diferencia entre lados y salida de 480 ms; perspectiva, giro y escala aportan profundidad sin modelos 3D. El controlador mantiene un máximo de dos sabores y retira el anterior a los 850 ms. Cambiar entre fotos del mismo sabor no reinicia la decoración. El foco, los enlaces y la etiqueta del producto quedan delante; las capas tienen `aria-hidden` y no reciben clics.

El mapeo reconoce Banana, Frutilla/Fresa/Strawberry y Vainilla/Vanilla dentro del nombre del sabor; «Strawberry Cream» y «Vainilla Ice Cream» actuales quedan cubiertos. Sabores sin recurso o combinaciones ambiguas no reciben una decoración inventada. Una imagen decorativa que falla se oculta y no bloquea foto, selector ni compra. La siguiente decoración se prepara junto con la foto vecina mientras la tarjeta automática es visible. Los recursos se reutilizan por URL, sin pedir todos los sabores al iniciar la página.

Fondo, dimensiones, fotografías, fragmentación del envase, neón, filtros, precios, promociones y permisos permanecen en su implementación existente. La ficha mantiene la selección manual y la tarjeta sigue el sabor de la foto activa. Con movimiento reducido se cancela la salida anterior y se muestran ingredientes estáticos; se responde a cambios de preferencia con la página abierta. Sin JavaScript permanecen las fotos y controles originales y no hay solicitudes a `/sabores/`.

Compilación, TypeScript y 44 recorridos de catálogo e ingredientes aprobados en Chromium de escritorio y móvil. Las pruebas cubren sincronización, fotos de un mismo sabor, fondo y medidas constantes, cambios rápidos, máximo de capas, sabor sin recurso, error decorativo, movimiento reducido en vivo y navegación sin JavaScript. Revisión visual con las tres variantes reales a 320, 390 y 1868 px: etiqueta visible, sin desbordamientos. No se modificaron datos de Supabase.

Capturas: [tarjeta](previews/ingredientes-tarjeta.png), [Banana](previews/ingredientes-banana-390.png), [Frutilla](previews/ingredientes-strawberry-390.png) y [Vainilla](previews/ingredientes-vainilla-390.png).

La revisión posterior al video del usuario aumenta las tarjetas a un escenario 4:5, alinea la base del envase con la piedra según su contorno transparente y desplaza/amplía los ingredientes hacia la superficie. Una capa inferior reutiliza la misma imagen con recorte y máscara suave; no aumenta descargas ni fusiona el envase con la decoración. Las promociones se muestran como insignia compacta y la grilla no estira tarjetas vecinas. La verificación ampliada suma 58 recorridos, incluyendo envases con diferentes márgenes transparentes y una promoción que no altera alturas.
