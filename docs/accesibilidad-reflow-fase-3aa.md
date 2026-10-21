# Fase 3AA — Texto ampliado y contenido accesible

Continuación autorizada de la auditoría, sobre Fase 3Z. Rama `fase-3aa-accesibilidad-reflow`. Alcance: problemas reproducidos de reflow y controles de compra; sin cambios comerciales, de datos, paleta, fuentes, logos o animaciones.

## Problemas reproducidos

Con producción local, datos sintéticos y viewport de 320 px, al aumentar la fuente raíz de 16 a 32 px:

- La barra fija medía 323,4 px, pero el documento solo reservaba 136 px. Parte del pie quedaba cubierta.
- El último enlace del pie llegaba a x=351, fuera del viewport. La navegación no permitía envolver sus elementos.
- Los importes de las tarjetas seguían en dos columnas estrechas: el primer precio terminaba en x=186 dentro de una tarjeta cuyo borde derecho era x=154. En resultados podía recortarse aunque el documento no mostrara scrollbar horizontal.
- Algunos títulos de inicio y una palabra del bloque de presentación extendían el documento a 421 px; tras corregir los primeros títulos se detectó otro desborde a 349 px.
- Con altura de viewport de 320 px, la barra ampliada medía 345,4 px y empezaba en y=-25,4: podía ocupar toda la pantalla.
- Los textos de medios de pago podían invadir el botón vecino al ampliarse. Se detectó en una captura nativa, después de pasar las primeras comprobaciones geométricas.

Las tres primeras pruebas de regresión fallaron antes de implementar las correcciones. Los restantes casos se agregaron al comprobar las superficies ampliadas.

## Correcciones

Un único `ResizeObserver` observa la barra de la ficha. Su altura real se publica en una variable CSS y reserva espacio al pie; también sirve como margen de scroll para evitar que el contenido termine detrás de la barra. No usa estado de React, listeners de mouse/scroll ni un loop de animación. Agrupa avisos de resize en un frame, se desconecta al desmontar y limpia su variable al salir de la ficha o pasar a escritorio.

En un teléfono con altura superior a 500 px se mantiene la compra fija. Con poco ancho relativo al texto, cantidad y botón se apilan para permitir leer la acción. En ventanas de hasta 500 px de alto y con JavaScript desactivado, la compra participa del flujo; se oculta su resumen adicional para no duplicar el precio inmediatamente encima del botón. Los formularios, cantidades, stock y precios existentes conservan sus reglas.

El pie permite envolver enlaces y contraer sus columnas. Los títulos afectados pueden romper palabras largas cuando no caben. La grilla de tienda y búsqueda conserva dos columnas al tamaño habitual y pasa a una si el texto ampliado necesita más espacio; sus mínimos impiden introducir una tercera columna en celular. Las etiquetas de pago quedan dentro de sus propios botones. No se reducen las letras para simular que caben.

## Comprobación

`npm.cmd run check`: lint, TypeScript, compilación de producción y **122 pruebas unitarias aprobadas**, dos omitidas.

Durante la etapa se ejecutaron los recorridos de bolsa, búsqueda, teclado, foco, cierre de diálogos, cantidades y promociones: 59 aprobados, 11 omitidos según dispositivo. La revisión ampliada de inicio, hero, grilla y compra dio 64 aprobados y 16 omitidos. Tras el último ajuste de etiquetas de pago, la verificación final de reflow, tienda compacta, compra e hidratación dio **33 aprobados y tres omitidos**. Todos con `next start`, Supabase desconectado y datos de prueba aislados.

Las regresiones incluyen agotamiento del stock disponible en el carrito, crecimiento del mensaje del botón, limpieza al navegar, cambio entre orientación horizontal/vertical/escritorio, controles sin JavaScript, precios contenidos en tarjetas y etiquetas sin solapamiento. Los recorridos de carga demorada siguen exigiendo menos de 1 px de desplazamiento al hidratar.

| Muestra de producción local | Antes | Después |
| --- | --- | --- |
| Compra, 320 px, texto habitual | Barra 129 px / reserva 136 px | Barra 129 px / reserva 136 px |
| Compra, 320 px, fuente raíz al 200 % | Barra 323,4 px / reserva 136 px | Barra 345,4 px / reserva 346 px; acción legible en dos líneas |
| Compra, 390 px, fuente raíz al 200 % | Barra 281,4 px / reserva 136 px | Barra 303,4 px / reserva 304 px |
| Compra, 768 px, fuente raíz al 200 % | Barra 157 px / reserva 136 px | Barra 157 px / reserva 157 px |
| Tienda, 320 px, texto habitual | Dos columnas | Dos columnas de 138 px |
| Tienda, 320 px, fuente raíz al 200 % | Precio fuera de la tarjeta | Una columna de 288 px; precio contenido |
| Inicio, 320 px, fuente raíz al 200 % | Documento de 421 px de ancho | Documento de 320 px de ancho |

Inspección adicional a 150 %, 200 %, 390, 768 y 1440 px; sin errores de página en la pasada registrada. El final de «Información del producto», llevado al borde inferior mediante scroll, quedó en y=540,45 frente al inicio de la barra en y=540,63, sin taparse. En tres muestras sobre superficies opacas, las razones de contraste calculadas fueron 9,37:1 para el resumen de compra, 16,80:1 para enlaces del pie y 6,52:1 para su texto secundario. Estas muestras no incluyen la composición fotográfica ni todos los estados del sitio.

Capturas temporales revisadas, fuera del repositorio: `stylo-3aa-product-before-320.png`, `stylo-3aa-product-final-320.png`, `stylo-3aa-cards-final-100.png`, `stylo-3aa-cards-final-200.png` y `stylo-3aa-native-final-320.png`. La última revisión de etiquetas se comprueba además con la regresión geométrica que exige que su texto permanezca dentro de cada botón.

## Límites

La prueba de ampliación modifica la fuente raíz del documento; los controles definidos en px no se duplican por ese mecanismo. Se complementa con reflow a 320 CSS px, pero no equivale a certificar zoom nativo en todos los navegadores. Se conservan pruebas de movimiento reducido y navegación sin JavaScript. Faltan lectores de pantalla reales, dispositivos físicos, Safari y una revisión completa de todas las combinaciones de fondos y estados. No se acredita conformidad WCAG AA integral ni una mejora de Core Web Vitals en esta etapa.

Referencias: [W3C, ampliación de texto](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) y [W3C, reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Siguen vigentes los pendientes comerciales y de fotografías de las fases anteriores.
