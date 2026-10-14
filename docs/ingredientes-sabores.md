# Primera versión de ingredientes por sabor — Fase 3

**Estado actual:** el efecto de las tarjetas sigue retirado. Por autorización posterior del usuario se prueba una escena nueva, exclusivamente en la ficha `whey-protein`, con selección manual por flechas y fondo completo por sabor. El catálogo conserva la piedra y la animación del envase. Lo siguiente documenta la prueba anterior; la nueva prueba se describe al final.

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

## Nueva prueba en la ficha de Whey Protein

Las flechas reemplazan el selector después de activar JavaScript. Cada cambio conserva el envase anterior hasta descargar y decodificar la foto de destino; entonces sincroniza sabor, precio, stock, promociones, variante del carrito y URL. Reutiliza el giro de 900 ms con las fotos reales disponibles, sin generar el dorso. Las miniaturas adicionales corresponden solo a la variante elegida. Los cambios rápidos conservan el último destino solicitado.

La escena ocupa todo el ancho del contenido: amarillo Banana, rojo Frutilla y crema Vainilla. Cuatro colocaciones del mismo WebP transparente rodean la foto y se extienden al fondo; son capas independientes, decorativas y sin interacción. Entrada de 800 ms y salida de 550 ms, con un máximo de dos sabores y retirada de la capa anterior a los 900 ms. No hay movimiento continuo ni descargas de todas las decoraciones al iniciar. La preferencia de movimiento reducido desactiva inmediatamente giro, transformación y transición del fondo.

Los datos de compra se mantienen en una superficie oscura legible. Las flechas tienen áreas de 56 px en escritorio y 48 px en móvil, etiquetas accesibles y foco visible. Un sabor sin decoración conserva su variante en una escena neutra; una foto faltante muestra un aviso y mantiene precios y stock reales. Si la foto falla, no se cambia la variante. Si falla la decoración, se oculta sin bloquear compra o navegación. Sin JavaScript se mantiene el formulario GET de variantes y no se solicitan ingredientes.

Se conservan los archivos aprobados y su transparencia real, comprobada de nuevo con valores alfa 0–255. No se modifican catálogo, administración, pedidos, checkout ni datos remotos de Supabase. Capturas de la ficha real: [Frutilla en escritorio](previews/ficha-sabor-frutilla-1868.png), [Banana en móvil](previews/ficha-sabor-banana-390.png) y [Vainilla en móvil](previews/ficha-sabor-vainilla-390.png).

Verificación de esta entrega: compilación y TypeScript correctos; 62 recorridos existentes de catálogo, gestión de imágenes, promociones, carrito, checkout y galerías, más 10 recorridos nuevos de la ficha, aprobados en Chromium de escritorio y móvil. Las pruebas nuevas cubren sincronización, recarga de la variante elegida, carrito de prueba, teclado, cambios rápidos, foto ausente, errores de foto/decoración y movimiento reducido en vivo. Revisión visual con los tres sabores reales a 320, 390 y 1868 px, sin errores de JavaScript ni desbordamientos. La ficha real sin JavaScript conserva la selección GET de Frutilla, sin solicitar ingredientes. Los recorridos de compra usan datos locales; no se realizaron cobros ni escrituras remotas.
