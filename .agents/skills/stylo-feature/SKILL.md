---
name: stylo-feature
description: Planificar e implementar cambios funcionales significativos en STYLO, con alcance, decisiones comerciales y verificación claros. Usar para funciones nuevas o cambios de comportamiento con varios recorridos; no para ajustes rutinarios.
---

# Cambios funcionales en STYLO

Antes de trabajar, leer `AGENTS.md` y la documentación de la fase afectada. Identificar los componentes y pruebas existentes que se pueden reutilizar. Conservar las decisiones ya confirmadas por el usuario; preguntar solo por una regla comercial o un dato imprescindible que aún falte.

Para un cambio significativo, dejar claros el comportamiento esperado, los datos afectados, los límites del alcance y al menos un recorrido verificable. Registrar decisiones nuevas en la documentación de la fase correspondiente. Dividir el trabajo cuando facilite revisar o probar cada parte, sin imponer un tamaño fijo ni crear tickets o PR por rutina.

Implementar dentro de la rama autorizada. Verificar con los comandos del proyecto y los recorridos afectados; para interfaz, usar `stylo-ui-review`. Para un fallo inesperado, seguir `stylo-debug`. Si el trabajo requiere cambiar el esquema o los permisos de la base, usar `stylo-db-migration` dentro del alcance autorizado.

Entregar una descripción concreta de lo que cambió, las pruebas ejecutadas y los límites pendientes. No iniciar por cuenta propia integraciones comerciales, servicios externos, despliegues o fusiones de ramas.
