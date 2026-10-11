# Fase 1 — Fundaciones

Autorizada el 10 de octubre de 2026. Restricción: desarrollo sin gastos hasta validación completa.

## Entrega local

- Next.js/TypeScript con módulos, rutas, layout y estilos de marca.
- Inicio, categorías, catálogo en preparación, nosotros, contacto, 404 y errores.
- Autenticación servidor, administrador único y MFA; acceso bloqueado sin configuración.
- Migración inicial de RLS, auditoría y Storage, pendiente de aplicación en pruebas.
- CI, verificación de tipos, tests y configuración de tres ambientes.

## Verificación local realizada

- TypeScript: sin errores.
- Build de producción Next.js: correcta.
- 10 pruebas de configuración y PostgreSQL en memoria: correctas. Comprueban administrador único, anon, usuario ajeno, MFA y permisos reales de base de datos.
- 16 pruebas Chromium en escritorio y móvil: correctas. Navegación, categorías, acceso privado sin configuración, no-store, teclado, movimiento reducido, 404, apariciones, cambio de preferencia y contenido sin JavaScript.
- Capturas revisadas: [escritorio](previews/home-desktop.png) y [móvil](previews/home-mobile.png).
- Auditoría npm al instalar: sin vulnerabilidades conocidas reportadas.

Las pruebas PostgreSQL utilizan helpers mínimos de Supabase; no acreditan el funcionamiento del proveedor Auth remoto. La integración real se verifica al conectar el proyecto de pruebas.

## Revisión visual

La portada se rediseñó a pedido del usuario para dar a STYLO una composición propia: título centrado, barra de categorías, tres categorías destacadas con fondos blancos e ilustraciones de envases, y seis categorías en filas. Los botones redondeados y los bloques de marca compactos completan la dirección deportiva. Las ilustraciones representan categorías; no son productos a la venta. Se conservan los logos oficiales y la paleta del manual.

Se aplicó además la [adaptación de AI Design Skills](diseno.md): tokens comunes, texto pequeño más legible, estados de interacción, iconos Phosphor y movimiento progresivo con `IntersectionObserver` y CSS. El menú transforma sus líneas al abrirse; las categorías y las palabras de marca se revelan al entrar en pantalla. Se respeta el movimiento reducido y el contenido queda disponible sin JavaScript.

La revisión incluye 320, 390, 768, 900, 1024 y 1440 px, sin desbordamiento horizontal ni superposición de marca y controles de cabecera. Las capturas enlazadas arriba corresponden a esta versión.

## Entrega en GitHub

Repositorio [lautiasc10/Stylo-suplementos](https://github.com/lautiasc10/Stylo-suplementos), vinculado como `origin`. La primera base se subió a `main` en el commit `6daf3ab`. La [ejecución inicial de CI](https://github.com/lautiasc10/Stylo-suplementos/actions/runs/38095718858) pasó en GitHub: instalación limpia, tipos, 10 pruebas unitarias, build y 16 recorridos Chromium.

La etiqueta `fase-1-base` identifica esta entrega revisable con sus instrucciones y documentación. Las fases siguientes se trabajan en ramas separadas y se integran tras validación. El estado de nuevos commits se consulta en [GitHub Actions](https://github.com/lautiasc10/Stylo-suplementos/actions).

## Pendientes de aceptación externa

- Configurar Supabase de pruebas sin costo y ejecutar la migración.
- Validar credenciales reales de pruebas, enrolamiento TOTP, cierre de sesión y políticas RLS.
- Validar la dirección visual con el usuario.

La entrega local no acredita despliegue remoto ni autenticación remota probada. No dar por cerrados esos criterios hasta verificarlos. El usuario autorizó continuar [Fase 2 de catálogo](fase-2.md) sin Supabase mientras crea la cuenta junto al dueño. No hay carrito, pedidos, pagos ni promociones operativos.

## Bloqueantes posteriores

Las decisiones de PEN-17, PEN-19 y la parte de catálogo de PEN-05 están confirmadas en [Fase 2](fase-2.md). Mantener los demás pendientes: PEN-04 a PEN-08 antes de reglas comerciales; PEN-01 a PEN-03 antes de logística; contenidos, legales y cuentas antes de lanzamiento. Dominio deliberadamente aplazado.
