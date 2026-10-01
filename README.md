# Cifraya

Proyecto independiente de Alessandro Kogi. Esta carpeta no pertenece a Autoids, Autovoid ni V ONE B. Incluye configuración opcional para una demo gratuita en Render, sin credenciales en el repositorio.

## Estado

**Fase 1 para pruebas:** el inicio muestra la rifa activa; la navegación pública ofrece Inicio, Buscar boletos y Ganadores. Buscar boletos consulta una reserva mediante el código privado entregado al apartar números. Ganadores muestra un estado vacío hasta que existan sorteos verificados. El panel para crear y publicar rifas, revisar números y reservas de 30 minutos tiene una ruta directa fuera de la navegación pública y sigue exigiendo `ADMIN_TOKEN`. **No se reciben pagos ni comprobantes ni se muestran compras confirmadas.**

## Arranque local

Requisitos: Node.js 20+, pnpm 9+ y Docker Desktop.

1. Copiar `.env.example` como `.env` y sustituir `ADMIN_TOKEN` por una cadena aleatoria de al menos 24 caracteres.
2. Ejecutar `pnpm install`.
3. Ejecutar `docker compose up -d` desde esta carpeta.
4. Ejecutar `pnpm db:generate`, `pnpm db:migrate` y `pnpm db:seed`.
5. Ejecutar `pnpm dev`.
6. Abrir `http://127.0.0.1:4173`. La API escucha solo en `127.0.0.1:4100`.

El panel de prueba pide el valor de `ADMIN_TOKEN`. No se guarda en el navegador. La ruta directa solo facilita el acceso al dueño; no es una medida de seguridad por sí misma. Esta clave temporal se sustituirá por cuentas con permisos antes de usar el sistema con participantes reales.

## Demo en línea sin costo

El archivo `render.yaml` prepara **un solo Web Service Free** de Render para la web y la API. La base de datos de prueba puede ser un proyecto **Free** de Supabase. No añadir tarjeta ni activar planes o complementos pagos. Esta configuración es solo para pruebas: Render puede dormir el servicio tras 15 minutos sin visitas y Supabase puede pausar proyectos inactivos. No se deben usar datos personales reales ni cobrar participaciones.

1. Crear un proyecto Free en Supabase con una cuenta propia. En **Connect**, copiar la cadena **Session pooler** (puerto `5432`); sustituir `[YOUR-PASSWORD]` por la contraseña de la base, codificando caracteres especiales si hace falta. Guardarla solo en Render como `DATABASE_URL`.
2. En Render, conectar el repositorio `Coghi77/cifraya` y crear un **Blueprint** desde `render.yaml`. Comprobar que el único servicio tenga plan **Free**. Render solicitará `DATABASE_URL` durante la creación y generará `ADMIN_TOKEN`.
3. El comando de arranque aplica las migraciones existentes y luego inicia la web y la API. Abrir la URL `onrender.com` que asigne Render y comprobar `/api/health`.
4. Para crear rifas de prueba, consultar `ADMIN_TOKEN` en el panel de variables de Render y pegarlo en el panel de la demo. No compartirlo ni ponerlo en GitHub. Si se creó como Web Service desde la URL pública del repositorio, se debe ejecutar un despliegue manual para aplicar nuevos commits.

No se crea una base de datos Free de Render porque caduca a los 30 días. Si Render o Supabase piden pasar a un plan pago, detener la configuración y mantener la demo local. Los límites gratuitos pueden cambiar; revisarlos en cada panel antes de crear recursos.

## Diseño

Identidad editorial con azul tinta, coral, lima y papel cálido. La selección de números usa estados contrastados y el pase visual muestra nombre, cantidad de boletos, números y vencimiento. El panel de operación usa superficies oscuras de alto contraste.

## Fases

Ver [docs/FASES.md](docs/FASES.md) para alcance, criterios de cierre y decisiones pendientes.
