# STYLO SUPLEMENTOS — propuesta de animación cinematográfica por scroll

**Fecha de análisis:** 10 de octubre de 2026.  
**Estado:** propuesta técnica y visual para revisión; sin implementación, videos generados ni gastos.  
**Documento rector:** [especificaciones_STYLO_SUPLEMENTOS.md](especificaciones_STYLO_SUPLEMENTOS.md). Este anexo desarrolla la animación prevista para la **Etapa 2 posterior al lanzamiento**, distinta de la [Fase 2 de catálogo](docs/fase-2.md). No cambia el alcance comercial aprobado.  
**Prioridad visual:** [Manual de Marca STYLO SUPLEMENTOS v1.1](docs/Manual_de_Marca_STYLO_SUPLEMENTOS_v1_1.pdf), instrucciones del usuario y [guía de diseño local](docs/diseno.md), en ese orden.

La recomendación es producir **dos clips breves de scoop y polvo mediante Higgsfield**, formar el león con una máscara extraída del arte autorizado y cerrar con los archivos oficiales superpuestos. La posición del scroll controlaría tanto el tiempo del video como la aparición de las capas de marca. Así se conserva la identidad y se limita la cantidad de generaciones pagas.

## 1. Requisitos confirmados y decisiones propuestas

El usuario solicita esta secuencia, en orden: scoop negro con detalles dorados; giro y liberación de polvo dorado; formación progresiva del león original; transición al isotipo oficial con león, hexágono y ST; aparición del logo completo y **POTENCIÁ TU MEJOR VERSIÓN.**

También son requisitos la reversibilidad, adaptación a escritorio y celular, conservación del logo y su lettering, uso posterior de Higgsfield y protección del rendimiento y la navegación del ecommerce. Esta entrega autoriza únicamente análisis y documentación.

Son **propuestas sujetas a revisión**: dos clips de cinco segundos, los porcentajes del storyboard, la duración del tramo de scroll, los presupuestos de descarga, el modelo de generación y el uso de la API prepaga. Ninguna supone aprobación para gastar, producir o integrar la animación.

## 2. Qué aporta el repositorio de Midudev

Se revisaron README, PROMPTS, componentes, scripts de movimiento, configuración y dependencias de [mcp-higgsfield-landing](https://github.com/midudev/mcp-higgsfield-landing), en el commit `da1bbe693ef1939794662e96c0ba6571e9c3f418`. Los enlaces siguientes fijan esa versión para que el análisis sea reproducible.

La referencia utiliza Astro, GSAP ScrollTrigger y Lenis. Une siete fotografías mediante seis clips de MiniMax H3, generados con primer y último fotograma a través de Higgsfield. Sus clips originales duran ocho segundos, se generan en 2K y se exportan a 1080p. STYLO conservaría Next.js y React; el patrón de interacción no exige migrar de framework. [Fuente: README](https://github.com/midudev/mcp-higgsfield-landing/blob/da1bbe693ef1939794662e96c0ba6571e9c3f418/README.md).

| Parte revisada | Funcionamiento observado | Adaptación propuesta para STYLO |
| --- | --- | --- |
| Escenario | Sección con escenario `sticky`, posters y videos superpuestos; contenido distribuido en paradas. | Un escenario corto en la home, con categorías inmediatamente después y enlace directo para saltarlo. |
| Tiempo | La posición entre paradas selecciona el clip y determina su `currentTime`. | Una única progresión normalizada controla los dos clips y las capas oficiales. |
| Búsqueda de fotogramas | Mientras existe un `seek` pendiente conserva el último destino; vuelve a sincronizar al recibir `seeked`. | Coalescer movimientos rápidos y evitar colas de búsquedas obsoletas. |
| Descarga | Obtiene clips completos como blobs, de uno en uno, empezando por el actual y los más cercanos. La cola termina descargando todos. | Descargar primero el activo; el vecino solo si corresponde y hay presupuesto. Como máximo dos clips disponibles. |
| Alternativas | Posters con movimiento reducido o ahorro de datos. | Portada estática de altura normal; tampoco reservar el largo recorrido cinematográfico. |

El mapeo, la cola, los posters y el intento `play()`/`pause()` para preparar iOS están en [world.ts](https://github.com/midudev/mcp-higgsfield-landing/blob/da1bbe693ef1939794662e96c0ba6571e9c3f418/src/scripts/world.ts). Ese intento puede fallar por políticas del navegador; se necesita una alternativa visible. Su implementación no incorpora cancelación completa, revocación de blobs ni limpieza propia de navegación React.

La composición y el recorte móvil se encuentran en [ScrollWorld.astro](https://github.com/midudev/mcp-higgsfield-landing/blob/da1bbe693ef1939794662e96c0ba6571e9c3f418/src/components/ScrollWorld.astro). El scroll suavizado global está en [motion.ts](https://github.com/midudev/mcp-higgsfield-landing/blob/da1bbe693ef1939794662e96c0ba6571e9c3f418/src/scripts/motion.ts); allí la preferencia de movimiento reducido se consulta al inicio. STYLO debe responder también a cambios de preferencia con la página abierta.

La referencia prepara H.264 a 24 fps con un fotograma clave cada seis fotogramas, para facilitar búsquedas. Los clips publicados se describen con pesos de 4–10 MB **cada uno**: trasladar seis clips similares sería costoso para una home móvil. Sus instrucciones también cuidan la correspondencia de color entre poster y video. Es necesario validar la codificación sobre nuestro material, sin copiar etiquetas de color que no correspondan al archivo. [Fuente: PROMPTS](https://github.com/midudev/mcp-higgsfield-landing/blob/da1bbe693ef1939794662e96c0ba6571e9c3f418/PROMPTS.md).

Se toma el mecanismo como referencia para una implementación propia. Los contenidos, fotografías y videos de Arko no son recursos de STYLO. No se identificó un archivo LICENSE general en la revisión; antes de reutilizar código literal habría que verificar su autorización.

## 3. Dirección visual y protección de la marca

### 3.1 Composición

Fondo negro `#080808`, scoop de acabado negro con detalles dorados `#DAAB4C` y luz direccional contenida. El polvo debe parecer fino y orgánico, con un desplazamiento legible sobre el fondo. Blanco `#FFFFFF` para información y controles. No añadir colores ajenos ni resplandores que alteren la lectura de la marca.

El manual, página 10, contiene un concepto de scoop negro/dorado que sirve de referencia formal. La escena no anuncia un producto disponible, una dosis ni una capacidad comercial. No pedir a la IA letras, inscripciones o logos sobre el scoop; cualquier marca que se decidiera añadir requeriría arte oficial y composición posterior.

La cámara puede acompañar el giro del scoop, pero se estabiliza antes de aparecer el león. El león y las composiciones oficiales se mantienen frontales, con sus proporciones y orientación originales. No convertir el isotipo en una escultura 3D ni deformarlo para realizar un morph.

### 3.2 Activos disponibles y limitaciones

| Archivo local revisado | Uso propuesto | Observación |
| --- | --- | --- |
| [logo-principal.webp](public/branding/logo-principal.webp) | Referencia del isotipo león + hexágono + ST. | 640 × 640 px, sin transparencia; versión de dorado plano. |
| [logo-completo.webp](public/branding/logo-completo.webp) | Cierre con la composición oficial completa. | 640 × 640 px, sin transparencia; incluye lettering, SUPLEMENTOS y el eslogan original. |
| [logo-horizontal.webp](public/branding/logo-horizontal.webp) | Referencia secundaria de lettering. | No contiene todos los elementos requeridos para el cierre. |

Estos recursos permiten revisar el storyboard, pero no sustituyen un maestro de mayor resolución y capas autorizadas. Hay diferencias de tratamiento entre el isotipo plano y la composición completa de acabado metálico: antes de producir, hay que acordar una familia compatible de originales. No asumir que ambos se pueden superponer exactamente.

Para la formación precisa se requiere el león separado o una máscara obtenida de un maestro autorizado, idealmente SVG o PNG transparente. No trazar otro león, vectorizarlo con IA ni reconstruir las letras. Los archivos actuales tienen fondo opaco; no tratar ese fondo como transparencia ni eliminarlo mediante una generación. La falta del maestro limita la producción de la formación exacta, pero no impide este análisis.

El cierre se mostraría como imagen oficial en una capa del navegador, preservando todos sus elementos y sin filtros de color. Así su calidad no depende de que la IA escriba bien ni de la compresión del video. El eslogan ya está incorporado en `logo-completo.webp`; no duplicarlo visualmente con otra tipografía. Mantener una representación textual accesible en el HTML.

Aplicar el área de seguridad recomendada por el manual: **X = altura de la S de STYLO** alrededor del conjunto. Comprobar la legibilidad del eslogan a tamaño móvil. El acabado metálico que ya pertenece al archivo completo se conserva; no autoriza añadir nuevos gradientes, sombras o efectos al logo. Fuente: manual, páginas 4–7 y 11–13.

La formación temporal del león separado es una adaptación audiovisual solicitada por el usuario. Debe validarse en el storyboard antes de producir. La excepción del manual para quitar el hexágono en indumentaria no se extiende a la web; el resultado de la secuencia conserva siempre el isotipo completo.

### 3.3 Storyboard propuesto

Los porcentajes representan posición del scroll, no segundos de reproducción automática.

| Progreso | Imagen y transición | Recurso |
| --- | --- | --- |
| 0–15 % | Scoop negro/dorado aparece sobre negro; encuadre cercano, sin texto generado. | Inicio del clip A; poster del mismo encuadre mientras carga. |
| 15–40 % | El scoop gira y libera polvo hacia el centro de la composición. | Resto del clip A, aproximadamente 5 s en total. |
| 40–65 % | El polvo se concentra progresivamente siguiendo el contorno exacto del león original. | Clip B de polvo, aproximadamente 5 s, con composición posterior guiada por el maestro. |
| 65–80 % | Se asienta el león; aparece el isotipo completo con hexágono y ST, en posición y escala coincidentes. | Transición de opacidad hacia el isotipo oficial. |
| 80–100 % | Aparece la composición completa STYLO SUPLEMENTOS con **POTENCIÁ TU MEJOR VERSIÓN.** | Archivo oficial completo, sin redibujar ni generar lettering. |

La sensación de transformación entre león e isotipo se logra mediante coincidencia de posición y fundido, sin deformar sus trazos. El paso al logo completo debe respetar la composición maestra elegida; si las variantes no coinciden, usar un fundido entre conjuntos completos y validarlo visualmente.

La IA puede generar polvo atractivo, pero no garantiza la geometría de un símbolo. Para obtener partículas que realmente converjan en el león, la propuesta es componer trayectorias y una máscara del original en posproducción, con herramientas locales. Esa parte exige trabajo de edición: una simple instrucción al modelo no asegura fidelidad. Prepararla fuera del navegador evita una simulación WebGL pesada en la tienda.

## 4. Arquitectura futura en STYLO

### 4.1 Integración modular

La home actual vive en [src/app/(tienda)/page.tsx](src/app/(tienda)/page.tsx). La propuesta futura es un bloque servidor con portada estática y enlaces reales, más un componente cliente aislado para la experiencia. Sus estilos usarían los tokens de [globals.css](src/app/globals.css), respetando [docs/diseno.md](docs/diseno.md).

Se probaría primero **scroll nativo + CSS sticky + requestAnimationFrame**, sin una biblioteca adicional. GSAP ScrollTrigger local sería una alternativa si el prototipo demuestra una ventaja concreta. No incorporar Lenis global ni interceptar rueda, tacto, teclado o navegación de la tienda.

Separar conceptualmente configuración del storyboard, controlador de progreso, carga de medios y presentación. El controlador recibe posiciones y devuelve tiempo/opacidad; no conoce productos, pedidos o sesiones. El módulo solo se carga en la home. Una opción de configuración permitiría volver a la portada estática sin modificar el catálogo.

### 4.2 Sincronización y reversibilidad

Definir `inicio` y `fin` como las posiciones de scroll entre las que el escenario permanece fijado. El progreso es:

```text
p = limitar((scrollY - inicio) / (fin - inicio), 0, 1)
clip A: tiempo = limitar(p / 0,40, 0, 1) × duraciónA
clip B: tiempo = limitar((p - 0,40) / 0,25, 0, 1) × duraciónB
capas oficiales: opacidad calculada a partir de p
```

Los tiempos efectivos se limitan al último fotograma válido. Hacer scroll hacia arriba reduce `p` y recorre los mismos estados en sentido inverso; no se genera ni descarga una versión invertida. Detener el scroll detiene la escena. No usar una reproducción autónoma como reloj.

Un listener pasivo programa, como máximo, una actualización por frame. Se conserva el último destino mientras hay una búsqueda pendiente y se sincroniza al terminar. Suspender actualizaciones fuera de pantalla y en pestañas ocultas. No actualizar el estado de React en cada movimiento.

Cambiar [`currentTime`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime) busca otra posición del video, pero no garantiza exactitud temporal absoluta ni 60 fps en cualquier celular. Para confirmar cuándo se presenta un fotograma se puede utilizar [`requestVideoFrameCallback`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), cuando esté disponible, con alternativa por eventos. La fluidez real debe medirse con clips finales y dispositivos físicos.

Si dos archivos provocan saltos visibles, evaluar una exportación local unida como un único MP4 corto: conserva las dos generaciones y simplifica el cambio de escena, aunque obliga a descargar el conjunto. Si el seek sigue siendo deficiente, revisar GOP, resolución y duración antes de considerar una secuencia de imágenes con memoria acotada. No descargar cientos de fotogramas 4K ni añadir canvas/WebGL de forma preventiva.

### 4.3 Carga y ciclo de vida

Mostrar HTML y poster antes de disponer del video. Iniciar descarga tras el contenido inicial y cuando el bloque sea elegible y cercano; nunca bloquear el enlace al catálogo. Descargar el activo completo como blob solo dentro del presupuesto acordado. Preparar el vecino sin descargar variantes duplicadas de escritorio y móvil.

Registrar eventos antes de asignar fuentes. Usar cancelación, plazos de carga y control de errores; ante fallo conservar la portada estática. Al salir de la ruta o activar movimiento reducido: cancelar solicitudes, retirar listeners/observadores, cancelar callbacks, descargar recursos del reproductor y revocar URLs de blobs.

Safari/iOS requiere verificación específica. Un intento silencioso de preparación del video no garantiza permiso de reproducción. Si no puede dibujar el fotograma buscado, mantener la alternativa estática, sin exigir que el comprador acepte un modal para navegar.

Higgsfield participa en la **producción previa de los recursos**, no en la visita al ecommerce. No habrá generaciones al hacer scroll, claves en el frontend ni dependencia de su servicio para comprar. Descargar y conservar los originales: Higgsfield indica que sus resultados pueden retirarse después de un mínimo de siete días. [Fuente: ayuda de la API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api).

## 5. Escritorio, celular y acceso al catálogo

Propuesta inicial: escenario de una pantalla y recorrido adicional de unas dos pantallas en escritorio; en móvil, recorrido adicional de una a una pantalla y media. Esto equivale aproximadamente a una sección total de tres pantallas y de dos a dos y media, respectivamente. Ajustar tras comprobar que no demora el acceso a productos.

Calcular la altura con viewport estable y espacio real de cabecera. Recalcular ante cambios de tamaño y orientación, evitando saltos cuando aparecen las barras del navegador móvil. La portada estática no conserva ese recorrido extendido. La mejora debe activarse antes de que el visitante recorra la sección; si los clips llegan tarde, conservar el modo estático durante esa visita para evitar desplazar el catálogo.

Para reducir costos, intentar **un master 16:9** por clip y exportar recortes locales para móvil. En un recorte 9:16 con la misma altura queda aproximadamente el 32 % del ancho original: scoop, giro y león deben permanecer en el 30 % central de seguridad. Revisar esto en los keyframes antes de generar. Si no funciona, habrá que recomponer o presupuestar una versión vertical específica; no prometer que cualquier escena horizontal se adapta.

El video puede usar `cover` con foco acordado; los logos oficiales usan `contain` y su área de seguridad, sin recortarse. No estirar el arte para llenar la pantalla.

Mantener desde el primer estado un enlace HTML **Explorar categorías**, dirigido a `#categorias`, y acceso al catálogo desde la cabecera. Puede ofrecerse un enlace secundario para omitir la experiencia. Cabecera y futuros controles de carrito quedan por encima de la capa decorativa. La escena no recibe foco ni intercepta clics.

Un único título y textos accesibles permanecen en el HTML. Videos decorativos sin sonido, `muted`, `playsInline` y ocultos al lector de pantalla; ningún significado comercial depende de verlos. Mantener foco visible, controles de al menos 48 px y navegación por teclado.

Sin JavaScript, con `prefers-reduced-motion`, ahorro de datos detectado, error de carga o preferencia manual de reducir animación, presentar logo y contenido estáticos, sin descargar videos. Detectar cambios de movimiento reducido en vivo. Como el ahorro de datos no se detecta en todos los navegadores, proponer además un control manual persistente. Estas condiciones afectan solo a la decoración.

## 6. Rendimiento y comprobaciones necesarias

Estos son **objetivos de un futuro prototipo**, no resultados medidos ni garantías de compresión:

| Recurso o métrica | Objetivo inicial |
| --- | --- |
| Poster | Hasta 150–200 KB, con dimensiones reservadas. |
| Clips móviles | Exportación 720p; suma objetivo de hasta 4 MB por visita animada. |
| Clips de escritorio | Exportación 1080p; suma objetivo de hasta 8 MB. |
| JavaScript adicional | Objetivo de hasta 25 KB comprimidos con controlador nativo. |
| Medios retenidos | Hasta dos clips; no almacenar todos sus fotogramas decodificados en JavaScript. |
| Experiencia de compra | Ninguna descarga de este módulo en catálogo, ficha, administración, carrito o checkout. |

Preparar MP4/H.264 sin audio, `yuv420p` y metadatos al principio del archivo. Comparar GOP 6, 12 y 24 a 24 fps: más fotogramas clave pueden facilitar el seek y aumentar el peso. Elegir por mediciones, no por copiar una configuración. Extraer los posters de los MP4 finales y verificar color entre video, poster, fondo CSS y logos. No recolorear el logo para disimular errores de codificación.

Si la compresión destruye las partículas o supera el presupuesto, simplificar la escena o acortar el material; la alternativa estática sigue disponible. Distribuir exportaciones con nombres versionados y caché apropiada, sin incluir masters pesados en el bundle. Hosting y transferencia se revisarán con los recursos reales; no se asume costo cero ilimitado ni se contrata otro servicio ahora.

Además de comparar con la home sin animación, tomar como referencia los umbrales de buena experiencia: LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1, evaluados en el percentil 75 cuando exista tráfico. Las mediciones de laboratorio anteriores al lanzamiento no sustituyen datos reales. [Fuente: Core Web Vitals](https://web.dev/articles/vitals).

La aceptación futura requiere:

- Revisar escritorio, 320/390 px móviles, tablet y orientación horizontal; Chromium, Safari/iOS y Chrome/Android, incluyendo un celular de recursos modestos.
- Probar avance, retroceso, scroll rápido, saltos por anclas, recarga a mitad de página y regreso desde otra ruta; sin fotogramas negros ni logo incompleto en el cierre.
- Verificar carga lenta, error de un clip, pestaña oculta, salida de la sección y ausencia de solicitudes duplicadas o recursos retenidos tras navegar.
- Comprobar teclado, foco, lector de pantalla, JavaScript desactivado y cambios de movimiento reducido con la página abierta.
- Verificar acceso directo a categorías y, cuando existan, carrito y checkout; ninguna espera ni scroll forzado para comprar.
- Comparar identidad y color con el maestro aprobado: león, hexágono, ST, lettering, proporciones, márgenes y eslogan exacto.

No se ejecutan estas pruebas como parte de este análisis porque el módulo y sus recursos todavía no existen. Tampoco corresponde atribuirle las verificaciones previas del catálogo.

## 7. Producción posterior con Higgsfield

1. Validar este storyboard y obtener los maestros compatibles, incluido el león o su máscara autorizada. Revisar cinco imágenes estáticas antes de gastar en movimiento.
2. Preparar tres keyframes principales: scoop inicial, fin del giro con polvo, nube de polvo final. El último frame de A sirve como primero de B. Mantener luz, cámara, fondo y zona de seguridad coincidentes.
3. Generar primero un único clip A de cinco segundos como prueba. Evaluar scoop, movimiento, polvo y recorte móvil antes de pedir más variantes.
4. Generar B usando el frame compartido y un destino de polvo; no pedir al modelo un león final, letras ni logo. MiniMax H3 admite imagen inicial y `end_image_url`, por lo que permite explorar la continuidad del enfoque de Midudev. Eso guía el modelo, sin garantizar coincidencia perfecta. [Fuente: parámetros oficiales](https://open.higgsfield.ai/models/minimax/h3/image-to-video/api-reference).
5. Componer en edición local la convergencia del polvo hacia el contorno autorizado. Revisar la adaptación del león con el dueño y preparar el fundido hacia las capas oficiales. Puede usarse software gratuito; presupuestar aparte el tiempo de edición.
6. Aprobar el montaje, exportar tamaños de escritorio/móvil, extraer posters y conservar masters, prompts, configuración y costos reales.
7. Solo después, implementar y verificar el controlador en una entrega separada. El cierre oficial permanece como capa original del navegador, aunque se use una guía de posición durante la edición.

## 8. Estimación de costos para gastar lo mínimo

### 8.1 Ruta recomendada: API prepaga, sin mensualidad

La API tiene facturación separada de los planes web y del MCP/CLI, con **carga mínima de USD 5**, sin suscripción. Cobra por generación y permite consultar una estimación antes de enviarla. Los fallos técnicos no se cobran; un resultado que termina correctamente pero no convence visualmente debe presupuestarse como un intento pagado. Esta última distinción es una inferencia de su política, no una garantía de devolución por calidad. [Fuente: facturación oficial](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api).

MiniMax H3 Image-to-Video publica hoy **USD 0,065 por segundo en 2K con descuento del 50 %**, y **USD 0,13 por segundo como tarifa estándar**. Para estimar se usa la tarifa estándar; el descuento puede finalizar antes de producir. [Fuente: tarifa del modelo](https://open.higgsfield.ai/models/minimax/h3/image-to-video/playground).

```text
costo de video = clips × intentos por clip × segundos por clip × precio por segundo
```

| Escenario: 2 clips × 5 segundos | Segundos generados | Tarifa estándar | Promoción publicada hoy |
| --- | --- | --- | --- |
| Un intento por clip | 10 | USD 1,30 | USD 0,65 |
| Tres intentos por clip | 30 | USD 3,90 | USD 1,95 |
| Cinco intentos por clip | 50 | USD 6,50 | USD 3,25 |

La tabla incluye solo generación de video. No incluye keyframes generados, impuestos aplicables, conversión de moneda, mano de obra de edición ni eventual transferencia del hosting. No se necesita generar imágenes de marca: usar los originales reduce gasto y evita alteraciones.

**Propuesta de presupuesto:** comenzar con una carga de **USD 5** cuando el usuario autorice producir. Puede alcanzar para una prueba y varias iteraciones bajo estas condiciones; no garantiza dos clips finales. Reservar **USD 10–15 en total** como estimación prudente de generación y algunos keyframes, con revisión antes de cualquier recarga. No activar recargas automáticas. Si hay que generar versiones verticales adicionales de ambos clips, su componente de generación puede duplicarse.

Ejemplo: consumir USD 3,90 de video requiere haber cargado al menos USD 5; el saldo restante no es un descuento sobre el desembolso. Confirmar tarifa, estimación de la solicitud y condiciones de uso comercial en la cuenta antes de producir. No se creó una cuenta, clave ni solicitud en esta entrega.

### 8.2 Alternativa: interfaz web y MCP/CLI

La página oficial, con facturación **mensual** seleccionada, muestra estas opciones en la fecha de revisión:

| Plan | Desembolso mensual | Créditos | Control de primer y último frame en la comparación publicada |
| --- | --- | --- | --- |
| Starter | USD 15 | 200 | No incluido. |
| Plus | USD 49 | 1000 | Incluido. |

Por eso Starter no debe presupuestarse como equivalente al flujo completo de Midudev. La API es la opción inicial recomendada para probar MiniMax H3 con primer/último frame sin pagar Plus. La modalidad anual exige pago anual por adelantado; las promociones Unlimited no aplican a MCP/CLI según la página. [Fuente: planes oficiales](https://higgsfield.ai/pricing).

El README de Midudev informa aproximadamente 137 créditos, equivalentes allí a USD 5, para sus seis clips, además de 64 créditos de comparación de modelos. Son costos históricos de consumo, no el precio mínimo de contratación ni una cotización vigente para STYLO. No reutilizar esa equivalencia para calcular nuestro desembolso. [Fuente: costos declarados en la referencia](https://github.com/midudev/mcp-higgsfield-landing/blob/da1bbe693ef1939794662e96c0ba6571e9c3f418/README.md).

## 9. Qué falta validar antes de avanzar

La próxima revisión puede hacerse sin gastos: aprobar dirección visual, familia de logos, transición temporal del león, encuadre móvil y recorrido propuesto. La generación necesita después autorización expresa de gasto y un límite de intentos, junto con los maestros aptos para producción.

La integración requerirá aprobación del montaje y comprobaciones reales de rendimiento y navegación. Esta propuesta no habilita otra fase comercial ni modifica cuentas, dominio, catálogo o compras. El único cambio de esta entrega es este documento.
