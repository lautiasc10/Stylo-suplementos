# Arquitectura aprobada — STYLO

Fecha: 10 de octubre de 2026. Aprobado: Next.js + TypeScript, Vercel, Supabase, Checkout Pro y Resend. Restricción nueva: ningún gasto ni dominio hasta completar y validar el desarrollo.

## Organización

- `src/app`: rutas, layouts, endpoints y composición.
- `src/components`: interfaz reutilizable y marca.
- `src/modules`: dominio por catálogo, inventario, precios, pedidos, pagos, logística, contenido y comunicaciones según se implementen. Solo catálogo estático y acceso admin en Fase 1.
- `src/lib`: configuración validada, adaptadores y clientes de infraestructura.
- `supabase/migrations`: SQL versionado; no se aplican cambios remotos automáticamente.
- `tests`: reglas de configuración y recorridos reales del navegador.

Una tienda, un administrador. No hay multitenancy ni backend independiente. El catálogo y artículos tendrán caché invalidable; checkout y administración serán privados y dinámicos. Las transacciones críticas de inventario/pagos se incorporarán en sus fases, después de aprobar reservas y precios.

## Autenticación

Sesiones solo en servidor mediante cookies HttpOnly. `proxy.ts` renueva la sesión en rutas admin y establece respuestas privadas. La autorización efectiva se repite en el módulo admin mediante `getUser`, pertenencia a `admin_users` y claims verificados `aal2`. El proxy no sustituye la autorización de cada operación.

MFA TOTP obligatorio, incluido enrolamiento inicial para el único administrador provisionado. Sin claves o sin pertenencia no existe acceso. Registro público deshabilitado en Supabase. No se usan claves service_role. RLS permite consultar únicamente la pertenencia propia; auditoría y escritura en Storage requieren MFA.

## Marca y alcance

Tokens oficiales #080808 / #DAAB4C / #FFFFFF. Montserrat e Inter locales. Logos WebP conservados intactos, con proporciones y márgenes originales. Las leyendas son texto editorial, no reconstrucciones del logotipo. No se publican fotos, testimonios, contactos ni respaldo profesional inventados.

La home de Fase 1 es una base visual con categorías confirmadas. Los demás bloques comerciales y las dos animaciones de producto requieren catálogo real. La cinemática no tiene scripts ni videos cargados: el punto de composición del hero podrá recibir un componente independiente en Etapa 2, una vez autorizada la adaptación de marca.

## Operación

No se habilita indexación antes del lanzamiento. Sin pagos ni emails conectados en Fase 1. Los despliegues remotos y sus proyectos se configurarán sin planes pagos cuando estén disponibles las conexiones. Un rollback de aplicación no revierte migraciones: cambios de esquema futuros deben ser compatibles hacia atrás.
