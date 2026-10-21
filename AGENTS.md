# STYLO Suplementos

Para cambios de interfaz, leer `docs/diseno.md` y aplicar la adaptación de AI Design Skills allí documentada. Usar los tokens de `src/app/globals.css` y mantener los estados accesibles y la mejora progresiva de las animaciones.

El manual de marca en `docs/Manual_de_Marca_STYLO_SUPLEMENTOS_v1_1.pdf` y las instrucciones del usuario prevalecen sobre las recomendaciones externas. Conservar los logos oficiales y no inventar datos comerciales.

Consultar `docs/fase-1.md`, `docs/fase-2.md` y `docs/fase-3.md` para el alcance, las autorizaciones y los pendientes. La Fase 3 ya fue autorizada y se desarrolla en ramas separadas; la vista previa local no habilita administración real. Trabajar sin gastos ni dominio contratado. No integrar una rama de fase o de prueba a `main` sin la validación acordada con el usuario.

Las skills propias de Codex están en `.agents/skills/`: `stylo-feature` para funcionalidades de alcance significativo, `stylo-debug` para fallos reproducibles, `stylo-ui-review` para comprobaciones visuales, `stylo-security-review` para auditorías solicitadas y `stylo-db-migration` para futuros cambios de esquema. Son guías de trabajo; no amplían el alcance ni la autorización de una tarea. Su adaptación y procedencia están en `docs/shipkit-codex.md`.

En PowerShell usar `npm.cmd`. Verificar la compilación y los recorridos de navegador afectados; las preferencias de movimiento reducido y la navegación sin JavaScript deben conservarse.

El remoto autorizado es `https://github.com/lautiasc10/Stylo-suplementos.git`. Subir entregas con commits identificados por fase. La etiqueta `fase-1-base` representa la primera base revisable, con los pendientes de `docs/fase-1.md`. Trabajar las fases siguientes en ramas separadas e integrarlas tras su validación. No incluir secretos, builds ni dependencias instaladas en los commits.
