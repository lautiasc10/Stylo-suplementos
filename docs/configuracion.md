# Configuración sin gastos

## Desarrollo local

La interfaz funciona sin Supabase. Copiar `.env.example` a `.env.local` solamente cuando se vaya a configurar la integración. Nunca enviar claves privadas por el chat ni subir `.env.local` al repositorio.

`APP_ENV` es `local`, `staging` o `production`. `NEXT_PUBLIC_SITE_URL` define el origen, sin datos personales. `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` son variables de servidor y deben configurarse juntas; usar publishable o anon, nunca secret/service_role.

## Supabase de pruebas

1. Crear o seleccionar un proyecto gratuito **exclusivamente de pruebas** desde tu cuenta. No aceptar cambios a planes pagos. Si un límite gratuito impide avanzar, continuar localmente y registrarlo.
2. Aplicar `supabase/migrations/202610100001_foundations.sql` desde SQL Editor, tras verificar que es el proyecto de pruebas.
3. En Auth desactivar registro público; habilitar TOTP MFA y revisar límites de intentos. Usar una contraseña fuerte y configurar recuperación administrativa mediante el dashboard; el flujo de recuperación público no pertenece a esta fase.
4. Crear el único usuario administrador en Auth. Copiar su UUID e insertar una fila en `public.admin_users` usando Table Editor. La base rechaza un segundo administrador. No guardar su contraseña en configuración.
5. Completar la URL y publishable key en `.env.local` desde el diálogo Connect. Configurar Site URL `http://localhost:3000` y las URLs de pruebas autorizadas. Reiniciar el servidor al cambiar variables.
6. Entrar por `/admin/login`, configurar la aplicación de autenticación y comprobar ingreso, salida y reingreso con TOTP.

Validar en este proyecto: usuario ajeno no entra, sesión aal1 no lee auditoría ni escribe archivos, anon no lee admin/auditoría, autenticador incorrecto no entra y cookies son HttpOnly. No se han ejecutado estas comprobaciones remotas mientras falte conexión.

## GitHub y Vercel

El remoto `origin` apunta al [repositorio público proporcionado por el usuario](https://github.com/lautiasc10/Stylo-suplementos). El workflow de `.github/workflows/ci.yml` ejecuta tipos, pruebas, build y recorridos de navegador en cada push de rama o pull request; las etiquetas no duplican esa ejecución. No contiene secrets de GitHub. Los archivos `.env` reales, dependencias, builds y resultados locales están excluidos de Git.

Las entregas se identifican por fase. `fase-1-base` marca la primera base revisable; la validación externa se registra en [Fase 1](fase-1.md). Las siguientes fases se trabajan en ramas separadas y se integran después de la validación acordada.

No se contrata Vercel Pro ni dominio en esta etapa. Las políticas de Vercel Hobby restringen su uso a proyectos personales no comerciales; la tienda no se publica comercialmente bajo ese plan. Se puede completar desarrollo y QA local. Cualquier uso remoto debe respetar esas condiciones y tus límites de gasto.

## Entornos y lanzamiento posterior

El código admite tres ambientes, pero el aislamiento real requiere proyectos/credenciales diferentes. Ningún preview apunta a datos productivos. El mismo `.env.example` sirve como plantilla, sin copiar valores reales entre ambientes.

La URL HTTPS de producción, proyectos definitivos, backups (BD y Storage separados), dominio, Checkout Pro y Resend se configuran en sus fases. Aprobar costos antes de contratar. Definir retención, RPO/RTO y probar restauración antes de vender.
