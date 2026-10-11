# Diseño de STYLO

Dirección de Fases 1 y 2: tienda deportiva con portada centrada, categorías ilustradas y contraste negro, dorado y blanco. Acción principal actual: explorar categorías y fichas. La compra se habilitará en sus fases comerciales.

## Guía aplicada

Se usa [landing-page-design de AI Design Skills](https://github.com/elayadesign/ai-design-skills/blob/main/skills/landing-page-design/SKILL.md), revisada el 10 de octubre de 2026, como guía adaptada al ecommerce. No se instaló un paquete ejecutable ni una skill global. Esta adaptación y las instrucciones del proyecto mantienen su aplicación en futuras iteraciones.

| Criterio | Implementación local |
| --- | --- |
| Jerarquía | Un botón principal dorado en la portada; navegación secundaria discreta. |
| Tipografía | Escala compartida de 12, 14, 16, 18, 20, 24, 30, 36, 48, 60 y 72 px; titulares con cortes deliberados. |
| Espaciado | Variables compartidas de 4, 8, 12, 16, 24, 32, 40, 48, 64, 80 y 96 px. |
| Formas | Tarjetas de radio 24 px, campos de 8 px y controles circulares o tipo píldora. |
| Interacción | Hover, pulsación y foco visible; controles principales de al menos 48 px de altura. |
| Movimiento | Curva común, aparición de categorías, transformación del menú y revelado de palabras de marca. |
| Iconografía | Siete SVG Phosphor regular locales; licencia MIT conservada en `docs/licenses`. |

Los tokens viven en `src/app/globals.css`; la composición de tienda, en `src/app/storefront.css`, y los componentes de catálogo, en `src/app/catalog.css`. Usar esos valores al extender componentes. Los tamaños de ilustraciones y breakpoints son medidas de composición, no pasos nuevos de espaciado o tipografía.

## Adaptaciones de marca y compra

El manual oficial prevalece: Montserrat e Inter, #080808, #DAAB4C y #FFFFFF; logos originales intactos. Se conservan dos familias tipográficas y el título blanco/dorado aunque la guía proponga otras fuentes y un gradiente.

La navegación permite explorar las nueve categorías sin interponer un modal. Se conserva la cabecera integrada en la tienda, en lugar de imponer una barra flotante de vidrio. La estructura corresponde a una home de ecommerce; no incorpora bloques de captación propios de otra oferta.

Las ilustraciones de envases identifican categorías. No representan inventario disponible. No añadir testimonios, cifras, garantías, beneficios de salud, precios o condiciones comerciales sin contenido confirmado.

## Accesibilidad y rendimiento

Las apariciones usan `IntersectionObserver`, sin listeners continuos de scroll ni bibliotecas de animación. El HTML inicial muestra todo el contenido. El foco vuelve visibles los grupos y la preferencia de movimiento reducido desactiva las animaciones, incluso si cambia con la página abierta. El revelado de marca mantiene texto real y orden de lectura.

Verificación: navegación en Chromium de escritorio y móvil, teclado, cambio de movimiento reducido y contenido sin JavaScript. Revisión visual a 320, 390, 768, 900, 1024 y 1440 px. Las capturas estáticas usan movimiento reducido para mostrar todos los bloques.

## Pendientes por fase

Fase 2 incorpora filtros GET en una franja segmentada: Categoría, Marca, Sabor y Ordenar. La búsqueda tiene una acción compacta «Filtrar»; precio y disponibilidad se despliegan por separado. Los filtros activos se pueden quitar individualmente conservando el resto de la selección. En móvil la franja se distribuye en dos columnas, con etiquetas visibles y controles de al menos 48 px. La categoría se elige en esta franja, sin repetir otro bloque de botones en la página.

Las tarjetas tienen información sobre negro, acentos dorados y un escenario blanco para las fotografías. La jerarquía separa marca, producto, presentación, disponibilidad y ambos precios. El acceso a variantes usa una línea de acción discreta. La ficha conserva su selección de variante, estados vacío/error/agotado y esqueleto de carga con movimiento reducido. La gestión usa formularios agrupados y tablas con desplazamiento contenido en móvil; bloquea controles mientras guarda o sube archivos.

La grabación `2026-10-10 21-59-08.mkv` proporcionada por el usuario sirve como referencia de movimiento de fotografías, no de identidad ni contenido. Las tarjetas alternan las fotos de las variantes con **Glitch Image Swap**: seis fragmentos irregulares de las imágenes anterior y siguiente se desplazan brevemente mientras un fundido revela la nueva foto. La transición dura 420 ms y los fragmentos se retiran a los 480 ms. Conserva los colores de la fotografía, con cortes contenidos y sin destellos de pantalla completa. Se activa únicamente después de cargar la siguiente foto, al cambiarla automáticamente o con los controles; el scroll no inicia el efecto. No usa canvas, WebGL, videos ni nuevas dependencias.

Una foto por variante alcanza para activar la secuencia. La foto activa determina simultáneamente sabor/presentación, ambos precios, disponibilidad y enlace a esa variante. También se pueden recorrer varias fotos de un mismo SKU. La secuencia incluye únicamente variantes activas que cumplen los filtros de sabor, stock y rango de precio; no muestra otro sabor cuando el visitante filtró uno. Las tarjetas conservan su orden inicial por el precio de lista mínimo elegible y no saltan de posición durante la animación.

Hay navegación anterior/siguiente y pausa; la ficha conserva una selección manual de variante, miniaturas solo de esa variante o de las fotos generales si no tiene específicas, y un fundido simple de 320 ms. Se cargan las fotos solicitadas antes de sustituir la visible y actualizar los datos de la tarjeta. El cambio automático se detiene fuera de pantalla, en pestañas ocultas, al pasar el puntero o enfocar la galería. Con movimiento reducido no hay alternancia automática ni glitch; la selección manual cambia la foto directamente. Activar esa preferencia en vivo también retira los fragmentos de una transición en curso. Las capas temporales están ocultas a lectores de pantalla y no reciben interacción. Sin JavaScript permanece la foto inicial y enlaces a las demás variantes/fotos. No agrega gastos ni modifica los archivos de marca.

Las fotos reales se cargan desde gestión. Los dibujos de categorías son alternativas explícitas cuando no hay fotografía; nunca se presentan como producto comercial real. La vista previa local identifica sus datos ficticios en todo momento. La comparación de precios del importador muestra importes anteriores y resultantes antes de guardar.

Fases 1 y 2 siguen pendientes de validación visual del usuario e integración externa. Checkout corresponde a Fase 3. Los textos legales y datos de contacto requieren contenido confirmado antes del lanzamiento. No crear enlaces vacíos para simular su entrega.

Scroll World queda reservado para la segunda etapa. Esta revisión no agrega planes pagos, cuentas, dominio ni funcionalidades comerciales.
