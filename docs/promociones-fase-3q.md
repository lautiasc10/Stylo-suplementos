# Fase 3Q — Promociones de la portada

Referencia autorizada: `2026-10-20 13-55-36.mkv`. Se adaptan la composición, selector de medio de pago, badges, jerarquía de precios y agregado rápido a las publicaciones existentes, sin copiar productos ni precios ficticios.

## Presentación

- Todas las promociones vigentes y comprables, sin el límite previo de tres. Se conservan vigencia, stock y cupos.
- Foto del producto y variante correspondiente; en combos, foto subida por administración o composición de sus fotos existentes. Sin crear imágenes.
- Transferencia y Mercado Pago comparten selección con carrito y checkout. La opción inicial es transferencia.
- Importe anterior, ahorro y porcentaje se calculan respecto al precio normal del mismo medio de pago. En cantidad se muestran el precio unitario, mínimo y total mínimo. En combo se compara el precio del conjunto completo.
- Tarjetas con borde, halo fijo y elevación breve de la foto al interactuar. No hay animación continua, filtros animados ni nuevas dependencias. Imágenes de carga diferida con dimensiones declaradas. Movimiento reducido desactiva desplazamientos y la transición del selector.
- Una columna en celular, dos en tablet y tres en escritorio. Las fotos y los bloques comparten alturas; el cambio de medio mantiene la altura de las tarjetas en las pruebas de ambos tamaños.

## Agregar desde la publicación

La acción recibe solo el identificador de la promoción. El servidor vuelve a consultar catálogo y promociones, comprueba la vigencia y agrega una unidad para rebajas, el mínimo para cantidad o el combo completo. Conserva los SKU y cantidades previas. Si falla un componente o el carrito supera el cupo, no guarda ninguno. Solo persisten identificadores y cantidades en la cookie; no crea pedidos ni modifica stock.

La vista previa usa el mismo validador con almacenamiento local. El agregado mantiene al usuario en la sección, confirma con un check y anuncia el resultado. El carrito sigue aplicando la promoción de mayor ahorro por medio de pago; no se acumulan ofertas, conforme a la regla existente.

Sin JavaScript, las publicaciones y precios son visibles, el selector se mantiene inactivo y el formulario real permite agregar la oferta y abrir el carrito. La ruta local `/vista-previa/ofertas` permite revisar publicaciones de prueba sin alterar las reales.

## Verificación del 20 de octubre de 2026

- Lint, TypeScript y build de producción aprobados. 99 pruebas unitarias aprobadas; dos pruebas previas de integración permanecen omitidas.
- 38 recorridos de Chromium aprobados en escritorio y celular: promociones, carrito, checkout, administración, navegación y contenido sin JavaScript. Incluyen cálculo de descuentos, estabilidad al cambiar de medio, agregado de cantidad/combos, rechazo atómico al cambiar stock y más de tres publicaciones.
- Recorrido adicional contra las publicaciones reales, con sesiones aisladas: Gymbro agrega una unidad ($30.000 transferencia / $34.000 Mercado Pago); Web agrega 15 ($450.000 / $525.000); Combo 2 agrega sus dos componentes ($40.000 / $50.000). Sin errores de JavaScript ni creación de pedidos. También se verificó el agregado completo de Combo 2 mediante el formulario sin JavaScript.
- Revisión visual de producción a 1440 y 375 px, sin desbordamiento horizontal y sin errores de JavaScript. Se mantiene la foto que el administrador haya cargado para el combo.

Capturas con publicaciones reales: [escritorio](previews/promociones-fase-3q-desktop.png) · [celular](previews/promociones-fase-3q-mobile.png).
