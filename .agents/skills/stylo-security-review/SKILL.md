---
name: stylo-security-review
description: Auditar cambios de seguridad de STYLO cuando se solicite una revisión o se prepare una entrega de alto riesgo. Verificar hallazgos sobre permisos, datos y rutas antes de proponer correcciones.
---

# Revisión de seguridad de STYLO

Delimitar la rama, los commits y las rutas a revisar. Priorizar acciones de servidor, autenticación y MFA, RLS, datos de clientes, carga de medios, secretos y futuras entradas de pago. Leer los invariantes ya documentados; no aplicar una lista genérica como si todos los servicios estuvieran habilitados.

Comprobar cada sospecha con código, una prueba o una consulta de solo lectura. Distinguir hallazgos confirmados, dudas y falsos positivos. No imprimir valores de `.env.local`, tokens ni datos personales en informes o resultados de herramientas.

Entregar evidencia, impacto y corrección propuesta para cada hallazgo confirmado. Si la corrección está autorizada por la tarea, implementarla en el alcance correspondiente y agregar una comprobación útil. Esta revisión por sí sola no autoriza cambios de base de datos, pagos ni despliegues.
