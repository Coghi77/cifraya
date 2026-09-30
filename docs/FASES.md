# Plan por fases

## Fase 0 — Decisiones antes de cobrar

- Validar el modelo concreto de campañas y participaciones con asesoría competente en Costa Rica.
- Definir reglas de campaña, compra, reserva, devolución y tratamiento de datos.
- Confirmar qué entidad y cuenta bancaria recibirán pagos.
- Mantener separada cualquier futura cuenta de Vercel u otros servicios. No registrar credenciales aquí.

## Fase 1 — Base local y flujo de reserva

- Proyecto independiente con web React, API Fastify y PostgreSQL/Prisma.
- Campaña configurable, publicación manual, números por campaña y vista pública móvil.
- Reserva exclusiva de 30 minutos; vencimiento libera números.
- Entorno local y demo gratuita opcional para pruebas, sin cobros ni recepción de comprobantes.

**Cierre:** una campaña de prueba se crea, se publica y dos personas no pueden reservar el mismo número. Una reserva vencida se libera. Las pruebas de simultaneidad se ejecutan sobre PostgreSQL local.

## Fase 2 — Pago manual y comprobantes

- Instrucciones SINPE vinculadas al pedido.
- Comprobante privado, referencia bancaria, fecha y monto.
- Si se envía dentro de los 30 minutos, cambiar a `PAGO_EN_REVISION` y mantener números apartados.
- Bandeja administrativa para verificar ingreso, aprobar, rechazar o pedir información.
- Dos días hábiles para revisión, con horario lunes a sábado de 9:00 a. m. a 6:00 p. m. en Costa Rica, excluyendo feriados publicados.
- Pagos tardíos y duplicados en una bandeja de incidencias; devolución acordada en tres días hábiles.
- Auditoría de cada decisión y confirmación al participante.

**Cierre:** no se venden números bajo revisión; una referencia bancaria no puede aprobar dos pedidos; los pagos tardíos no desplazan reservas existentes.

## Fase 3 — Resultados y operación

- Cierre de participantes, resultado, evidencia y entrega del premio.
- Reportes por campaña: cobrado, pendiente, gastos y devoluciones.
- Cuentas administrativas, permisos, segundo factor, respaldos y monitoreo.
- Revisión de seguridad y privacidad antes de cualquier exposición pública.

## Fase 4 — Integraciones y crecimiento

- Integración de pagos solo después de aceptación expresa de la actividad por el proveedor.
- Automatización de conciliación, notificaciones y atribución de campañas.
- Despliegue en cuentas propias de Alessandro Kogi cuando se autorice.

## Regla de alcance

El sistema no debe presentarse como listo para recibir pagos hasta completar las fases 0, 2 y 3 y sus verificaciones.
