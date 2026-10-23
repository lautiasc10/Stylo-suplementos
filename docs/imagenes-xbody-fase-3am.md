# Fase 3AM — Fotos transparentes de XBODY

Rama `fase-3am-imagenes-xbody`, posterior a la actualización de seguridad 3AL. Los originales subidos por el usuario permanecen en Storage. Pure Rice Cream no se publica porque aún no figura en la lista de precios.

Se comprobó en el catálogo real que el usuario reemplazó los frentes de **Creatina micronizada 1 kg (XBO-0012)** y **Vitalmag frutos rojos 300 g (XBO-0017)**. Ambas fotos nuevas son PNG transparentes de 1254 × 1254 px. Las etiquetas confirman presentación y sabor. La creatina se recortaba en la ficha de escritorio porque el envase ocupaba casi todo el canvas. La página pedía una imagen optimizada a 1920 px incluso en móvil.

El script `scripts/normalize-transparent-photos.mjs` toma originales transparentes locales, conserva el envase conectado más grande, recorta sus píxeles visibles y lo centra en un canvas transparente de 1000 × 1000: 800 px de altura y línea base en y=900. Exporta WebP 320/600/1000 sin modificar la fuente. El registro de rutas exactas usa estas copias solo mientras la foto original asociada siga siendo esa misma; un reemplazo futuro en administración se sirve inmediatamente con su nuevo archivo.

| SKU | PNG original | WebP 600 px | WebP 1000 px |
| --- | ---: | ---: | ---: |
| XBO-0012 | 1.036.926 B | 41.168 B | 86.982 B |
| XBO-0017 | 957.506 B | 42.588 B | 81.134 B |

Medición en dos servidores `next build` + `next start`, con Chrome/Playwright a 1440 y 390 px (DPR 1), navegando a cada ficha y desplazando cada tarjeta del catálogo al viewport:

| SKU | Vista | Antes | Después |
| --- | --- | ---: | ---: |
| XBO-0012 | Ficha 1440 / 390 | 116.012 / 116.012 B | 86.982 / 41.168 B |
| XBO-0012 | Card 1440 / 390 | 110.014 / 110.014 B | 41.168 / 17.666 B |
| XBO-0017 | Ficha 1440 / 390 | 97.608 / 97.608 B | 81.134 / 42.588 B |
| XBO-0017 | Card 1440 / 390 | 93.340 / 93.340 B | 42.588 / 18.790 B |

Son bytes transferidos de la foto frontal concreta, con igual equipo y sin limitación de red ni CPU; no representan Core Web Vitals de campo. En ocho recorridos posteriores (dos productos × catálogo/ficha × dos anchos) no hubo imágenes rotas, errores JavaScript ni desbordamiento horizontal. Se abrieron las capturas: el envase de creatina ya no se recorta y ambas tarjetas conservan proporción y línea de apoyo. Vitalmag cambió de frutos rojos a neutro y volvió con movimiento reducido, sincronizando URL e imagen; el frente también apareció con JavaScript desactivado. Los archivos de la galería que contienen información nutricional permanecen como fichas legibles y no se pasan por el recorte de envases.

El informe de normalización y hash de cada entrada está en `public/media/catalog-normalized-v2/xbody-20261023-report.json`. Las capturas y los originales de revisión quedan fuera del repositorio en `C:/tmp/stylo-media-3am/`.
