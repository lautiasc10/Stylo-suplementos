# STYLO SUPLEMENTOS — Diagramas PlantUML

Complemento de `especificaciones_STYLO_SUPLEMENTOS.md` v1.0. Diagramas editables para revisión de Codex, NO arquitectura final aprobada.

| Archivo | Objetivo |
|---|---|
| 01_arquitectura_propuesta.puml | Contexto e integraciones, stack por proponer |
| 02_casos_de_uso.puml | Comprador y administrador |
| 03_modelo_datos_propuesto.puml | Modelo conceptual sujeto a migraciones definitivas |
| 04_checkout_mercadopago.puml | Checkout Pro, webhook, idempotencia y stock |
| 05_transferencia_efectivo.puml | Pagos manuales, auditoría y reservas |
| 06_estados_pedido.puml | Máquinas separadas de pago y entrega |
| 07_promociones.puml | Mejor descuento sin acumulación |

## Reglas para Codex
1. Leer primero las especificaciones y el manual de marca; la decisión del stack corresponde a Codex para aprobación del cliente.
2. Conservar todo lo `CONFIRMADO`; marcar `PENDIENTE` los PEN-01 a PEN-21 sin inventar reglas de negocio.
3. El esquema ER es conceptual: cambiar nombres, claves y relaciones según arquitectura justificada, preservar transacciones e historial inmutable de precios.
4. No implementar pagos/stock/logística sin resolver bloqueantes P0 correspondientes.
5. Producción, staging y desarrollo separados; ningún secreto en frontend ni en diagramas.
6. La integración de la animación del león es fase 2 y requiere uso aprobado de activos oficiales de marca.

Para renderizar: instalar PlantUML y ejecutar `plantuml *.puml` en esta carpeta, o usar previsualización PlantUML en editor compatible.
