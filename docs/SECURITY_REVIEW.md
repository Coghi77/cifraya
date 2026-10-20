# Revisión funcional y de seguridad — 19 de octubre de 2026

## Comprobaciones realizadas
- pnpm test:production: 25 pruebas aprobadas y compilación API/web correcta.
- pnpm audit --prod: sin vulnerabilidades conocidas reportadas por el registro en esta ejecución.
- node scripts/reservation-audit.mjs: PostgreSQL aislado, dos procesos API; 12 intentos simultáneos por el mismo número y 30 selecciones mixtas sin duplicidad entre selecciones aceptadas. Verifica TTL, liberación, inversos, comprobantes, aprobación y cola de correo.
- scripts/security-audit.mjs (invocado por la auditoría): 18 rutas administrativas rechazan sesiones ausentes/manipuladas; datos privados no cacheados; creación y edición de 10/20 premios; publicación; reglas económicas inmutables al publicar; rechazo de ganador no vendido, robo de selección, precio manipulado, token malformado y archivos falsos. Rechazo de pago libera boletos una sola vez y encola su correo. Privacidad del listado de números y pedido; CSP, nosniff, anti-framing, CORS y límite de intentos de PIN.
- Navegador local: entrada al panel con PIN ficticio, cambio entre secciones y persistencia del texto del borrador, tarjetas y formulario ampliados.

## Corrección
Los fallos no controlados ya no devuelven diagnósticos internos al cliente. Identificadores únicos duplicados responden 409 con mensaje seguro.

## Alcance
Las operaciones de prueba usan una base temporal, sin compras reales ni envío de correos. Esta revisión no certifica ausencia de toda vulnerabilidad: no incluye pentest externo independiente, configuración privada de Supabase/Render, recuperación de respaldos ni carga real de producción. SSE y límite de PIN son locales a cada proceso; antes de múltiples réplicas requieren coordinación compartida (docs/PRODUCTION.md).
