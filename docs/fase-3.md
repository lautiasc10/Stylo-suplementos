# Fase 3 — Comercio

Autorizada por el usuario el 11 de octubre de 2026. Rama: `fase-3-comercio`, creada desde la última entrega de `fase-2-catalogo` sin integrarla a `main`. Desarrollo sin gastos, dominio ni servicios nuevos. La vista previa sigue separada de la tienda y del administrador real.

## Decisiones de esta revisión

- El administrador configura **dos precios finales**, lista y efectivo/transferencia, para rebajas, promociones por cantidad y combos.
- Para cantidad, el precio final es **por unidad** al alcanzar el mínimo de esa presentación. Para combos, el precio final corresponde al conjunto definido; se repiten solo conjuntos completos y los sobrantes conservan su precio base.
- Se conserva la regla de no acumulación. El usuario delegó la elección del criterio: aplicar una sola promoción, la que más dinero ahorre en el carrito según el medio de pago. Un empate se resuelve por identificador estable; una oferta nunca aumenta el importe habitual.
- Una compra online se convierte en pedido tras verificar el pago. «Pendiente» después de pagar corresponde a preparación/entrega, sin confundirlo con un pago pendiente.
- El administrador puede cargar manualmente un pedido para retirar, pendiente de cobro. No se considera pagado por registrarlo.

La tienda admite únicamente **transferencia y Mercado Pago**, según la revisión solicitada el 11 de octubre. El efectivo queda exclusivamente en administración, para ventas presenciales ya cobradas y entregadas, con confirmación explícita del administrador.

El carrito y los retiros manuales pendientes no reservan ni descuentan stock. Una venta presencial confirmada sí descuenta stock, congela importes y registra movimiento y auditoría de forma atómica e idempotente; incrementa la revisión del catálogo para evitar sobreescrituras desde gestión. La política de reservas y los cobros online se resuelven en Fase 4. Los cupones conservan sus condiciones pendientes.

## Entrega implementada

- Carrito lateral accesible desde la cabecera de las páginas comerciales y página `/carrito`. Agrega la variante elegida desde la ficha, reúne cantidades por SKU, elimina líneas y muestra ambos subtotales y promociones aplicadas. Las tarjetas y su animación conservan su estructura.
- Modal nativo `dialog`, cierre con Escape y clic exterior, foco contenido y retorno al control de apertura; bloquea el scroll del fondo y desactiva su entrada con movimiento reducido.
- Carrito real persistido por 30 días en cookie HttpOnly con identificadores y cantidades, nunca importes o datos del comprador. El servidor vuelve a consultar catálogo y promociones para cada modificación y revisión. Rechaza cantidades superiores al stock o presentaciones ocultas; una presentación retirada permanece identificable para quitarla. Límite: 30 presentaciones y 999 unidades por presentación, dentro de su existencia real.
- Checkout invitado en `/checkout`: contacto, selector de medio de pago y resumen. Mercado Pago usa lista; transferencia usa su precio correspondiente. Efectivo también se rechaza en el servidor. DNI/contacto no se guardan en el navegador ni se incluyen en URLs. La revisión recalcula el subtotal y actualiza el resumen.
- Gestión de rebajas, cantidad y combos: crear, editar, pausar/reactivar y quitar promociones; precios finales independientes, componentes por SKU e inicio/fin opcionales. La vigencia se evalúa al calcular precios, con inicio inclusivo y fin exclusivo. Campos de fechas en hora del navegador, almacenados como instantes ISO.
- Carga manual de retiros o ventas presenciales: cliente, teléfono opcional, presentaciones y cantidades. PostgreSQL calcula los importes vigentes sin confiar en precios del formulario. Una referencia idempotente evita duplicados; un reintento con otros datos se rechaza. Un retiro queda pendiente de cobro y entrega; una venta en efectivo exige confirmar cobro y entrega y descuenta existencias una sola vez.
- Migración `202610110001_commerce.sql`: configuración versionada, lectura pública de promociones activas, escritura del administrador con MFA, órdenes privadas y auditoría. Bloqueos de revisión evitan sobrescribir promociones de otra sesión. El cálculo y el registro manual se ejecutan dentro de una transacción; las instantáneas no permiten modificaciones directas.

La revisión del checkout **no confirma una compra, genera un pedido online ni cobra**. Todavía no se configuran tarifas/direcciones de entrega, Checkout Pro, instrucciones bancarias o confirmaciones por email. Se muestran estos límites sin inventar un costo de envío ni contactos del negocio. Corresponden a la siguiente fase e integración externa.

## Revisar sin Supabase

Con `npm.cmd run dev`, abrir:

- `/vista-previa`: catálogo local existente.
- `/vista-previa/producto/proteina-de-prueba`: agregar una presentación al carrito de prueba.
- `/vista-previa/carrito` y `/vista-previa/checkout`: cantidades, importes y revisión invitada.
- `/vista-previa/promociones`: administrar ofertas ficticias; los cambios se guardan en este navegador.
- `/vista-previa/pedidos`: registrar retiros o ventas en efectivo ficticias. Registros y contactos se conservan solo mientras esa pantalla está abierta. Una venta confirmada actualiza el stock del catálogo local, preservando sus imágenes.

Las nuevas rutas heredan la restricción de ambiente/host local. El carrito de prueba usa almacenamiento independiente del catálogo y del carrito real. No se reemplazan ni modifican los productos previamente cargados por el usuario. Usar datos ficticios en las pruebas. La revisión invitada no persiste contacto ni DNI. La carga manual de prueba tampoco los envía a Supabase.

En un entorno configurado, `/admin/promociones` y `/admin/pedidos` requieren administrador y MFA también al guardar. Sin Supabase permanecen bloqueados. Aplicar las **cuatro migraciones** en orden únicamente en el proyecto de pruebas cuando esté disponible. `202610110002_manual_cash_sales.sql` agrega ventas presenciales sin modificar la migración ya entregada. No se ejecutó ninguna migración remota.

Capturas con datos ficticios: carrito [escritorio](previews/cart-desktop.png) / [celular](previews/cart-mobile.png), checkout [escritorio](previews/checkout-desktop.png) / [celular](previews/checkout-mobile.png), [promociones](previews/promotions-desktop.png), gestión [escritorio](previews/management-desktop.png) / [celular](previews/management-mobile.png), y [ofertas antes de agregar al carrito](previews/product-offer-desktop.png).

## Diseño revisado

El panel privado incorpora navegación lateral con sección actual identificada, accesos por tarea, campos agrupados y acciones separadas. Productos presenta tarjetas con fotografía y nombre; clic o teclado abre su editor, sin navegación superior duplicada. Promociones y registros manuales separan listado y formulario, con estados vacíos explícitos y botones de 48 px.

El carrito usa icono de carrito, tarjetas por presentación y resumen lateral en escritorio; en celular, una columna. Se distingue cuándo los importes de cada línea son anteriores a promociones y se destacan los ahorros en el resumen. El checkout muestra solo dos medios de pago, con selección visible.

Las ofertas activas se muestran en catálogo y ficha antes de agregar: precio rebajado y precio anterior, cantidad mínima y precio por unidad, o componentes enlazados y precio del combo completo. Se omiten ofertas vencidas, futuras, sin ahorro o sin existencias suficientes. Se conserva la regla de mayor ahorro y no acumulación. El contexto de ofertas recibe únicamente las presentaciones referenciadas, sin duplicar las fotos del catálogo.

## Verificación

- TypeScript y compilación de producción correctos.
- 51 pruebas unitarias/PostgreSQL: incluye catálogo, precios, promociones, RLS/MFA e idempotencia; suma ofertas antes de comprar y ventas presenciales con stock, revisión y auditoría, sin duplicados.
- 64 recorridos Chromium de escritorio/celular: catálogo, carrito, recuperación local, stock, foco, movimiento reducido, separación prueba/tienda, promociones antes de agregar, checkout con dos medios, privacidad y ventas/retiros sin duplicación.
- Revisión visual en 320, 390, 768, 1024 y 1440 px, sin desbordamiento ni errores de navegador.
- Navegación pública sin JavaScript conservada. La cabecera enlaza `/carrito`; los formularios de productos/cantidades reales tienen acciones de servidor. Se retiró el fallback automático de carga del catálogo porque podía impedir mostrar los resultados sin JavaScript. El checkout conserva aviso de revisión con JavaScript y envíos POST, sin datos personales en URLs; las vistas previas y gestión requieren JavaScript.

PostgreSQL en memoria no acredita Supabase remoto. Chromium no acredita Safari/iOS ni dispositivos físicos.

El 12 de octubre se conectó el proyecto del usuario mediante `.env.local`, excluido de Git. `catalog_snapshot` y `commerce_promotions` responden correctamente; el registro público está desactivado. El acceso anónimo a administradores, auditoría y pedidos se rechaza con `42501`. Catálogo público y redirección del panel sin sesión verificados en Chromium, con y sin JavaScript y movimiento reducido. No se ejecutaron escrituras remotas desde el agente.

En la misma sesión, el usuario confirmó el ingreso con autenticador, el guardado de productos y el recorrido de catálogo/carrito. Después confirmó funcionamiento de las pruebas propuestas de promociones y pedidos manuales: retiro sin descuento de existencias y venta presencial confirmada con descuento único. Se registra como validación funcional informada por el usuario, no como una prueba automatizada remota. El detalle de Storage, cookies y auditoría con sesión autenticada sigue pendiente de comprobación específica.

El 13 de octubre se aplica la paleta y tipografía solicitada por el usuario: negro #050505, comercial #080808, dorado #D8B474, blanco cálido #ECE9E1 y gris #92928D. Arial del sistema reemplaza las fuentes cargadas; títulos 800, marca textual STYLO 900 en cursiva y botones 600. Se conservan logos y fotos, con detalle y capturas actuales en la auditoría de rediseño.

## Pendientes antes de habilitar compras

El rediseño profundo solicitado el 12 de octubre se entrega en la rama separada `fase-3-rediseno-ux`. Conserva las reglas comerciales y añade fotografías de variante en el carrito, controles de cantidad integrados, confirmación al quitar, resumen visible, navegación administrativa por tareas, editor agrupado y controles visuales accesibles. La revisión posterior separa la creación de ventas/retiros y promociones del listado, y unifica tablas, formularios y acciones con iconos de productos, marcas, categorías, promociones y ventas/retiros para escritorio y celular. Los registros muestran datos de cliente, productos, fecha, estado y total sin referencia técnica visible. La última revisión convierte Productos en una grilla de fotos y nombres que abre el editor y verifica la navegación local de Resumen. Compilación, 58 pruebas unitarias/PostgreSQL y 92 recorridos Chromium correctos; detalle, limitaciones y capturas en [la auditoría del rediseño](rediseno-ux.md). No se integra esta rama hasta la revisión del usuario.

- Completar las comprobaciones específicas de imágenes en Storage, cookies y auditoría con sesión autenticada. Lectura pública y rechazo anónimo de datos privados comprobados por el agente; ingreso, productos, carrito, promociones y pedidos manuales validados funcionalmente por el usuario.
- Integrar pago verificado, intentos de cobro, conciliación y creación única de pedidos online pagados en Fase 4. No existe un endpoint público capaz de crear o marcar un pedido pagado en esta entrega.
- Resolver concurrencia al cobrar la última unidad y la política de reservas/expiración, incluyendo encargos manuales.
- Definir entregas y costos, instrucciones bancarias, confirmación de cobro al retirar y avisos transaccionales.
- Validar con el usuario la interfaz y la interpretación «precio por unidad desde una cantidad mínima»; completar las condiciones de cupones, textos legales y consentimiento antes del lanzamiento.

Esta entrega deja el comercio revisable, con pedidos manuales protegidos preparados para Supabase. No acredita compras completas ni da por cerradas las condiciones de aceptación de pagos y logística.
