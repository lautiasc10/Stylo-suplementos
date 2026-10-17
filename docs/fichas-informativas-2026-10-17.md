# Fichas informativas de productos — 17 de octubre de 2026

## Implementación

La ficha de producto incorpora **Información del producto**, un desplegable nativo con miniaturas de las fichas del fabricante y ampliación mediante `dialog`. Cierra con Escape, clic exterior o botón Cerrar; contiene el foco y lo devuelve al enlace de origen. El archivo original sigue disponible como enlace y el desplegable funciona sin JavaScript. Las imágenes se cargan con `loading="lazy"`; esta sección no agrega animaciones.

Administración permite agregar, reemplazar, describir, ordenar y quitar estas imágenes en **Fichas del fabricante**. La opción **Todo el producto** comparte una única ficha entre las variantes. Si cambia la información, se puede elegir el SKU correspondiente. Al descartar una variante nueva, sus fichas específicas se retiran del borrador y no se convierten en información compartida.

Los metadatos viven en `Product.informationImages`, dentro del documento de producto existente en Supabase. El guardado conserva las validaciones de archivos y asociaciones, la sesión administrativa con MFA y la revisión del catálogo. No fue necesaria una migración de estructura. Las fichas permanecen separadas de `Product.images`: no participan en las fotos de portada, la animación de tarjetas, el carrito ni la selección automática del envase.

## Carga realizada

- **51 imágenes informativas** en **46 productos**, correspondientes a **66 variantes**.
- **43 compartidas** y **8 específicas** de sabor. Se comparte una sola imagen en los productos que tienen información común.
- **7 productos / 10 variantes pendientes** por falta de una fuente informativa legible y correspondiente al modelo.
- Revisión del catálogo después del guardado: **62**. Los 53 productos mantienen su visibilidad y sus datos comerciales; las fotos de los envases se conservaron.

Los archivos proceden de la carpeta compartida suministrada por el usuario. Se convirtieron a WebP sin pérdida y se recortaron solamente márgenes vacíos para mejorar la lectura, conservando el contenido original. No se reescribieron datos nutricionales, ingredientes ni indicaciones.

La tabla más reciente de cafeína correspondía a 60 cápsulas: se utilizó la alternativa suministrada que indica 30 cápsulas y 200 mg por cápsula, coincidente con el SKU. Para Mutant se utilizó el dorso de 1,5 kg con 17 porciones; se descartó la tabla del envase de 5 kg. En ONE FIT, la ficha común del doypack Whey incluye los ingredientes de sus sabores; EAA, Collagen y Friction conservan los archivos específicos cuando cambia el etiquetado.

## Comprobaciones

- Comparación completa del catálogo leído después de guardar: únicamente se agregaron fichas informativas y se actualizaron versión y revisión.
- Descarga y comparación de los 51 archivos guardados con los archivos preparados.
- 75 pruebas unitarias correctas; dos pruebas de archivos externos se omiten si no se proporcionan esos archivos.
- 48 recorridos de catálogo en escritorio y móvil correctos, incluidos carga de fotos, reemplazo, importación, guardado y nueva sección informativa.
- Comprobación con datos reales a 1440 y 390 px: apertura, cierre, retorno del foco, imagen compartida única al cambiar de sabor y ficha específica que cambia con su variante.
- Comprobación sin JavaScript en ficha estándar y ganador de masa: apertura nativa y acceso al archivo original.
- Compilación y lint correctos; lint conserva cuatro advertencias previas de hooks.

## Pendientes

| SKU      | Producto                                      | Motivo                                                                                                      |
| -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| XBO-0001 | AMINOÁCIDOS RAMIFICADOS "FIX BCAA" x 300GR    | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| XBO-0002 | AMINOÁCIDOS RAMIFICADOS "FIX BCAA" x 300GR    | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| XBO-0003 | AMINOÁCIDOS RAMIFICADOS "FIX BCAA" x 300GR    | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| XBO-0004 | AMINOÁCIDOS RAMIFICADOS "FIX BCAA" x 300GR    | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| XBO-0014 | CAFEÍNA x 60 CÁPSULAS                         | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| XBO-0012 | CREATINA MICRONIZADA x 1KG                    | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| ONE-0010 | GANADOR DE PESO "THE BEST GAINER" 1.5KG       | No se encontró ficha informativa legible de The Best Gainer chocolate 1,5 kg.                               |
| XBO-0016 | MULTIVITAMÍNICO "MULTISPORT" x 90 CÁPSULAS    | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| XBO-0015 | PROTEÍNA "WHEY BLEND PROTEIN" x 2LBS DP       | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |
| XBO-0019 | ZINC+MAGNESIO+VITAMINA B6 "ZMA" - 90 CAPSULAS | Las fichas disponibles corresponden a otros modelos; falta una fuente informativa confirmada para este SKU. |

## Asociaciones cargadas

| SKU incluidos                              | Alcance             | Archivo suministrado               |
| ------------------------------------------ | ------------------- | ---------------------------------- |
| STAR-0016                                  | Todo el producto    | CLA1000 IN.png                     |
| STAR-0001                                  | Todo el producto    | MtorBCAA270g IN.png                |
| ONE-0001                                   | Variante específica | EAA-Cereza-d_retoque.png           |
| ONE-0002                                   | Variante específica | EAA-Naranja-d_retoque.png          |
| ONE-0003                                   | Variante específica | EAA-Pomelo-d_retoque.png           |
| ONE-0004                                   | Variante específica | EAA-Uva-d_retoque.png              |
| STAR-0002                                  | Todo el producto    | EAAS IN.png                        |
| STAR-0003                                  | Todo el producto    | BCAA2000 IN.png                    |
| STAR-0013                                  | Todo el producto    | Caffeine200 IN.png                 |
| ONE-0018                                   | Todo el producto    | CitratoMagnesio-d_retoque.png      |
| ONE-0019                                   | Todo el producto    | CitratoPotasio-d_retoque.png       |
| XBO-0005, XBO-0006, XBO-0007, XBO-0008     | Todo el producto    | Collagen HydroFlex_infoN.png       |
| XBO-0009, XBO-0010, XBO-0011               | Todo el producto    | Collagen HydroSport_infoN.png      |
| ONE-0006                                   | Variante específica | Colagen-Frutilla-d_retoque.png     |
| ONE-0007                                   | Variante específica | Colagen-Naranja-d_retoque.png      |
| STAR-0005                                  | Todo el producto    | CollagenPlusL IN.png               |
| STAR-0006                                  | Todo el producto    | Collagen210gFR SG IN.png           |
| ONE-0008                                   | Todo el producto    | Creatine200-d_retoque.png          |
| ONE-0009                                   | Todo el producto    | Creatine500-d_retoque.png          |
| STAR-0007                                  | Todo el producto    | CreatineMonohydrate1000g IN.png    |
| STAR-0008                                  | Todo el producto    | CreatineMonohydrate150g IN.png     |
| STAR-0009                                  | Todo el producto    | CreatineMonohydrate300gD IN.png    |
| STAR-0010                                  | Todo el producto    | CreatineMonohydrate300g IN.png     |
| STAR-0011                                  | Todo el producto    | CreatineMonohydrate300gD FR IN.png |
| XBO-0013                                   | Todo el producto    | CreatinePureinfo.png               |
| STAR-0012                                  | Todo el producto    | MUTANT MASS 1500gdorso.png         |
| ONE-0005                                   | Todo el producto    | Glutamine-d_retoque.png            |
| STAR-0004                                  | Todo el producto    | LGlutamine150g IN.png              |
| STAR-0029                                  | Todo el producto    | CdeMagnesio500GSS IN.png           |
| STAR-0030                                  | Todo el producto    | AllInOneMultivitamin IN.png        |
| ONE-0020                                   | Todo el producto    | Multivitamins-d_retoque.png        |
| ONE-0021                                   | Todo el producto    | Omega3-d_retoque.png               |
| STAR-0031                                  | Todo el producto    | Omega3 IN.png                      |
| ONE-0012                                   | Variante específica | Friction-Limon-d_retoque.png       |
| ONE-0013                                   | Variante específica | Friction-Uva-d_retoque.png         |
| STAR-0017                                  | Todo el producto    | PumpV8 AP W GA CS IN.png           |
| STAR-0018                                  | Todo el producto    | TNT IN.png                         |
| STAR-0019                                  | Todo el producto    | JustPlantProtein IN.png            |
| STAR-0020, STAR-0021, STAR-0022            | Todo el producto    | PWP2LB CH VC SC BC CC IN.png       |
| ONE-0014, ONE-0015, ONE-0016, ONE-0017     | Todo el producto    | ClassicWhey2Lb-d_retoque.png       |
| STAR-0023, STAR-0024, STAR-0025, STAR-0026 | Todo el producto    | WheyProtein IN.png                 |
| STAR-0027, STAR-0028                       | Todo el producto    | TablaCreatine&Whey.png             |
| ONE-0011                                   | Todo el producto    | FatDestroyer-d_retoque.png         |
| STAR-0014                                  | Todo el producto    | Rippedv8-info.png                  |
| STAR-0015                                  | Todo el producto    | Resveratrol500 IN.png              |
| XBO-0017, XBO-0018                         | Todo el producto    | VitalMag_infoN.png                 |
| ONE-0022                                   | Todo el producto    | VitaminaC-d_retoque.png            |
| STAR-0032                                  | Todo el producto    | VitaminaC IN.png                   |
| ONE-0023                                   | Todo el producto    | D3K2Vitamins-d_retoque.png         |
| STAR-0033                                  | Todo el producto    | VitaminasK2D3 IN.png               |
| STAR-0034                                  | Todo el producto    | ZMA IN.png                         |
