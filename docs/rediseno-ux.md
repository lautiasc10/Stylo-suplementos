# Rediseño de experiencia STYLO — Fase 3

Solicitud del usuario del 12 de octubre de 2026. Rama `fase-3-rediseno-ux`; no incorpora pagos ni nuevas reglas comerciales.

## Auditoría inicial

- El carrito carece de fotografías y muestra dos importes por línea sin identificar precio unitario. SKU, avisos y explicaciones repetidas compiten con la acción de compra.
- El lateral desplaza todo su contenido, incluido el resumen. Su encabezado y acción principal desaparecen en selecciones largas.
- Quitar un producto actúa inmediatamente, sin prevención de errores.
- Panel, tablas y formularios usan el mismo fondo negro y bordes muy tenues; cuesta distinguir navegación, contenido y acciones.
- Las acciones en tablas aumentan demasiado la altura de cada fila. Estados «visible/oculto» se presentan como texto sin jerarquía.
- El editor mezcla información principal, SEO, fotografías y variantes en un recorrido largo. Guardar está al final y los mensajes quedan lejos del formulario.
- El foco no tiene una regla general para todos los controles. Contornos de algunos campos no alcanzan contraste suficiente para distinguirlos del fondo.

## Dirección visual

Conservar negro `#080808`, dorado `#DAAB4C`, blanco, Montserrat e Inter y archivos oficiales. Usar superficies oscuras diferenciadas, bordes legibles, espaciado de la escala existente y radios moderados. El dorado distingue la acción principal y la selección; el estado se comunica también con palabras. No añadir afirmaciones comerciales, métricas ficticias, secciones inexistentes ni fotografías generadas.

Carrito: fotografía de la variante elegida, identidad y presentación agrupadas, precio unitario y subtotal explícitos, control de cantidad integrado y eliminación confirmada. Un resumen común calcula los mismos importes actuales; el lateral mantiene encabezado y acción visibles con desplazamiento interior de productos.

Administración: navegación por tareas, encabezados compactos, datos reales del catálogo, filas legibles, acciones principales y secundarias diferenciadas. Editor con secciones identificables y navegación interna; opciones de SEO plegables, sin cambiar validación ni envío.

Accesibilidad: controles cómodos, foco visible, labels reales, mensajes anunciados, diseño a 320 px, teclado y movimiento reducido. Referencia de evaluación: [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/). Una revisión técnica de estas vistas no constituye certificación integral.

## Verificación

- Compilación de producción y comprobación TypeScript correctas.
- 52 pruebas unitarias/PostgreSQL correctas: precios, promociones, stock, permisos, MFA e idempotencia; incluye selección de fotografía de variante, alternativa general y rechazo de fotos de otra presentación.
- 74 recorridos Chromium correctos, en escritorio y emulación móvil. Cubren catálogo, edición/importación, carrito, promociones, checkout de revisión, ventas manuales y protección administrativa. Última ejecución en PowerShell: `$env:PLAYWRIGHT_PORT='3001'; npx.cmd playwright test --workers=4`, con credenciales vacías y sin escrituras en Supabase.
- Recorridos nuevos: fotografía y fallo de imagen, cambio de visualización de precios, confirmación/cancelación de eliminación, foco al cerrar el lateral y al eliminar, carrito largo y pantalla horizontal, navegación administrativa y cambio de tamaño, edición por secciones, 320/768/1024 px sin desbordamiento.
- Revisión visual a 390/1440 px con movimiento reducido, sin excepciones de JavaScript en las capturas. Se conserva navegación pública sin JavaScript y acciones de servidor de carrito; los selectores que recalculan la presentación del precio permanecen deshabilitados hasta la hidratación.
- Contrastes medidos del sistema: texto secundario sobre superficie elevada 8,86:1; dorado sobre superficie elevada 8,30:1; texto negro sobre botón dorado 9,45:1; borde de control sobre superficie elevada 3,71:1. Los estados también se comunican con texto y foco visible.

Se corrigió durante las pruebas una actualización tardía de URL que podía cerrar una edición recién abierta. El menú administrativo se abre al volver a escritorio aunque hubiera quedado cerrado en celular. Una ejecución con ocho workers registró un timeout aislado de hidratación en una vista previa; ese recorrido pasó individualmente y la suite completa pasó después con cuatro workers.

No se añadieron dependencias ni migraciones, ni se modificaron precios, cobros, cálculo de promociones, pedidos o permisos. El carrito persistido sigue guardando solo identificadores y cantidades; la foto y la marca son datos de presentación recuperados del catálogo. Una carga tardía de un carrito cerrado no sobrescribe el estado actual.

El panel se verificó con datos locales de prueba, usando los mismos componentes de la gestión privada. No se contó con una sesión autenticada del administrador para repetir escrituras remotas. Chromium móvil no acredita Safari/iOS físico, ni estas comprobaciones certifican integralmente WCAG. Los pagos y la entrega conservan sus pendientes de Fase 3.

## Capturas

Las imágenes de revisión de gestión y compra usan datos ficticios de la vista previa, claramente identificados. Los marcadores de fotografía indican que esos datos de prueba no contienen fotos comerciales; no se sustituyeron fotografías reales por imágenes de marca o generadas.

| Vista                | Escritorio                                          | Celular                                            |
| -------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Carrito lateral      | [Captura](previews/rediseno-cart-desktop.png)       | [Captura](previews/rediseno-cart-mobile.png)       |
| Gestión del catálogo | [Captura](previews/rediseno-admin-desktop.png)      | [Captura](previews/rediseno-admin-mobile.png)      |
| Editor de producto   | [Captura](previews/rediseno-editor-desktop.png)     | [Captura](previews/rediseno-editor-mobile.png)     |
| Checkout             | [Captura](previews/rediseno-checkout-desktop.png)   | [Captura](previews/rediseno-checkout-mobile.png)   |
| Promociones          | [Captura](previews/rediseno-promotions-desktop.png) | [Captura](previews/rediseno-promotions-mobile.png) |
| Portada              | [Captura](previews/rediseno-home-desktop.png)       | [Captura](previews/rediseno-home-mobile.png)       |
