# Fase 3AT — Ventas, retiros, costos e historial

Rama `fase-3at-admin-ventas` creada desde `main` para mantenerla separada de la Fase 3AS, aún pendiente de integración. No se aplicó la nueva migración ni se modificaron datos reales. Conserva la identidad del administrador y el catálogo actual.

## Estructuras revisadas y reglas

- `commerce_orders` registra pedidos manuales pendientes (`pending/pending_pickup`) y ventas presenciales ya cobradas (`paid/delivered`), con precio, líneas y promoción congelados en `snapshot`. Antes de esta fase no había estado «Retirado», fecha de cobro/retiro ni transición para completar el pedido.
- `create_manual_pickup_order` no reserva stock; `create_manual_cash_sale` descuenta en la misma transacción y es idempotente por `request_id`. Ambas vuelven a calcular el precio en PostgreSQL. La nueva transición usa los importes congelados del pedido, comprueba existencias al cobrar y descuenta una sola vez.
- El catálogo guarda SKU, variante y stock; no guarda costos de compra. Los costos se separan en `catalog_variant_costs` con RLS y solo acceso de administrador con MFA. No aparecen en el RPC público del catálogo ni se suman a los documentos de producto.
- El resumen anterior recorría páginas de pedidos para sumar el mes. Ventas solo cargaba los últimos 50. Ahora un agregado privado calcula 12 meses en la base y la lista pide solo diez filas por página, con conteo exacto y filtros en la base.

## Comportamiento

- El selector largo del editor de ventas se reemplaza por búsqueda por nombre, marca, SKU, sabor y presentación. Los resultados informan existencias; una variante agotada o una cantidad excesiva bloquean el guardado con una advertencia específica. El servidor y PostgreSQL conservan sus validaciones definitivas.
- Un retiro pendiente puede confirmarse como cobrado y «Retirado». Guarda `paid_at` y `picked_up_at`, agrega movimiento de inventario y auditoría. Un reintento del mismo pedido devuelve el resultado previo; si el stock ya no alcanza, el pedido queda pendiente y no hay decrementos parciales.
- La tabla compacta presenta fecha, cliente, estado y total. Por defecto muestra el mes argentino actual. Tiene diez filas por página, nombre del cliente, estado, mes anterior, últimos tres meses, año actual y rango personalizado. Al abrir una fila muestra líneas, SKU, cantidades, importes, promoción, pago y fechas sin navegar. Las fechas de la lista usan `operation_at`: cobro de pedidos completados y creación de los pendientes. No se borran registros al comenzar un mes.
- Resumen: facturación cobrada neta de devoluciones registradas, número de ventas, ganancia solo si todas las ventas del mes tienen costo histórico, ticket promedio y pedidos pendientes. Reposición conserva información actual, señala variantes agotadas y enlaza la ficha administrativa del SKU. El gráfico muestra los últimos 6 o 12 meses y variación respecto del anterior cuando el divisor es mayor que cero.
- El editor de cada variante persistida ofrece costo de compra privado por unidad. Se guarda por separado para no publicar el dato ni modificar SKU, precio o stock. Vaciar el campo retira el costo. Los cambios futuros no alteran el costo capturado en ventas anteriores.
- En `/vista-previa/gestion`, el mismo control guarda costos ficticios únicamente en el navegador (`stylo.purchase-costs-preview.v1`) para comprobar su diseño. Las ventas ficticias capturan esos costos al cobrar; nunca consulta ni modifica los costos privados reales.

## Criterio único de venta y ganancia

Una operación cuenta como **venta efectiva** cuando `payment_status='paid'`; el período se determina por `paid_at` en `America/Argentina/Buenos_Aires`. Las ventas presenciales antiguas reciben `paid_at=created_at` porque ese era el instante confirmado de cobro. Los pedidos pendientes nunca entran en facturación, ventas, ticket ni gráfico. Un retiro entra al cobrarse, no al crearse.

Ganancia de una venta = `snapshot.total - refund_total - fee_total - expense_total - cost_total`. El total ya refleja descuentos y promociones. Los campos de comisión, otros gastos y devolución quedan en cero mientras no exista un registro real para esa operación; no se inventan importes. Cuando falta `cost_total` en cualquier venta del mes, el resumen muestra «—» y el número de ventas sin costo. Las ventas históricas previas a la migración conservan costo desconocido; completar el costo actual del SKU **no** reescribe retrospectivamente esas ventas. Las comisiones de Mercado Pago y un flujo de devoluciones no están integrados todavía; antes de aceptar pagos online o registrar devoluciones deberán capturarse con su evento y fecha reales.

## Migración y compatibilidad

`supabase/migrations/202610240002_admin_sales_history.sql` amplía contratos existentes: columnas de fecha/costos en pedidos, tabla privada de costos, transición idempotente, índices y agregado mensual. Los pedidos y ventas existentes se conservan, sin reiniciar sus importes. Las versiones de la aplicación anteriores siguen pudiendo crear pedidos y ventas; el trigger captura costo cuando esté disponible. La migración se probó con PostgreSQL local/PGlite, no se aplicó a Supabase real. Revertir la interfaz no debe borrar columnas o costos: son datos históricos. No hay registro administrativo para ajustar comisiones o devoluciones en esta fase.

La Fase 3AS se desarrolló en otra rama y su ranking público usa `created_at` de ventas cobradas. Si se integran ambas ramas, cambiar ese ranking a `paid_at` para mantener el criterio único; no integrar una encima de la otra sin revisar el conflicto.

## Verificación

- PostgreSQL local: permisos/RLS, costo privado, transición idempotente, stock insuficiente con rollback y agregado del mes.
- Unitarias: límites de mes Buenos Aires, filtros válidos, vista previa y paginación de diez filas en la consulta servidor.
- Build, TypeScript, lint y recorridos Playwright de escritorio/móvil sobre compilación de producción local con datos ficticios. Las capturas temporales y trazas quedan fuera de los commits.
