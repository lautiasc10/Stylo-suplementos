# Fase 3H — Coreografía del detalle por sabor

Actualización visual: el círculo y la escala del fondo nuevo terminan juntos a los 850 ms. Durante los primeros 160 ms, la nueva escena se funde suavemente dentro del círculo; la anterior sigue completa debajo hasta que el círculo termina. Si el navegador no admite `clip-path: circle`, el cambio usa el fundido simple existente. Esta actualización se verificó en las fichas de escritorio y móvil.

18 de octubre de 2026. Rama `fase-3h-coreografia-sabores`. Alcance vigente: fichas de varios sabores; el pedido posterior reemplaza la prueba anterior en tres productos. El catálogo y las fichas sin escena de sabor conservan sus componentes y transiciones. No se cambian recursos originales, información comercial, diseño del bloque lateral ni datos de Supabase.

## Comportamiento

- Flechas, chips, teclado y swipe comparten una solicitud con dirección, coordenadas y reloj. Precio, stock, botón y `?variante=` se actualizan dentro del evento; las fotografías y decoraciones no bloquean la compra.
- El fondo es una composición completa por sabor: color, ingredientes existentes y el mismo velo de legibilidad. La nueva composición se descubre con un círculo desde el control tocado durante 850 ms, con escala de 1,06 a 1 en esos mismos 850 ms y un fundido inicial de 160 ms. La escena anterior se retira al terminar el círculo. Una interrupción completa visualmente la escena anterior y monta la siguiente; nunca hay más de dos escenas.
- El envase sale 24 px con 20° de giro y se desvanece en 260 ms. La aproximación del siguiente empieza a los 140 ms, pero permanece transparente hasta los 260 ms; llega a su posición a los 560 ms. Esa separación elimina la doble exposición: en ningún punto del timeline hay dos envases con opacidad visible simultánea. La escala y línea base se conservan.
- El contorno del chip se desplaza mediante transform en 280 ms y conserva su posición visual si se interrumpe. Nombre de sabor, disponibilidad y precios entran con 6 px y retrasos de 120/160/200 ms; terminan a los 400 ms. Los acentos usan capas de opacidad de 300/600 ms.
- Se preparan y decodifican las fotos y decoraciones vecinas al entrar al hero y en reposo. Hover/foco sobre un chip prepara también esa selección. La caché de fotografías está limitada a cuatro entradas. Si una foto falta o falla, se informa en el escenario y se mantiene la selección de compra solicitada; no se inventa una imagen.
- Los cuadros lentos se registran para medir la transición, sin desactivar el reveal en cambios posteriores. Movimiento reducido usa 250 ms sin desplazamiento, giro ni círculo. Los paquetes usan fundidos consecutivos para preservar la ausencia de doble exposición. La ficha inicial y cada reveal terminado activan una deriva de 20 segundos de la capa compuesta, más un flotado leve de uno o dos ingredientes; en móvil la amplitud es menor. Se pausa fuera de pantalla y con la pestaña oculta, y no funciona con movimiento reducido.
- Durante un nuevo cambio, la escena saliente conserva el instante exacto de su deriva y flotado; el reveal no reinicia su transformación. La escena entrante inicia su movimiento ambiente solamente cuando terminan tanto el círculo como el zoom, ambos en escala 1. Los efectos `fill: both` del reveal se cancelan en ese punto: si se mantienen, el zoom final tapa el movimiento ambiente y se produce un salto al siguiente clic. Los cambios interrumpidos no añaden animación ambiente a una escena que aún no había terminado de entrar.
- HTML inicial visible y enlaces reales en los chips. Los ingredientes iniciales no dependen de recibir un evento `onLoad` después de hidratar; esto corrige la decoración invisible cuando el recurso había terminado de cargar antes de React.

Todos los tiempos y curvas de esta coreografía están en [`flavor-motion.ts`](../src/components/catalog/flavor-motion.ts). La implementación usa Web Animations API y un muestreador RAF; no actualiza estado React por cuadro. `will-change` se limita a la transición. El velo lateral conserva su geometría, pero viaja dentro de cada fondo para evitar un cambio de iluminación antes del círculo. No se anima el tamaño de controles ni de la grilla.

## Verificación

- `npm.cmd run check`: lint y TypeScript correctos, 87 pruebas unitarias aprobadas, 2 omitidas, build de producción correcto.
- Los recorridos Playwright incluyen 16 familias de fondos, los dos sentidos, diez cambios rápidos por sentido, chips, teclado, swipe, carrito, errores de foto/decoración, selección inmediata con `decode` bloqueado, precarga, reducción de movimiento y persistencia del reveal después de cuadros lentos. La deriva se verifica al terminar el reveal y al ocultar la pestaña.
- Muestreo de los envases a intervalos de 1/60 s en todo su timeline: cero cuadros con dos frentes visibles.
- Ficha real sin JavaScript: cambio a Frutilla por enlace, foto y decoración visibles, URL correcta y sin desbordamiento. [Resultado](reviews/coreografia-sabores/sin-javascript.json), [captura](reviews/coreografia-sabores/sin-javascript.webp).
- No cambian el archivo `VariantSpinner`, `ProductCard`, `ProductGallery` ni el CSS del catálogo. Sus pruebas de giro y carga siguen verificando el comportamiento anterior en productos sin escena.

## Medición de producción

Medición de la coreografía original, antes del fundido inicial de 160 ms y de igualar el zoom al círculo. Servidor `next build` + `next start --port 3200`, Chromium con GPU NVIDIA GeForce GTX 1650 habilitada, DPR 1. Escritorio 1440 × 900, móvil emulado 375 × 900. El reloj real de la pantalla produjo intervalos habituales de 13,3 ms (aproximadamente 75 Hz). No se utilizó `next dev`. El móvil es una emulación, no una certificación en teléfono físico.

| Recorrido | Duración medida | Máximo durante la transición | Cuadros >20 ms | Cuadros >32 ms | Scripting en ventana de 1,25 s | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Escritorio siguiente | 964,3 ms | 26,7 ms | 1 | 0 | 22,23 ms | 0 |
| Escritorio anterior | 965,8 ms | 13,5 ms | 0 | 0 | 20,02 ms | 0 |
| Móvil swipe | 963,9 ms | 13,5 ms | 0 | 0 | 22,63 ms | 0 |
| Móvil movimiento reducido | 256,6 ms | 13,4 ms | 0 | 0 | 19,21 ms | 0 |

Cero cuadros con doble exposición en todos los recorridos; máximo de dos capas de envase y dos de fondo; cero excepciones JavaScript o desbordamientos. Recursos de imagen acumulados, incluidas decoración, logos y vecinos: 1,22 MB en siguiente, 1,14 MB en anterior y 1,19 MB en móvil. El contador de desplazamientos incluyendo cambios derivados de interacción registró 0,0001296 en móvil con movimiento reducido; esos eventos con interacción reciente no computan en CLS. Los demás recorridos también dieron cero en ese contador.

**Límite pendiente:** el requisito de cero cuadros superiores a 20 ms no queda acreditado en todos los recorridos: hubo un cuadro de 26,7 ms en el primer cambio de escritorio. El percentil 95 estuvo entre 13,4 y 13,5 ms. No se promete una frecuencia constante en todo dispositivo. La degradación permanente se retiró porque apagaba el reveal tras cambios repetidos.

Las primeras mediciones usaron por defecto Chromium Headless Shell con composición por software/SwiftShader, donde se observaron cuadros de 33–50 ms. Se conservaron [las cifras iniciales](reviews/coreografia-sabores/mediciones-antes-ajuste.json) y [la última pasada por software](reviews/coreografia-sabores/mediciones-software.json); no deben compararse directamente con GPU para atribuir la diferencia solo al código. El ajuste de composición mantiene las escenas agrupadas y promociona temporalmente la saliente, además de la entrante.

[Datos completos de la pasada final](reviews/coreografia-sabores/mediciones.json).

## Capturas y grabación

- [Video exportado a 60 fps](reviews/coreografia-sabores/cambio-sabor-60fps.webm).
- [140 ms: salida](reviews/coreografia-sabores/secuencia-140ms.webp).
- [400 ms: nuevo envase y revelado](reviews/coreografia-sabores/secuencia-400ms.webp).
- [960 ms: reposo](reviews/coreografia-sabores/secuencia-960ms.webp).
- [Móvil](reviews/coreografia-sabores/mobile-swipe-despues.webp).

El video se obtiene del compositor mediante CDP con marcas de tiempo y se exporta a 60 fps. Puede repetir cuadros capturados; no demuestra por sí solo 60 cuadros reales constantes. La captura agrega sobrecosto, por eso los tiempos de la tabla se midieron por separado sin grabación. El clip incluye un breve reposo antes y después de la coreografía de 960 ms. [Metadatos de captura](reviews/coreografia-sabores/grabacion.json).

Reproducción:

```powershell
npm.cmd run build
npm.cmd run start -- --port 3200
# En otra terminal:
node scripts/measure-flavor-choreography.mjs
node scripts/record-flavor-choreography.mjs
```

Los scripts leen la ficha pública real de Whey Protein Star, no escriben en la base de datos y requieren las herramientas de navegador ya instaladas en el proyecto. La grabación usa el FFmpeg incluido con Playwright o `FFMPEG_PATH`.
