# Cifraya

Proyecto independiente de Alessandro Kogi. Esta carpeta no pertenece a Autoids, Autovoid ni V ONE B. Incluye configuración opcional para una demo gratuita en Render, sin credenciales en el repositorio.

## Estado

El inicio muestra la rifa activa; la navegación pública ofrece Inicio, Buscar boletos y Ganadores. Las rifas con menos de 200 números permiten escogerlos; desde 200 números el servidor propone números disponibles al azar y permite cinco cambios por selección. Los paquetes ajustan automáticamente el precio según la cantidad. Los números se apartan durante 30 minutos; el comprador puede adjuntar hasta tres imágenes de su comprobante SINPE al reservar o durante ese plazo. Al recibirlo, la reserva pasa a revisión y los números permanecen apartados hasta que administración confirme o rechace el pago.

El panel, accesible por una ruta directa y protegido con `ADMIN_PIN`, muestra compradores, números, monto y comprobantes. La confirmación marca los números como vendidos; el rechazo exige un motivo y los libera. Buscar boletos consulta el estado mediante el código privado. Ganadores publica el resultado cuando administración selecciona un número vendido. Las vistas se actualizan mediante eventos del servidor y consultas periódicas de respaldo, sin depender de una recarga manual.

La verificación de SINPE es **manual**: una imagen no prueba por sí sola que el dinero llegó. Antes de confirmar, administración debe cotejar el pago en su cuenta. Los comprobantes se guardan en PostgreSQL, por lo que conviene vigilar la capacidad de Supabase.

Cada rifa admite hasta cinco fotos del premio. El panel permite cargarlas al crear el borrador o después, y eliminarlas. La primera foto es la portada; las demás aparecen en la galería de la rifa. El navegador reduce cada imagen a un máximo de 1600 píxeles y el servidor limita cada archivo guardado a 2 MB. Se almacenan en PostgreSQL para que no desaparezcan cuando Render reinicie el servicio; conviene vigilar el espacio disponible en el plan gratuito de Supabase.

## Arranque local

Requisitos: Node.js 20+, pnpm 9+ y Docker Desktop.

1. Copiar `.env.example` como `.env`, asignar un PIN de seis dígitos a `ADMIN_PIN` y sustituir `ADMIN_TOKEN` por una cadena aleatoria de al menos 24 caracteres.
2. Ejecutar `pnpm install`.
3. Ejecutar `docker compose up -d` desde esta carpeta.
4. Ejecutar `pnpm db:generate`, `pnpm db:migrate` y `pnpm db:seed`.
5. Ejecutar `pnpm dev`.
6. Abrir `http://127.0.0.1:4173`. La API escucha solo en `127.0.0.1:4100`.

El panel pide `ADMIN_PIN` y entrega una sesión firmada de ocho horas con `ADMIN_TOKEN`, que sigue siendo válida si el servidor se reinicia. El PIN no se guarda en el navegador. Si la sesión vence mientras se prepara una rifa, el panel vuelve a pedirlo y conserva el borrador en la pestaña. Tras cinco intentos fallidos desde una dirección IP se bloquea el acceso durante 15 minutos. La ruta directa solo facilita el acceso al dueño; no es una medida de seguridad por sí misma. Antes de usar el sistema con participantes reales, conviene sustituir el PIN por cuentas con permisos y autenticación más fuerte.

## Entorno en línea gratuito

El archivo `render.yaml` prepara **un solo Web Service Free** de Render para la web y la API. La base de datos puede ser un proyecto **Free** de Supabase. Esta configuración no garantiza disponibilidad 24/7: Render duerme el servicio tras un período sin visitas y Supabase puede pausar proyectos inactivos. Para operar con clientes reales se necesita infraestructura con disponibilidad, respaldo y capacidad acordes al volumen.

1. Crear un proyecto Free en Supabase con una cuenta propia. En **Connect**, copiar la cadena **Session pooler** (puerto `5432`); sustituir `[YOUR-PASSWORD]` por la contraseña de la base, codificando caracteres especiales si hace falta. Guardarla solo en Render como `DATABASE_URL`.
2. En Render, conectar el repositorio `Coghi77/cifraya` y crear un **Blueprint** desde `render.yaml`. Comprobar que el único servicio tenga plan **Free**. Render solicitará `DATABASE_URL` y `ADMIN_PIN` durante la creación y generará `ADMIN_TOKEN`.
3. El comando de arranque aplica las migraciones existentes y luego inicia la web y la API. Abrir la URL `onrender.com` que asigne Render y comprobar `/api/health`.
4. Si el servicio ya existe, agregar `ADMIN_PIN` en **Render → Environment** con el valor deseado. No escribir el PIN en GitHub. Luego ejecutar un despliegue manual para aplicar los nuevos commits. El panel pedirá ese PIN.

No se crea una base de datos Free de Render porque caduca a los 30 días. Si Render o Supabase piden pasar a un plan pago, detener la configuración y mantener la demo local. Los límites gratuitos pueden cambiar; revisarlos en cada panel antes de crear recursos.

## Diseño

Identidad en blanco y negro con superficies oscuras para el panel. El pase visual muestra nombre, cantidad de boletos, números y estado de la reserva.

## Fases

Ver [docs/FASES.md](docs/FASES.md) para alcance, criterios de cierre y decisiones pendientes.
