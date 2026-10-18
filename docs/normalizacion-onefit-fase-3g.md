# Fase 3G — Fotos mejoradas de One Fit

18 de octubre de 2026. Rama: `fase-3g-normalizacion-onefit`.

Se renormalizaron ocho fotos frontales de cinco productos, conservando los originales de Supabase Storage (`product-media`). No se modificaron registros remotos, SKU, variantes, stock, precios, logos, fondos de sabor ni animaciones.

## Corrección posterior — EAA y Colágeno naranja

El usuario adjuntó la foto correcta de EAA naranja y señaló que la silueta de Colágeno naranja estaba mordida por el recorte. Se sustituyen únicamente esos dos derivados: EAA usa el adjunto nuevo y Colágeno usa la toma completa de Optimus Collagen naranja que estaba asociada por error a EAA. Se conservan sus originales en `assets/product-originals/onefit`, fuera de `public`, junto con su procedencia.

La foto nueva de EAA tiene transparencia real; el modo explícito `existing-alpha` conserva la silueta, quita ruido de alfa insignificante y evita volver a segmentar la etiqueta blanca. Este modo rechaza un fondo opaco. Colágeno sigue usando rembg sobre la toma completa. Tres pruebas Python cubren conservación de bordes blancos, rechazo de fondo opaco y continuidad del modo rembg.

El registro mantiene las asociaciones por variante y ruta exacta; se actualizan los WebP de 320, 600 y 1000, con nuevos nombres, sin sobrescribir los anteriores. El informe vigente guarda `sourceOverride` para distinguir el original de entrada del objeto de Storage sustituido visualmente, `sourceHash` del archivo utilizado y `catalogSourceHash` del archivo remoto anterior. Supabase no se modifica. Los otros seis frentes permanecen idénticos.

Para reproducir estas dos correcciones usando los originales conservados en el repositorio:

```powershell
python scripts/normalize-product-photos.py scripts/manifests/onefit-naranja-correcciones-20261018.json C:/trabajo/naranja-corregida
```

La revisión inicial y sus observaciones quedan descritas a continuación como historial. Las cifras vigentes de los ocho archivos son 8.127.354 bytes de entrada, 142.872 en 320 px, 348.540 en 600 px y 683.554 en masters de 1000 px. La copia más pesada de tarjeta sigue siendo de 54.716 bytes. La incidencia de la foto de Colágeno puesta en EAA queda resuelta en catálogo y detalle por el registro local; sus asociaciones originales en administración/Storage se conservan.

Validación de la corrección: `npm.cmd run check` aprobado (87 pruebas unitarias, dos omitidas), tres pruebas Python aprobadas, seis recorridos de detalle a 1600/768/375 px y cuatro de tarjetas con las animaciones activas. Probados retorno de variante, URL, carga sin JavaScript y movimiento reducido. Sin errores de consola ni desbordamientos. Los hashes de ambos archivos de Storage siguen intactos y las copias originales locales coinciden con los archivos utilizados.

Evidencia actual: [comparación de las dos correcciones](reviews/normalizacion-onefit/correccion-naranja.webp), [Colágeno naranja en detalle](reviews/normalizacion-onefit/ONE-0007-corregida-1600.webp), [EAA naranja en tarjeta móvil](reviews/normalizacion-onefit/ONE-0002-tarjeta-corregida-375.webp) e [informe de navegador](reviews/normalizacion-onefit/correccion-naranja-verificacion.json).

## Primera entrega

| Producto                    | Sabores / SKU procesados                                         |
| --------------------------- | ---------------------------------------------------------------- |
| EEAA + Essential Amino Acid | Cereza ONE-0001, naranja ONE-0002, pomelo ONE-0003, uva ONE-0004 |
| Colágeno Optimus 240 g      | Naranja ONE-0007                                                 |
| The Best Gainer 1,5 kg      | Chocolate ONE-0010                                               |
| Friction 3.2 300 g          | Limón ONE-0012                                                   |
| Whey Protein 2 lbs DP       | Chocolate ONE-0014                                               |

[Comparación de las ocho fotos, originales y normalizadas](reviews/normalizacion-onefit/comparativa.webp).

## Resultado técnico

Se usa rembg con U²-Net para separar el envase de los halos y sombras del origen, y Pillow para recortar, conservar proporciones y componer un master transparente de 1000 × 1000. Cada envase ocupa 800 px de alto y se apoya en y=900; se centra horizontalmente. Se exportan también WebP de 320 y 600 px. Solo se modifica el alfa y el tamaño: no se generan ni reconstruyen etiquetas o partes del producto.

Los 24 derivados nuevos están en `public/media/onefit-normalized-v1`. Los nombres incluyen el ID de foto y el SHA-256 del original; el script rechaza sobrescribir un destino existente con otros bytes. Los originales conservan sus hashes. Los derivados previos, incluidos los sabores fuera de alcance, permanecen disponibles.

El registro específico `src/modules/catalog/renormalized-images.json` vincula únicamente las ocho rutas nuevas. `normalizedPhotoProps` usa estas copias solo cuando la URL coincide exactamente con la ruta de Storage registrada. Reemplazar una foto o usar una vista previa no queda oculto por una copia antigua. El perfil nuevo sirve 320/600/1000 con `srcset`; los 64 derivados anteriores conservan 320/640/1000.

| Conjunto de ocho fotos  |     Bytes |
| ----------------------- | --------: |
| Originales PNG          | 8.216.780 |
| WebP de 320 px          |   142.146 |
| WebP de 600 px          |   345.612 |
| Masters WebP de 1000 px |   673.048 |

La copia de tarjeta más pesada mide 54.716 bytes. Estas cifras describen las fotos procesadas; no son una medición de descarga total de la página.

## Observaciones del origen

- **EEAA naranja, ONE-0002:** la foto actualmente asociada a esa variante muestra **OPTIMUS COLLAGEN** en la etiqueta. Se conserva su asociación y se normaliza el archivo recibido, sin alterar textos ni asignar la imagen de otro SKU. Hay que reemplazar ese original por el EEAA naranja correcto. El recorte no puede corregir la identidad del envase.
- **Whey Chocolate:** el usuario confirmó **Chocolate, ONE-0014**, UUID `3eb37c89-a023-4ab1-98e0-168940b95ddc`, que tiene la nueva foto PNG. El UUID suministrado inicialmente `baa2445c-aa97-4cbd-b020-231f40bf5464` corresponde a **Dulce de leche, ONE-0015**, sin foto propia. Dulce de leche queda intacto, sin recibir la foto de Chocolate.
- En la primera entrega, EEAA naranja y Colágeno naranja necesitaban ampliaciones (recortes de 797 y 685 px de alto, respectivamente). La revisión posterior del usuario detectó un borde mordido en Colágeno naranja, corregido con la toma completa descrita arriba. El escalado no inventa nitidez.

## Reproducción local

El script complementario `scripts/normalize-product-photos.py` usa rembg/Pillow fuera de la aplicación. No añade dependencias de ejecución al sitio. Se reutilizó el entorno Python local existente, con rembg 2.0.85 y Pillow 12.3.0; U²-Net se ejecuta localmente en CPU. El modelo y los originales descargados permanecen fuera del repositorio.

El manifiesto `scripts/manifests/onefit-20261018.json` conserva las rutas y asociaciones auditadas. Descargar los originales públicos a una carpeta de trabajo `originals/`, manteniendo sus nombres, y ejecutar desde la raíz del proyecto:

```powershell
python scripts/normalize-product-photos.py scripts/manifests/onefit-20261018.json C:/trabajo/derivados --input-root C:/trabajo
```

La carpeta de salida debe ser distinta de la de originales. El informe enumera los recortes, colocaciones, hashes, pesos y advertencias. Revisar visualmente antes de vincular recursos nuevos en el registro; el script no escribe en Supabase ni publica automáticamente una nueva asociación.

## Verificación

- `npm.cmd run check`: lint, typecheck, 86 pruebas unitarias aprobadas (dos omitidas por configuración) y build de producción correctos.
- `npm.cmd run test:media`: cuatro pruebas aprobadas del normalizador previo.
- Playwright: normalización, giro y fondos de sabor, 37 recorridos aprobados; uno omitido por ser exclusivo de escritorio.
- Catálogo real de One Fit en producción a 1600, 768 y 375 px; ocho fotos verificadas también al recorrer variantes con las animaciones activas.
- Ocho fichas verificadas, ocho cambios de sabor en ambas direcciones, seis comprobaciones adicionales de detalle móvil/tableta, navegación sin JavaScript y movimiento reducido. Sin errores de consola ni desbordamientos horizontales en estos recorridos.
- Relectura pública de Supabase: catálogo idéntico (53 productos y 76 variantes); SHA-256 de los ocho originales intacto.

Evidencia: [verificación de navegador](reviews/normalizacion-onefit/verificacion.json), [integridad de originales](reviews/normalizacion-onefit/originales.json), [catálogo móvil](reviews/normalizacion-onefit/catalogo-375.png), [EEAA en escritorio](reviews/normalizacion-onefit/ONE-0001-1600.png), [EEAA móvil](reviews/normalizacion-onefit/ONE-0001-375.png), [Whey Chocolate](reviews/normalizacion-onefit/ONE-0014-1600.png).

La revisión móvil fue emulada en Chromium; no se probó un teléfono físico.
