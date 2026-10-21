---
name: stylo-debug
description: Investigar y corregir fallos reproducibles de STYLO, localizando la causa y verificando el recorrido afectado. Usar ante regresiones, errores de pruebas o problemas comunicados por el usuario.
---

# Depuración de STYLO

Guardar el síntoma y el contexto: ruta, variante, dispositivo, pasos, consola o prueba fallida. Reproducirlo en la vista previa local o en un entorno de prueba; no usar producción para ensayos ni modificar datos reales para provocar el fallo.

Seguir el flujo desde la interfaz hasta la acción, los cálculos y los datos, según corresponda. Comprobar la causa antes de editar. Para un comportamiento que pueda reaparecer y se pueda probar de forma útil, ejecutar primero una prueba que falle por el motivo correcto. Un cambio visual pequeño puede verificarse con el recorrido de navegador y capturas en vez de añadir una prueba que solo repita el CSS.

Corregir la causa dentro del alcance solicitado, sin mezclar refactorizaciones ajenas. Ejecutar la prueba específica, las comprobaciones pertinentes del proyecto y el recorrido original. Si el problema no se reproduce, explicar qué evidencia falta y no atribuirle una causa inventada. Si toca datos ya escritos, medir el alcance en modo lectura antes de proponer una corrección.

Informar dónde estaba el fallo, qué lo resolvió, cómo se comprobó y qué incertidumbre queda.
