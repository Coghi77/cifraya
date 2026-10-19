# Auditoría de reserva y selección

La selección previa bloquea boletos durante cinco minutos: en manual desde cada clic y en aleatorio desde la generación. Cambiar números no amplía el plazo. La transacción de selección usa bloqueo de Campaign en PostgreSQL, válido entre múltiples procesos; reclama únicamente números libres, vencidos o propios. Reemplazar/deseleccionar libera los anteriores. Los invertidos se reclaman al agregarlos. Al confirmar los datos, una transacción serializable consume la propuesta, crea el pedido y reclama únicamente filas AVAILABLE con holdKey propio y holdExpiresAt vigente. Si no reclama todas, revierte pedido, números y correo. Reserva de 30 minutos; primer comprobante exige expiresAt > hora del servidor. Al pasar a PENDING_REVIEW el apartado se conserva hasta decisión administrativa. La caducidad libera solo reservas ACTIVE y filas RESERVED vinculadas al pedido; nunca números vendidos.

Validación local realizada con PostgreSQL 18.4 temporal (no sustituye una prueba de carga en infraestructura de producción). Doce solicitudes HTTP concurrentes por el mismo número: exactamente un 201 y once 409, una reserva y un correo. También se verificaron conflicto parcial de paquetes, manual duplicado/fuera de rango, exclusión aleatoria de apartados, rechazo de vendidos, primer comprobante fuera de plazo, liberación al vencer y un solo correo al adjuntar múltiples comprobantes.

Para repetir desde la raíz del repositorio en Windows, con puertos 5546, 4199 y 4200 libres:

1. npm install --prefix tmp/reservation-tests embedded-postgres@18.4.0-beta.17 --no-audit --no-fund
2. pnpm --filter @cifraya/api build
3. node scripts/reservation-audit.mjs

El script crea su propio clúster en tmp y una base con nombre único. Fuerza DATABASE_URL local, desactiva Resend y arranca su propia API; no carga .env. Cierra API y PostgreSQL incluso si falla. Conserva datos sintéticos y logs en tmp para diagnóstico. La dependencia es solo de auditoría, no se agrega al runtime de producción.

Prueba adicional: 30 solicitudes mixtas manual/aleatorio distribuidas entre dos procesos API, sin intersecciones entre selecciones aceptadas. Verifica selección manual parcial, deselección, TTL fijo de cinco minutos, limpieza automática, rechazo del antiguo dueño al vencer, reclamación por otra sesión e invertidos exclusivos. No crea reservas reales ni envía correos.
