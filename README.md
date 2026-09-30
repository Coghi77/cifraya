# Kogi Rifas

Proyecto local e independiente de Alessandro Kogi. Esta carpeta no pertenece a Autoids, Autovoid ni V ONE B. No tiene configuración de despliegue ni credenciales de servicios externos.

## Estado

**Fase 1 en desarrollo local:** campaña de prueba, panel local para crear y publicar campañas, inventario de números y reservas de 30 minutos. **No se reciben pagos ni comprobantes.** La UI señala expresamente que es una demostración.

## Arranque local

Requisitos: Node.js 20+, pnpm 9+ y Docker Desktop.

1. Copiar `.env.example` como `.env` y sustituir `ADMIN_TOKEN` por una cadena aleatoria de al menos 24 caracteres.
2. Ejecutar `pnpm install`.
3. Ejecutar `docker compose up -d` desde esta carpeta.
4. Ejecutar `pnpm db:generate`, `pnpm db:migrate` y `pnpm db:seed`.
5. Ejecutar `pnpm dev`.
6. Abrir `http://127.0.0.1:4173`. La API escucha solo en `127.0.0.1:4100`.

El panel local pide el valor de `ADMIN_TOKEN`. No se guarda en el navegador. Esta clave temporal se sustituirá por cuentas con permisos antes de cualquier despliegue.

## Diseño

Sitio público claro y limpio, con material translúcido solo en navegación y detalles visuales. Selección de números, datos y estados usan superficies sólidas. El panel local usa superficies oscuras de alto contraste.

## Fases

Ver [docs/FASES.md](docs/FASES.md) para alcance, criterios de cierre y decisiones pendientes.
