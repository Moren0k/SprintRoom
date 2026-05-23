# SprintRoom: notas de infraestructura

## InsForge UnitOfWork

`InsForgeUnitOfWork` coordina la persistencia de agregados usando llamadas secuenciales al SDK de InsForge/PostgREST. No representa una transaccion real de base de datos.

Implicaciones operativas:

- Las escrituras multi-tabla pueden quedar parcialmente aplicadas si una llamada intermedia falla.
- Los adaptadores reducen escrituras innecesarias guardando solo agregados nuevos, eliminados o modificados desde que fueron cargados.
- Las operaciones usan `upsert` idempotente donde aplica para disminuir el impacto de reintentos.
- La auditoria se registra despues de operaciones exitosas; si falla solo la escritura de auditoria, la mutacion funcional ya pudo haber ocurrido.

Si el backend necesita atomicidad estricta para un flujo, debe moverse a una funcion RPC/transaccional en PostgreSQL o a una funcion serverless que ejecute la operacion completa dentro de una transaccion administrada.
