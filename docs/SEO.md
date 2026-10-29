# SEO — preparación local

Estos ajustes no agregan texto visible ni cambian el diseño. No están publicados automáticamente: requieren un despliegue posterior autorizado.

- El HTML incluye descripción y metadatos para compartir.
- `/robots.txt` indica el sitemap. No bloquea el rastreo de las páginas con `noindex`, para que el buscador pueda leer esa instrucción.
- `/sitemap.xml` lista inicio, ganadores y rifas LIVE que no sean pruebas. Con Próximamente activo lista solamente inicio.
- Administración, pedidos, búsqueda de boletos y API llevan `X-Robots-Tag: noindex, nofollow`. Esto no sustituye los controles de acceso.
- La aplicación sigue renderizando su contenido mediante JavaScript; estos cambios no implementan SSR ni garantizan indexación.

## Activación posterior

1. Publicar los cambios en Render cuando el usuario lo autorice.
2. En Google Search Console agregar una propiedad de dominio `vnovatcg.com`.
3. Verificarla con el TXT exacto que Google entregue, en el proveedor de DNS autoritativo. Usar R2 no significa que Cloudflare gestione el DNS.
4. Enviar `https://vnovatcg.com/sitemap.xml`.
5. Inspeccionar `https://vnovatcg.com/`, probar la URL publicada y solicitar indexación. Revisar el HTML renderizado y las exclusiones que informe Google.

Search Console requiere acceso a la cuenta del propietario; no se ha configurado desde esta tarea. Google determina cuándo y si indexa las páginas.
