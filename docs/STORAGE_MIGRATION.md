# Almacenamiento: preparación y corte

Estado 2026-10-29: bucket privado `vnova-media` creado en Cloudflare. Credenciales guardadas en el servicio correcto de Render. Integración local validada; pendiente activarla, copiar archivos y migrar PostgreSQL. No interpretar este documento como confirmación de corte completado.

## R2

- `MEDIA_STORAGE` omitido o `database`: escritura y lectura histórica en PostgreSQL.
- `MEDIA_STORAGE=r2`: nuevas fotos y comprobantes en R2 privado, con claves aleatorias, checksum SHA-256 y límite de tamaño.
- Variables privadas: `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Nunca usar prefijo VITE ni publicar el bucket.
- La API conserva las reglas de acceso: fotos solo de rifas públicas LIVE; comprobantes solo con sesión de administración. Una falla de R2 no guarda una referencia sin archivo.
- Migración SQL aditiva: conserva bytes existentes. Desplegar primero con almacenamiento database.
- Copiar históricos con `node scripts/migrate-media-r2.mjs` y las variables R2 presentes, después de compilar y aplicar la migración. Verifica cada objeto remoto, guarda clave/hash y retiene los bytes originales. Es reanudable. No elimina objetos ni bytes.
- La lectura prioriza los bytes históricos mientras existan. Para retirar esos bytes se requiere respaldo probado, validación de todas las copias y una operación posterior explícita. No se purgan en esta fase.
- Una escritura R2 seguida por un conflicto de base puede dejar un objeto huérfano. No ejecutar limpiezas generales del bucket: reconciliar claves contra ambas tablas antes de cualquier borrado.

## PostgreSQL en Render

1. Crear instancia en el mismo workspace y región Oregon del servicio `cifraya`. Confirmar precio/plan antes de contratar.
2. Respaldar PostgreSQL origen con pg_dump y verificar pg_restore --list. Guardar respaldo fuera de Git.
3. Restaurar en instancia vacía; comparar tablas, cantidades, secuencias, fotos/comprobantes y restricciones.
4. Para corte final, suspender escrituras de TODAS las rutas y trabajadores. La pantalla «Próximamente» NO equivale a congelación completa: no bloquea comprobantes ni administración.
5. Hacer respaldo final y restauración mientras la aplicación está detenida. Configurar DATABASE_URL interna de Render y redes externas restringidas según necesidad de administración.
6. Arrancar, probar lectura privada/pública, subida controlada, reservas y aprobación en datos de prueba; comprobar colas de correo para evitar reenvíos.
7. Conservar Supabase y respaldo como retorno. Si se admitieron nuevas escrituras en destino, no volver al origen antiguo sin reconciliarlas.

## Validación local

43 pruebas API y una prueba web pasan; build de producción pasa. Incluye compatibilidad con bytes históricos, configuración inválida, round-trip R2 simulado, checksum alterado y rechazo de claves de objeto inválidas. Aún se requiere prueba contra R2 real y verificación del despliegue.
