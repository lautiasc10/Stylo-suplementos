# Fase 3D — Anillo estable y galería oscura

Entrega en `fase-3d-anillo-galeria`, sin integrar a main. Conserva paleta, tipografías, logos, textos y estructura comercial. Reemplaza las reglas técnicas de [Fase 3C](variant-ring-fase-3c.md).

## Anillo y tilt

- Todos los frentes se montan una vez, con key del ID de variante. Las variantes lejanas mantienen su nodo, pero no descargan fotos hasta que hacen falta. No se cambia ninguna fuente durante el giro.
- Offset circular con signo y camino más corto; anillo de 550 ms con curva (.22,.8,.3,1). La vecina que cruza por detrás desaparece antes de atravesar el centro; su pista usa Web Animations nativa. El resto usa Framer Motion existente.
- Vecinas a ±60%, escala .55, opacidad .3 y profundidad de -80 px, detrás del activo. Con dos variantes hay solo una vecina. Se conserva el límite de solapamiento del 15% del ancho visible incluso para el encuadre más ancho permitido. Más allá de las vecinas, opacidad cero y ninguna pista de animación.
- Se prioriza la última instrucción de rendimiento: **sin blur**. Una máscara estática pertenece únicamente al anillo, con transparencia en los extremos. El contorno de tarjeta mantiene su degradado mediante border-image, sin máscara adicional.
- El brillo es un gradiente normal semitransparente, sin mix-blend-mode ni máscara por envase. Solo el activo se inclina. Las variables se escriben por rAF sobre ese envase y su sombra, evitando invalidar todos los vecinos. Se retira will-change al detenerse el movimiento o terminar la rotación.
- Durante el giro se conserva únicamente la última solicitud. Flechas, chips, teclado y swipe mantienen precio, stock, contador, miniaturas, enlace y carrito sincronizados al confirmar la selección. La roca permanece fija.
- En tarjetas no hay pointermove activo sin hover; la preparación de fotos vecinas requiere hover, foco o contacto. En detalle se preparan únicamente las vecinas. Movimiento reducido conserva fundido sin tilt ni brillo; el HTML inicial muestra el frente sin transición.

## Imágenes y galería

Se procesaron **115 originales**: 56 frentes, 8 costados/dorsos y 51 fichas. Los originales permanecen en Supabase Storage y en la carpeta temporal de trabajo; no se subieron ni escribieron archivos remotos. Los SHA-256 de los 115 originales coinciden después del procesamiento.

`scripts/normalize-gallery.py` usa rembg/u2netp y Pillow. Evalúa la segmentación de todas las imágenes, pero conserva el alfa original cuando ya existe, para evitar erosionar etiquetas. Un segundo paso, `scripts/finish-gallery-mattes.mjs`, aplica la eliminación conservadora de fondo uniforme de Fase 1 a fotos rechazadas y descarta el resultado si elimina zonas blancas impresas del centro del envase. Solo cuatro de estas correcciones superaron la comprobación y la revisión visual.

Los derivados viven en `public/media/products-normalized-v2`, y su registro por ruta original exacta en `src/modules/catalog/normalized-gallery.json`. Masters transparentes de 1000 × 1000, copias de 320 y 600; los envases tienen **800 px de alto y base en y=900**. No hay envases con altura o encuadre pendiente de renormalizar. Se conservan las [advertencias de resolución de los originales](normalizacion-imagenes-aplicada.md#archivos-para-revisar): un canvas mayor no recupera detalle de una fuente pequeña.

Next Image sirve las fotos, con dimensiones explícitas y sizes por tamaño de galería. Un loader acotado reutiliza estos WebP sin comprimirlos nuevamente: tarjetas hasta 600 px, detalle hasta 1000, miniaturas 320. Máximo medido en los archivos de 600: **40.194 bytes**. Las primeras cuatro tarjetas cargan temprano; solo el frente principal del detalle usa fetchPriority high. El resto conserva lazy loading. Para fotos nuevas todavía sin normalizar, se reduce el optimizador de tarjeta de 1200 a 640 px y el del detalle de 1920 a 1080.

Las fichas informativas se muestran dentro de un bloque oscuro con borde dorado fino, radio y padding, también al ampliar. Las tablas conservan su papel para que las letras sigan siendo legibles; no hay un plano blanco ocupando toda la galería. El placeholder del catálogo usa roca y una ilustración dorada tenue.

## Excepciones del recorte

**6 fotos requieren máscara manual**: tanto rembg como el recorte uniforme eliminaban partes impresas. Se descartaron los recortes dañados; se entrega la foto íntegra, sin márgenes exteriores innecesarios, dentro del marco oscuro. No se inventó ni reconstruyó ningún píxel del envase.

| Foto / variante | Original conservado |
| --- | --- |
| Etiqueta e información nutricional · AMINOÁCIDOS "EEAA + ESSENTIAL AMINO ACID" · cereza | `d242dd6b-989a-49a4-9b20-e852cddb5561/0f1f73af-c2c7-4c0c-9b9e-c282e606ff83.webp` |
| Etiqueta e información nutricional · AMINOÁCIDOS "EEAA + ESSENTIAL AMINO ACID" · naranja | `d242dd6b-989a-49a4-9b20-e852cddb5561/6b7f3eba-e2ae-43ce-a42e-0f1eb96e00ef.webp` |
| Etiqueta e información nutricional · CITRATO DE POTASIO x 150GR | `250ea8a3-4d7d-46d0-acf9-b75c630703c1/22985195-08e9-4675-b346-21874107634f.webp` |
| Etiqueta e información nutricional · COLAGENO "OPTIMUS" x 240GR · frutilla | `1dc35418-8d84-4b15-bc31-45dda36636cd/4abc3ad4-96db-4579-9152-1efaa4db3f24.webp` |
| Etiqueta e información nutricional · COLAGENO "OPTIMUS" x 240GR · naranja | `1dc35418-8d84-4b15-bc31-45dda36636cd/3b7e2733-210f-4ea6-9ca7-0a25cfd0df02.webp` |
| Etiqueta e información nutricional · PROTEÍNA "WHEY PROTEIN" 2LBS DP | `2908c277-201c-4d5b-87a9-169841e07f41/192b403d-817d-4750-b4f4-0fd3c63d0cac.webp` |

**31 tablas nutricionales** conservan el papel dentro del marco. La segmentación de objetos no es adecuada para separar tipografía de papel blanco; se prioriza mantener todo el contenido. Lista completa:

| Ficha | Original conservado |
| --- | --- |
| Información nutricional · ÁCIDO LINOLEICO "CLA 1000" x 90 CAPS | `3047fa30-9a5c-4a16-818c-48b5f34d2251/4a6a690f-b7e9-4171-a558-aab7e911f1ce.webp` |
| Información nutricional · AMINO. RAMIF. "BCAA MTOR" x 270 GRS | `ffc19a88-155b-45f3-b661-16745700d7d9/7833a750-a8c1-4f8c-b12d-340c90ee258c.webp` |
| Información nutricional · AMINOÁCIDOS "ESSENTIAL AMINO" x 360 GRS | `4c903967-9729-46e5-9a6c-e50e7e2a6bb4/1136aeda-028a-4153-8772-7ecde6a13012.webp` |
| Información nutricional · AMINOÁCIDOS RAMIFICADOS "BCAA" x 120 CAPS | `0087c1a8-137c-4379-9c57-f6926d51cf6a/5412be4f-7e3b-4926-8e3b-05c596a7fda0.webp` |
| Información nutricional · CAFEINA 200 x 30 CAPS | `b525db9e-6264-4550-a7d1-0a3714f308ed/b59d05a4-770b-4945-b270-a0fa62e118d6.webp` |
| Información nutricional · COLÁGENO "HYDROFLEX" x 330GR | `9a5cf95c-772b-46f2-9172-99b811f07065/25d6e92f-f2bd-4d50-b821-a46cb428279a.webp` |
| Información nutricional · COLÁGENO "HYDROSPORT" x 360GR | `d47b8df4-d46f-44fd-bd4c-3a841c28f816/6da392a2-1381-4f08-afba-fffce738527f.webp` |
| Información nutricional · COLAGENO "PLUS" x 360 GRS | `aeaf3f44-bfbf-4ed3-ab15-d2a550944641/958a476e-bcb1-4861-82ca-b0c659e21e67.webp` |
| Información nutricional · COLAGENO x 210 GRS | `d6d9930f-4193-4916-938d-2f26329114dc/3d4daa8b-7726-4170-82ae-fa12f5addf7d.webp` |
| Información nutricional · CREATINA MONOHIDRATADA x 1 KG | `0c070db3-97d3-4d56-8e51-8073d54f45ee/a11f7f60-56c2-42ef-b132-c00ac4b78486.webp` |
| Información nutricional · CREATINA MONOHIDRATADA x 150 GRS TARRO | `23525bce-0e15-4c17-8bb9-035b7a700661/b02cd585-1e7e-4d9c-9ad9-03ba23383602.webp` |
| Información nutricional · CREATINA MONOHIDRATADA x 300 GRS DP | `922613cc-fc33-4ef2-884a-bc245afdc843/e71e40c6-216a-484f-8f0d-45e3f1cc23a2.webp` |
| Información nutricional · CREATINA MONOHIDRATADA x 300 GRS TARRO | `b4631a13-5914-494a-8b4c-ca3113ff9f1a/79418bca-234d-4aa2-8267-540ea477def6.webp` |
| Información nutricional · CREATINA MONOHIDRATADA x 300GR DP | `034c58d1-f8b3-4d2e-b53a-48eb7ebb089e/685fc614-b59c-40f3-85c2-8efe97796394.webp` |
| Información nutricional · CREATINA x 300GR DP | `4e3b0e36-964b-4b2d-88f5-e9bd1a2d6251/72001c0c-9baf-4816-9ecf-4433e1adf8e7.webp` |
| Información nutricional · L - GLUTAMINA x 150 GRS | `3438a7f1-c211-4ee5-bc6e-047afc9385e5/4755e93a-ba79-440e-b68c-8bfded4ff438.webp` |
| Información nutricional · MAGNESIO x 500 GRS | `0ec36831-38f8-4af7-9d3c-c12c330334e6/6e33c403-da2d-40d8-a765-f315cc6274d3.webp` |
| Información nutricional · MULTIVITAMÍNICO "ALL-IN-ONE" x 60 COMP | `c3d93701-0862-4087-82a2-bf1679aa95d4/54b715b2-997c-4c21-9dc6-4f3e1a109a01.webp` |
| Información nutricional · OMEGA 3 x 60 CAPS | `fe6c9c50-4319-4532-8c69-4bb9a9051ec8/7e320e8a-158f-4195-bb2c-946704836164.webp` |
| Información nutricional · PRE-ENTRENO "PUMP V8" x 285 GRS | `6e3f380b-cfb4-48c0-bb4b-37c122e8199e/20ad5d52-c8d0-4b4c-a9b4-2f9d195f3eae.webp` |
| Información nutricional · PRE-ENTRENO "TNT" x 240 GRS | `95ea43b9-3ac0-4fa4-b6a1-a6d8646e4d7c/39df488d-c683-40d5-8392-278f110a84c6.webp` |
| Información nutricional · PROTEÍNA "JUST PLANT" x 2 LBS | `17a2a00d-acf8-4b58-b4f0-6f96087f5dbf/e73a0936-7d06-4a0f-ade1-9c3979facb8d.webp` |
| Información nutricional · PROTEÍNA "PLATINUM WHEY" x 2 LBS | `5a8eefe5-32d9-4119-b1c2-0ca65eb916c5/d4978e14-658a-4415-bd86-e58bd81e64a4.webp` |
| Información nutricional · PROTEÍNA "WHEY PROTEIN" x 2 LBS DP | `6d7d2d83-c67f-4999-bab7-bdbec4bb8e87/65387934-8085-47a5-8392-8a746a37d43c.webp` |
| Información nutricional · PROTEÍNA + CREATINA x 910 GR | `189bf31e-45ca-494b-967a-292954231b42/03c6319b-5296-42b1-ba9a-22e8232e7019.webp` |
| Información nutricional · QUEMADOR DE GRASAS "RIPPED V8" x 60 CAPS. | `36b02068-1086-4fe6-a414-5733ed8b124e/7d2817e7-6506-41d0-85d4-31884868bba7.webp` |
| Información nutricional · RESVERATROL 500 x 60 CAPS | `4f8a9d63-0417-4942-9e2e-c20cc84a91fa/a41592b8-cd5a-447e-8993-ee32f1c93a21.webp` |
| Información nutricional · TRI-MAGNESIO "VITALMAG" (CITRATO+MALATO+GLICINATO) 300g | `38586942-817f-476c-8451-a949689924fa/8dd8a030-7057-46f1-9981-ad53a2a7c912.webp` |
| Información nutricional · VITAMINA C x 60 CAPS | `8022818b-6512-474a-a5eb-4cf2e84904db/69e3ce5c-0c64-44f7-9530-82ece425aacf.webp` |
| Información nutricional · VITAMINAS K2-D3 x 60 CAPS | `139526c5-9bc2-4c84-8e26-f459904cd455/254ed817-0886-4b31-899e-49e226fb95b9.webp` |
| Información nutricional · ZINC+MAGNESIO+VITAMINA B6 "ZMA" x 90 CAPS | `87441c85-77b0-41b9-9318-bd169d4bb502/2e5c33bf-faf1-4ae5-9926-7b8f027bd585.webp` |

Otros nueve recortes de fotos de etiquetas superaron la retención de impresión de 99,5% y se revisaron en plancha; su estado continúa marcado para revisión fina. Informe completo: [report.json](../public/media/products-normalized-v2/report.json).

## Rendimiento antes y después

Capturas con Chromium CDP Performance/Tracing, producción **next build --profile + next start**, 1440 × 1000, DPR 1, contexto nuevo y CPU 4×. Sin servidor dev. El hook de React DevTools del script registra commits y duración del renderer de profiling; no se agrega instrumentación a la tienda. Los .trace.json.gz se pueden cargar/descomprimir en Performance. Son mediciones de laboratorio de esta máquina, con variación entre ejecuciones.

A 60 Hz el presupuesto real es 16,67 ms: por eso se informan los >16 ms pedidos, junto a >20 y >50 ms, que distinguen mejor los frames perdidos. Paint agrega Paint/PrePaint/CompositeLayers/UpdateLayerTree sin duplicar intervalos; scripting usa ScriptDuration de CDP. Las duraciones son totales por recorrido, no por frame.

### Antes — Fase 3C

| Recorrido | Frame p95 (ms) | Frames >16 ms / muestras | >20 ms | >50 ms | Scripting (ms) | Paint (ms) | Eventos JS >16 ms | Paint >16 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Scroll del catálogo | 33.4 | 152/152 | 18 | 4 | 326.59 | 99.26 | 1 | 0 |
| Hover y tilt | 50 | 100/100 | 71 | 3 | 127.42 | 212.08 | 1 | 0 |
| Cambio en tarjeta | 49.9 | 77/77 | 10 | 0 | 158 | 82.22 | 0 | 0 |
| Cambio en detalle | 33.4 | 80/80 | 10 | 0 | 153.48 | 31.39 | 2 | 0 |

### Después — Fase 3D con CPU 4×

| Recorrido | Frame p95 (ms) | Frames >16 ms / muestras | >20 ms | >50 ms | Scripting (ms) | Paint (ms) | Eventos JS >16 ms | Paint >16 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Scroll del catálogo | 33.4 | 147/147 | 23 | 3 | 422.78 | 109.56 | 0 | 0 |
| Hover y tilt | 33.4 | 117/117 | 25 | 0 | 99.19 | 61.07 | 0 | 0 |
| Cambio en tarjeta | 33.4 | 87/87 | 7 | 1 | 138.11 | 64.2 | 2 | 0 |
| Cambio en detalle | 16.7 | 88/88 | 2 | 0 | 143.3 | 37.99 | 2 | 0 |

El hover reduce scripting y pintura; el detalle mejora su intervalo p95. El scripting total del scroll **sube** de 326.59 a 422.78 ms: mantener todos los nodos estables y Next Image agrega trabajo al revelar/cargar nuevas tarjetas. La medición 4× conserva picos, incluidos 1 frame(s) >50 ms al cambiar en tarjeta y 2 eventos de JS >16 ms en detalle. No se presenta esa prueba como 60 fps constantes ni como mejora de todas las métricas.

Peso inicial de imágenes: **724.269 → 562.048 bytes** (22.4% menos). Recorrido completo catálogo + detalle: **1.517.579 → 1.295.039 bytes**. Se incluye lo solicitado por el navegador, no la suma de todos los archivos del repositorio.

### Máquina de prueba sin limitación de CPU

| Recorrido | Frame p95 (ms) | Frames >16 ms / muestras | >20 ms | >50 ms | Scripting (ms) | Paint (ms) | Eventos JS >16 ms | Paint >16 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Scroll del catálogo | 16.7 | 143/143 | 0 | 0 | 97.93 | 18.93 | 0 | 0 |
| Hover y tilt | 16.7 | 176/176 | 0 | 0 | 27.66 | 18.75 | 0 | 0 |
| Cambio en tarjeta | 16.7 | 84/84 | 0 | 0 | 35.47 | 9.97 | 0 | 0 |
| Cambio en detalle | 16.8 | 86/86 | 0 | 0 | 35.21 | 4.43 | 0 | 0 |

En los cuatro recorridos finales no hubo frames >20 ms ni eventos largos de scripting/pintura. No acredita un teléfono físico ni Safari. Con 53 productos y ese resultado no se introduce virtualización ni se cambia la paginación/layout.

React: en el hover 4× hubo **cero commits**; en el cambio de tarjeta final se renderizó **una ProductCard**, no el catálogo entero. El anillo guarda su índice localmente; la tarjeta solo refleja la variante confirmada. En la prueba sin limitación, el hover también alcanzó el temporizador de alternancia automática y produjo dos commits de ese anillo, no por mousemove. Se memoizaron ProductCard y las fotos, y el tilt no usa setState.

### Registro por ajuste

| Captura | Cambio principal | Hover p95 / scripting / paint | Imágenes iniciales |
| --- | --- | --- | ---: |
| [before](reviews/variant-ring-fase-3d/before.json) | Base 3C | 50 ms / 127.42 ms / 212.08 ms | 724.269 B |
| [ring](reviews/variant-ring-fase-3d/ring.json) | Nodos persistentes, vecinas y brillo normal | 33.4 ms / 109.43 ms / 173.79 ms | 724.295 B |
| [media](reviews/variant-ring-fase-3d/media.json) | WebP 600/1000, memoización y variables locales | 33.4 ms / 107.96 ms / 66.37 ms | 576.291 B |
| [after](reviews/variant-ring-fase-3d/after.json) | Fondos finales y tamaños del optimizador | 33.4 ms / 101.59 ms / 75.18 ms | 562.050 B |
| [final](reviews/variant-ring-fase-3d/final.json) | Retiro de will-change al reposo y control de pistas | 33.4 ms / 99.19 ms / 61.07 ms | 562.048 B |

## Comprobaciones y capturas

- Lint, TypeScript y build normal y de profiling aprobados; **85 unitarias** y cuatro pruebas del normalizador aprobadas. Dos unitarias omitidas por su configuración de integración.
- **124 recorridos Chromium distintos** aprobados en escritorio y móvil; dos omisiones por plataforma. La corrida general aprobó 118, omitió dos y dejó seis expectativas antiguas que contaban nodos desmontados. Se adaptaron al contrato de nodos persistentes/capas visibles y los seis pasaron al repetirlos.
- Diez clics rápidos hacia adelante y diez hacia atrás, en ambos tamaños y dispositivos: nodos conservados, cero cambios de fuente durante el giro, estado final consistente. Cruces circulares ocultos, reducción de movimiento en vivo, flechas/chips/swipe, navegación sin JavaScript, foto fallida y regreso a foco comprobados.
- Las 115 copias tienen alfa real y canvas 1000 × 1000; originales intactos. Catálogo y dos fichas reales revisados a 1800, 768 y 375 px: nueve vistas y seis selecciones de etiqueta, sin desbordamiento ni errores de consola. [Verificación](reviews/variant-ring-fase-3d/verification.json).
- 53 productos y 76 variantes. Fotos, identidades, SKU y precios coinciden con la instantánea original. Se detectó una actualización externa de stock en STAR-0016; esta tarea no ejecutó escrituras de base de datos ni cobros. [Lectura comparada](reviews/variant-ring-fase-3d/catalog-data.json).

[Catálogo escritorio](reviews/variant-ring-fase-3d/catalogo-1800.png) · [768 px](reviews/variant-ring-fase-3d/catalogo-768.png) · [375 px](reviews/variant-ring-fase-3d/catalogo-375.png) · [Anillo](reviews/variant-ring-fase-3d/anillo-escritorio.png) · [Ficha móvil](reviews/variant-ring-fase-3d/producto-375.png) · [Etiqueta enmarcada](reviews/variant-ring-fase-3d/etiqueta-STAR-0023-1800.png).

## Reproducir

En un entorno Python separado, instalar rembg[cpu] 2.0.85 y Pillow 12.3.0. u2netp descarga una vez el modelo de segmentación; no se incorpora al frontend. No se agregaron dependencias npm.

`python scripts/normalize-gallery.py catalogo-publico.json carpeta-temporal`

`node scripts/finish-gallery-mattes.mjs carpeta-temporal`

El JSON de entrada usa {catalog,imageBase}, con URL pública del bucket product-media. Nunca usar credenciales administrativas. Conservar originales y revisar report.json antes de publicar.

`npm.cmd run build -- --profile`

`npm.cmd run start -- --port 3200`

`node scripts/measure-variant-ring.mjs nombre` (CPU 4×; PROFILE_CPU=1 permite la corrida sin limitación).

`node scripts/verify-gallery.mjs catalogo-publico.json carpeta-temporal`

Para entregar un build sin profiling: `npm.cmd run check`.
