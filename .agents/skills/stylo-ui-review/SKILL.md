---
name: stylo-ui-review
description: Revisar cambios visibles de STYLO con sus pruebas Playwright y capturas de escritorio y móvil. Usar después de cambios de interfaz o cuando una revisión visual necesita evidencia.
---

# Revisión visual de STYLO

Leer `docs/diseno.md` y comprobar el diseño solicitado contra los tokens y logos existentes. Usar la aplicación local y los escenarios de prueba del repositorio. `playwright.config.ts` ya separa la vista previa local de Supabase; no sustituirla por una sesión de producción.

Ejecutar el recorrido afectado con `npm.cmd run test:e2e -- <archivo o filtro>` tras compilar cuando corresponda. Revisar escritorio y móvil, capturas, errores de consola y solicitudes fallidas. Abrir las capturas para evaluar legibilidad, tamaños, desbordamientos, foco, estados vacíos y contenido real; una prueba que pasa no sustituye esa inspección.

Comprobar movimiento reducido y navegación sin JavaScript en las superficies afectadas. Para afirmar que mejoró el rendimiento, medir sobre `next build` y `next start` y comunicar también los límites de la medición. Mantener capturas temporales con datos de prueba fuera de los commits hasta haberlas revisado.

No instalar otro Playwright ni copiar el script de captura de Shipkit: STYLO ya dispone de la dependencia, la configuración y las pruebas necesarias. Entregar rutas, tamaños de pantalla, resultados y hallazgos concretos.
