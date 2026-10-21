# Shipkit adaptado a Codex en STYLO

Referencia revisada: [Tintaa307/shipkit](https://github.com/Tintaa307/shipkit), commit [`8b622b5`](https://github.com/Tintaa307/shipkit/tree/8b622b50879ef61d994305ff3b09be9e95ed7774), licencia [MIT](https://github.com/Tintaa307/shipkit/blob/main/LICENSE). Estas guías son adaptaciones breves para STYLO, no una copia del paquete ni de su instalador.

| Shipkit | Skill de Codex | Adaptación |
| --- | --- | --- |
| `new-feature` + `implement-slice` | `stylo-feature` | Un solo flujo para cambios significativos; usa las fases, la rama y las decisiones ya acordadas. No impone agentes Claude, modelos, tickets, PR ni aprobación repetida para trabajo rutinario. |
| `debug` | `stylo-debug` | Reproducción y causa antes de la corrección; prueba de regresión cuando aporta una protección real. |
| `verify-ui` | `stylo-ui-review` | Reutiliza Playwright, Vitest y las vistas previas existentes. Comprueba escritorio, móvil, accesibilidad, consola y navegación sin JavaScript. |
| `security-audit` | `stylo-security-review` | Revisión solicitada y basada en evidencia; los hallazgos no crean tareas ni cambios externos automáticamente. |
| `safe-migration` | `stylo-db-migration` | Guía para una futura solicitud de esquema; respeta las migraciones y políticas propias de STYLO. No se aplica ninguna migración por instalar la skill. |

El pack de ARCA, Rebill, Mercado Pago y Correo Argentino queda fuera de esta adaptación. El usuario pospuso las decisiones de pago y envío; sus API y reglas se deberán verificar con fuentes vigentes cuando se definan. El proyecto tampoco necesita los agentes `.claude/agents`, el instalador `install.sh`, el script de capturas de Shipkit ni dependencias nuevas.

Las instrucciones del usuario, `AGENTS.md`, el manual de marca y la documentación de fase prevalecen sobre estas guías. Las skills indican cuándo revisar y cómo comprobar; no conceden permiso para modificar servicios, datos reales o despliegues. Comandos de referencia en PowerShell: `npm.cmd run check` y, para un recorrido afectado, `npm.cmd run test:e2e -- <archivo o filtro>`.
