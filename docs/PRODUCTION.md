# Operación de Cifraya

## Verificación reproducible

`pnpm test:production` ejecuta pruebas API y del canal de actualización, y compila ambos proyectos. `pnpm audit --prod` revisa vulnerabilidades conocidas de dependencias. `/api/health` comprueba el proceso; `/api/ready` comprueba también PostgreSQL y devuelve 503 si falla.

## Consumo y actualizaciones

- Una conexión SSE por pestaña visible. Los eventos se agrupan durante 250 ms. Reconexión y regreso a la pestaña sincronizan los datos automáticamente.
- Respaldo cada 120 segundos con conexión saludable, o cada 20 segundos si SSE falla. Las pestañas ocultas cierran SSE y no consultan de respaldo. Los modales de revisión de pagos y participantes comparten las notificaciones.
- Las listas públicas de rifas y ganadores comparten consultas simultáneas y una caché de dos segundos, invalidada con cada modificación. Los datos privados no se almacenan en esa caché.
- La revisión de vencimientos comparte una ejecución y evita repetir consultas durante cinco segundos si no queda un lote completo pendiente.
- El proceso limita conexiones SSE y descarta clientes que no consumen los datos, para evitar buffers sin límite. Al recibir SIGTERM/SIGINT cierra conexiones y Prisma.
- La API envía `no-store`; las imágenes públicas conservan su caché explícita. Los registros de solicitudes ocultan tokens de consulta y cabeceras de sesión.

## Configuración necesaria para operación continua

- Mantener `DATABASE_URL`, `ADMIN_TOKEN` y `ADMIN_PIN` solo en el gestor de secretos de Render. Conservar ADMIN_TOKEN entre despliegues para no invalidar sesiones. Rotarlo cuando sea necesario cerrar todas las sesiones.
- El despliegue actual usa una instancia. Antes de usar varias réplicas, compartir los eventos y límites entre procesos; la implementación SSE y el límite de intentos están en memoria. El respaldo periódico converge los datos, pero no sustituye un bus de eventos compartido.
- El plan gratuito de Render puede suspender el servicio tras inactividad. Para operación continua, cambiar el tipo de instancia desde Render. Referencia: https://render.com/docs/free . El código no cambia el plan ni genera cargos.
- Verificar y probar restauración de respaldos de Supabase antes de ventas reales. No se ha verificado la política de respaldos de la cuenta desde esta tarea.
- Las fotos y comprobantes siguen en PostgreSQL con límites de tamaño; vigilar crecimiento. Si aumenta el volumen, migrarlos a almacenamiento de objetos privado mediante una migración que conserve permisos y enlaces.

## Alcance de la comprobación

Las pruebas de concurrencia de caché usan un cargador simulado: 1.000 solicitudes simultáneas generan una lectura. Eso prueba deduplicación, no capacidad de atender 1.000 compradores simultáneos. Para dimensionar la infraestructura hace falta una prueba de carga sobre un entorno separado con PostgreSQL y datos representativos; no ejecutar compras ni verificaciones de pago sintéticas en producción.
