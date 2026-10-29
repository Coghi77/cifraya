# Revisión de reservas y carga — 2026-10-28

## Hallazgos corregidos
- No existía acción para cancelar una reserva sin comprobante. Se agregó acción autenticada con motivo y liberación atómica.
- La revisión dependía de eventos para refrescar. Se agregó respaldo visible cada 20 segundos.
- Inicio descargaba código administrativo y pedidos sin necesitarlos; carga ahora por módulos.
- Fotos secundarias competían inicialmente con la principal; precarga diferida de baja prioridad.
- Lectura pública del interruptor Próximamente comparte caché de 2 segundos. El bloqueo de compras consulta directamente el estado persistente.

## Evidencia
- 41 pruebas API y 1 web aprobadas; compilación API/web aprobada.
- Auditoría aislada PostgreSQL y dos procesos API aprobada: 12 solicitudes simultáneas sobre la misma selección producen una reserva; selección manual/aleatoria sin duplicados; vencimiento de 30 minutos; comprobante tardío rechazado; revisión conserva números; cancelación duplicada produce una sola liberación/correo; cancelación y comprobante concurrentes no dejan estados incoherentes; confirmados protegidos.
- Seguridad aislada: 25 rutas administrativas, sesión inválida, consulta privada, precios manipulados, imagen falsa, CORS y limitación de login.
- JavaScript principal: 398.49 KB a aproximadamente 318 KB; gzip 114.03 KB a aproximadamente 98 KB. Es una medición del build, no una garantía de tiempo percibido en redes móviles.
- No se modificaron compras reales ni se enviaron correos de prueba reales. Historial cancelado/vencido se conserva; solo números se liberan.

## Límites
La disponibilidad de Render y la latencia de Supabase/red siguen afectando tiempos. No se ejecutó carga masiva contra producción. Las pruebas no garantizan ausencia absoluta de bugs.
