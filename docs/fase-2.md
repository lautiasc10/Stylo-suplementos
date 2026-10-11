# Fase 2 — Catálogo

Autorizada por el usuario el 10 de octubre de 2026, con Supabase todavía pendiente de crear junto al dueño. Desarrollo sin gastos ni dominio. Rama de entrega: `fase-2-catalogo`; integrar a `main` después de la validación del usuario.

## Decisiones confirmadas

| Pendiente | Decisión para esta fase |
| --- | --- |
| PEN-05, parte catálogo | Filtro y orden por **precio de lista**. Se muestran además precios de efectivo/transferencia. Promociones y precedencias quedan para Fase 3. |
| PEN-17 | Una existencia por SKU; ajuste manual para ventas fuera de la web. El stock inicial real lo carga el negocio. |
| PEN-19 | Crear/actualizar por SKU, rechazar duplicados, previsualizar antes de aplicar y conservar fotos y variantes ausentes del archivo. |

## Entrega local

- Productos, marcas y categorías: alta, edición, visibilidad y orden de grupos. Logo de marca opcional. Ocultar conserva registros; no se destruyen SKU ni historial.
- Variantes por sabor, tamaño o presentación opcionales; SKU único, ambos precios y stock entero por variante. Los agotados permanecen visibles.
- Galería de hasta 12 imágenes por producto: portada por orden, texto alternativo y asociación opcional a una variante. JPEG, PNG o WebP de hasta 5 MB; comprobación de firma y MIME.
- Catálogo y ficha: búsqueda con sugerencias nativas, franja de Categoría/Marca/Sabor/Ordenar, acción compacta y filtros activos que se pueden retirar individualmente. Precio y disponibilidad quedan en un desplegable. Stock, sabor y precio se comprueban sobre la misma variante. La tarjeta enlaza la variante que coincide.
- Galerías: cambio automático cada 3 segundos con fragmentación triangular y reconstrucción de 700 ms, siguiendo el movimiento del video `2026-10-10 21-59-08.mkv`. Inicio escalonado, imágenes centradas y dimensiones estables. Tarjetas sin flechas, barra, botón de pausa ni contador. Una sola fotografía distinta permanece estática. No requiere hover, clic ni scroll; se suspende fuera de pantalla, en pestañas ocultas, con foco de teclado o movimiento reducido. Fotos y variantes elegibles conservan su sincronización. La ficha sigue con selección manual, miniaturas y fundido simple.
- Inventario: ajuste desde el editor y umbral configurable de stock bajo, inicialmente 0. El listado señala variantes activas de productos visibles; también se puede ajustar stock de productos ocultos desde su editor.
- CSV y Excel `.xlsx`: plantilla, informe con precios/stock anteriores y resultantes, datos del producto y aplicación explícita. Una fila inválida bloquea todo el lote.
- Migración PostgreSQL con RLS, escritura transaccional, revisión del catálogo para impedir sobrescrituras entre sesiones y auditoría inmutable de cambios de precios y existencias.
- Administración real protegida por autorización del servidor y MFA, también al guardar y subir imágenes. Sin Supabase sigue bloqueada.

El esquema implementado está en [08_catalogo_fase_2.puml](plantuml/08_catalogo_fase_2.puml). Las páginas públicas leen el catálogo real; los datos ficticios nunca se usan como sustituto ante una falla del proveedor.

## Revisar sin Supabase

```text
npm.cmd run dev
```

Abrir `http://127.0.0.1:3000/vista-previa` para el catálogo y `http://127.0.0.1:3000/vista-previa/gestion` para la gestión. Son productos y marcas explícitamente ficticios. Los cambios e imágenes se guardan únicamente en ese navegador, mediante almacenamiento local. “Restablecer datos de prueba” permite volver al estado inicial.

Estas rutas solo funcionan con `APP_ENV=local`, URL del sitio local y host de la petición local. En otros ambientes devuelven 404. No habilitan el administrador ni llaman operaciones remotas. La vista previa requiere JavaScript; la navegación pública por categorías y filtros usa enlaces/formularios GET y se conserva sin JavaScript. Las fichas reales incluyen una alternativa GET para seleccionar presentación sin JavaScript.

Capturas con datos de prueba: [catálogo escritorio](previews/catalog-desktop.png), [catálogo móvil](previews/catalog-mobile.png), [ficha escritorio](previews/product-desktop.png), [ficha móvil](previews/product-mobile.png), [gestión escritorio](previews/manager-desktop.png) y [gestión móvil](previews/manager-mobile.png).

La revisión de filtros actualiza las capturas de catálogo. La [galería de variantes](previews/gallery-product.png) muestra imágenes sintéticas exclusivamente de prueba; no agrega fotografías ni reemplaza los productos guardados en el navegador del usuario. Para activar el cambio entre variantes, asociar una fotografía a cada SKU en gestión. Las variantes ocultas o excluidas por filtros no se recorren. Si se carga una sola variante con varias fotos, también se puede recorrer su galería.

La [secuencia de fragmentos](previews/gallery-fragments.png) muestra el estado inicial, la separación triangular, la reconstrucción y la siguiente fotografía asentada, con envases sintéticos de prueba. El efecto se comprobó a 320, 390, 768 y 1440 px, sin desbordamiento ni errores de navegador.

## Operación e importación

1. Crear las marcas y categorías antes de productos o importaciones. Sus URL identifican los grupos dentro del archivo.
2. Crear un producto, asignarle marca/categorías y cargar al menos una variante con SKU y precios positivos. Los atributos irrelevantes pueden dejarse vacíos. Activar “Visible en la tienda” para publicarlo.
3. Subir fotografías autorizadas, escribir su descripción y seleccionar la variante si corresponde. “Usar primero” adelanta la imagen una posición; la primera foto aplicable es la portada.
4. Descargar la plantilla CSV desde Carga masiva. Guardarla como CSV UTF-8 separado por coma o punto y coma, o como Excel `.xlsx` con la misma cabecera en la primera hoja.
5. Elegir el archivo, revisar el informe y pulsar “Aplicar importación”. Antes de ese paso el catálogo no cambia. Ante conflicto con otra sesión, recargar y preparar otra vez el lote.

| Columna | Regla |
| --- | --- |
| `producto_slug` | URL del producto padre, minúsculas y guiones; un SKU existente permanece en su producto. |
| `nombre`, `descripcion` | Datos compartidos por todas las filas del mismo producto; deben coincidir. |
| `marca`, `categorias` | URL de grupos existentes. Separar varias categorías con `\|`. |
| `sku` | Único en todo el catálogo y en el archivo. Se normaliza a mayúsculas. |
| `sabor`, `tamano`, `presentacion` | Opcionales; describen la variante. |
| `precio_lista`, `precio_efectivo` | ARS, positivos, hasta dos decimales, coma o punto decimal, sin separadores de miles. |
| `stock` | Entero de 0 a 1000000. |
| `visible` | `true` / `false`, corresponde al producto padre. La visibilidad de variantes existentes se conserva. |

Límites: 2 MB por archivo, 1000 filas de datos, 100 variantes y 12 fotos por producto. El catálogo completo enviado a guardar también debe caber en 2 MB; las imágenes viajan por separado. Excel tiene límites adicionales de entradas ZIP y tamaño declarado descomprimido. El lector no ejecuta fórmulas ni macros; no se admiten `.xls` o `.xlsm`. La plantilla no crea marcas/categorías implícitas ni baja variantes omitidas. SEO, etiquetas y fotos existentes se conservan al importar.

Las fotos se suben antes de guardar su asociación. Cancelar una edición o quitar una foto no elimina físicamente el archivo. Revisar limpieza de archivos huérfanos al conectar Storage. En la vista previa, imágenes grandes pueden agotar la cuota local; el error se informa y no se confirma el guardado.

## Verificación

- TypeScript y compilación de producción correctos.
- 32 pruebas unitarias/PostgreSQL: centavos exactos, validación, visibilidad, combinación de filtros, selección y orden de fotos por variante, CSV/Excel, conservación de datos, RLS, MFA, atomicidad, revisión entre sesiones y auditorías de precio/stock.
- 44 recorridos Chromium de escritorio/móvil: incluye la base de Fase 1, búsqueda, variantes agotadas, edición persistida, galería con una foto por variante y sincronización de precios/stock/enlace, respeto de filtros durante el cambio, retirada individual de filtros, pausa con foco de teclado y movimiento reducido en vivo, inicio automático a los tres segundos incluso con el puntero encima, ausencia de controles en las tarjetas, duración finita de los fragmentos, inicio escalonado, suspensión fuera de pantalla y cancelación con movimiento reducido, alta de marca/producto, ocultación, stock bajo, importaciones y límites de acceso.
- La revisión de filtros comprueba 320, 390, 768, 1024 y 1440 px, tanto con los filtros secundarios cerrados como abiertos, sin desbordamiento. Catálogo, ficha, gestión y editor conservan los recorridos de escritorio/móvil; las tablas extensas tienen desplazamiento dentro de su contenedor.
- Preferencias de movimiento reducido y navegación pública sin JavaScript conservadas. npm audit: sin vulnerabilidades conocidas reportadas al instalar las nuevas dependencias.

## Pendientes de integración y aceptación

- Crear Supabase de pruebas con el dueño, aplicar primero `202610100001_foundations.sql` y después `202610100002_catalog.sql` y provisionar al único administrador según [configuración](configuracion.md).
- Verificar Auth/MFA reales, lecturas públicas, guardados e importaciones desde dos sesiones, políticas RLS y subidas de Storage en ese proyecto. PGlite y la vista previa local no acreditan esta integración.
- Validar la interfaz con el usuario y cargar fotos, marcas, SKU, precios y existencias reales confirmados por el negocio.

No hay carrito, reservas, pedidos ni cobros en esta entrega. El descuento de stock por pago corresponde a Fase 4. La Fase 3 requiere su validación y resolver las reglas comerciales pendientes; la cinemática del león continúa reservada a la etapa posterior.
