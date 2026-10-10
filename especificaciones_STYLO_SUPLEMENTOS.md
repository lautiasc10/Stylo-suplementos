# ESPECIFICACIONES FUNCIONALES Y TÉCNICAS — STYLO SUPLEMENTOS

**Versión:** 1.0 — Relevamiento consolidado (10 de octubre de 2026)  
**Estado:** Base aprobada de requisitos; existen decisiones comerciales y de integración pendientes marcadas como `PENDIENTE`.  
**Proyecto:** ecommerce B2C multimarca de suplementos, accesorios y productos relacionados, con una sola tienda y un solo administrador.  
**Destino:** documento rector para planificación y ejecución por fases con Codex.  
**Fuentes:** ocho secciones de decisiones del cliente proporcionadas en la conversación; *Manual de Marca STYLO SUPLEMENTOS, v1.1 (septiembre de 2026)*.  
**Referencia de interacción:** https://beastlabssuplementos.com/ — **solo** para el movimiento/animación de productos, no para replicar diseños, contenidos ni identidad.

> **Regla de trabajo:** Los elementos `CONFIRMADO` son requisitos; los `PENDIENTE` requieren validación de negocio o técnica antes de desarrollar la función correspondiente; los `PROPUESTA TÉCNICA` son recomendaciones sujetas a revisión. No presentar ninguna propuesta como decisión del cliente. No comenzar a implementar hasta entregar el diseño de arquitectura y plan de fases para aprobación.

---

## 1. Objetivo y alcance

Crear una tienda online STYLO SUPLEMENTOS, responsive en escritorio y móvil con igual prioridad, para comercializar productos de distintas marcas. Debe brindar una compra clara y rápida, un panel privado de administración, diferentes medios de pago, logística local/nacional, herramientas de marketing y una estética premium fiel al manual de marca.

### 1.1 Metas cualitativas
- Claridad del catálogo, disponibilidad real y precios según medio de pago.
- Compra sin registro obligatorio, con carrito lateral y checkout comprensible.
- Gestión comercial autónoma mediante un panel privado.
- Diseño negro/dorado/blanco de alto contraste, tipografía legible, navegación estable.
- SEO, medición y comunicaciones alineadas con consentimiento y privacidad.
- Seguridad y rendimiento apropiados para producción.

### 1.2 Restricciones expresas
- Una sola tienda; **sin multitenancy**. [DERIVADO DEL ALCANCE: validar si se añadieran sucursales].
- Un administrador, sin permisos de empleados en la primera versión.
- **No fijar un stack definitivo por adelantado**: Codex debe proponer y justificar arquitectura y tecnologías, respetando los servicios confirmados.
- Hosting previsto: **Vercel + Supabase**.
- Mercado Pago: **Checkout Pro**.
- Correos: **Resend con dominio verificado**.
- Almacenamiento de imágenes: **Supabase Storage**.
- Separar desarrollo, pruebas y producción.
- Sin animación cinematográfica del león en el lanzamiento: preparar una integración modular para etapa 2.

### 1.3 Alcance del lanzamiento (MVP comercial)
Incluye catálogo, fichas, variantes, búsqueda/filtros avanzados, carrito, checkout invitado, pagos, cálculo de envíos según integración confirmada, retiro, panel administrativo, promociones, contenidos, newsletters y automatizaciones de correo elegidas, SEO y analíticas, animaciones de productos, estados y notificaciones de pedidos.

**Etapa 2 confirmada:** recuperación de carritos abandonados; envío gratis por mínimo de compra; integración de animación cinematográfica del león. Otros elementos no expresamente aplazados pertenecen al alcance inicial, sujeto a viabilidad y priorización aprobada.

---

## 2. Identidad de marca obligatoria

Fuente: *Manual de Marca STYLO SUPLEMENTOS v1.1*, especialmente págs. 3–7, 10–13.

| Elemento | Regla |
|---|---|
| Posicionamiento | Suplementación deportiva y bienestar con acompañamiento responsable; profesional, cercano, moderno y confiable. |
| Propuesta de valor | Suplementación con respaldo profesional. El manual menciona a Mariana Wallace, Lic. en Nutrición; validar con el cliente el texto, consentimiento y datos a publicar. |
| Slogan | **POTENCIÁ TU MEJOR VERSIÓN.** |
| Negro | `#080808` — base visual predominante. |
| Dorado | `#DAAB4C` — acentos y destacados, no fondo dominante indiscriminado. |
| Blanco | `#FFFFFF` — legibilidad e información. |
| Tipografías | Montserrat en títulos y encabezados; Inter para contenido, fichas, interfaces y texto funcional. |
| Logotipo | Usar archivos oficiales; NO reconstruir lettering ni alterar león, hexágono, monograma ST, colores ni proporciones. |
| Isotipo | León + hexágono + ST, en favicon y espacios pequeños, usando versión oficial. |
| Voz | Clara, profesional, cercana, motivadora y responsable; sin resultados garantizados ni afirmaciones engañosas. |

**Aclaración crítica:** La excepción del manual que permite retirar el hexágono es específica de **indumentaria**; no se extiende automáticamente al sitio web ni a la animación cinematográfica. Los efectos audiovisuales que modifiquen visualmente el isotipo requerirán aprobación expresa de una adaptación de marca.

**Activos pendientes de entrega:** logotipo maestro SVG/PNG autorizado, variantes oficiales, fotografías reales, imágenes de producto, fotos del equipo y testimonios con autorización de uso. El PDF del manual sirve como referencia, no sustituye necesariamente los archivos editables de marca.

---

## 3. Perfiles y permisos

- **Visitante/comprador invitado:** navegar, buscar, filtrar, agregar al carrito, comprar, consultar estado por acceso seguro y suscribirse voluntariamente al newsletter.
- **Administrador único:** inicio de sesión privado; administrar productos y contenido, stock, precios, órdenes, pagos manuales, logística, promociones, mensajes, suscriptores y reportes.
- **Servicios externos:** pasarela Mercado Pago, Resend, proveedor logístico aún por definir, plataformas de medición, sin atribuirles acceso administrativo.

RF-ADM-00: prohibir al público el acceso a datos privados del administrador, compradores, ventas y suscripciones; validar autorización en servidor, no únicamente en interfaz.

---

## 4. Requisitos funcionales: catálogo e inventario [SECCIÓN 1 — CONFIRMADA]

### 4.1 Categorías iniciales (administrables)
1. Proteínas.
2. Creatinas.
3. Pre-entrenos.
4. Vitaminas y minerales.
5. Shakers y accesorios.
6. Aminoácidos.
7. Ganadores de masa.
8. Colágeno.
9. Barras y snacks proteicos.

Estas son categorías iniciales, no un catálogo inmutable. La clasificación de productos concretos la administra STYLO.

### 4.2 Productos, marcas y variantes
- **RF-CAT-01**: producto padre con nombre, marca, categoría(s), descripción, imágenes, estado visible/oculto, etiquetas comerciales y datos necesarios para SEO.
- **RF-CAT-02**: marca con nombre, logo opcional, visibilidad y orden; alta y edición desde admin.
- **RF-CAT-03**: variantes dentro de una misma ficha, seleccionables por sabor, tamaño y/o presentación según corresponda. No forzar atributos irrelevantes para shakers, prendas u otros accesorios.
- **RF-CAT-04**: cada variante comercializable puede tener SKU interno único, precio(s), stock, imagen(es) propia(s) opcional(es), estado de venta y atributos. **PROPUESTA TÉCNICA** para permitir gestión precisa.
- **RF-CAT-05**: mostrar stock/agotado de forma confiable por variante. Los productos agotados **siguen visibles** con aviso “Sin stock”; impedir agregar al carrito variante sin disponibilidad.
- **RF-CAT-06**: descontar stock **únicamente tras pago confirmado**; para pagos pendientes aplicar política de reserva pendiente de definir (§15).
- **RF-CAT-07**: permitir galería de múltiples fotografías y selección de imagen principal.
- **RF-CAT-08**: búsqueda por producto, marca y palabras clave, con sugerencias; filtros por categoría, marca, sabor, precio y disponibilidad; ordenamiento.
- **RF-CAT-09**: definir regla de precio usada por filtro/ordenamiento y mantener coherencia con las cifras visibles y checkout (§5 y §15).
- **RF-CAT-10**: productos y variantes visibles pero no vendidos por falta de stock permanecen indexables según estrategia SEO.

**Criterios de aceptación:** cambiar sabor/tamaño actualiza SKU, precio, existencia e imágenes pertinentes sin cambiar de página; agotado no permite compra; usuario puede buscar por nombre de marca y filtrar sin perder coherencia de precios.

---

## 5. Precios, descuentos y promociones [SECCIÓN 2 — CONFIRMADA]

- **RF-PRI-01**: soportar **precio de lista** y **precio efectivo/transferencia** (en ARS, salvo futura decisión). Mostrar ambos de manera clara con etiquetas inequívocas.
- **RF-PRI-02**: precio efectivo/transferencia aplica solo a medios de pago elegibles; Mercado Pago no debe aplicar esa tarifa por error.
- **RF-PRI-03**: mostrar información de cuotas en fichas/tarjetas cuando corresponda; verificar opciones reales de Mercado Pago y evitar publicar montos ficticios o desactualizados.
- **RF-PRO-01**: cupones administrables: código, tipo, valor, vigencia, límites y condiciones, sujetos a confirmación de reglas exactas.
- **RF-PRO-02**: ofertas con inicio y fin, sin requerir intervención manual al comenzar o concluir.
- **RF-PRO-03**: promociones por cantidad, administrables.
- **RF-PRO-04**: combos/bundles con precio promocional y composición definida.
- **RF-PRO-05**: promociones y cupones **no se acumulan**: aplicar el **mejor descuento elegible**, con regla precisa a decidir en §15.
- **RF-PRO-06**: el backend calcula y valida los precios finales; el navegador nunca decide el total a pagar.
- **RF-PRO-07**: pedido conserva una instantánea de productos, precios base, descuentos, medio de pago, envío e importe final en el momento de su creación.

**Pendientes clave:** precedencia precio por medio de pago frente a promoción; qué significa “mejor” (mayor ahorro total del carrito, no descuento porcentual aislado); redondeos; promociones aplicables a combos; base para cuotas; tratamiento de cambios de precio antes del pago.

**Aceptación:** la suma de líneas, descuentos y envío coincide con total de pedido y pago generado; nunca se aplica a la vez más de un descuento incompatible.

---

## 6. Carrito, checkout y pagos [SECCIÓN 3 — CONFIRMADA]

### 6.1 Carrito y compra invitada
- **RF-CHK-01**: carrito lateral deslizable (drawer), accesible desde todas las páginas comerciales, con variantes, cantidades, subtotales, eliminación y acceso al checkout.
- **RF-CHK-02**: comprar como invitado, **sin cuenta obligatoria**.
- **RF-CHK-03**: capturar nombre y apellido, correo electrónico, teléfono/WhatsApp, DNI, dirección cuando exista envío y notas adicionales opcionales.
- **RF-CHK-04**: validar datos y solicitar únicamente los necesarios en cada modalidad; tratar DNI como dato sensible en sentido práctico, evitando exponerlo en URLs, logs, eventos analíticos o mensajes innecesarios.
- **RF-CHK-05**: mostrar un resumen final que identifique productos, variantes, precios, descuento, costo de entrega, modalidad elegida, importe y condiciones aplicables.
- **RF-CHK-06**: consentimiento para marketing separado y opcional respecto del consentimiento imprescindible para procesar el pedido.

### 6.2 Métodos de pago
- **RF-PAY-01**: **Mercado Pago Checkout Pro** mediante preferencia generada exclusivamente en servidor; procesar notificaciones/webhooks verificados y consultar el estado real del pago antes de acreditar.
- **RF-PAY-02**: **transferencia bancaria manual**: comunicar instrucciones verificadas, mantener estado pendiente, permitir validación administrativa y registrar responsable/fecha de aprobación.
- **RF-PAY-03**: **efectivo al retirar**: permitir pedido pendiente de cobro, registrar pago en administración al cobrar y recién entonces confirmarlo como pagado.
- **RF-PAY-04**: preservar trazabilidad independiente de **estado del pago** y **estado logístico**; el cliente puede tener un pedido creado/reservado que todavía no está pagado ni listo para retirar.
- **RF-PAY-05**: asegurar idempotencia: una misma notificación, retorno del navegador o doble clic no puede duplicar ventas ni descontar stock dos veces.
- **RF-PAY-06**: no considerar la pantalla de éxito/retorno del navegador como confirmación suficiente del pago.
- **RF-PAY-07**: reintegrar stock o liberar reservas ante cancelación, expiración y fallos conforme a política confirmada.
- **RF-PAY-08**: abandono de carrito — **ETAPA 2**, no exigible al MVP.

**Aceptación:** el pago confirmado por Checkout Pro se refleja una vez; una transferencia sin validar no aparece como cobrada; pago contra retiro queda pendiente hasta confirmación manual; pedidos no se duplican en reintentos.

---

## 7. Entregas y logística [SECCIÓN 4 — CONFIRMADA]

- **RF-SHP-01**: métodos disponibles: retiro en local/punto de entrega; envío a coordinar por WhatsApp; domicilio en Rosario y alrededores; envío nacional por correo.
- **RF-SHP-02**: **cálculo automático de costo de envío** donde un proveedor/tarifario lo haga viable. Se deberá elegir integración exacta. No inventar tarifas ni asumir que todas las modalidades admiten cálculo automático.
- **RF-SHP-03**: retiro: informar ubicación/condiciones aprobadas, y **avisar cuando el pedido está listo**; no prometer retiro inmediato.
- **RF-SHP-04**: notificaciones de estado por **correo electrónico**.
- **RF-SHP-05**: estados logísticos: **pendiente**, **en preparación**, **listo para retirar**, **enviado**, **entregado**, **cancelado**. Los estados inaplicables a un método no se muestran como pasos obligatorios.
- **RF-SHP-06**: envío a coordinar por WhatsApp requiere explicar antes de confirmar si se cobra aparte, si el pedido está condicionado a cotización y qué se paga en línea.
- **RF-SHP-07**: política de envío gratis a partir de monto mínimo — **ETAPA 2**.
- **RF-SHP-08**: no habilitar cobro total con un envío “automático” sin cotización válida, salvo modalidad explícita de envío a coordinar y aceptación clara de costo pendiente.

**Pendientes:** dirección y horarios de retiro, zonas, códigos postales, peso/dimensiones de paquetes, correo nacional elegido, APIs/credenciales/tarifario, logística de devoluciones, reglas de envío a coordinar, cobro por separado, plazos estimados.

**Aceptación:** el cliente conoce antes de pagar cuánto corresponde abonar ahora y qué costo podría quedar pendiente; cambia el método de entrega sin perder productos; administrador puede actualizar estados y se envían mensajes correspondientes.

---

## 8. Panel administrativo [SECCIÓN 5 — CONFIRMADA]

- **RF-ADM-01**: **un único administrador** con autenticación segura.
- **RF-ADM-02**: crear, editar, ocultar y eliminar productos; **PROPUESTA TÉCNICA:** borrado lógico para productos vinculados a pedidos históricos.
- **RF-ADM-03**: editar precios, stock y atributos/variantes por sabor, tamaño y presentación.
- **RF-ADM-04**: cargar varias imágenes y descripciones, con imagen de portada.
- **RF-ADM-05**: importar/actualizar productos mediante Excel/CSV, con previsualización, validación, manejo de errores, identificación por SKU/ID e informe de cambios.
- **RF-ADM-06**: gestionar pedidos, pagos manuales, datos del comprador y estados.
- **RF-ADM-07**: gestionar banners y fotografías de inicio, destacados, novedades, cupones, promociones, combos, orden de categorías y productos.
- **RF-ADM-08**: panel de resumen con ventas, pedidos, productos más vendidos y bajo stock.
- **RF-ADM-09**: umbral configurable de **stock bajo**; señales en panel.
- **RF-ADM-10**: marcas administrables.
- **RF-ADM-11**: gestionar testimonios publicados con control editorial.
- **RF-ADM-12**: editor de guías y artículos con borrador/publicación, título, slug, imagen, contenido y metadatos SEO.
- **RF-ADM-13**: gestión de suscriptores y consentimiento, con bajas y registros mínimos para auditoría.
- **RF-ADM-14**: registrar cambios críticos de precio, inventario, pedidos, promoción y pagos manuales con marca temporal.

**Aceptación:** administrador no necesita programar para cambiar catálogo o banners; importación errónea no corrompe existencias ni duplica variantes; una orden histórica conserva su precio original.

---

## 9. Diseño, interfaz y navegación [SECCIÓN 6 — CONFIRMADA]

### 9.1 Estética y responsive
- **RF-UX-01**: experiencia visual oscura premium, negro predominante, dorado de acento y blanco funcional; respetar §2.
- **RF-UX-02**: diseñar y probar escritorio y móvil **con igual prioridad**; no interpretar como “solo escritorio” ni como “solo mobile-first”.
- **RF-UX-03**: interacciones claras: accesibilidad de teclado, foco visible, botones/etiquetas legibles, estados de carga, vacíos y errores.
- **RF-UX-04**: encabezado, navegación, búsqueda, carrito y llamadas a la acción funcionales sin dependencia de animaciones.

### 9.2 Inicio: secciones confirmadas
1. Hero/banner principal con mensaje y CTA de compra.
2. Carrusel automático de productos destacados.
3. Categorías con imágenes.
4. Ofertas y promociones.
5. Combos destacados.
6. Novedades y recién ingresados.
7. Presentación de STYLO y su respaldo profesional.
8. Testimonios de clientes administrables.
9. Instagram y redes sociales.

Orden final, contenidos, cantidad de cards y composición en cada breakpoint: **diseño UX propuesto para aprobación**, no un listado impuesto por la documentación.

### 9.3 Animaciones confirmadas
- **RF-ANM-01**: efecto A: carrusel continuo y fluido de productos; permitir interacción manual y pausar ante interacción/foco según convenga.
- **RF-ANM-02**: efecto B: producto central destacado que cambia automáticamente con transición agradable; mostrar controles explícitos de navegación.
- **RF-ANM-03**: utilizar ambos **en diferentes secciones**, sin saturar el inicio ni afectar lectura, clics o compra.
- **RF-ANM-04**: respetar `prefers-reduced-motion`, evitar animaciones que provoquen saltos de diseño y asegurar que no dependan de vídeos enormes o JS bloqueante.
- **RF-ANM-05**: inspiración en animación de https://beastlabssuplementos.com/, **sin copia visual o de recursos de terceros**. El efecto concreto se deberá validar con captura/video de referencia si la descripción no alcanza.
- **RF-ANM-06**: preparar un slot/componente modular para cinemática del león en **ETAPA 2**, sin descargar recursos ni ejecutar la animación en el MVP.

### 9.4 Páginas confirmadas
- Inicio.
- Catálogo/listado y búsqueda.
- Ficha de producto.
- Carrito y checkout.
- Nosotros / Sobre STYLO.
- Contacto y WhatsApp.
- Preguntas frecuentes.
- Envíos y devoluciones.
- Seguimiento del pedido (acceso seguro sin exponer datos por número secuencial solamente).
- Guías y artículos sobre suplementación (listado y ficha de artículo).
- Páginas legales: privacidad, términos, políticas de compra/devolución y gestión de consentimiento, redactadas/revisadas por el negocio antes de publicar.

- **RF-UX-05**: búsqueda avanzada con sugerencias y filtros por marca, categoría, sabor, precio y disponibilidad; evitar que componentes cambien arbitrariamente el precio utilizado.

**Criterios de aceptación:** navegación usable en celular y escritorio, productos legibles, animaciones que pausan o se reducen cuando corresponde; CTA y contenido accesibles sin animación.

---

## 10. Marketing, SEO y comunicaciones [SECCIÓN 7 — CONFIRMADA]

### 10.1 SEO y medición
- **RF-MKT-01**: SEO técnico completo: URLs legibles, metadatos por página, sitemap, robots, canonical, social previews y datos estructurados cuando correspondan.
- **RF-MKT-02**: Google Analytics 4: eventos de comercio relevantes (vista de producto, add_to_cart, begin_checkout, purchase) sin duplicar conversiones.
- **RF-MKT-03**: Google Search Console: verificación del sitio y conexión con sitemap.
- **RF-MKT-04**: Meta Pixel para campañas, sujeto a consentimiento y configuración correspondiente.
- **RF-MKT-05**: ninguna analítica recibirá nombre, teléfono, email, DNI ni otras credenciales/datos personales en URLs o eventos.

### 10.2 Newsletter y emails
- **RF-MKT-06**: formulario de suscripción voluntario con consentimiento explícito, base de suscriptores y baja sencilla.
- **RF-MKT-07**: email de bienvenida a suscriptores.
- **RF-MKT-08**: campañas con ofertas y novedades a suscriptores consentidos.
- **RF-MKT-09**: email posterior a la compra solicitando testimonio por canal controlado; **no habilitar reseñas públicas**, porque la decisión expresa fue *solo testimonios administrables*.
- **RF-MKT-10**: emails transaccionales de pedido y entrega desde **Resend con dominio verificado**, diferenciados de comunicaciones publicitarias.

### 10.3 WhatsApp y contenido
- **RF-MKT-11**: botón flotante WhatsApp y contacto contextual en fichas de producto y pedidos; no enviar datos personales sin intención del usuario.
- **RF-MKT-12**: editor de guías/artículos en panel; lenguaje claro y responsable, sin promesas de cambios físicos garantizados, sin atribuir aval profesional a contenido que no fue revisado.
- **RF-MKT-13**: testimonios únicamente creados/editados/publicados desde admin, con autorización documentada del autor antes de usarlos.
- **RF-MKT-14**: sección Instagram/redes mediante links o integración sostenible, sin hacer depender el sitio de widgets pesados o indisponibles.

**Pendientes:** dominios y perfiles oficiales, IDs de GA4/Meta, diseño de consentimiento de cookies, textos legales, remitentes, procedimiento de baja, frecuencia de campañas y revisión editorial de artículos.

---

## 11. Infraestructura, arquitectura y operaciones [SECCIÓN 8 — CONFIRMADA]

### 11.1 Decisiones cerradas
- Hosting: **Vercel + Supabase**.
- Pasarela: **Mercado Pago Checkout Pro**.
- Email: **Resend con dominio verificado**.
- Media: **Supabase Storage**.
- Ambientes: **desarrollo, staging/pruebas y producción independientes**.
- Nivel: seguridad completa, validaciones, webhooks, protección de datos, registros y respaldos.
- Rendimiento: alta prioridad; optimización de imágenes, carga y animaciones.

### 11.2 Decisión delegada, NO cerrada
**Codex propondrá la arquitectura y el stack exactos.** Se le solicita comparar opciones compatibles con Vercel + Supabase, explicar beneficios/riesgos/costos/mantenibilidad y pedir aprobación antes de instalar o implementar. Next.js + TypeScript podría ser candidato, pero **NO es una decisión confirmada**.

### 11.3 Responsabilidades técnicas obligatorias (agnósticas del stack)
- **RNF-SEC-01**: validaciones de datos y autorización en servidor, políticas estrictas de acceso a base de datos y storage.
- **RNF-SEC-02**: secretos solo en entorno seguro; separar test y producción; no exponer keys privadas en frontend, logs o repositorio.
- **RNF-SEC-03**: verificar autenticidad y estado de notificaciones de Mercado Pago según documentación vigente, consulta servidor-servidor, idempotencia y defensa ante reenvíos.
- **RNF-SEC-04**: proteger endpoint de admin, sesiones y operaciones mutables; control de tasa para login, formularios y checkout.
- **RNF-SEC-05**: conservar el mínimo necesario de datos personales; políticas de retención, exportación/eliminación cuando aplique y control de acceso.
- **RNF-SEC-06**: backups con frecuencia definida, restauración ensayada, logs sin secretos, alertas ante fallas de pagos, correos y logística.
- **RNF-SEC-07**: pagos de prueba en sandbox/test y pruebas de conciliación antes de credenciales reales.
- **RNF-PERF-01**: imágenes responsivas con tamaños adecuados, compresión, carga diferida cuando corresponda, caché coherente y evitar cambios de layout.
- **RNF-PERF-02**: medir Core Web Vitals en móvil y escritorio; presentar presupuestos de rendimiento medibles para aprobación (no prometer una métrica sin entorno de prueba).
- **RNF-PERF-03**: transiciones con bajo costo de renderizado y alternativa sin movimiento.
- **RNF-QA-01**: pruebas automatizadas para reglas de precios, stock, pedidos, cupones y webhooks; pruebas end-to-end para compras por cada medio de pago y método de entrega.
- **RNF-OPS-01**: migrations versionadas, CI, despliegue con rollback, monitoreo de errores y runbook de incidentes.
- **RNF-OPS-02**: documentación en español, nombres de variables de entorno sin sus valores reales, instrucciones de instalación y despliegue.

### 11.4 Integraciones externas y fallos
- Una caída del proveedor de envío debe permitir informar de forma honesta que no hay tarifa automática disponible, sin inventar costo.
- Resend temporalmente indisponible: registrar y reintentar comunicaciones transaccionales de forma segura.
- Fallo de redirección/retorno de Mercado Pago: pedido consultable de forma segura, conciliable con el pago sin confirmaciones falsas.

---

## 12. Modelo de información orientativo (PROPUESTA TÉCNICA)

Codex debe validar antes de crear tablas/migrations. Entidades esperadas:

- `brands`, `categories`, `products`, `product_variants`, `product_images`, `inventory_movements`.
- `customers_or_guest_contacts`, `addresses`, `carts`, `cart_items` (según persistencia elegida).
- `orders`, `order_items`, `payments`, `payment_events`, `order_status_history`.
- `shipping_methods`, `shipping_quotes`, `shipments`, `pickup_points`.
- `coupons`, `promotions`, `promotion_conditions`, `bundles`, `bundle_items`, `order_discounts`.
- `homepage_banners`, `home_sections`, `testimonials`, `articles`, `article_media`.
- `newsletter_subscribers`, `consent_records`, `email_events`.
- `admin_users`, `admin_audit_log`, `configuration`.

**Reglas:** claves estables, SKU único por variante, stock transaccional, historial inmutable de importe por pedido, estados de pago y despacho separados, datos privados nunca públicamente consultables y evitar eliminar registros referenciados por pedidos.

---

## 13. Flujos principales para diagramar en PlantUML

**DIA-01 — Contexto/arquitectura:** usuario, administrador, frontend/backend propuesto, Supabase, Mercado Pago, Resend, servicio de envío, GA4 y Meta.

**DIA-02 — Casos de uso:** navegación, variantes, promociones, checkout, pago, seguimiento, newsletter, administración y logística.

**DIA-03 — Modelo entidad-relación:** a partir de §12, con cardinalidades, claves y restricciones.

**DIA-04 — Secuencia checkout Mercado Pago:** selección → cotización envío → validación de precio/stock → creación del pedido → Checkout Pro → webhook → verificación → conciliación → descuento/reserva → email.

**DIA-05 — Secuencia transferencia y efectivo:** pedido pendiente → reglas de reserva → verificación manual → confirmación de pago → preparación → entrega; expiración/cancelación y liberación de reserva.

**DIA-06 — Máquina de estados:** pagos (pendiente, aprobado, rechazado, reembolsado, etc. según proveedor), logística y transiciones válidas; estados no deben confundirse.

**DIA-07 — Gestión de promoción:** elegibilidad, exclusión mutua y aplicación del mejor descuento elegible.

Codex entregará fuentes `.puml` editables y versiones de lectura si fuera necesario.

---

## 14. Fases de implementación propuestas (sujetas a aprobación)

| Fase | Entregable | Condición de aceptación |
|---|---|---|
| **0 — Arquitectura** | propuesta justificada de stack, modelo de datos, seguridad, backlog, diagramas base | revisión/aprobación previa a código |
| **1 — Fundaciones** | repositorio, CI, ambientes, auth admin, estilos oficiales, layout y rutas | despliegue de pruebas y seguridad base |
| **2 — Catálogo** | productos, marcas, categorías, variantes, imágenes, filtros, búsqueda, inventario y carga masiva | pruebas de variantes/precios/agotados |
| **3 — Comercio** | carrito, checkout invitado, precios/promociones/combos, órdenes | totales consistentes y sin pedidos duplicados |
| **4 — Pagos/logística** | Checkout Pro, transferencia, efectivo, reservas, cotización envío, retiro, estados | transacciones de prueba completas y reconciliadas |
| **5 — Backoffice y contenidos** | panel de órdenes, reportes, banners, testimonios, artículos, newsletter y correos | negocio puede operar sin programar |
| **6 — Experiencia/marketing** | animaciones, SEO, analíticas, WhatsApp, pruebas responsive/performance | auditoría UX y eventos sin duplicados |
| **7 — Lanzamiento** | QA integral, respaldos, seguridad, dominio, monitoreo, credenciales de producción y runbook | checklist de salida a producción aprobado |
| **Posterior — Etapa 2** | recuperación de carrito; envío gratis por monto; cinemática león aprobada | alcance y presupuesto posterior |

La asignación por fases no implica recortar requisitos confirmados para el lanzamiento: solo establece orden de implementación.

---

## 15. Decisiones pendientes y contradicciones a resolver

**Prioridad P0 = bloquea el módulo correspondiente antes de lanzarlo. P1 = necesario antes de la publicación definitiva.**

| ID | Prioridad | Tema | Decisión necesaria / riesgo |
|---|---|---|---|
| **PEN-01** | P0 | Operador logístico | Elegir correo nacional, integración API/tarifario, tipo de cotización, dimensiones/peso y condiciones comerciales. |
| **PEN-02** | P0 | Envío por WhatsApp | Confirmar si costo queda fuera del checkout, cómo se cobra, y qué mensaje/aceptación muestra la pantalla. |
| **PEN-03** | P0 | Tarifas Rosario | Definir cobertura y cálculo local (zonas, CP, distancia u operador); automática o fallback explícito. |
| **PEN-04** | P0 | Stock pendiente | Definir reservas, plazo de expiración, políticas para transferencia/efectivo y concurrencia de pedidos. La decisión “descontar al pago” ya está confirmada, pero no basta para evitar sobreventas. |
| **PEN-05** | P0 | Precios | Regla exacta entre lista, efectivo/transferencia, ofertas, cupones, combos y cantidad; base de filtros/orden. |
| **PEN-06** | P0 | Cuotas | Forma de mostrar cuotas compatibles con Checkout Pro y evitar diferencias entre cartel y MP. |
| **PEN-07** | P0 | Confirmación de retiro | Pedido en efectivo “creado” vs “pagado”; cuándo se prepara, cuánto tiempo permanece reservado y confirmación manual. |
| **PEN-08** | P0 | Pagos/reembolsos | Titular de cuenta MP, CBUs, procesos de cancelación, devolución y reversión de stock. |
| **PEN-09** | P0 | Catálogo regulatorio | Qué productos concretos se venderán, rótulos e información comercial obligatoria, advertencias y validación de cumplimiento local. Evitar afirmaciones médicas no demostradas. |
| **PEN-10** | P1 | Retiro | Punto de retiro, domicilio visible, días y horarios, plazos y contacto. |
| **PEN-11** | P1 | Envíos/devoluciones | Política aprobada: plazos, condiciones, cambios, responsable del costo y contacto. |
| **PEN-12** | P1 | Activos de marca | Logo maestro, variantes oficiales, fotografías, autorizaciones y contenidos reales. |
| **PEN-13** | P1 | Respaldo profesional | Aprobación expresa del texto y credenciales que se exhiban sobre la Lic. en Nutrición mencionada en el manual. |
| **PEN-14** | P1 | Sitio y marketing | Dominio, WhatsApp, Instagram, GA4, Search Console, Pixel, consentimiento de cookies y políticas de datos. |
| **PEN-15** | P1 | Reseñas | Canal para recopilar testimonios posteriores a la compra, consentimiento de publicación; no abrir comentarios públicos. |
| **PEN-16** | P1 | Arquitectura | Codex propone stack final y comparación de alternativas, costos y diagramas; cliente aprueba antes de codificar. |
| **PEN-17** | P1 | Inventario | Múltiples depósitos/sucursales no confirmados, nivel SKU, stock inicial y sincronización con ventas fuera de la web. |
| **PEN-18** | P1 | Contenido legal | Texto final de términos, privacidad, derecho de revocación, devoluciones, facturación y tratamiento de DNI, con revisión competente. |
| **PEN-19** | P1 | Importaciones | Plantilla Excel/CSV y reglas de actualización: SKU, duplicados, baja de variantes, preservación de fotos. |
| **PEN-20** | P1 | Animación referencia | Captura/video puntual del efecto de Beast Labs para verificar ritmo y transición sin copiar la interfaz. |
| **PEN-21** | P1 | Comprobantes/facturación | Si se requiere integración con facturación electrónica/ERP o procedimiento manual, y datos fiscales pertinentes. |

**Tensiones detectadas (no borrar ninguna decisión):**
1. “Costo de envío automático” y “envíos a coordinar por WhatsApp” son compatibles **solo si se modelan como modalidades diferentes**, con totales e información claros.
2. “Confirmar pedidos solo al pago verificado” y “efectivo al retirar” requieren diferenciar **pedido creado/reservado** de **pedido pagado/confirmado**.
3. “Descontar stock tras pago” con transferencias pendientes necesita política de **reserva temporal** para evitar sobreventas.
4. “Correo solicitando reseña” y “solo testimonios administrables” requieren formulario/canal moderado, no reviews públicos.
5. “Mostrar cuotas” con “precio de lista + contado/transferencia” exige reflejar condiciones del medio de pago, sin adjudicar a MP financiación que no ofrece.

### Propuestas de criterio para validación (NO aprobadas)
- Reserva de stock durante un plazo corto y configurable para pedidos pendientes, con limpieza automática e integridad transaccional; confirmar duración con el negocio.
- Para envíos coordinados, mostrar expresamente “Costo de envío no incluido; se cotizará y abonará por separado” **solo si ese es realmente el circuito comercial aprobado**.
- Aplicar una sola promoción por pedido, elegir máximo ahorro monetario elegible calculado en servidor, excepto que el cliente/negocio defina reglas distintas.
- Registrar identidad de pago, estado, monto y versión de la cotización; bloquear reintentos que cambien los importes sin revalidación.

---

## 16. Pruebas mínimas y criterios globales de aceptación

### Compras
- Pedido MP aprobado, pendiente, rechazado y webhook duplicado; no hay doble descuento ni confirmación anticipada.
- Transferencia manual aprobada/rechazada; efectivo retirado/cancelado; conciliación y log de acciones.
- Dos clientes intentan adquirir última unidad: **nunca** stock negativo ni dos cobros exitosos de misma última unidad sin gestión explícita.
- Variantes, combos, cupón, oferta programada, cantidad y no acumulación; cálculo de descuento y redondeo estable.
- Cambio de método de pago actualiza el precio aplicable antes de crear pedido.
- Cambio de localidad/modalidad de envío recalcula o aclara importe pendiente sin cargo oculto.

### Administración
- Alta, edición, ocultación y borrado lógico; marca y categoría editable; umbral stock bajo.
- Excel/CSV con registros válidos, inválidos y duplicados no produce corrupción.
- Banners y contenidos administrables; artículos con SEO, testimonios con moderación, newsletter y bajas.

### Seguridad y privacidad
- Invitado no puede consultar datos de otro pedido cambiando un ID.
- Admin privado protegido también a nivel de API/base de datos.
- Webhooks y notificaciones duplicadas, falsificadas o fuera de orden no alteran incorrectamente los estados.
- Los eventos GA4/Meta no contienen DNI, email, teléfono, nombre ni dirección.
- Backups/restauración probados; secrets fuera del repositorio.

### UX y rendimiento
- Pruebas de escritorio y celular con el mismo nivel de atención: carrito, filtros, modales, checkout y admin.
- Animaciones con alternativa reducida, controles y rendimiento medido.
- Enlaces, formularios, mensajes vacíos, descuentos y stock legibles y accesibles.
- Confirmar que el sitio no muestra datos/beneficios de suplementos sin validación comercial pertinente.

---

## 17. Entregables solicitados a Codex

1. **Propuesta de arquitectura** con alternativas y comparación: stack, costos, restricciones de Vercel/Supabase, estrategia de rendering y APIs, dependencias e integraciones.
2. **Mapa de alcance:** tabla de RF, RNF y pendientes; separar confirmado/propuesto/pendiente.
3. **Estructura de repositorio y documentación**, migraciones y esquema de datos a partir de reglas aprobadas.
4. **Diagramas PlantUML editables** indicados en §13.
5. **Backlog por fases** con dependencias, pruebas y criterio de aceptación de cada fase.
6. **Diseño UX/UI propuesto** basado en manual oficial, con wireframes de escritorio y móvil; especificar animaciones de productos y mecanismo de desactivación.
7. **Plan de QA, seguridad, despliegue y monitoreo** con ambientes aislados y secretos bajo control.
8. **Guía de operación admin** y soporte para importar/actualizar productos.

### Instrucción inicial para Codex (copiar/pegar)

> Leé completamente `especificaciones.md` y el Manual de Marca STYLO SUPLEMENTOS v1.1 antes de escribir código. No supongas requisitos no documentados ni cambies decisiones CONFIRMADAS. Identificá todos los puntos PENDIENTE y explicá cuáles bloquean cada módulo. Primero entregá: (1) propuesta comparada de arquitectura/stack compatible con Vercel + Supabase, Mercado Pago Checkout Pro, Resend y Supabase Storage; (2) modelo de datos; (3) diagramas PlantUML; (4) plan de fases y pruebas; (5) propuesta de UX/UI y animaciones alineada al manual. Pedí aprobación antes de iniciar implementación. No expongas secretos ni uses credenciales productivas en pruebas. Priorizá exactitud de precios, seguridad del pago, consistencia de inventario y rendimiento.

---

## 18. Estado de decisiones por sección

| Sección | Estado |
|---|---|
| 1. Catálogo y productos | Confirmada |
| 2. Precios, descuentos y promociones | Confirmada; reglas finas pendientes |
| 3. Carrito, checkout y pagos | Confirmada; reservas y reembolsos pendientes |
| 4. Envíos, retiros y entregas | Confirmada; proveedor y tarifas pendientes |
| 5. Panel administrativo | Confirmada |
| 6. Diseño, páginas y animaciones | Confirmada; activos y referencia exacta pendientes |
| 7. Marketing, SEO y comunicación | Confirmada; cuentas, textos y consentimientos pendientes |
| 8. Tecnología, seguridad y despliegue | Confirmada; elección final del stack delegada a Codex |

**Próximo paso:** resolver primero los pendientes P0 junto al cliente o establecer criterios de negocio aprobados. Codex puede avanzar con propuesta de arquitectura, esquemas y wireframes mientras tanto, pero NO dar por resueltas reglas comerciales que afecten pagos, stock y envíos.
