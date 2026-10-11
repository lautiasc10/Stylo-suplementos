# Fase 3 — Comercio

Autorizada por el usuario el 11 de octubre de 2026. Rama: `fase-3-comercio`, creada desde la última entrega de `fase-2-catalogo` sin integrarla a `main`. Desarrollo sin gastos, dominio ni servicios nuevos. La vista previa sigue separada de la tienda y del administrador real.

## Decisiones de esta revisión

- El administrador configura **dos precios finales**, lista y efectivo/transferencia, para rebajas, promociones por cantidad y combos.
- Para cantidad, el precio final es **por unidad** al alcanzar el mínimo de esa presentación. Para combos, el precio final corresponde al conjunto definido; se repiten solo conjuntos completos y los sobrantes conservan su precio base.
- Se conserva la regla de no acumulación. El usuario delegó la elección del criterio: aplicar una sola promoción, la que más dinero ahorre en el carrito según el medio de pago. Un empate se resuelve por identificador estable; una oferta nunca aumenta el importe habitual.
- Una compra online se convierte en pedido tras verificar el pago. «Pendiente» después de pagar corresponde a preparación/entrega, sin confundirlo con un pago pendiente.
- El administrador puede cargar manualmente un pedido para retirar, pendiente de cobro. No se considera pagado por registrarlo.

La decisión de pedidos no define todavía una reserva temporal ni su plazo. Esta entrega no reserva ni descuenta stock en el carrito o en la carga manual; esa política y la confirmación de cobros se resuelven en Fase 4 antes de operar ventas. Los cupones del documento rector conservan sus condiciones pendientes y no se habilitan en esta revisión.

## Entrega implementada

- Carrito lateral accesible desde la cabecera de las páginas comerciales y página `/carrito`. Agrega la variante elegida desde la ficha, reúne cantidades por SKU, elimina líneas y muestra ambos subtotales y promociones aplicadas. Las tarjetas y su animación conservan su estructura.
- Modal nativo `dialog`, cierre con Escape y clic exterior, foco contenido y retorno al control de apertura; bloquea el scroll del fondo y desactiva su entrada con movimiento reducido.
- Carrito real persistido por 30 días en cookie HttpOnly con identificadores y cantidades, nunca importes o datos del comprador. El servidor vuelve a consultar catálogo y promociones para cada modificación y revisión. Rechaza cantidades superiores al stock o presentaciones ocultas; una presentación retirada permanece identificable para quitarla. Límite: 30 presentaciones y 999 unidades por presentación, dentro de su existencia real.
- Checkout invitado en `/checkout`: contacto, selector de medio de pago y resumen. Mercado Pago usa lista; transferencia y efectivo usan la tarifa correspondiente. DNI/contacto no se guardan en el navegador ni se incluyen en URLs. La revisión vuelve a calcular el subtotal y actualiza el resumen.
- Gestión de rebajas, cantidad y combos: crear, editar, pausar/reactivar y quitar promociones; precios finales independientes, componentes por SKU e inicio/fin opcionales. La vigencia se evalúa al calcular precios, con inicio inclusivo y fin exclusivo. Campos de fechas en hora del navegador, almacenados como instantes ISO.
- Carga manual de retiros: cliente y teléfono opcional, presentaciones y cantidades. PostgreSQL calcula los importes a partir del catálogo/promociones; no recibe precios del formulario. Guarda una instantánea y una referencia idempotente: un reintento idéntico devuelve el mismo pedido; un reintento con otros datos se rechaza. Estado inicial: pago pendiente y retiro pendiente. No permite marcarlo como pagado desde esta entrega.
- Migración `202610110001_commerce.sql`: configuración versionada, lectura pública de promociones activas, escritura del administrador con MFA, órdenes privadas y auditoría. Bloqueos de revisión evitan sobrescribir promociones de otra sesión. El cálculo y el registro manual se ejecutan dentro de una transacción; las instantáneas no permiten modificaciones directas.

La revisión del checkout **no confirma una compra, genera un pedido online ni cobra**. Todavía no se configuran tarifas/direcciones de entrega, Checkout Pro, instrucciones bancarias o confirmaciones por email. Se muestran estos límites sin inventar un costo de envío ni contactos del negocio. Corresponden a la siguiente fase e integración externa.

## Revisar sin Supabase

Con `npm.cmd run dev`, abrir:

- `/vista-previa`: catálogo local existente.
- `/vista-previa/producto/proteina-de-prueba`: agregar una presentación al carrito de prueba.
- `/vista-previa/carrito` y `/vista-previa/checkout`: cantidades, importes y revisión invitada.
- `/vista-previa/promociones`: administrar ofertas ficticias; los cambios se guardan en este navegador.
- `/vista-previa/pedidos`: registrar retiros ficticios, conservados únicamente mientras esa pantalla permanece abierta.

Las nuevas rutas heredan la restricción de ambiente/host local. El carrito de prueba usa almacenamiento independiente del catálogo y del carrito real. No se reemplazan ni modifican los productos previamente cargados por el usuario. Usar datos ficticios en las pruebas. La revisión invitada no persiste contacto ni DNI. La carga manual de prueba tampoco los envía a Supabase.

En un entorno configurado, `/admin/promociones` y `/admin/pedidos` requieren administrador y MFA también al guardar. Sin Supabase permanecen bloqueados. Aplicar las tres migraciones en orden únicamente en el proyecto de pruebas cuando esté disponible; no se ejecutó ninguna migración remota en esta entrega.

Capturas con datos ficticios: carrito [escritorio](previews/cart-desktop.png) / [celular](previews/cart-mobile.png), checkout [escritorio](previews/checkout-desktop.png) / [celular](previews/checkout-mobile.png), y [promociones](previews/promotions-desktop.png).

## Verificación

- TypeScript y compilación de producción correctos.
- 47 pruebas unitarias/PostgreSQL: catálogo y seguridad anteriores, centavos exactos, stocks, cantidades, no acumulación, combos completos, ofertas por medio de pago, fechas, validación invitada, RLS/MFA, registro manual idempotente, rechazo de cambios de payload y coincidencia entre los motores TypeScript/PostgreSQL.
- 62 recorridos Chromium de escritorio/celular: incluye los 52 anteriores y carrito, recuperación local, stock insuficiente, restauración de foco, movimiento reducido, separación entre prueba/tienda, creación/edición de promociones, importes del checkout, privacidad y carga manual sin duplicación.
- Revisión visual en 320, 390, 768, 1024 y 1440 px, sin desbordamiento ni errores de navegador.
- Navegación pública sin JavaScript conservada. La cabecera enlaza `/carrito`; los formularios de productos/cantidades reales tienen acciones de servidor. Se retiró el fallback automático de carga del catálogo porque podía impedir mostrar los resultados sin JavaScript. El checkout conserva aviso de revisión con JavaScript y envíos POST, sin datos personales en URLs; las vistas previas y gestión requieren JavaScript.

PostgreSQL en memoria no acredita Supabase remoto. Chromium no acredita Safari/iOS ni dispositivos físicos.

## Pendientes antes de habilitar compras

- Configurar Supabase de pruebas y verificar autenticación, acciones, cookies, auditoría y privacidad remotas.
- Integrar pago verificado, intentos de cobro, conciliación y creación única de pedidos online pagados en Fase 4. No existe un endpoint público capaz de crear o marcar un pedido pagado en esta entrega.
- Resolver concurrencia al cobrar la última unidad y la política de reservas/expiración, incluyendo encargos manuales.
- Definir entregas y costos, instrucciones bancarias, confirmación de cobro al retirar y avisos transaccionales.
- Validar con el usuario la interfaz y la interpretación «precio por unidad desde una cantidad mínima»; completar las condiciones de cupones, textos legales y consentimiento antes del lanzamiento.

Esta entrega deja el comercio revisable, con pedidos manuales protegidos preparados para Supabase. No acredita compras completas ni da por cerradas las condiciones de aceptación de pagos y logística.
