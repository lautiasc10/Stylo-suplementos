# Normalización de imágenes — Fase 1 aplicada

Fecha: 17 de octubre de 2026. Rama: `fase-3-imagenes-piloto`.

El usuario aprobó el piloto y autorizó aplicar la Fase 1 al catálogo. Las fases 2 y 3 del pedido de revisión continúan pendientes; esta entrega no modifica selectores, navegación ni la mecánica del giro.

## Alcance

Se procesaron las 64 fotos existentes del envase: 56 frentes y ocho costados/dorsos. Se reutilizaron los 18 derivados aprobados del piloto y se agregaron 46 fotos con sus tres tamaños WebP. Todos los originales tienen transparencia real; no fue necesario quitarles un fondo ni generar imágenes. Las fichas informativas y los logos de marca quedan fuera del procesamiento.

Cada master mide 1000 × 1000 con transparencia, envase de 800 px de alto, proporciones conservadas y base en y=900. Se generan también versiones de 320 y 640 px. Las tarjetas y la galería de detalle usan el mismo escenario cuadrado y la misma roca CSS optimizada. La roca y la sombra de apoyo permanecen independientes del envase durante el giro.

Las fotos originales siguen en Supabase Storage, bucket `product-media`. No se escribieron registros ni archivos remotos. El registro local `src/modules/catalog/normalized-images.json` vincula cada ruta original exacta con su copia optimizada en `public/media/products-normalized-v1` o en la carpeta del piloto. La selección responsive usa `srcset`/`sizes` y conserva la precarga/decodificación existente. Las dos primeras imágenes se solicitan de forma anticipada y el resto conserva carga diferida.

El catálogo público contiene 53 productos y 76 variantes. En su selección inicial, 43 tarjetas tienen foto y usan los derivados; diez conservan su marcador de imagen pendiente. No se asigna la foto de otro SKU cuando falta una imagen de la variante seleccionada. No se crearon imágenes para productos que aún no las tienen.

## Mantenimiento

`scripts/normalize-catalog.mjs` consume una exportación pública JSON con `{ catalog, imageBase }`, donde `imageBase` es la URL pública del bucket. Descarga originales a una carpeta temporal separada, comprueba sus hashes, reutiliza los del piloto que coinciden y actualiza el registro local. No necesita claves administrativas y no guarda cambios en Supabase.

`npm.cmd run media:catalog -- C:/imagenes/catalogo.json C:/imagenes/temporal`

`npm.cmd run test:media`

El script básico y sus reglas de recorte están documentados en [el piloto](normalizacion-imagenes-fase-1.md). Los derivados usan nombres con hash y versión; un destino existente con otros bytes se rechaza. El informe completo está en `public/media/products-normalized-v1/report.json`.

Al reemplazar una foto desde administración, la nueva ruta funciona de inmediato con su original; para normalizar esa nueva foto hay que volver a procesar el catálogo y publicar los derivados. El enlace entre producto, variante y SKU permanece en la base original.

## Archivos para revisar

No se detectaron fondos complejos ni recortes que bloquearan la exportación. Hay 22 advertencias: 21 originales pequeños y una foto que toca el borde de origen. No se inventó detalle mediante IA; una ampliación no recupera nitidez. La foto de Cafeína 200 conserva el encuadre recibido y debe revisarse contra su original.

| Imagen | Advertencia |
| --- | --- |
| CREATINA MICRONIZADA POWERADED x 200GR · Vista frontal | Original pequeño: ampliación 1.32×; el procesamiento no recupera detalle inexistente. |
| CAFEÍNA x 60 CÁPSULAS · Vista frontal | Original pequeño: ampliación 1.37×; el procesamiento no recupera detalle inexistente. |
| COLAGENO "OPTIMUS" x 240GR · naranja · Vista frontal | Original pequeño: ampliación 2.88×; el procesamiento no recupera detalle inexistente. |
| COLAGENO "OPTIMUS" x 240GR · frutilla · Vista frontal | Original pequeño: ampliación 1.44×; el procesamiento no recupera detalle inexistente. |
| COLAGENO "OPTIMUS" x 240GR · Vista posterior | Original pequeño: ampliación 1.44×; el procesamiento no recupera detalle inexistente. |
| PROTEÍNA "WHEY PROTEIN" 2LBS DP · frutilla · DP · Vista frontal | Original pequeño: ampliación 1.29×; el procesamiento no recupera detalle inexistente. |
| PROTEÍNA "WHEY PROTEIN" 2LBS DP · Vista posterior | Original pequeño: ampliación 2.57×; el procesamiento no recupera detalle inexistente. |
| PROTEÍNA "WHEY PROTEIN" 2LBS DP · vainilla · DP · Vista frontal | Original pequeño: ampliación 1.29×; el procesamiento no recupera detalle inexistente. |
| PROTEÍNA "WHEY PROTEIN" 2LBS DP · chocolate · DP · Vista frontal | Original pequeño: ampliación 2.57×; el procesamiento no recupera detalle inexistente. |
| PRE-ENTRENO "FRICTION 3.2" x 300GR · uva · Vista frontal | Original pequeño: ampliación 1.44×; el procesamiento no recupera detalle inexistente. |
| PRE-ENTRENO "FRICTION 3.2" x 300GR · limón · Vista frontal | Original pequeño: ampliación 2.87×; el procesamiento no recupera detalle inexistente. |
| PRE-ENTRENO "FRICTION 3.2" x 300GR · Vista posterior | Original pequeño: ampliación 2.87×; el procesamiento no recupera detalle inexistente. |
| ZINC+MAGNESIO+VITAMINA B6 "ZMA" - 90 CAPSULAS · Vista frontal | Original pequeño: ampliación 1.37×; el procesamiento no recupera detalle inexistente. |
| CAFEINA 200 x 30 CAPS | El producto toca el borde original: podría estar cortado. |
| AMINOÁCIDOS "EEAA + ESSENTIAL AMINO ACID" · cereza · Vista frontal | Original pequeño: ampliación 2.87×; el procesamiento no recupera detalle inexistente. |
| AMINOÁCIDOS "EEAA + ESSENTIAL AMINO ACID" · uva · Vista frontal | Original pequeño: ampliación 1.44×; el procesamiento no recupera detalle inexistente. |
| AMINOÁCIDOS "EEAA + ESSENTIAL AMINO ACID" · naranja · Vista frontal | Original pequeño: ampliación 2.87×; el procesamiento no recupera detalle inexistente. |
| AMINOÁCIDOS "EEAA + ESSENTIAL AMINO ACID" · Vista posterior | Original pequeño: ampliación 2.87×; el procesamiento no recupera detalle inexistente. |
| AMINOÁCIDOS "EEAA + ESSENTIAL AMINO ACID" · pomelo · Vista frontal | Original pequeño: ampliación 2.87×; el procesamiento no recupera detalle inexistente. |
| GLUTAMINA x 200GR · Vista frontal | Original pequeño: ampliación 1.32×; el procesamiento no recupera detalle inexistente. |
| GANADOR DE PESO "THE BEST GAINER" 1.5KG · chocolate · Vista frontal | Original pequeño: ampliación 2.49×; el procesamiento no recupera detalle inexistente. |
| AMINOÁCIDOS RAMIFICADOS "FIX BCAA" x 300GR · sandia · Vista frontal | Original pequeño: ampliación 1.32×; el procesamiento no recupera detalle inexistente. |

## Comprobaciones

- Comparación de la instantánea pública antes/después: productos, variantes, SKU, stock, precios y rutas originales idénticos.
- SHA-256 de los 64 originales: intactos. Los 64 masters tienen alfa real, dimensiones 1000 × 1000 y base uniforme. Los 192 derivados existen.
- Masters: 4.048.316 bytes frente a 37.693.964 bytes de origen. Es el peso de estas fotos, no una medición de carga total del sitio.
- Catálogo real a 1800, 768 y 375 px: 53 tarjetas, todos los escenarios fotográficos cuadrados y sin desbordamiento horizontal. Comprobadas cuatro fichas reales, selección de variante/URL, movimiento reducido y navegación sin JavaScript, sin errores de consola.
- Lint, typecheck y build aprobados: cero errores y cuatro advertencias de hooks preexistentes. 78 pruebas unitarias aprobadas, dos omitidas por su configuración; cuatro pruebas del normalizador y 76 recorridos Chromium de escritorio/móvil aprobados.
- Se actualizó la regresión de alineación para esperar el escenario 1:1 aprobado. Una prueba del giro ahora espera el inicio del observador de visibilidad antes de avanzar su reloj simulado.

Las capturas y las medidas de la revisión real están en [normalización aplicada](reviews/normalizacion-aplicada/verificacion.json): [escritorio](reviews/normalizacion-aplicada/catalogo-1800.png), [768 px](reviews/normalizacion-aplicada/catalogo-768.png), [375 px](reviews/normalizacion-aplicada/catalogo-375.png) y [ganador de masa](reviews/normalizacion-aplicada/ONE-0010-375.png). La revisión móvil fue emulada en Chromium; no equivale a una prueba en teléfono físico.
