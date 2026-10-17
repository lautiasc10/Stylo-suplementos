# Imágenes parejas — Fase 1 de la revisión

Fecha: 17 de octubre de 2026. Rama: `fase-3-imagenes-piloto`. Esta «Fase 1» corresponde al pedido de normalización; no modifica el alcance de las fases comerciales anteriores.

**Piloto aprobado y Fase 1 aplicada al catálogo.** Este documento conserva el resultado original de los cinco productos. La aplicación posterior a las 64 fotos existentes, sus comprobaciones y las advertencias de calidad se detallan en [Fase 1 aplicada](normalizacion-imagenes-aplicada.md). Las fases 2 y 3 del pedido siguen pendientes. No se cambió ningún registro ni archivo de Supabase.

## Stack y ubicación de los originales

Next.js 16.4 con App Router, React 19, TypeScript y Tailwind/CSS propio. Las páginas combinan servidor y componentes cliente. Framer Motion está instalado; las galerías también utilizan Web Animations API.

Las fotografías originales están en Supabase Storage, bucket `product-media`, bajo `<productId>/<fileId>.<extensión>`. `catalog_images` guarda las rutas, texto alternativo, variante y orden de las portadas. El documento del producto contiene `turnImages` para costados/dorsos e `informationImages` para fichas. Variantes mantiene UUID, SKU, sabor, presentación, precios y stock independientes. Las imágenes públicas usan `<img>` y el optimizador de Next.

La roca anterior **ya era un fondo CSS independiente**, `/visuals/catalog-lion-stone-v1.webp`; no estaba horneada en las 18 fotos examinadas. Los tamaños desparejos procedían de los márgenes transparentes, proporciones de los originales, escenario 4:5 y escalado/posicionamiento en el navegador.

Las copias de la prueba están en `public/media/normalization-trial-v1/`. Los originales de Storage no se sobrescriben. `before/` contiene copias optimizadas que conservan el encuadre anterior; los logos se copiaron byte por byte. No son nuevos originales ni se asignan al catálogo. Las fichas informativas no pasan por el recorte del envase.

## Resultado para revisar

- [Comparador local de los cinco productos](http://127.0.0.1:3000/vista-previa/imagenes).
- [Antes, cinco tarjetas](reviews/normalizacion-fase-1/antes-1800.png).
- [Después, cinco tarjetas](reviews/normalizacion-fase-1/despues-1800.png).
- [375 px](reviews/normalizacion-fase-1/despues-375.png) y [768 px](reviews/normalizacion-fase-1/despues-768.png).
- [Galería de detalle en escritorio](reviews/normalizacion-fase-1/detalle-1440.png) y [en celular](reviews/normalizacion-fase-1/detalle-375.png).

| Producto | Frentes | Dorsos |
| --- | ---: | ---: |
| EAA ONE FIT | 4 | 1 compartido |
| Creatina ONE FIT 200 GR | 1 | 0 |
| Platinum Whey STAR 2 LBS | 3 | 0 |
| Whey Protein STAR 2 LBS DP | 4 | 4 específicos |
| ZMA XBODY 90 cápsulas | 1 | 0 |

Son cinco productos, trece variantes y dieciocho fotos del envase. Cada copia principal es WebP transparente de 1000 × 1000, con producto de 800 px de alto, centrado y base en y=900. Se conserva la relación de aspecto. También se generan versiones de 320 y 640 px con `srcset`/`sizes`; la precarga y la foto visible utilizan la misma selección responsive antes de animar.

El comparador reutiliza las tarjetas y la ficha existentes. Solo su modo «Después» activa el encuadre nuevo: contenedor 1:1, `object-fit: contain`, badges absolutos, alineación de nombre/precios/acción y una única roca cuadrada de 1000 px derivada del recurso autorizado. La roca y la sombra de apoyo son CSS y permanecen fuera de las capas que giran. No se cambiaron tipografías, paleta, textos comerciales ni logos.

La ruta está bajo la protección existente de vista previa: entorno local, host local y sin indexación. La instantánea de los cinco productos permite revisar el mismo resultado sin conexión a Supabase. No se habilitan operaciones administrativas reales desde esa vista previa.

## Script reutilizable

```powershell
npm.cmd run media:normalize -- C:/imagenes/manifiesto.json C:/imagenes/normalizadas-v1
npm.cmd run test:media
```

Ejemplo de manifiesto, con rutas de entrada relativas al propio JSON:

```json
{
  "images": [
    {
      "id": "producto-frente",
      "input": "originales/producto.png",
      "label": "Nombre del producto · Vista frontal",
      "productId": "identificador-del-producto",
      "variantId": "identificador-de-variante",
      "kind": "front"
    }
  ]
}
```

`scripts/normalize-products.mjs` usa Sharp como dependencia de desarrollo explícita. Lee los originales, detecta el componente opaco principal, recorta su bounding box, escala sin deformar, coloca la base común y exporta tres tamaños. No anima ni procesa imágenes en el navegador. Los archivos incorporan el hash del original y una versión; si ya existe un destino con otros bytes, se rechaza la sobrescritura.

Si falta transparencia, solo elimina un fondo uniforme conectado a los bordes y marca el resultado para inspección. Un fondo complejo, incluida una roca realmente horneada, requiere máscara manual o segmentación: **el script lo rechaza y lo informa**, en lugar de prometer un recorte fiable con Sharp. El piloto no necesitó este paso, porque sus dieciocho originales ya tenían alfa real.

El informe `public/media/normalization-trial-v1/report.json` registra hash de origen, dimensiones, bounding box, escala/posición, archivos exportados y advertencias. No incluye contraseñas, claves ni URLs firmadas.

## Imágenes que requieren revisión

No se detectaron recortes ambiguos en el piloto. Se señalan siete archivos por resolución de origen:

| Archivo | Aviso |
| --- | --- |
| EAA ONE FIT, cereza, frente | Ampliación 2,87× |
| EAA ONE FIT, naranja, frente | Ampliación 2,87× |
| EAA ONE FIT, pomelo, frente | Ampliación 2,87× |
| EAA ONE FIT, uva, frente | Ampliación 1,44× |
| EAA ONE FIT, dorso compartido | Ampliación 2,87× |
| Creatina ONE FIT 200 GR, frente | Ampliación 1,32× |
| ZMA XBODY 90 cápsulas, frente | Ampliación 1,37× |

Se pueden revisar desde el desplegable del comparador. Para mejorar su nitidez hace falta un original de mayor resolución; no se inventó detalle mediante IA. Un formato demasiado ancho también se marcaría y se reduciría para conservarlo completo.

## Validación

- `lint`, `typecheck` y `build`: sin errores; cuatro advertencias de hooks anteriores.
- 76 pruebas unitarias aprobadas y dos omitidas por su configuración existente.
- Cuatro pruebas del script: dimensiones/base/proporciones, alfa, fondo uniforme, rechazo de fondo complejo, originales intactos y prohibición de sobrescribir destinos.
- Dieciséis pruebas de navegador aprobadas en producción local, escritorio y móvil: piloto, originales, selección responsive, galería, variantes, movimiento reducido, funcionamiento sin JavaScript y regresiones del giro anterior.
- Revisión a 1800, 768 y 375 px: escenarios cuadrados iguales, altura de tarjetas y posición relativa de precios alineadas, sin desbordamiento. Capturas y medidas en `docs/reviews/normalizacion-fase-1/`.
- Verificación SHA-256 de los dieciocho originales tras procesarlos: intactos. Dieciocho masters con alfa real y dimensiones 1000 × 1000; total 1.230.954 bytes, frente a 8.827.074 bytes de las fotos de origen del piloto. No es una medición del peso total del sitio.
- Se corrigieron claves React duplicadas entre etiquetas de promoción/stock detectadas al mostrar productos agotados. El recorrido final del comparador no produjo errores de consola. La auditoría general del panel Issues queda para la fase 2.

El usuario aprobó aplicar esta Fase 1 al catálogo completo. Quedan pendientes los originales de mayor resolución y la autorización de los cambios de interfaz y selector de las fases 2 y 3.
