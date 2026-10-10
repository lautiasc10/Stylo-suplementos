# Diseño de STYLO

Dirección de Fase 1: tienda deportiva con portada centrada, categorías ilustradas y contraste negro, dorado y blanco. Acción principal actual: explorar categorías. La compra se habilitará cuando exista catálogo comercial real.

## Guía aplicada

Se usa [landing-page-design de AI Design Skills](https://github.com/elayadesign/ai-design-skills/blob/main/skills/landing-page-design/SKILL.md), revisada el 10 de octubre de 2026, como guía adaptada al ecommerce. No se instaló un paquete ejecutable ni una skill global. Esta adaptación y las instrucciones del proyecto mantienen su aplicación en futuras iteraciones.

| Criterio | Implementación local |
| --- | --- |
| Jerarquía | Un botón principal dorado en la portada; navegación secundaria discreta. |
| Tipografía | Escala compartida de 12, 14, 16, 18, 20, 24, 30, 36, 48, 60 y 72 px; titulares con cortes deliberados. |
| Espaciado | Variables compartidas de 4, 8, 12, 16, 24, 32, 40, 48, 64, 80 y 96 px. |
| Formas | Tarjetas de radio 24 px, campos de 8 px y controles circulares o tipo píldora. |
| Interacción | Hover, pulsación y foco visible; controles principales de al menos 48 px de altura. |
| Movimiento | Curva común, aparición de categorías, transformación del menú y revelado de palabras de marca. |
| Iconografía | Siete SVG Phosphor regular locales; licencia MIT conservada en `docs/licenses`. |

Los tokens viven en `src/app/globals.css`; la composición de tienda, en `src/app/storefront.css`. Usar esos valores al extender componentes. Los tamaños de ilustraciones y breakpoints son medidas de composición, no pasos nuevos de espaciado o tipografía.

## Adaptaciones de marca y compra

El manual oficial prevalece: Montserrat e Inter, #080808, #DAAB4C y #FFFFFF; logos originales intactos. Se conservan dos familias tipográficas y el título blanco/dorado aunque la guía proponga otras fuentes y un gradiente.

La navegación permite explorar las nueve categorías sin interponer un modal. Se conserva la cabecera integrada en la tienda, en lugar de imponer una barra flotante de vidrio. La estructura corresponde a una home de ecommerce; no incorpora bloques de captación propios de otra oferta.

Las ilustraciones de envases identifican categorías. No representan inventario disponible. No añadir testimonios, cifras, garantías, beneficios de salud, precios o condiciones comerciales sin contenido confirmado.

## Accesibilidad y rendimiento

Las apariciones usan `IntersectionObserver`, sin listeners continuos de scroll ni bibliotecas de animación. El HTML inicial muestra todo el contenido. El foco vuelve visibles los grupos y la preferencia de movimiento reducido desactiva las animaciones, incluso si cambia con la página abierta. El revelado de marca mantiene texto real y orden de lectura.

Verificación: navegación en Chromium de escritorio y móvil, teclado, cambio de movimiento reducido y contenido sin JavaScript. Revisión visual a 320, 390, 768, 900, 1024 y 1440 px. Las capturas estáticas usan movimiento reducido para mostrar todos los bloques.

## Pendientes por fase

Fase 1 sigue pendiente de validación visual del usuario e integración externa. Los estados de carga comerciales, imágenes de productos, carruseles y checkout corresponden a las fases autorizadas de catálogo y compra. Los textos legales y datos de contacto requieren contenido confirmado antes del lanzamiento. No crear enlaces vacíos para simular su entrega.

Scroll World queda reservado para la segunda etapa. Esta revisión no agrega planes pagos, cuentas, dominio ni funcionalidades comerciales.
