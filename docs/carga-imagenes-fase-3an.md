# Fase 3AN — Normalización al subir imágenes

Rama `fase-3an-carga-imagenes`, basada en la revisión aprobada de fotos XBODY (3AM). La carga del administrador ahora prepara las imágenes antes de vincularlas al borrador. El producto se publica solo al guardar, como antes.

## Comportamiento

- **Fotos de envases y vistas:** PNG/WebP con transparencia real, recorte del área visible, altura de 800 px, base y=900, canvas de 1000 × 1000 y WebP 320/600/1000. Las copias de 320/600 no superan 60.000 bytes; se ajusta calidad entre 90 y 70 cuando hace falta. La vista previa usa la misma línea de apoyo del catálogo.
- **Fichas informativas:** JPEG/PNG/WebP, máximo 1000 px sin ampliar, conservando proporción, fondo y texto completo. No se aplica el recorte de envases a las tablas.
- **Logos:** validación de archivo, bytes originales y proporciones conservados.
- Se archiva el original exacto y se generan nombres nuevos en cada carga y reemplazo. Las rutas son identificables por perfil, por lo que las fotos nuevas no necesitan agregarse manualmente a un JSON ni desplegar otro cambio de código. Las rutas históricas y sus derivados estáticos siguen funcionando.
- Un fondo blanco u opaco en una foto de envase se rechaza con explicación; no se simula quitarlo ni se arriesga borrar etiquetas blancas. El administrador debe aportar una versión SF. Un envase que toca el borde, tiene menos de 320 px visibles de alto o un encuadre demasiado ancho se devuelve para revisión. Entre 320 y 799 px se admite con aviso de nitidez.
- El procesador corre en servidor durante la carga. El catálogo público solo sirve los WebP ya generados con `srcset`, dimensiones, lazy loading y caché. Sharp ya existía; se declara ahora como dependencia de producción de la misma versión 0.35.5.

## Seguridad y consistencia

`requireAdmin()` exige administrador con MFA antes de leer/procesar el archivo o escribir en Storage. Se mantienen los 5 MB de entrada, validación MIME/firma, y se añade decodificación real, rechazo de animaciones y límite de 16 megapíxeles. El análisis alfa trabaja sobre un máximo de 1600 × 1600 para limitar memoria. Todas las copias se preparan antes de subir la primera. Si alguna subida falla, se intenta quitar solo los objetos nuevos de ese intento; el borrador y la foto anterior se conservan. No se sobrescriben archivos históricos. Los borradores abandonados conservan archivos sin asociación, igual que antes; no se implementa limpieza remota de originales.

La gestión de prueba utiliza el mismo procesador mediante una acción restringida a ambiente y host local. Guarda los resultados únicamente en el navegador; no llama a Supabase ni demuestra permisos administrativos reales. Los originales grandes también consumen cuota del almacenamiento local de prueba y pueden alcanzar su límite, que ya se informa sin alterar el catálogo real.

## Activación pendiente en Supabase

La migración `supabase/migrations/202610230001_catalog_media_profiles.sql` amplía únicamente el CHECK de rutas de `catalog_images` y agrega una consulta de capacidad para administradores con MFA. Conserva las rutas anteriores; no transforma registros, precios, stock, variantes, RLS ni políticas de Storage. Fue preparada para prueba local, **no ejecutada en Supabase real**.

El administrador comprueba esta capacidad antes de iniciar una subida procesada. Hasta aplicar la migración, devuelve un mensaje y conserva la imagen previa. Los logos siguen usando su ruta compatible anterior. La tienda y las imágenes ya cargadas siguen disponibles.

Para activar: integrar la rama tras validación y aplicar la migración revisada. Comprobar con una sesión administrativa que la capacidad devuelve `normalizedUploads: true`; subir una foto SF de prueba, revisar y guardar el producto deseado. Esa comprobación real queda pendiente de autorización.

Reversión: no restaurar el CHECK antiguo mientras existan rutas procesadas. Primero hay que vincular los productos afectados a los originales compatibles archivados o conservar la ampliación del CHECK al volver a la aplicación anterior. No se deben borrar derivados mientras sigan publicados.

## Verificación

Lint, typecheck y build de producción correctos. La suite unitaria pasó 149 casos; dos casos existentes requieren archivos externos de importación y permanecen omitidos. Se verificaron formato, transparencia, altura/base, conservación de etiquetas blancas y bytes originales, límite de peso, rechazo de archivos corruptos o demasiado grandes, permisos previos al procesamiento y limpieza del intento fallido. La migración se ejecutó solo en PGlite: comprueba rutas históricas y nuevas, transacción, variantes intactas, rechazo de traversal y capacidad reservada a admin con MFA.

Se completaron 14 recorridos Playwright sobre `next build` + `next start`, con catálogo ficticio y Supabase desconfigurado, en escritorio y móvil: creación de marca/producto, cargas compartidas y por variante, reemplazos, archivo inválido, descarte de variante, conservación tras recargar y navegación pública sin JavaScript. La prueba nueva mide los píxeles alfa del resultado: 1000 × 1000, área visible entre y=100 y y=900; comprueba que la tarjeta abre la ficha, y que la gestión de prueba no escribe en Supabase. Se revisaron capturas de la miniatura del editor y de la ficha móvil; quedan en `test-results`, fuera de commits. No se midieron CWV de campo ni se realizaron subidas a Storage real.

La compresión de carga usa esfuerzo 4 y genera las tres copias en paralelo, manteniendo el límite de peso. El recorrido de navegador con foto, rechazo de reemplazo opaco y ficha informativa pasó de unos 11–14 s a 3–4 s en las ejecuciones locales observadas. Son tiempos de toda esa prueba, no una garantía de latencia de red o de cada subida real. El procesamiento no forma parte del renderizado público.
