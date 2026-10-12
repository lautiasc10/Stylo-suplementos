# Rediseño de experiencia STYLO — Fase 3

Solicitud del usuario del 12 de octubre de 2026. Rama `fase-3-rediseno-ux`; no incorpora pagos ni nuevas reglas comerciales.

## Auditoría inicial

- El carrito carece de fotografías y muestra dos importes por línea sin identificar precio unitario. SKU, avisos y explicaciones repetidas compiten con la acción de compra.
- El lateral desplaza todo su contenido, incluido el resumen. Su encabezado y acción principal desaparecen en selecciones largas.
- Quitar un producto actúa inmediatamente, sin prevención de errores.
- Panel, tablas y formularios usan el mismo fondo negro y bordes muy tenues; cuesta distinguir navegación, contenido y acciones.
- Las acciones en tablas aumentan demasiado la altura de cada fila. Estados «visible/oculto» se presentan como texto sin jerarquía.
- El editor mezcla información principal, SEO, fotografías y variantes en un recorrido largo. Guardar está al final y los mensajes quedan lejos del formulario.
- El foco no tiene una regla general para todos los controles. Contornos de algunos campos no alcanzan contraste suficiente para distinguirlos del fondo.

## Dirección visual

Conservar negro `#080808`, dorado `#DAAB4C`, blanco, Montserrat e Inter y archivos oficiales. Usar superficies oscuras diferenciadas, bordes legibles, espaciado de la escala existente y radios moderados. El dorado distingue la acción principal y la selección; el estado se comunica también con palabras. No añadir afirmaciones comerciales, métricas ficticias, secciones inexistentes ni fotografías generadas.

Carrito: fotografía de la variante elegida, identidad y presentación agrupadas, precio unitario y subtotal explícitos, control de cantidad integrado y eliminación confirmada. Un resumen común calcula los mismos importes actuales; el lateral mantiene encabezado y acción visibles con desplazamiento interior de productos.

Administración: navegación por tareas, encabezados compactos, datos reales del catálogo, filas legibles, acciones principales y secundarias diferenciadas. Editor con secciones identificables y navegación interna; opciones de SEO plegables, sin cambiar validación ni envío.

Accesibilidad: controles cómodos, foco visible, labels reales, mensajes anunciados, diseño a 320 px, teclado y movimiento reducido. Referencia de evaluación: [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). Una revisión técnica de estas vistas no constituye certificación integral.

## Verificación

- Compilación de producción y comprobación TypeScript correctas.
- 58 pruebas unitarias/PostgreSQL correctas: precios, promociones, stock, permisos, MFA e idempotencia; incluye selección de fotografía de variante, alternativa general y rechazo de fotos de otra presentación. Las nuevas pruebas verifican autorización previa a las lecturas del panel, carga paralela, límite de pedidos y errores parciales. Tres pruebas de componentes verifican la navegación local hacia y desde Resumen y la alternativa protegida antes de cargar el panel.
- 92 recorridos Chromium correctos, en escritorio y emulación móvil. Cubren catálogo, edición/importación, carrito, promociones, checkout de revisión, ventas manuales y protección administrativa. Última ejecución en PowerShell: `$env:PLAYWRIGHT_PORT='3001'; npx.cmd playwright test --workers=4`, con credenciales vacías y sin escrituras en Supabase.
- Recorridos nuevos: fotografía y fallo de imagen, cambio de visualización de precios, confirmación/cancelación de eliminación, foco al cerrar el lateral y al eliminar, carrito largo y pantalla horizontal, navegación administrativa y cambio de tamaño, edición por secciones, 320/768/1024 px sin desbordamiento.
- Revisión visual a 390/1440 px con movimiento reducido, sin excepciones de JavaScript en las capturas. Se conserva navegación pública sin JavaScript y acciones de servidor de carrito; los selectores que recalculan la presentación del precio permanecen deshabilitados hasta la hidratación.
- Contrastes medidos del sistema: texto secundario sobre superficie elevada 8,86:1; dorado sobre superficie elevada 8,30:1; texto negro sobre botón dorado 9,45:1; borde de control sobre superficie elevada 3,71:1. Los estados también se comunican con texto y foco visible.

Se corrigió durante las pruebas una actualización tardía de URL que podía cerrar una edición recién abierta. El menú administrativo se abre al volver a escritorio aunque hubiera quedado cerrado en celular. Una ejecución con ocho workers registró un timeout aislado de hidratación en una vista previa; ese recorrido pasó individualmente y la suite completa pasó después con cuatro workers.

No se añadieron dependencias ni migraciones, ni se modificaron precios, cobros, cálculo de promociones, pedidos o permisos. El carrito persistido sigue guardando solo identificadores y cantidades; la foto y la marca son datos de presentación recuperados del catálogo. Una carga tardía de un carrito cerrado no sobrescribe el estado actual.

El panel se verificó con datos locales de prueba, usando los mismos componentes de la gestión privada. No se contó con una sesión autenticada del administrador para repetir escrituras remotas. Chromium móvil no acredita Safari/iOS físico, ni estas comprobaciones certifican integralmente WCAG. Los pagos y la entrega conservan sus pendientes de Fase 3.

## Capturas

### Navegación del catálogo

La comparación detectó dos recorridos diferentes: las pestañas cambiaban el estado local inmediatamente y luego ejecutaban `router.replace`; el lateral esperaba la navegación de Next antes de mostrar la sección. En la ruta privada esa navegación vuelve a ejecutar la comprobación de acceso y la consulta del catálogo. Una comprobación con respuesta de ruta demorada artificialmente 500 ms en la vista previa confirmó la diferencia: la nueva sección ya era visible después del clic en la pestaña, pero todavía no después del clic en el lateral. Esta demora controlada no representa una medición de latencia de Supabase.

El lateral usa el cambio de sección mediante la [History API integrada en Next](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api). Se retiraron las pestañas superiores a pedido del usuario para evitar duplicar la navegación. El catálogo cargado se conserva; la URL es la única fuente de selección y se mantienen sus otros parámetros. No hay solicitudes de página al recorrer productos, marcas, categorías y carga masiva dentro del catálogo. Atrás/Adelante recuperan la sección y la recarga respeta el enlace directo. Cambiar de sección limpia los borradores como antes; pulsar la sección activa conserva la edición.

Los enlaces siguen admitiendo otra pestaña y navegación normal sin JavaScript; las tareas de edición conservan su requisito de JavaScript. Guardados, permisos y comprobaciones de servidor no cambian. Las seis verificaciones de esta primera revisión bloquean las solicitudes de sección y recorren historial, recarga, teclado, borradores, apertura en otra pestaña y entrada desde promociones.

### Navegación entre tareas administrativas

La revisión siguiente extiende el mismo comportamiento a Productos, Ventas y retiros y Promociones, incluido el Resumen que se abre después de iniciar sesión. Comparten un layout persistente bajo el grupo `(gestion)`; sus URLs públicas permanecen iguales. Tras verificar administrador y MFA se leen catálogo, promociones y los últimos 50 registros en paralelo. Los cambios del lateral y los accesos del Resumen seleccionan componentes del mismo panel y actualizan el historial, sin esperar otra navegación de servidor. La carga inicial se realiza una vez al entrar al grupo, con estado de preparación; salir a la tienda conserva la navegación normal.

El estado compartido vive en memoria mientras el panel está abierto. Los resultados confirmados de catálogo y promociones se incorporan al panel; los registros recién creados permanecen al cambiar de tarea y disparan una lectura autenticada para actualizar registros y existencias. Al recuperar el foco se sincroniza en segundo plano; al volver a una tarea o pestaña visible se consulta si pasaron 30 segundos desde la última lectura. Las solicitudes simultáneas se agrupan y los resultados iniciados antes de un guardado no sobrescriben sus cambios. Las revisiones evitan reemplazar catálogo o promociones por versiones anteriores. Un error de sincronización conserva los datos existentes y ofrece reintentar; una carga inicial fallida identifica la sección no disponible.

No se usa almacenamiento local para datos administrativos reales, no se altera RLS, ni se relajan las comprobaciones de cada guardado, subida o nueva lectura. Una entrada directa, recarga o pestaña nueva sigue pasando por el layout protegido. La vista previa usa el mismo panel con datos ficticios y sus reglas locales existentes; sus registros temporales ahora sobreviven los cambios entre tareas, hasta cerrar o recargar el panel.

Cuatro nuevos recorridos de escritorio y celular bloquean las solicitudes de página y verifican cambios repetidos entre las tres tareas, selección lateral, teclado, historial, recarga, promociones guardadas, registros conservados y stock tras una venta. También se amplió el rechazo de acceso directo a todas las rutas de gestión. Las tres pruebas nuevas de lectura comprueban que no se consultan pedidos antes de autorizar, ni al rechazar acceso, y que los errores no se confunden con un listado vacío. No se realizaron escrituras remotas ni se midió una sesión privada autenticada de Supabase.

La revisión completa detectó una carrera intermitente en la prueba existente de movimiento reducido: adelantaba el reloj simulado antes de recibir el cambio de preferencia del navegador. Se añadió una espera por la pausa de la galería antes de adelantar ese reloj. No se modificó la animación de las fotografías.

### Productos y revisión de Resumen

La última revisión sustituye la tabla de Productos por una grilla con fotografía y nombre. Toda la tarjeta abre la edición, también con Enter o Espacio. Se usan fotografías guardadas, priorizando la primera presentación y recurriendo a otra foto del mismo producto cuando aquella no tiene imagen. Sin foto o ante un error se conserva el nombre con un indicador accesible. Las tarjetas mantienen proporciones y distribuyen cuatro columnas a 1440 px y dos a 390 px; a 320/768/1440 px no desbordan. Los productos ocultos siguen disponibles para editar y su visibilidad se configura en «Visible en la tienda». El bloque de inventario sigue separado y conserva sus funciones.

El foco entra al nombre al crear o editar; cancelar, volver o guardar lo devuelve al producto correspondiente o al botón de creación. Los nuevos recorridos comprueban fotografía, alternativa ante fallo, apertura con teclado, guardado, retorno de foco y ausencia de tabla y pestañas superiores. Se actualizaron y revisaron las capturas de Productos con envases sintéticos marcados PRUEBA, exclusivamente en la vista previa local; no se añadieron fotos al catálogo del usuario.

Resumen ya pertenece al panel persistente y no ejecuta una lectura propia al seleccionarlo. Se comprobaron los manejadores reales de sus enlaces mediante pruebas de componentes, con hooks y navegador simulados: desde las tres tareas usan el historial local y sus accesos vuelven a las tareas por el mismo mecanismo. La entrada directa conserva el layout autorizado. Esto no mide la latencia de una sesión Supabase autenticada.

### Revisión de gestión del 12 de octubre

Ventas y retiros y Promociones comienzan con el listado y una acción de crear. El formulario sustituye al listado al crear o editar; guardar correctamente vuelve al listado y cancelar descarta el borrador sin escribir. Reabrir creación presenta campos vacíos. Los errores conservan el formulario para corregirlo. El foco entra al primer campo y vuelve al botón de creación al cerrar.

Marcas y categorías pasan de cinco columnas a cuatro: nombre con URL y descripción cuando corresponde, estado textual, orden y acción «Editar» con nombre accesible específico. Se conservan los logos cargados. Las columnas secundarias tienen anchos definidos y las URLs largas se parten sin desbordar. En celular las filas se presentan en bloques con etiquetas de estado y orden, conservando la semántica de tabla. Los formularios tienen título y acciones agrupadas; al cerrar o guardar, el foco vuelve al botón que abrió la edición.

La siguiente revisión unifica productos, marcas, categorías, promociones y ventas/retiros mediante un componente de tabla común. Comparten cabeceras, espaciado, estados, bordes y transformación a bloques por debajo de 1200 px. Las promociones muestran identificación, estado, ambos precios y acciones. Ventas/retiros muestran cliente, teléfono cuando existe, productos y cantidades del registro, fecha y hora, estado de cobro/entrega y total. Se retira la referencia UUID de la presentación; se conserva internamente para identidad e idempotencia. El detalle proviene del snapshot histórico, tanto de la forma local como de la devuelta por PostgreSQL, sin reconstruir precios o productos desde el catálogo actual. Si un registro no incluye detalle, se indica su ausencia.

Las acciones de fila usan iconos de 48 px, etiquetas accesibles específicas, título y descripción al enfocar con teclado. Se mantienen las confirmaciones de eliminación. Crear, guardar y cancelar conservan texto; todas las acciones de formulario terminan con cancelar a la izquierda y guardar a la derecha. Marcas/categorías ahora ocultan el listado mientras se edita, como los otros módulos. Los formularios comparten superficies, leyendas, campos y espaciado; el producto mantiene sus secciones de variantes, fotografías y SEO. Se retiran reglas de tabla antiguas sustituidas por el sistema común.

Se verificaron apertura/cancelación sin guardado, reapertura limpia, edición de combos, guardado de ventas y retiros, estado y orden de marcas/categorías y nombres/URLs extensos a 320/768/1440 px. También se verificaron las acciones con teclado, sus descripciones y tamaño, activación/pausa de promociones, teléfono y productos del retiro y ausencia de referencias técnicas en la tabla. Compilación y 52 pruebas unitarias/PostgreSQL correctas; suite completa de 80 recorridos Chromium correcta. Se actualizaron y revisaron capturas de escritorio y celular con movimiento reducido, sin excepciones JavaScript ni desbordamiento. Estas pruebas usan datos ficticios locales y no escriben en el proyecto Supabase del usuario.

Las imágenes de revisión de gestión y compra usan datos ficticios de la vista previa, claramente identificados. Los marcadores de fotografía indican que esos datos de prueba no contienen fotos comerciales; no se sustituyeron fotografías reales por imágenes de marca o generadas.

| Vista                | Escritorio                                                | Celular                                                  |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Carrito lateral      | [Captura](previews/rediseno-cart-desktop.png)             | [Captura](previews/rediseno-cart-mobile.png)             |
| Gestión del catálogo | [Captura](previews/rediseno-admin-desktop.png)            | [Captura](previews/rediseno-admin-mobile.png)            |
| Editor de producto   | [Captura](previews/rediseno-editor-desktop.png)           | [Captura](previews/rediseno-editor-mobile.png)           |
| Checkout             | [Captura](previews/rediseno-checkout-desktop.png)         | [Captura](previews/rediseno-checkout-mobile.png)         |
| Promociones          | [Captura](previews/rediseno-promotions-desktop.png)       | [Captura](previews/rediseno-promotions-mobile.png)       |
| Crear promoción      | [Captura](previews/rediseno-promotion-editor-desktop.png) | [Captura](previews/rediseno-promotion-editor-mobile.png) |
| Ventas y retiros     | [Captura](previews/rediseno-orders-desktop.png)           | [Captura](previews/rediseno-orders-mobile.png)           |
| Crear venta o retiro | [Captura](previews/rediseno-order-editor-desktop.png)     | [Captura](previews/rediseno-order-editor-mobile.png)     |
| Marcas               | [Captura](previews/rediseno-brands-desktop.png)           | [Captura](previews/rediseno-brands-mobile.png)           |
| Categorías           | [Captura](previews/rediseno-categories-desktop.png)       | [Captura](previews/rediseno-categories-mobile.png)       |
| Portada              | [Captura](previews/rediseno-home-desktop.png)             | [Captura](previews/rediseno-home-mobile.png)             |
