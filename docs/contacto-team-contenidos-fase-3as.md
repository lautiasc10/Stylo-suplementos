# Fase 3AS — Contacto, Team y contenido del Home

Solicitud autorizada el 24 de octubre de 2026. Rama `fase-3as-contacto-contenidos`, pendiente de revisión e integración a `main`. Resend, pagos, logística y cupones quedan fuera de esta entrega.

## Datos confirmados

- WhatsApp: +54 9 341 531-6456.
- Instagram: `stylo.suplementos`.
- Facebook: `Stylo.Suplementos`.
- Email: `stylo.suplementos@gmail.com`.
- Ubicación pública: Rosario, Argentina. No se publica domicilio, mapa de retiro ni horario porque todavía no están definidos.
- Las consultas de atletas **y profesores** deben recibirse y gestionarse en el panel privado. No se derivan a WhatsApp ni a un servicio de correo.
- El ranking debe representar los tres productos más vendidos del mes, con ventas cobradas. Mientras no haya datos suficientes, se conserva una selección inicial expresamente identificada como ejemplo.

## Comportamiento implementado

### Contacto

`/contacto` reemplaza el anuncio provisional por una composición con fotografía real del equipo y enlaces directos a los cuatro canales confirmados. El pie enlaza Instagram y WhatsApp. Los enlaces funcionan sin JavaScript; los destinos externos usan `noopener noreferrer`. No se añaden widgets de terceros ni promesas de tiempos de respuesta.

### Atletas y profesores

Se conserva la sección del Home, sus fotos y animaciones. El texto invita a conversar sobre una posible colaboración; retira suplementos mensuales, comisiones y códigos propios sin condiciones aprobadas.

El formulario solicita rol (atleta, profesor/a o ambos), nombre, email y disciplina. Instagram y mensaje son opcionales. Pide consentimiento específico para gestionar la consulta y explica que no suscribe a publicidad. Valida longitudes y formato en navegador, acción de servidor y PostgreSQL. Ante fallo no anuncia éxito y conserva lo escrito.

Las consultas llegan a `/admin/atletas`. El administrador puede buscar por nombre/email, filtrar estados, navegar páginas de 25 registros y guardar estado/notas internas. Los estados son Nueva, En revisión, Contactada y Cerrada. Guardar seguimiento no envía correos ni mensajes. Los datos de búsqueda viajan por POST, sin email en URLs. Las fechas usan Buenos Aires y formato estable para hidratación.

La ruta queda fuera del grupo de paneles almacenados en el cliente: entrar o salir usa navegación normal, evitando confundirla con Resumen. El nuevo enlace está en Comunidad. La navegación previa de Productos, Ventas y Promociones conserva su comportamiento.

`/vista-previa/portada#atletas` y `/vista-previa/atletas` ofrecen el recorrido local identificado como prueba. Solo guardan datos ficticios en `stylo.team-applications-preview.v1`; nunca escriben en Supabase. La restricción existente de host/ambiente protege estas rutas.

### Más vendidos

La consulta agrupa **unidades** de las líneas de ventas con `payment_status='paid'` por producto padre; sus sabores no ocupan puestos separados. Para la foto y enlace elige el SKU más vendido de ese producto. Los empates usan IDs para mantener orden estable. Se consideran productos, marcas y variantes activos; un agotado puede conservar su posición, mostrando su disponibilidad real y sin permitir agregarlo.

El período es el mes calendario actual de `America/Argentina/Buenos_Aires`. La consulta pública solo devuelve IDs de los productos y variantes seleccionados: no expone clientes, emails, teléfonos, importes, unidades ni pedidos. Se cachea durante 60 segundos con clave por mes y cliente público sin sesión/cookies. El nuevo mes usa otra clave inmediatamente.

Al disponer de tres productos clasificados con fotografía, cambian la leyenda a ranking mensual y el distintivo a «N.º 1 del mes». No se modifica la coreografía individual ni el cierre de tres productos. Si faltan datos o fotos, se mantienen productos reales del catálogo como selección de ejemplo, sin mezclar puestos ni inventar ventas.

**Regla temporal actual:** las ventas manuales cobradas se crean como pagadas; se usa `created_at`, igual que el resumen administrativo existente. Cuando Fase 4 incorpore cobros de pedidos creados previamente, adaptar el ranking al instante efectivo de cobro (`paid_at` o equivalente). Los registros de prueba marcados como cobrados no pueden distinguirse automáticamente de ventas reales con el modelo actual; revisar la calidad de los datos antes de habilitar el ranking público.

### Novedades

El editor añade «Mostrar en Novedades», reutilizando las etiquetas existentes `nuevo`, `novedad` y `novedades`. La casilla conserva otras etiquetas, SKU, precios y existencias. El Home público muestra hasta cuatro productos visibles marcados; ya no toma automáticamente los últimos cuatro de un array ni deduce fechas desde las fotografías. Sin selección, conserva una salida clara al catálogo. La demostración local sigue identificando sus ejemplos.

## Migración y activación

Archivo: `supabase/migrations/202610240001_team_and_home_content.sql`.

Requiere las migraciones existentes de fundaciones, catálogo y comercio. En una transacción añade:

- Tabla privada `team_applications` e índices de consulta/admisión.
- RPC pública `submit_team_application(jsonb)`, con validación, consentimiento booleano, deduplicación de reintentos idénticos y admisión serializada por lock transaccional. Ventana de 15 minutos por email, máximo de 50 consultas/hora y 500/día globales.
- RPC privada `review_team_application(...)`, que vuelve a exigir admin/MFA, evita sobreescrituras mediante `updated_at` y registra solo acción/ID en auditoría.
- RPC agregada `storefront_content_snapshot()` y un índice de ventas pagadas por fecha.

No altera productos, fotos, stock, pagos ni pedidos existentes. No añade claves de servicio, proveedor externo ni configuración de Resend. La aplicación funciona sin la migración: Contacto queda disponible, el ranking conserva los ejemplos y el formulario no habilita la captura de datos.

**Estado informado por el usuario (24 de octubre de 2026):** aplicó la migración y confirmó que funciona. Esta confirmación no equivale a una comprobación independiente del entorno remoto ni a una prueba de entrega de consultas reales. Tras desplegar esta rama, refrescar después de aproximadamente un minuto por la caché pública y verificar la lectura privada con MFA, el envío consentido de una consulta de prueba, su seguimiento y el ranking agregado.

**Reversión:** volver a la aplicación anterior puede conservar tabla y funciones nuevas sin afectar sus contratos. No borrar la tabla para revertir una interfaz: contiene consultas privadas. Antes de habilitar públicamente, el negocio debe definir retención y eliminación de solicitudes; el consentimiento implementado es para responder esta consulta, no para marketing.

## Comprobaciones

- Pruebas de PostgreSQL local: anon no lee ni inserta directamente; usuario ajeno/admin sin MFA no leen la bandeja ni revisan solicitudes; admin con MFA puede gestionar; se registra auditoría y se rechaza una versión obsoleta.
- RPC pública: validación de consentimiento booleano y límites de campos, reintento sin duplicado, límite por email y límite global incluso al evitar la interfaz.
- Ranking: agrupación de SKU, orden por unidades, exclusión de impagos y mes anterior, selección de variante y ausencia de campos privados en la salida pública.
- Unitarias del proyecto: 162 correctas y 2 omisiones existentes del CSV externo.
- Navegador Chromium en producción local: Contacto, consultas del Team, consentimiento, error sin pérdida de campos, persistencia del ejemplo en la bandeja, filtros/seguimiento, texto sin ejecución de HTML, canales sin JavaScript, selección de Novedades sin cambiar variantes, cabecera/bolsa y coreografía de Más vendidos.
- Serie final: 39 recorridos correctos y 5 omisiones por dispositivo; se suman 4 comprobaciones de acceso privado y de los paneles existentes. Lint, typecheck y build correctos.
- Capturas fuera del repositorio en `C:/tmp/stylo-3as/visual/` y `final/`: Contacto escritorio/tablet/móvil y Team/bandeja. Los formularios usan datos explícitamente ficticios.

Las pruebas locales no acreditan por sí solas la aplicación de RLS en el proyecto remoto, la recepción de consultas reales ni la disponibilidad de las cuentas de redes sociales. El usuario confirmó que aplicó la migración y que funciona; todavía falta verificar el recorrido completo tras publicar esta rama. Los enlaces usan exactamente los datos suministrados por el dueño.
