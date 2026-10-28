# Revisión de estilos, correos y regresión — 27/10/2026

## Entregado
- Registrar venta: formulario sobre el fondo del modal, sin tarjeta exterior. Conserva bloqueo de desplazamiento, validaciones y confirmación de efectivo.
- Excel: las tres hojas comparten morado, turquesa y tipografía legible. Mantiene importes numéricos, fechas de Costa Rica, filtros, encabezados congelados y separación Efectivo/SINPE. No modifica precios históricos.
- Correos: plantilla común oscura con encabezado, números destacados, separación tipo boleto y botón retro. Cubre reserva/revisión combinada, aprobación, rechazo y aprobación de efectivo; también las vistas diagnósticas. Los mensajes ya enviados no cambian.
- Ganadores: retirado marco exterior; trofeos oro/plata/cobre, primer puesto destacado, presentación individual para rifas de un premio y distribución vertical móvil.

## Fallos y detalles corregidos
- La fecha del resultado dependía de la zona horaria del dispositivo. Ahora se presenta en America/Costa_Rica.
- Los estilos globales de botones aplicaban recorte pixelado al podio completo. Se excluyó ese componente para evitar recortes y conservar la jerarquía.
- Las tarjetas de podio en tres columnas resultaban demasiado estrechas en móvil. Se apilan con el primer premio arriba.
- Un resultado sin boleto vendido se identifica explícitamente como sin ganador.

## Verificación
- 38 pruebas API y 1 prueba de sincronización web: 39 aprobadas.
- TypeScript API/web, Vite y generación Prisma: correctos.
- Auditoría de dependencias de producción: cero vulnerabilidades conocidas.
- Prueba con PostgreSQL aislado: 12 selecciones concurrentes del mismo número, una selección aceptada; 12 envíos simultáneos de esa reserva, una reserva creada. Tiempo de la tanda de reservas: 43 ms en local.
- También comprobados en base aislada: plazo de 30 minutos, exclusión manual/aleatoria de números ocupados, carga de comprobantes sin correo duplicado, mantenimiento de reserva en revisión, rechazo de comprobante vencido, liberación al vencer, exclusión de números vendidos, rollback de grupos, duplicados/rango y prefijos con ceros.
- El guion local antiguo esperaba un segundo correo al subir comprobante y permitía propuestas solapadas. Se ajustó el guion a las reglas vigentes; no se modificó la lógica de reservas para hacerlo pasar.
- Excel leído de vuelta: resumen coincide con hojas, montos son números, nombres que empiezan por '=' permanecen texto y fechas usan UTC-6; casos con ventas y sin ventas.
- Muestras HTML de los cuatro tipos de correo, revisión visual de correo y podio en escritorio y 390 px; no se enviaron correos a clientes.
- Producción, solo lectura: inicio, búsqueda, ganadores, rifa, salud, disponibilidad DB, campañas y resultados: HTTP 200. Listado admin y Excel sin sesión: HTTP 401.
- Latencias observadas de esas consultas: 177–705 ms, incluyendo red; no equivalen a carga masiva ni experiencia de todos los usuarios.

## Límites y pendientes de verificación
- No puede afirmarse que no exista ningún bug: faltan pruebas exhaustivas de todos los dispositivos, combinaciones y recorridos administrativos.
- Los correos requieren una comprobación real en Gmail/Outlook para confirmar particularidades de cada cliente. Las pruebas actuales son HTML y lógica de envío con proveedor simulado; no se enviaron nuevos mensajes sin pedirlo.
- No se hicieron compras, publicaciones de ganadores ni modificaciones a registros reales durante la auditoría.
- La sesión administrativa usa tokens con vencimiento; cerrar sesión borra el acceso del navegador, pero un token previamente copiado permanece válido hasta su vencimiento. Una revocación centralizada exige un cambio de autenticación adicional.
- No se ejecutó carga masiva contra Render. Las pruebas concurrentes se hicieron en una base local aislada.
