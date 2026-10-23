# Fase 3AL — Actualización de seguridad de Next.js

Rama `fase-3al-seguridad-next`, basada en `main` / `398b6f0`. Trabajo aislado en `C:/tmp/stylo-security-3al`; la instalación y los servidores de la carpeta principal se conservan. Sin integración a main ni despliegue en esta entrega.

## Cambio y evidencia

Next.js pasa de **16.4.0 a 16.4.3**, fijado exactamente en package.json y package-lock.json. Es la versión estable publicada en el registro de npm consultado el 23 de octubre de 2026. Se verificaron los requisitos de Node y React: el proyecto conserva Node 22.13.1, React/React DOM 19.3.0 y sharp 0.35.5.

El diff del lockfile se limita a `next`, `@next/env` y las ocho distribuciones opcionales `@next/swc-*`; sus versiones e integridades quedan registradas. Las demás dependencias permanecen iguales. La instalación se hizo con `npm install next@16.4.3 --save-exact --ignore-scripts`, después de revisar los metadatos y scripts publicados. No se ejecutó un instalador externo ni `audit fix --force`.

| Hallazgo del registro de npm antes del cambio | Gravedad | Relación con STYLO |
| --- | --- | --- |
| GHSA-673q-mjm6-r5xr: ejecución remota en funciones use cache con typed arrays | Crítica | El paquete instalado figura afectado. No se encontró uso de esa directiva en la aplicación; no se reprodujo explotación. |
| GHSA-2464-fhr4-w9xw: ejecución remota en optimización de imágenes SVG | Crítica | El paquete figura afectado; sharp 0.35.5 ya estaba instalado. No se intentó explotar ni se probó Linux remoto. |
| GHSA-p3m5-59mp-jv5r: denegación de servicio con Server Actions | Alta | STYLO usa App Router y Server Actions. La versión instalada figura afectada; no se enviaron solicitudes de ataque. |

El aviso oficial indica parches desde 16.4.1; 16.4.3 incorpora esos parches y correcciones posteriores. Las notas de versión incluyen correcciones de Turbopack, fuentes y proxy. Se conserva la configuración de seguridad de STYLO.

- [Aviso oficial de Next.js](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- [Versión oficial 16.4.3 y cambios](https://github.com/vercel/next.js/releases/tag/v16.4.3).

## Auditoría antes/después

| Comprobación | Antes | Después |
| --- | --- | --- |
| Versión efectiva de Next.js | 16.4.0 | 16.4.3 |
| Paquetes vulnerables según npm audit completo | 1 crítico, next (tres avisos) | 0 |
| Build de producción | El aviso de seguridad detenía la primera ejecución | Salida 0 en la primera ejecución, sin ese aviso |
| React y sharp | 19.3.0 / 0.35.5 | Sin cambios |

Auditoría completa, incluyendo dependencias de desarrollo, realizada contra el registro de npm. Cero avisos conocidos no equivale a una certificación integral de seguridad ni acredita un despliegue remoto actualizado.

## Pruebas antiguas detectadas y corregidas

La pasada completa encontró problemas que se reprodujeron también en main con Next 16.4.0:

1. El mock de `admin-workspace.test.ts` no implementaba los filtros y la paginación de la consulta de ventas del mes, añadida en una fase posterior. Se actualizó el doble de Supabase sin cambiar consultas reales. Se verifica que el acceso se autorice antes de cualquier lectura, que se recorran más de 1000 ventas sin el límite de 50 pedidos recientes y que una consulta mensual fallida no se interprete como cero ventas.
2. Un recorrido sin JavaScript seguía buscando el filtro «Hasta (ARS)», retirado por indicación del usuario. Ahora verifica su ausencia y el envío/persistencia de categoría, orden, búsqueda, disponibilidad y promociones mediante el formulario nativo.
3. Una prueba exigía que el ID de variante fuera el último parámetro de la URL. Ahora contempla y comprueba el parámetro `volver` incorporado para conservar filtros, además de seguir validando sabor, stock, precio, giro y apertura de la ficha.

Solo se modificaron esos archivos de pruebas. No se cambió código funcional para hacerlas pasar ni se retiraron validaciones de acceso, precios o existencias.

## Verificación de la entrega

- Lint y typecheck correctos.
- Build de producción correcto con Next 16.4.3, sin repetir el comando para sortear avisos.
- Suite unitaria completa: **143 pruebas correctas y 2 omitidas ya existentes**, en 28 archivos (27 correctos y uno omitido).
- Las dos omitidas requieren el CSV externo y un snapshot indicados mediante `STYLO_IMPORT_CSV` / `STYLO_CATALOG_SNAPSHOT`, ausentes en esta copia aislada. No se redujo su cobertura ni se deshabilitaron pruebas nuevas.
- **118 recorridos de navegador distintos verificados**, escritorio y móvil. De la primera selección, 100 pasaron inicialmente y cuatro casos antiguos pasaron tras actualizar las pruebas; otros 14 cubrieron carrito, checkout de revisión, búsqueda, privacidad sin JavaScript y protección del admin/MFA.
- Carrito, SKU, selección de pago, promociones, combos, CSV/Excel, edición de fotos, vuelta con filtros, SEO, hidratación, movimiento reducido y navegación sin JavaScript cubiertos por los recorridos pertinentes. No se hicieron compras reales.
- Capturas revisadas a 1440 y 390 px en Chromium; sin errores JavaScript ni desbordamiento en esa comprobación. La vista previa conserva los avisos y productos ficticios propios de esa ruta.
- Optimizador de imágenes verificado con una foto local normalizada y la cabecera Accept de un navegador: WebP 384 × 384 con transparencia. Los recursos originales no se modificaron.

Entorno: Windows, Node 22.13.1, npm 11.2.0, Chromium de Playwright y `next build` + `next start` en el puerto 3152. Las pruebas usan configuración local sin Supabase ni credenciales de producción. Capturas y resultados temporales en `C:/tmp/stylo-security-3al-review/`. No se midieron nuevos FPS ni Core Web Vitals; no se atribuyen mejoras visuales o de rendimiento a la actualización.

## Límites y siguiente paso

No se alteraron diseño, fotografías, textos comerciales, base de datos, RLS, configuración de Supabase, Resend, medios de pago, envíos, dominio ni despliegues. Los avisos de stock continúan pendientes de activación y las compras online siguen en revisión, según lo acordado.

El parche queda listo para integrar tras validar esta entrega. Para que proteja un sitio publicado hay que instalar el lockfile actualizado, recompilar y desplegar en su entorno; subir la rama a GitHub no actualiza por sí solo las instancias existentes. La carpeta principal sigue usando su instalación anterior hasta esa integración e instalación.
