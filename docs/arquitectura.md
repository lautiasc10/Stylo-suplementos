# Arquitectura aprobada — STYLO

Fecha: 10 de octubre de 2026. Aprobado: Next.js + TypeScript, Vercel, Supabase, Checkout Pro y Resend. Restricción nueva: ningún gasto ni dominio hasta completar y validar el desarrollo.

## Organización

- `src/app`: rutas, layouts, endpoints y composición.
- `src/components`: interfaz reutilizable y marca.
- `src/modules`: dominio por catálogo, inventario, precios, pedidos, pagos, logística, contenido y comunicaciones según se implementen. Fase 1 incorpora acceso admin; Fase 2, catálogo e inventario por SKU.
- `src/lib`: configuración validada, adaptadores y clientes de infraestructura.
- `supabase/migrations`: SQL versionado; no se aplican cambios remotos automáticamente.
- `tests`: reglas de configuración y recorridos reales del navegador.

Una tienda, un administrador. No hay multitenancy ni backend independiente. El catálogo y artículos tendrán caché invalidable; checkout y administración serán privados y dinámicos. Las transacciones críticas de inventario/pagos se incorporarán en sus fases, después de aprobar reservas y precios.

En Fase 2, `catalog_snapshot` entrega lectura pública filtrada y la versión completa solo al admin con MFA. `save_catalog` guarda producto/variantes/imágenes y auditorías dentro de una transacción, bloqueando la fila de revisión para rechazar sesiones desactualizadas. Las tablas no permiten escrituras directas a clientes. `getCatalog` comparte la lectura dentro de la petición; las acciones invalidan las rutas después de guardar. Storage conserva archivos con nombres UUID y rutas por producto/marca. Ver [esquema implementado](plantuml/08_catalogo_fase_2.puml).

La vista previa usa los mismos componentes y validadores con datos locales identificados como ficticios. Está limitada al ambiente y host locales, no sustituye al cliente Supabase ni permite acceso a datos o acciones admin.

En [Fase 3](fase-3.md), el carrito guarda solo identificadores y cantidades en cookie HttpOnly; el servidor recalcula precios y disponibilidad. Promociones y cargas manuales usan revisión y RLS/MFA. PostgreSQL conserva una instantánea privada e idempotente al registrar retiros pendientes o ventas presenciales en efectivo. Estas últimas requieren confirmación de cobro/entrega y descuentan stock con movimiento, auditoría y actualización de revisión del catálogo en la misma transacción. Las compras online usan transferencia o Mercado Pago y todavía no crean órdenes: lo harán tras verificar el pago en Fase 4. Carrito/checkout son dinámicos; las ofertas se describen antes de agregar productos y la vista previa mantiene almacenamiento independiente, sin persistir datos del comprador.

## Autenticación

Sesiones solo en servidor mediante cookies HttpOnly. `proxy.ts` renueva la sesión en rutas admin y establece respuestas privadas. La autorización efectiva se repite en el módulo admin mediante `getUser`, pertenencia a `admin_users` y claims verificados `aal2`. El proxy no sustituye la autorización de cada operación.

MFA TOTP obligatorio, incluido enrolamiento inicial para el único administrador provisionado. Sin claves o sin pertenencia no existe acceso. Registro público deshabilitado en Supabase. No se usan claves service_role. RLS permite consultar únicamente la pertenencia propia; auditoría y escritura en Storage requieren MFA.

## Marca y alcance

Tokens oficiales #080808 / #DAAB4C / #FFFFFF. Montserrat e Inter locales. Logos WebP conservados intactos, con proporciones y márgenes originales. Las leyendas son texto editorial, no reconstrucciones del logotipo. No se publican fotos, testimonios, contactos ni respaldo profesional inventados.

La home de Fase 1 es una base visual con categorías confirmadas. Los demás bloques comerciales y las dos animaciones de producto requieren catálogo real. La cinemática no tiene scripts ni videos cargados: el punto de composición del hero podrá recibir un componente independiente en Etapa 2, una vez autorizada la adaptación de marca.

## Operación

No se habilita indexación antes del lanzamiento. Sin pagos ni emails conectados en Fase 1. Los despliegues remotos y sus proyectos se configurarán sin planes pagos cuando estén disponibles las conexiones. Un rollback de aplicación no revierte migraciones: cambios de esquema futuros deben ser compatibles hacia atrás.
