# Fase 3AK — Combos y revisión de fotografías

Rama: `fase-3ak-combos-y-fotos`, basada en 3AJ. No integrada a main.

## Enlaces de combos

Promociones enlazaba al primer componente de cualquier oferta, incluso un combo. La imagen destacada, el recorrido horizontal y la vista previa antigua ahora distinguen combos y usan `/combo/:id`. Combos power incorpora «Ver combo». Se conserva el agregado atómico de sus componentes y la selección de pago.

La foto real de Crea + Prote tiene 1254 × 1254 px y transparencia. No estaba cortada: la ficha solicitaba una copia de 640 px. Se corrigió `sizes` para el ancho real y se usa calidad 85; la foto conserva su proporción y encuadre. El catálogo sigue solicitando una copia pequeña y diferida.

## Inventario de Drive y catálogo

Revisión de `IMAGENES PARA CORREGIR`, dentro de Lauti-Imágenes-sitio de la cuenta indicada. Se inventariaron 53 archivos: 29 de XBody, 14 de One Fit y 10 de Star. El manifiesto con sus nombres, IDs y enlaces originales está en `scripts/manifests/drive-media-20261023.json`.

Se descargaron y comprobaron las 131 imágenes inicialmente asociadas al catálogo: ninguna devolvió error HTTP. De las 53 fotos de Drive, 39 ya tenían una coincidencia exacta de SHA-256 en Storage. Se contrastaron visualmente los frentes y sus asociaciones por SKU; las tablas no se usaron como portada.

### Cambios guardados desde administración con MFA

| Producto / SKU | Corrección |
| --- | --- |
| Pump V8 · STAR-0017 | Foto frontal correcta, antes ausente. |
| Ripped V8 · STAR-0014 | Restituida su foto original verificada; se había subido Pump V8 por error. |
| Fix BCAA · XBO-0001, 0002 y 0004 | Frentes de frutos rojos, limón y uva; sandía conserva su foto. |
| Fix BCAA | Dorso real compartido, sin la sombra gris del archivo recibido. |
| Xtreme Protein chocolate · XBO-0015 | Dorso real específico de su variante. |
| Vitalmag neutro · XBO-0018 | Dorso real de la variante. |
| Vitalmag | Tabla nutricional del fabricante. |

Siete archivos de Drive faltantes quedaron incorporados. Sumando la corrección Pump/Ripped, se guardaron ocho imágenes adicionales y un reemplazo. Los originales de Storage y Drive se conservan. El catálogo final tiene 139 imágenes asociadas. La comparación de snapshots verificó que no cambiaron SKU, variantes, precios, stock, textos ni visibilidad; solo imágenes, versiones de los productos editados y revisión de catálogo. No se realizaron compras ni cambios de esquema.

### Archivos que quedan pendientes o no conviene reemplazar

| Archivo / grupo | Motivo |
| --- | --- |
| PureRiceCream: neutra, frutilla, vainilla y chocolate; PureRise_infoN | Pure Rice Cream no tiene publicación en este catálogo. Faltan sus datos comerciales; no se crearon productos ni se asignaron esas fotos a otro. |
| Productos (1).png | La etiqueta indica creatina de 500 g; el SKU XBO-0012 está registrado como 1 kg. No corresponde vincularla sin resolver esa diferencia. |
| dad2c1_2142871b21bd4b67a4fc204cb7f30c2e~mv2.png | The Best Gainer, 615 × 439 px. Se conserva la foto de mejor calidad ya normalizada. |

Siguen sin frente propio XBO-0012 (creatina 1 kg) y XBO-0017 (Vitalmag frutos rojos). Se mantienen sus placeholders; no se usa la foto de otra presentación o sabor para completarlos.

## Normalización y rendimiento de archivos

Se reutilizó `normalize-product-photos.py`, con rembg/Pillow ya instalados. Los originales transparentes revisados conservan su alfa; los fondos/sombras horneados pasan por rembg. Master 1000 × 1000, producto de 800 px de alto, base y=900, copias WebP de 320 y 600 px. Las correcciones anteriores de EAA naranja y Optimus naranja se mantienen.

- 27 fotos ya cargadas carecían de derivados actuales: 34.899.501 bytes originales → 884.124 bytes sumando sus copias de 600 px; máximo 50.456 bytes por copia.
- Se prepararon otros seis envases/dorsos faltantes con el mismo perfil; la copia de Fix BCAA posterior se revisó nuevamente para quitar su sombra.
- 30 fichas informativas: 18.475.498 → 1.970.970 bytes. WebP hasta 1000 px, sin rembg, conservando contenido, proporciones y transparencia. Solo se registra un derivado si pesa menos que el original.
- Son comparaciones de archivos, no una medición antes/después de FPS o Core Web Vitals. El navegador decide 320/600/1000 según `srcset` y `sizes`; no descarga los masters de todas las cards.
- Los mapas se aplican a rutas exactas. Un nuevo reemplazo en administración funciona inmediatamente con su archivo nuevo, sin quedar tapado por un derivado antiguo. Se preservan previews con data/blob URL.
- Los derivados tienen nombres versionados y caché immutable. No se añadieron librerías ni bucles de animación.

Revisión manual: Mutant Mass, los tres nuevos frentes Fix BCAA y su dorso parten de un recorte menor de 800 px. No están cortados, pero el detalle ampliado está limitado por el original. No hubo recortes fallidos; no se generaron envases ni detalles con IA.

## Herramientas y reproducción

Los scripts `audit-current-media.mjs` y `audit-media-files.mjs` leen el catálogo público y comparan hashes/formatos/errores de carga con el manifiesto de Drive. Guardan snapshots, originales y capturas en una carpeta temporal indicada; no escriben en Supabase. No imprimir variables de entorno ni agregar snapshots administrativos a commits.

`normalize-updated-catalog.mjs` prepara un manifiesto de las rutas nuevas; `publish-normalized-media.mjs` registra sus exportaciones verificadas. `prepare-missing-media.mjs`, `prepare-reviewed-media.mjs` y `link-reviewed-media.mjs` documentan el lote específico de esta fase. Las subidas reales se hicieron por el formulario administrativo existente con su validación de archivos y MFA, no mediante privilegios adicionales.

`optimize-information-media.mjs` conserva las tablas fuera del recorte de envases. `preview-normalized-media.mjs` genera la plancha temporal para revisar visualmente alineación y recorte.

## Verificación

Las pruebas unitarias comprueban rutas exactas, sustituciones futuras, previews, archivos disponibles, formato WebP, transparencia, tamaño y línea base. Las pruebas de navegador cubren entradas al combo desde Promociones, foto propia o composición sin foto, compra con datos de prueba, retorno con filtros y movimiento reducido. Se revisan capturas de tienda, combo y fichas reales en producción local a 1440 y 390 px; los datos reales se usan solo en lectura durante esa revisión.

Medición posterior en Chromium, `next build` + `next start`, contexto nuevo, DPR 1 y scroll hasta el final del catálogo: imágenes transferidas 2.500.904 bytes a 1440 px y 1.024.036 bytes a 390 px (Resource Timing, incluye logos y decoraciones solicitadas como imágenes). Sin imágenes solicitadas rotas, errores JavaScript ni desbordamiento horizontal. Se recorrieron 17 variantes de seis familias en cada ancho. El combo conserva ambos productos completos y carga sin JavaScript. Son mediciones locales sin limitación de CPU/red; no se midieron FPS ni CWV de campo, y no hay una medición de red anterior comparable. Capturas y resultados temporales: `C:/tmp/stylo-media-3ak/browser/`.

La compilación advierte una vulnerabilidad conocida en Next.js 16.4.0. La primera ejecución se detiene después de generar las rutas; repetirla finaliza. La actualización de seguridad requiere trabajo separado; no se cambiaron dependencias en esta fase.

Resultado final: lint y typecheck correctos; build final con salida 0 tras repetir el aviso; 12 pruebas unitarias y 24 pruebas de navegador correctas. El acordeón y la ampliación de las fichas también usan los derivados y conservan foco, Escape y previews. Se comprobaron sus imágenes reales a 1440 y 390 px.

La revisión de la ampliación detectó que el título heredaba el color oscuro del sabor sobre el cuadro negro: se corrigió únicamente ese contraste con el token claro del diálogo. «Abrir imagen original» y la navegación sin JavaScript siguen enlazando a Storage; solo las miniaturas y la vista dentro del diálogo usan las copias optimizadas.
