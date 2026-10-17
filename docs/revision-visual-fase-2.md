# Revisión visual — Fase 2

17 de octubre de 2026. Rama: `fase-3-revision-visual-fase-2`.

Esta fase continúa la normalización de imágenes aprobada. Corresponde a la revisión visual del catálogo y del detalle, distinta de las fases comerciales históricas. No incluye el nuevo `VariantSpinner` de la Fase 3 solicitada.

## Cambios

- Galería cuadrada de hasta 640 px y columnas 55/45, con separación acotada. La información permanece sticky en escritorio. A 1440 px se midieron escenarios de 609 a 640 px; en 375 px, 343 px sin recortes.
- Miniaturas oscuras, activa con borde dorado y tira horizontal hasta 959 px. El orden conserva frentes, vistas del envase y fichas informativas al final. Cafeína 200 abre con el frasco; su tabla nutricional queda al final. No se reasignaron fotos ni posiciones en la base.
- El selector nativo del detalle estándar se reemplaza por `VariantPicker`, con chips accesibles y enlaces reales. Las variantes agotadas se distinguen visualmente y siguen siendo seleccionables para consultar sus datos. Si un mismo sabor tiene varias presentaciones, se usa la etiqueta completa para no confundir SKU.
- El estado agotado de la variante elegida se muestra una sola vez visualmente, en la acción de compra. Las otras opciones agotadas conservan su etiqueta pequeña. El anuncio de disponibilidad permanece accesible para lectores de pantalla.
- Tarjetas agotadas con la foto atenuada y texto legible; permanecen en el catálogo y conservan su orden. En 375 y 768 px se muestran dos columnas. En celular, ambos precios se apilan dentro de la tarjeta para evitar desbordamientos.
- Swipe horizontal en la galería del detalle, conservando el desplazamiento vertical y el gesto de zoom del navegador. Usa las mismas funciones de selección, carga y decodificación existentes; con varias variantes recorre sabores y con una sola recorre fotografías.
- Una única acción de compra fija abajo en móvil, con espacio reservado al final y respeto de las áreas seguras. Se conserva el mismo formulario, SKU y lógica de carrito; también permanece visible sin JavaScript. Los diálogos siguen en la capa superior.

Se mantienen paleta, tipografías, archivos de marca y textos comerciales. No se agregaron dependencias ni se modificaron checkout, pagos, permisos, precios, stock o registros de Supabase. La roca CSS y los derivados de Fase 1 se reutilizan.

## Auditoría de avisos

Al abrir las herramientas de Next del entorno actual no aparece la sección Issues ni el contador de 97 mencionado en el pedido original. La revisión del catálogo y las fichas no produjo errores de hidratación, claves duplicadas ni imágenes principales sin dimensiones. Se inspeccionaron las 53 tarjetas públicas; las imágenes de `main` tienen dimensiones declaradas.

| Aviso encontrado | Corrección |
| --- | --- |
| Cuatro advertencias previas de hooks en manager, workspace y galería | Dependencias basadas en ID para el foco y limpieza de solicitudes mediante callbacks estables. Se conserva la invalidación de operaciones pendientes. |
| Preload del isotipo reportado como no utilizado por Chrome | Se retira el preload explícito; el SVG y la imagen originales siguen renderizándose y el logo horizontal conserva su prioridad. |
| Framer Motion informa que el sistema tiene movimiento reducido | Aviso esperado de la biblioteca en desarrollo al emular esa preferencia; no se oculta ni se desactiva la preferencia. |

Durante las regresiones se detectó y corrigió una superposición del fondo de la ficha experimental de sabores en móvil: su pseudo-elemento queda anclado a la columna informativa, sin cubrir el envase. La prueba de píxeles del fundido vuelve a comprobar una etiqueta opaca.

## Verificación

Lint, TypeScript y compilación de producción pasan, sin errores ni advertencias de ESLint. Pasan 78 pruebas unitarias (dos omitidas por su configuración existente) y 117 recorridos Chromium (uno omitido por estar limitado a escritorio). Las regresiones comprueban selección por chip/flecha, imagen fallida, movimientos reducidos, información nutricional, carrito, checkout de prueba, importador y administración local.

Las nuevas pruebas incluyen teclado, URL/stock/precios sincronizados, ausencia del selector nativo, galería 560–640 px, swipe, dos columnas y compra fija a 375/768 px, y selección por enlaces sin JavaScript. Se actualizaron las pruebas anteriores para utilizar los chips y esperar el observador de visibilidad antes de adelantar el reloj de autoplay. La comprobación de estabilidad compara posiciones de layout, independientemente del scroll y del reveal ya existente.

Revisión real: [medidas y consola](reviews/revision-visual-fase-2/verificacion.json), [catálogo escritorio](reviews/revision-visual-fase-2/catalogo-1440.png), [375 px](reviews/revision-visual-fase-2/catalogo-375.png), [768 px](reviews/revision-visual-fase-2/catalogo-768.png), [detalle escritorio](reviews/revision-visual-fase-2/STAR-0023-1440.png), [detalle móvil](reviews/revision-visual-fase-2/STAR-0023-375.png).

La comprobación de fluidez usa producción local, recursos preparados y Chromium a 375 px con CPU ralentizada 4×: 143 muestras de `requestAnimationFrame`, percentil 95 de 16,8 ms, máximo 33,3 ms y ninguna pausa superior a 50 ms durante el cambio de variante. [Medición](reviews/revision-visual-fase-2/rendimiento.json). Es una comprobación de laboratorio; no acredita un teléfono físico ni todas las conexiones. La medición se hizo sin compilaciones ni pruebas concurrentes.

La Fase 3 fue autorizada posteriormente por el usuario y se desarrolla en su propia rama: [giro de variantes](variant-spinner-fase-3.md). Esta entrega conserva el registro de la revisión visual de Fase 2.
