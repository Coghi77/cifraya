# Correos de pagos — Resend

1. Resend > Domains > Add domain: vnovatcg.com. Copiar exactamente los registros de envío DKIM/SPF/MX que indique el proveedor a la zona DNS de Hostinger. Conservar A @ y CNAME www existentes, así como registros de correo existentes. No habilitar recepción ni sustituir MX del dominio raíz para enviar notificaciones.
2. Verificar el dominio en Resend. Desactivar seguimiento de enlaces y aperturas: el enlace al pedido contiene una credencial privada.
3. Crear una API key con permiso Sending access, restringida al dominio. Guardarla directamente en Render > servicio cifraya > Environment como RESEND_API_KEY. No pegarla en chats, Git ni variables VITE.
4. Configurar EMAIL_FROM=Vnova TCG <pedidos@vnovatcg.com> y PUBLIC_APP_URL=https://vnovatcg.com. Guardar y desplegar.
5. Con una reserva propia y un destinatario autorizado, comprobar aprobación y rechazo con motivo (pedidos separados). Verificar bandeja/spam y evento Delivered en Resend. No aprobar compras reales solo para probar correos.

## Operación

La decisión de pago y la notificación se guardan en la misma transacción. El envío sucede después. No se generan correos retroactivos para decisiones anteriores a esta integración. Si falta configuración, las nuevas decisiones quedan pendientes y se envían al configurarla.

Cola persistente EmailNotification; clave única por reserva/tipo. Un proceso atiende hasta diez correos por minuto y al aprobar/rechazar; pausa 600 ms entre solicitudes. Reintentos exponenciales de fallos de red, HTTP 408/429/5xx, máximo doce intentos y ventana de 23 horas desde el primer intento. Clave de idempotencia y contenido/remitente estables durante los reintentos. Tras reinicio, una concesión expira en dos minutos. No requiere otro servicio de pago.

SENT significa aceptado por Resend, no entregado. Revisar rebotes/entrega en Resend. FAILED requiere inspección por administrador; no resetear registros ni reenviar ciegamente, especialmente al vencer las 24 horas de idempotencia del proveedor. El panel privado muestra estado y código técnico sin exponer el contenido ni enlace privado.

Render debe estar activo para procesar la cola: el plan gratuito puede dormir y retrasar reintentos. Controlar cuotas del proveedor. Los mensajes se conservan en PostgreSQL e incluyen información privada: restringir acceso y definir retención según operación. El remitente no crea un buzón para recibir respuestas.

Pruebas automatizadas usan un proveedor simulado y no envían correo real. La activación y entrega real se verifican después de DNS y secretos.
`POST /api/admin/email-tests` permite una pareja de mensajes de diagnóstico con correo autorizado y requestId UUID. Requiere sesión admin, máximo cinco parejas/hora, reintentos con el mismo UUID no duplican mensajes. No crea pedidos, boletos ni pagos. GET del mismo recurso con UUID muestra aceptación/error. Los mensajes se identifican [PRUEBA] y no contienen enlaces privados de pedido.
También se encolan RESERVED al crear la reserva y PENDING_REVIEW al adjuntar el primer comprobante. Ambos eventos se guardan dentro de su transacción y usan la unicidad por reserva/tipo. Los comprobantes adicionales no repiten el correo de revisión. La reserva inicial explica que falta el comprobante; no afirma que el pago ya fue recibido.
El diagnóstico admite group=reservation para probar RESERVED y PENDING_REVIEW; por defecto group=payment prueba aprobación y rechazo. El mismo límite global de cinco parejas por hora aplica a ambos grupos.
