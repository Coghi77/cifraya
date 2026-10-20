# Revisión móvil y seguridad — 2026-10-20

## Cambios de experiencia móvil
- Fotos de altura contenida (230–320 px), sin recorte y con galería ampliable.
- Dos tarjetas por fila (una en pantallas menores de 360 px), precios visibles, contraste corregido en Inicio y botones de al menos 44 px en los controles principales.
- Acceso directo a compra desde detalle. Desplazamiento hacia selección manual, números generados y reserva, dejando espacio para el encabezado fijo.
- Formulario de reserva en dialog nativo: foco contenido, Escape, recuperación del foco y bloqueo del scroll de fondo. Campos de 16 px, autocompletado y teléfono con teclado adecuado; errores dentro del formulario.

## Validación ejecutada
- Compilación TypeScript y Vite, API y web: correcta.
- pnpm test:production: 29 pruebas API y 1 de eventos web, todas pasan.
- pnpm audit --prod: ninguna vulnerabilidad conocida reportada al ejecutar.
- scripts/reservation-audit.mjs: PostgreSQL temporal, dos procesos API, correos desactivados, sin tocar producción.
- 12 propuestas y 12 intentos de reserva sobre el mismo número: solo una reserva aceptada; 234 ms para la secuencia local de concurrencia. Es una medición local, no capacidad garantizada en Render.
- 30 selecciones mixtas manual/aleatorio: 40 números concedidos, todos únicos.
- Vencimientos de selección y reserva, liberación, comprobante tardío, retención durante revisión, exclusión de vendidos, inversos y rollback de conflictos: pasan.
- 20 rutas admin: sin sesión y con token falsificado devuelven 401; no-store, PIN con límite de intentos, origen externo, imágenes falsas y cadena de inyección: pasan.
- Privacidad de consultas y listado de números, precio calculado por servidor, snapshots de compras previas, rechazo de precio desactualizado y aislamiento de rifas técnicas: pasan.
- Inventario de 100.000 números y reglas JPS: pasan (2.375 ms en el entorno local).
- Navegador a 320×740 y 390×844: formulario sin desbordamiento horizontal, selección manual de dos números, cierre con Escape y restauración de foco. Reserva aleatoria sintética completada con total CRC 2.000 y plazo de 30 minutos. No se enviaron correos.

## Alcance y límites
Esta es una revisión del código y de las rutas de la aplicación, con pruebas automatizadas y de navegador. No certifica ausencia de vulnerabilidades ni sustituye una auditoría independiente. No se hicieron ataques de carga contra producción ni se revisaron permisos internos de las cuentas Render/Supabase/Resend. La vista móvil usa dimensiones emuladas; teclado virtual, cámara y Safari/iOS requieren validación adicional en dispositivos físicos.

Riesgos operativos identificados: el PIN de seis dígitos usa un límite en memoria por IP; no es un control distribuido entre réplicas y el proxy puede agrupar usuarios. Las rutas públicas de selección/reserva no tienen controles antiautomatización distribuidos: un bot con múltiples sesiones podría ocupar inventario temporal y consumir recursos/correos. Conviene endurecer esos controles antes de campañas de alto tráfico; no se cambiaron políticas de proxy ni límites que pudieran bloquear compradores legítimos sin medir su impacto.
