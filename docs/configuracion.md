# Configuración sin gastos

## Desarrollo local

La interfaz funciona sin Supabase. Para conectar el proyecto, copiar `.env.example` a `.env.local` si ese archivo todavía no existe. Nunca sobrescribir una configuración existente ni enviar claves privadas por el chat. `.env.local` está excluido de Git.

`APP_ENV` es `local`, `staging` o `production`. `NEXT_PUBLIC_SITE_URL` define el origen, sin datos personales. `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` son variables de servidor y deben configurarse juntas; usar publishable o anon, nunca secret/service_role.

## Conectar el proyecto de Supabase

El usuario ya creó un proyecto y autorizó conectar Supabase. El código de Fases 1–3 incluye autenticación, catálogo, imágenes, promociones y pedidos manuales; no hace falta agregar otra biblioteca. Usar este proyecto inicialmente para pruebas, sin datos personales de compradores ni ventas reales. No cambiar de plan ni contratar servicios para esta configuración.

**Comprobación actualizada del 12 de octubre de 2026:** URL y clave publishable configuradas localmente, excluidas de Git. Auth responde con email habilitado y registro público desactivado. Las consultas de solo lectura a `catalog_snapshot` y `commerce_promotions` funcionan: nueve categorías, sin marcas, productos ni promociones. El acceso anónimo a `admin_users`, `admin_audit_log` y `commerce_orders` se rechaza con `42501`. El usuario informó haber completado el autenticador. No se ejecutó SQL remoto desde el agente; Storage, operaciones privadas con MFA y venta presencial siguen pendientes de prueba.

La compilación con `.env.local` pasó. La revisión inicial cubrió login, protección de `/admin`, catálogo no disponible, carrito y checkout en Chromium, con y sin JavaScript y movimiento reducido. Después de la configuración remota, se volvió a comprobar `/catalogo` y `/admin` en el servidor local: el catálogo carga sin aviso de error y el panel redirige al login sin sesión, con y sin JavaScript y movimiento reducido, sin errores de navegador. Esto no acredita las operaciones privadas completas.

### 1. Completar la conexión local

En el proyecto correcto de Supabase, abrir **Connect** y copiar **Project URL** y **Publishable key**. También se puede consultar la clave en **Settings → API Keys**. Usar estos nombres del proyecto, aunque el ejemplo de Supabase proponga otros:

```dotenv
APP_ENV=local
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU-CLAVE
```

Los valores son marcadores: reemplazarlos por los del proyecto. No agregar contraseña de base de datos ni claves `secret`/`service_role`. Esta aplicación usa la clave publishable con la sesión del administrador y las políticas de acceso de la base. [Fuente: claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

### 2. Crear las tablas y permisos

En **SQL Editor**, ejecutar el contenido completo de estos archivos, **uno por uno y en este orden**, esperando éxito antes de avanzar:

1. [202610100001_foundations.sql](../supabase/migrations/202610100001_foundations.sql): administrador, MFA, auditoría y bucket de imágenes `product-media`.
2. [202610100002_catalog.sql](../supabase/migrations/202610100002_catalog.sql): marcas, categorías, productos, presentaciones, precios y existencias.
3. [202610110001_commerce.sql](../supabase/migrations/202610110001_commerce.sql): promociones, cálculo del carrito y retiros manuales.
4. [202610110002_manual_cash_sales.sql](../supabase/migrations/202610110002_manual_cash_sales.sql): ventas presenciales ya cobradas y entregadas, con descuento de stock.

Estas migraciones se ejecutan una sola vez. Si el proyecto ya contiene tablas de STYLO o se ejecutó alguno de los archivos, comprobar primero cuáles faltan; no repetir todos ni borrar tablas para resolver un error. Si una ejecución falla, guardar el mensaje y detener la secuencia. El bucket se crea desde la primera migración: no hace falta crearlo manualmente. No se insertan productos ni promociones de ejemplo.

### 3. Crear tu acceso al panel

En **Authentication**, desactivar **Allow new users to sign up** y habilitar el factor **TOTP** en la configuración de MFA. En **URL Configuration**, establecer **Site URL** en `http://127.0.0.1:3000`. Usar ese mismo origen al abrir la tienda. [Fuentes: configuración de Auth](https://supabase.com/docs/guides/auth/general-configuration), [MFA](https://supabase.com/docs/guides/auth/auth-mfa).

En **Authentication → Users**, crear un usuario con tu email y una contraseña fuerte; marcarlo como confirmado. Es el usuario de STYLO, distinto de la sesión con la que entrás al dashboard de Supabase. No usar una invitación por email: la aplicación todavía no tiene un recorrido de aceptación de invitaciones ni recuperación pública de contraseña.

Copiar el **User UID** del usuario recién creado. En SQL Editor, reemplazar el marcador por ese UUID y ejecutar:

```sql
insert into public.admin_users (user_id)
values ('REEMPLAZAR-POR-EL-USER-UID');
```

La base admite un único administrador. Si ya está registrado, no volver a insertarlo. La contraseña no va en `.env.local` ni en el chat.

### 4. Reiniciar e ingresar

Reiniciar el servidor local después de completar las variables:

```powershell
npm.cmd run dev
```

Abrir `http://127.0.0.1:3000/admin/login`, ingresar con el email y contraseña creados y vincular una aplicación de autenticación usando el QR. Introducir el código de seis dígitos para completar MFA. Las escrituras privadas requieren esa segunda verificación.

### 5. Comprobar la conexión

Desde el panel real, cargar una categoría, una marca y un producto de prueba con presentación, stock y ambos precios. Comprobar la carga de una imagen, guardar, recargar y verificar que los datos persisten. Revisar que el producto activo aparezca en `/catalogo` y pueda agregarse a `/carrito`.

Después, probar una promoción, comprobar su precio antes de agregar al carrito y registrar un retiro manual con datos ficticios. Una venta presencial de prueba confirmada debe descontar existencias una sola vez; un retiro pendiente no las descuenta. Cerrar sesión y volver a entrar con MFA.

La vista previa `/vista-previa` conserva su almacenamiento local separado. Conectar Supabase **no importa automáticamente** sus productos, promociones o pedidos; la gestión real se realiza en `/admin`.

Validar también: usuario ajeno no entra, sesión sin MFA no escribe ni lee auditoría, visitante no lee pedidos/contactos, autenticador incorrecto no entra y cookies son HttpOnly. Los resultados locales anteriores no acreditan estas comprobaciones remotas. Registrar resultados en [Fase 3](fase-3.md) después de probarlos.

Conectar Supabase no habilita cobros online: Mercado Pago, instrucciones de transferencia y confirmación de pedidos pagados siguen pendientes de Fase 4. El efectivo se mantiene exclusivamente en el registro administrativo de ventas presenciales.

## GitHub y Vercel

El remoto `origin` apunta al [repositorio público proporcionado por el usuario](https://github.com/lautiasc10/Stylo-suplementos). El workflow de `.github/workflows/ci.yml` ejecuta tipos, pruebas, build y recorridos de navegador en cada push de rama o pull request; las etiquetas no duplican esa ejecución. No contiene secrets de GitHub. Los archivos `.env` reales, dependencias, builds y resultados locales están excluidos de Git.

Las entregas se identifican por fase. `fase-1-base` marca la primera base revisable; la validación externa se registra en [Fase 1](fase-1.md). Las siguientes fases se trabajan en ramas separadas y se integran después de la validación acordada.

No se contrata Vercel Pro ni dominio en esta etapa. Las políticas de Vercel Hobby restringen su uso a proyectos personales no comerciales; la tienda no se publica comercialmente bajo ese plan. Se puede completar desarrollo y QA local. Cualquier uso remoto debe respetar esas condiciones y tus límites de gasto.

## Entornos y lanzamiento posterior

El código admite tres ambientes, pero el aislamiento real requiere proyectos/credenciales diferentes. Ningún preview apunta a datos productivos. El mismo `.env.example` sirve como plantilla, sin copiar valores reales entre ambientes.

La URL HTTPS de producción, proyectos definitivos, backups (BD y Storage separados), dominio, Checkout Pro y Resend se configuran en sus fases. Aprobar costos antes de contratar. Definir retención, RPO/RTO y probar restauración antes de vender.
