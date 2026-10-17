# Fase 3 — giro con fotografías del envase y galería de producto

Fecha: 17 de octubre de 2026. Rama: `fase-3-rediseno-ux`.

Las tarjetas y las fichas pueden intercalar vistas reales del envase durante el cambio de variante. El frente anterior da paso a los ángulos disponibles y termina en el frente del nuevo sabor. La selección comercial se confirma al finalizar: foto, sabor, precios, stock, enlace y carrito siguen el mismo SKU. Las tablas nutricionales no intervienen en esta animación.

Es una composición de fotografías con perspectiva, no un modelo 3D ni un video de 360 grados. Su continuidad depende de los ángulos suministrados. Actualmente se confirmaron dorsos; el componente también admite costado izquierdo y derecho cuando se carguen fotos compatibles.

## Recursos incorporados

Se verificaron transparencia real, producto y presentación antes de guardar ocho archivos WebP sin pérdida. Se ajustó únicamente el lienzo transparente del dorso a la escala del frente; no se alteraron etiquetas ni se generaron fotografías.

| Producto | Asociación del dorso | Variantes con frente y giro |
| --- | --- | --- |
| STAR Whey Protein 2 LBS DP | Un dorso específico por SKU: STAR-0023 a STAR-0026 | 4 |
| ONE FIT Essential Amino Acid | Vista posterior de uso compartida | 4 |
| ONE FIT Optimus 240 GR | Vista posterior de uso compartida | 2 |
| ONE FIT Friction 3.2 300 GR | Vista posterior de uso compartida | 2 |
| ONE FIT Whey Protein 2 LBS DP | Dorso compartido | 3 |

ONE-0015 (dulce de leche) conserva la fotografía frontal pendiente. El dorso común está disponible para el producto; esa variante no se incorpora a la rotación de las tarjetas mientras no tenga frente.

Origen: [carpeta del usuario en Google Drive](https://drive.google.com/drive/folders/1oRApvTMQksu0B0c5rmFIPPHEn48k3l0w). STAR usa `WheyProteinCH d SF.png`, `WheyProteinCC d SF.png`, `WheyProteinSC d SF.png` y `WheyProteinVC d SF.png`. ONE FIT usa las fotos transparentes de FOTOS-PRODUCTOS con IDs `15SCZCLEaKoWKNTxDS36Chx97QjHs2JXx`, `127G5SjDkneD4lxXcBYA7aFqQtpLTqwfy`, `1H-G-YMIC452fzXK9WcP8MMimBiWgR1Fs` y `185jAMT8PfhlATcxwIsQr0Z2SIC8pDqTq`.

Platinum Whey, FIX BCAA, Hydroflex, Hydrosport, Creatine + Whey y Vitalmag conservan la transición anterior cuando hay fotografías suficientes. No se asignaron dorsos de Isolate a Platinum Whey sin confirmar que correspondan, ni fotos con fondo blanco real a productos que el usuario pidió dejar pendientes. No se reutiliza un frente de otro sabor para completar una variante sin imagen.

## Galería y administración

La ficha presenta miniaturas en una columna con flechas de desplazamiento en escritorio. En celular se adapta a una tira horizontal para conservar el espacio del envase. Se puede consultar frente, dorso, costados y ficha informativa. Seleccionar una miniatura no cambia el SKU. Las flechas de sabor y el selector sí lo cambian. El acceso a la ficha ampliada del fabricante se conserva debajo.

En administración, cada variante tiene su sección «Costados y dorso», con carga, reemplazo, asociación y selector de vista. Las vistas realmente comunes se editan en «Costados y dorso compartidos». Las vistas específicas tienen prioridad sobre una compartida del mismo tipo. Las imágenes frontales y las fichas conservan sus secciones anteriores.

`turnImages` es opcional y se conserva en el documento JSONB existente. No requiere migración SQL. La validación controla hasta 24 vistas, tipo de ángulo, UUID, ruta dentro del producto, texto alternativo, posición y referencia a una variante válida. El guardado mantiene revisión, MFA y atomicidad. Se verificó la persistencia en PostgreSQL de prueba y Supabase real. Estado final: revisión 64, 53 productos y 76 variantes; precios, SKU, stock, visibilidad, promociones y fotos anteriores conservados.

## Movimiento y alternativas

El giro dura 1100 ms y anima solo transformación y opacidad mediante Web Animations API. Las capas temporales están ocultas al lector de pantalla y desaparecen al finalizar. Antes de empezar, las fotos utilizadas deben estar descargadas y decodificadas. La caché conserva hasta cuatro fotos; prepara el siguiente frente y los ángulos actuales únicamente cuando la galería está visible, respetando ahorro de datos. Una espera decorativa superior a 450 ms permite continuar con la transición anterior.

Fuera de pantalla, en pestañas ocultas y al activar movimiento reducido se resuelve una transición pendiente. Con movimiento reducido no hay rotación automática y las selecciones manuales son inmediatas una vez cargada la foto. Si falla el frente solicitado, se mantienen el SKU y la imagen anteriores. Los enlaces de miniaturas permiten abrir los originales sin JavaScript; la foto inicial y la información comercial siguen presentes en el HTML.

## Verificación

- Build y lint completados: sin errores; cuatro advertencias de hooks previas.
- 76 pruebas unitarias aprobadas; dos omitidas por su configuración existente.
- 68 pruebas de navegador aprobadas en producción local, escritorio y celular: catálogo, edición, importación, galería, fichas, ganadores de masa, sincronización, errores, movimiento reducido y giro con dorsos.
- Supabase: lectura posterior y comparación de los datos comerciales con el respaldo previo; ocho archivos descargados iguales a los subidos y con canal alfa real.
- Recorrido público a 1440 y 390 px sin desbordamiento; miniaturas y cambio de variante revisados con las fotos reales. Comprobado el HTML sin JavaScript en la ficha real.

No se hicieron cobros ni pedidos reales durante estas comprobaciones. La fluidez en todos los dispositivos físicos no se puede garantizar con emulación; los originales de baja resolución conservan ese límite de detalle.
