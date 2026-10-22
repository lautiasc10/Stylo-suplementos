# Fase 3AI — Sobre STYLO y acceso a Atletas

La navegación pública enlaza «Atletas» con la sección `/#atletas` del Home. «Contacto» sigue disponible en el pie y en `/contacto`.

`/nosotros` presenta a las personas fotografiadas con prendas STYLO en dos escenas editoriales. Los archivos `RYC_9065.NEF` y `RYC_9070.NEF` entregados por el usuario contienen JPEG de 5568 × 3712 px. Se extrajo esa vista, se corrigió su orientación y se exportaron dos WebP de 1200 × 1800 px (118 y 167 KB). Los RAW originales permanecen fuera del repositorio. No se asignan nombres, cargos, cifras ni testimonios no confirmados.

La composición usa los tokens negro/dorado, Anton y Barlow actuales: retrato protagonista, principios de marca, segunda escena con el león oficial en las prendas y acciones hacia tienda y Team STYLO. La primera imagen tiene prioridad de carga; la segunda se carga según la posición. Las apariciones reutilizan `Reveal`, conservando contenido visible en HTML sin JavaScript y respetando movimiento reducido.

Validación: lint, TypeScript, build de producción y recorridos de navegador en 320, 390, 768 y 1440 px; navegación de escritorio/móvil, imágenes decodificadas, ausencia de desbordamiento, movimiento reducido y contenido sin JavaScript. Las capturas de prueba se revisan fuera del commit.
