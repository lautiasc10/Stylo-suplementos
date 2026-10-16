# Búsqueda de productos — 15 de octubre de 2026

La lupa y Ctrl/Cmd K abren un diálogo nativo: panel de hasta 860 px bajo la cabecera en escritorio y pantalla completa en celular. La apertura combina opacidad y un desplazamiento de 8 px durante 180 ms; con movimiento reducido no hay animación. Fondo #0c0c0c, contorno dorado tenue, radio de 6 px y fondo exterior negro al 60 % con desenfoque estático de 4 px. No se incorporan dependencias.

El input tiene un solo borde, lupa, limpieza y pista Ctrl K en escritorio. Escape se maneja expresamente para que el comportamiento nativo de un input search no se limite a borrar el texto. Cierra también con X, clic exterior o elección de destino. El foco vuelve a la lupa y se contiene en el diálogo con Tab/Shift Tab. Se bloquea el scroll conservando el espaciado de la página y se restaura al cerrar o navegar.

Se aplican los patrones de [combobox de WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) y [diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). El input conserva el foco al usar flechas, identifica la opción mediante aria-activedescendant, controla el listbox y anuncia resultados en una región polite. Enter abre la opción activa o la página completa. Esto no sustituye la revisión con lectores de pantalla y dispositivos físicos.

## Datos, filtros y costos de carga

El endpoint GET `/api/buscar` devuelve un índice público compacto, aplicando publicCatalog: nombres, grupos, variantes activas, precios, disponibilidad y primera foto pertinente. No incluye SKU, descripciones, auditoría, claves ni datos de clientes. Usa la misma lectura autorizada del catálogo. Devuelve 503 ante un error, con reintento en el panel y sin detalles internos.

El índice se descarga recién al abrir, se reutiliza hasta un minuto en memoria y se cancela al cerrar o cambiar de ruta. La escritura filtra localmente después de 175 ms, cancelando el destino anterior. No consulta Supabase por cada letra. Se normalizan mayúsculas, acentos y guiones; la distancia de Damerau-Levenshtein acotada tolera errores y transposiciones, priorizando coincidencias exactas y prefijos. Se preparan los campos una vez por índice. La búsqueda incluye nombre, marca, categoría y sabor y mantiene precio, foto y disponibilidad asociados a la misma variante.

Se muestran hasta cinco productos y tres categorías y marcas coincidentes por grupo. Recientes usa localStorage, hasta cinco términos, con borrado individual o total; el buscador sigue funcionando si el almacenamiento no está disponible. La constante `POPULAR_SEARCHES`, en `src/modules/catalog/search.ts`, contiene los términos editables que pidió el usuario. Categorías y marcas rápidas provienen exclusivamente de los datos existentes.

`/buscar` conserva consulta, categoría, marca, mínimo/máximo, stock, orden y página en la URL. Las tarjetas son las existentes del catálogo, con doce productos por página, chips de filtros, limpieza, sugerencias vacías y navegación Atrás/Adelante. Los formularios GET funcionan sin JavaScript. Se evita un loading.tsx de ruta que dejaría solo el fallback en el HTML sin scripts; los skeletons del panel mantienen dimensiones estables. Los errores del catálogo se presentan por separado de la falta de coincidencias.

**Pendiente: orden Más nuevos.** El catálogo actual no registra fechas de alta. La opción queda deshabilitada hasta contar con fechas reales; una URL con ese orden explica el motivo y usa relevancia. El motor admite createdAt válido si luego existe, pero esta entrega no inventa fechas ni modifica la base. Los indicadores editoriales de Novedades siguen siendo independientes.

La vista previa conserva su catálogo y carrito locales, incluida `/vista-previa/buscar`. Nunca usa una variante de la tienda real para una compra de prueba.

## SVG y movimiento del hero

`public/branding/stylo-suplementos.svg` procede de `STYLO_SUPLEMENTOS_transparente.svg`, entregado por el dueño. Tiene transparencia real, paths, gradiente y ningún script o recurso remoto. Se modifica únicamente el encuadre vacío: el viewBox pasa de 0 0 1024 1024 a 18 395 981 236. No se redibujan letras ni se cambian colores. El nombre horizontal se combina con el isotipo previo, porque el archivo entregado no incluye el león.

Se usa en cabecera, pie, presentación del hero, administración y Sobre STYLO. Favicon y Open Graph conservan sus imágenes aptas para esos tamaños y usos. Se retira la fuente cursiva del nombre que ya no se utiliza. El degradado del archivo queda como token de acentos de búsqueda; Barlow Condensed e Inter continúan en la interfaz.

El hero conserva scoop, polvo, ojos, león y presentación única. Los textos se mueven como tres renglones, en vez de animar cada palabra por separado. Las entradas comienzan a 0, 180, 520, 1000 y 1220 ms desde el final real del león; la navegación, a 1900 ms. La marca recorre 8 px y el navbar 18 px, con curvas suaves. El cuerpo del león usa un fundido continuo de 3,2 segundos superpuesto a los ojos, sin escalones intermedios de opacidad ni filtros de desenfoque del video. No se cambia el material ni se agregan generaciones o descargas audiovisuales.

## Comprobaciones

Compilación de producción y 67 pruebas unitarias/PostgreSQL aprobadas. Los recorridos Chromium cubren búsqueda normal y tolerante, teclado, contención y retorno de foco, Ctrl K durante el hero, historial, límites de recientes, error/reintento, respuesta cancelada, filtros, paginación y navegación sin JavaScript. Se comprueban además catálogo, carrito, gestión, mega menú y cambios de sabor. La revisión detectó y corrigió una espera de cierre que ocultaba el mega menú después de restaurar el foco desde el carrito.

En esta máquina, sugerencias con datos reales aparecieron en unos 210–230 ms incluyendo el debounce de 175 ms. Un ensayo del motor con 2000 productos y 6000 variantes preparó el índice en unos 20 ms y resolvió consultas en 25–49 ms. Son observaciones locales, sin promesa de tiempos equivalentes en todos los equipos o conexiones. No se acredita un porcentaje universal de fluidez ni métricas de campo.

Capturas de revisión: [panel de escritorio](previews/busqueda-panel-1440.jpg), [panel móvil](previews/busqueda-panel-390.jpg), [resultados](previews/busqueda-resultados-1440.jpg) y [hero con SVG](previews/hero-svg-1868.jpg).

La validación final midió ancho completo del panel móvil y diferencia de altura cero entre estado inicial y resultados a 320, 390, 768, 1280 y 1440 px, sin errores de página ni desbordes en búsqueda, Sobre STYLO y acceso administrativo. La prueba de precios sugeridos comprueba que una rebaja directa se muestra y que un descuento por cantidad no se anuncia como precio de una sola unidad. Se reutiliza priceLines, sin una regla de precios paralela. Las 18 pruebas específicas de búsqueda terminaron aprobadas en escritorio y móvil.
