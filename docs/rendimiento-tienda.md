# Rendimiento de tienda — Fase 3

Revisión del 14 de octubre de 2026. Se optimizan catálogo, fotos de compra y ficha de sabores conservando el diseño aprobado, originales, variantes, precios, permisos y promociones. No se escribieron datos remotos ni se realizaron cobros.

## Hallazgos y cambios

Las fotos transparentes de las proteínas se descargaban como PNG de aproximadamente 1 MB cada una. La copia visual de reposo también podía solicitar fotos de tarjetas fuera de pantalla; las preparaciones competían con la imagen principal. El fondo completo cambiaba de color y transformaba una superficie grande durante cada transición. La sombra filtraba fotografías grandes durante el giro.

Las fotos públicas del bucket configurado pasan por el optimizador existente de Next.js, con calidad 85 y límites por uso: ficha 1920 px, tarjeta/logo 1200 px y miniatura 384 px. El recurso comprobado mantiene 1113 × 1669 px y alfa 0–255: pasa de 1.023.486 a 83.608 bytes, aproximadamente un 92 % menos. No se modifica el original ni se amplía el envase. URLs locales y datos de vista previa conservan su ruta. La lista permitida limita el optimizador al host y bucket públicos configurados; otros hosts y buckets devuelven 400. [Documentación oficial de Image y remotePatterns](https://nextjs.org/docs/app/api-reference/components/image).

La imagen principal tiene prioridad en la ficha; las dos vecinas se preparan después de su carga, con prioridad baja. Las tarjetas esperan su foto y solo preparan la siguiente cuando son visibles. La copia de reposo comparte carga diferida en tarjetas. Una caché por galería comparte solicitudes y conserva hasta cuatro fotos decodificadas; cancela cargas pendientes al salir de pantalla, ocultar la pestaña o desmontar. Ahorro de datos omite la preparación automática.

El color cambia mediante opacidad de superficies separadas y los ingredientes mediante opacidad individual, evitando transformar el fondo completo. Se mantiene el movimiento suave de crema y rodajas, pausa manual y movimiento reducido. La sombra de la ficha se prepara como una pequeña capa de interfaz de 240 × 240 px, cacheada por foto y también preparada con sus vecinas. Se conserva la foto real como elemento independiente; si la lectura de píxeles falla, queda la sombra CSS estática. No se utiliza el filtro pesado sobre los planos que giran. El giro conserva el cierre gradual hacia su plano estable. No se agregan dependencias.

## Medición local

Compilación de producción, Chromium sin interfaz, contextos nuevos sin caché de navegador, servidor local y recursos del optimizador ya preparados. Red simulada de 200.000 bytes/s (aproximadamente 1,6 Mbps), latencia 80 ms y CPU ralentizada cuatro veces. Se mide cada vista por separado; el script no se ejecuta simultáneamente con las pruebas de navegador. Base anterior: commit `18c95db`.

| Vista | LCP anterior | LCP actual | Intervalo de frame p95 anterior → actual | Frames mayores de 34 ms, anterior → actual |
| --- | --- | --- | --- | --- |
| Ficha, 1868 × 980 | 18,18 s | 3,02 s | 66,7 → 33,4 ms | 46/73 → 4/169 |
| Ficha, 390 × 844 | 17,72 s | 2,29 s | 16,8 → 16,8 ms | 0/201 → 3/203 |
| Catálogo, 1868 × 980 | 9,03 s | 2,60 s | 16,7 → 16,8 ms | 0/244 → 2/233 |

Sin ralentización de CPU ni red: LCP de 380 ms en ficha de escritorio, 360 ms en ficha móvil y 356 ms en catálogo. Los tres cambios preparados de sabor respondieron en 53/93/45 ms en escritorio y 54/43/44 ms en móvil; estas cifras incluyen automatización y observación del DOM, no representan INP. El giro visible dura 660 ms. En móvil y catálogo no se observaron frames mayores de 34 ms en esa medición; la ficha amplia mantiene un p95 de 33,4 ms en este navegador.

Son muestras de laboratorio, no percentiles de tráfico real ni garantía de 60 fps en todos los dispositivos. No todas las métricas mejoraron: en la simulación el bloqueo acumulado de tareas iniciales pasó de 85 a 232 ms en ficha de escritorio y de 183 a 242 ms en catálogo; CLS de la ficha de escritorio pasó de 0,014 a 0,054. Los reportes conservan estos resultados completos. La escena amplia aún exige más composición gráfica; faltan comprobaciones físicas en Safari/iOS y Android de recursos modestos antes de afirmar fluidez universal. La primera transformación de una foto en un servidor sin caché puede tardar más que las muestras preparadas.

Reportes: [antes](performance/storefront-before.json), [después con simulación](performance/storefront-after.json) y [después sin ralentización](performance/storefront-after-normal.json). Repetición, con el servidor de producción en el puerto 3002 y las mismas variantes disponibles:

```powershell
node scripts/profile-storefront.mjs revision
$env:PROFILE_CPU = '1'
$env:PROFILE_NETWORK = 'off'
node scripts/profile-storefront.mjs revision-normal
```

## Verificación funcional y visual

Compilación y TypeScript correctos; 76 recorridos aprobados en Chromium de escritorio y móvil. Recorridos existentes de catálogo, edición de fotos, galerías, apoyo en piedra, promociones, carrito y checkout; flechas rápidas, foto ausente, error de carga, pausa, teclado, movimiento reducido en vivo y formularios sin JavaScript. Las pruebas de compra utilizan datos locales, sin pagos ni pedidos reales. Se revisan fotos y transparencia con los recursos públicos, manteniendo el acceso al catálogo y la ficha sin JavaScript.

Capturas: [ficha escritorio](previews/rendimiento-ficha-1868.png), [ficha móvil](previews/rendimiento-ficha-390.png) y [catálogo](previews/rendimiento-catalogo-1868.png). Sin desbordamiento horizontal en las vistas revisadas.
