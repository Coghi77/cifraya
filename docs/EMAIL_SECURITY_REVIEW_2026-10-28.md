# Correos y revisión funcional — 28 de octubre de 2026

## Cambios
- Plantilla compartida clara: cuerpo blanco, encabezado negro, marca naranja y botones azules biselados de estética pixel.
- Aplicada a reserva, comprobante en revisión, aprobación (SINPE y efectivo) y rechazo.
- El enlace «Copiar código de consulta» abre `/pedido?copiar=1#TOKEN`; la página permite copiar con un toque. Los clientes de correo no permiten JavaScript de portapapeles.
- El token permanece en el fragmento, no en ruta ni query. El detalle se obtiene con la API privada por código. No compartir estos enlaces: quien tiene el código puede consultar el pedido.
- Las fotos subidas y comprobantes se almacenan como bytes en PostgreSQL/Supabase; Render sirve las respuestas. No se almacenan en Cloudflare ni en el disco de Render.

## Evidencia de validación
- Suite de producción: 38 pruebas API y 1 web aprobadas, compilaciones API/web correctas.
- Nueva prueba de enlaces: aprobada para las cuatro variantes; origen HTTPS, token fuera de ruta/query y contenido escapado.
- Auditoría de dependencias de producción: 0 vulnerabilidades conocidas entre 295 dependencias.
- Auditoría de integración sobre PostgreSQL local desechable: reservas, vencimientos, comprobantes, precios históricos, efectivo/SINPE, Excel, premios, permisos y validaciones aprobados.
- 24 rutas administrativas rechazaron solicitudes sin autorización o con autorización falsificada.
- Concurrencia: 12 solicitudes sobre el mismo número produjeron una sola reserva (227 ms en el entorno local). Selección mixta manual/aleatoria: 42 números únicos sin duplicación.
- Revisados límites de intentos de PIN, CORS, cabeceras de seguridad, caché privada, rechazo de imágenes inválidas y datos de inyección.
- Vista local de correo revisada en escritorio y ancho móvil 390 px, sin desbordamiento horizontal. Botón de copia probado en navegador: texto copiado coincide con los 48 caracteres del código ficticio.

## Límites
No se modificaron compras reales. La integración se probó en una base local aislada; sus tiempos no representan carga de producción. No es una auditoría independiente ni una garantía de ausencia de vulnerabilidades. La renderización en todas las versiones de Gmail, Outlook y Apple Mail y las combinaciones de dispositivos no está cubierta por esta revisión. Los registros detallados locales están en `tmp/production-review.log`, `tmp/integration-review.log` y `tmp/dependency-review.json`.
