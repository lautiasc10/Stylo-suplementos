# Apariciones por scroll — 16 de octubre de 2026

## Auditoría inicial

El sitio usa App Router (`src/app`), Next.js 16.4, React 19.3, Barlow Condensed e Inter mediante `next/font`. Framer Motion no estaba instalado. Se incorpora la versión 14.3.0 con lockfile; no se usan bibliotecas adicionales de scroll ni se intercepta la navegación.

| Vista | Estructura revisada | Cambio |
| --- | --- | --- |
| Home | Página servidor; `CinematicHero`, `HomeProducts`, `HomePromotions` | Apariciones de encabezados y colecciones debajo del hero. |
| Catálogo | Página servidor; `CatalogHeading`, `CatalogListing`, `ProductCard` cliente | Encabezado suave, stagger inicial y fundido breve al filtrar. |
| Búsqueda | `SearchResults`, mismas tarjetas y filtros por URL | Mismo comportamiento de grilla que catálogo. |
| Producto | Página servidor; `ProductDetail`, `ProductGallery` clientes | Bloques de información y fundido de pack/precio. |
| Sobre STYLO, contacto y pie | Componentes existentes de la tienda | Apariciones compartidas, sin efectos sobre formularios comerciales. |

El reveal anterior se conserva como adaptador a la nueva implementación; se retiran sus reglas CSS duplicadas y la animación de palabras sueltas de `BrandTagline`. El hero, su secuencia, la mirada y el polvo no reciben nuevas animaciones. Se omite el parallax opcional para mantener su funcionamiento y presupuesto de trabajo.

## Componentes

`src/components/ui/Reveal.tsx` exporta `Reveal`, `RevealGroup` y `RevealItem`. Son componentes cliente, utilizables desde páginas servidor sin convertir sus consultas de datos en código cliente.

- `Reveal`: props `delay`, `direction` (`up`, `left`, `right`, `none`), `as`, `className` y atributos HTML/Motion compatibles.
- Etiquetas admitidas por `as`: div, section, article, header, footer, main, ul, ol, li, h1, h2, h3, p y span. Los componentes Motion se declaran una vez, fuera del render.
- Aparición fuera de pantalla: opacidad 0 → 1 y desplazamiento 24 → 0 px; 0,6 s con curva `[0.22, 1, 0.36, 1]`.
- Viewport de `Reveal`: una sola vez, 20 % visible y margen inferior −80 px. En grupos demasiado altos se reduce el umbral para que la entrada siga siendo alcanzable.
- Stagger: 0,08 s entre los primeros elementos, con retraso acotado a 0,4 s para evitar colas largas en catálogos grandes. En celular la duración baja a 0,4 s y el stagger a 0,06 s.
- `revision`: en una grilla persistente, cambios de filtros/orden muestran los elementos en su posición final y aplican solo opacidad 0,78 → 1 durante 0,2 s. La grilla no recibe una key por filtros; cada envoltorio conserva la identidad del producto.

El HTML de servidor y el primer render cliente son visibles (`initial={false}`). Solo después de hidratar se preparan los bloques que están debajo de pantalla. Lo ya visible permanece disponible: la opción `enterOnMount` añade una entrada corta conservando opacidad legible, sin un salto inicial a negro. La información del producto usa cinco bloques; el botón permanece disponible desde el inicio y su entrada comienza como máximo a los 0,32 s en escritorio.

El foco muestra inmediatamente el bloque y sus hijos. `useMotionPreference` utiliza `useReducedMotion` más una suscripción nativa: la implementación instalada de Motion captura la preferencia inicial, por lo que se añade soporte explícito para cambios con la página abierta. Con movimiento reducido se muestran todos los elementos sin transición, también mediante CSS de respaldo. No hay listeners de scroll ni actualizaciones React por cuadro.

API de referencia: [animaciones de scroll de Motion](https://motion.dev/docs/react-scroll-animations) y [componente Motion](https://motion.dev/docs/react-motion-component).

## Variantes y compra

`Crossfade` conserva como máximo dos capas durante 250 ms, con limpieza acotada mediante temporizador. Solo cambia opacidad: no anima tamaños ni reordena el layout. La capa saliente tiene `aria-hidden` e `inert`; no duplica información accesible ni permite acciones sobre una variante anterior. La nueva variante comercial se conserva en el formulario de compra.

En Whey Protein se mantiene la preparación y decodificación de fotos vecinas; las flechas cambian el pack mediante fundido de 250 ms, reemplazando el giro anterior exclusivamente en la ficha. Las tarjetas conservan su animación de cambio de imagen existente. Bajo el nuevo pack se mantiene el anterior opaco hasta completar la entrada, para evitar que la etiqueta se vuelva translúcida contra el fondo. Las fichas con selector conservan la selección y sus fotos; sus envoltorios también funden el cambio. Los precios se animan como un bloque, sin tocar cálculos ni promociones.

No se modifica la lógica de carrito, checkout, pagos, permisos, Supabase, promociones o administración. Los ajustes adicionales para habilitar lint son de sintaxis: quitar una importación sin uso, renombrar un helper que no es un hook, explicitar un `if`, documentar los fallbacks de almacenamiento y retirar una asignación inicial que ambas ramas reemplazaban.

## Identidad y futuras secciones

`SectionHeading` combina el encabezado, enlace y línea dorada fina. La línea usa `scaleX` y queda reservada desde el HTML. Nuevas colecciones debajo del hero deben reutilizar este componente y `RevealGroup`/`RevealItem`, como destacados, novedades y promociones; no se inventan reseñas ni beneficios comerciales.

El hover de tarjeta cambia la escala anterior por `translateY(-4px)` durante 0,2 s. Su borde usa el degradado oficial y una transición de opacidad de 0,2 s, con sombra estática. Se retira la rotación continua del borde. No se superponen dos animaciones al mismo elemento: reveal en la envoltura, hover en la tarjeta y cambio de foto en la galería.

## Comprobaciones por etapa

Cada etapa pasó build de producción y lint. Se incorpora ESLint 10 con reglas TypeScript y reglas de hooks de React, sin activar diagnósticos de React Compiler. `npm run check` incluye ahora lint, tipos, pruebas y build, por lo que CI lo ejecutará también. Node mínimo pasa a 22.13 para coincidir con los requisitos del linter. Lint termina sin errores; permanecen cuatro advertencias previas sobre dependencias/captura de refs en administración, gestión y galería. No se reescriben esos ciclos comerciales para silenciarlas.

Las pruebas cubren HTML sin JavaScript, scripts demorados, foco, preferencia reducida en vivo, una sola aparición, filtros, búsqueda, selección de variante, opacidad de las etiquetas, fotos preparadas, carrito y conservación del hero. Los resultados y la medición móvil final se registran al cerrar la revisión. La emulación con CPU limitada no sustituye un teléfono físico ni una prueba en Safari/iOS.
## Resultado final

- Build y lint comprobados al cerrar las cuatro etapas; compilación y tipos correctos, lint sin errores con las cuatro advertencias previas descritas arriba.
- 67 pruebas unitarias aprobadas.
- 67 recorridos finales de catálogo, variantes, fotografías y reveal aprobados entre escritorio y móvil; además, durante esta entrega pasaron los recorridos de hero y buscador.
- Verificación visual en Chromium a 1868 × 943 y 390 × 844: sin errores de página ni desbordamiento horizontal. Hover medido en −4 px, precio accesible único y acción de compra visible. Capturas: [home escritorio](previews/reveal-home-1868.jpg), [catálogo escritorio](previews/reveal-catalogo-1868.jpg), [producto escritorio](previews/reveal-producto-1868.jpg), [home móvil](previews/reveal-home-390.jpg), [catálogo móvil](previews/reveal-catalogo-390.jpg) y [producto móvil](previews/reveal-producto-390.jpg).
- Prueba móvil emulada Pixel 5 con CPU limitada ×4 y medios preparados: barrido de 180 callbacks de animación, mediana 16,7 ms, p95 16,8 ms, sin tareas largas durante el recorrido, CLS 0 y sin desbordes. Es una medición local de callbacks y no una garantía de cuadros presentados en un dispositivo físico. Sigue pendiente la comprobación en teléfono físico y Safari/iOS.
- Auditoría de dependencias: sin vulnerabilidades conocidas reportadas. La configuración final no incorpora eslint-config-next ni sus dependencias transitivas; ESLint, TypeScript y hooks se comprueban directamente.