import type { FastifyInstance } from 'fastify';

const origin = 'https://vnovatcg.com';
type Campaign = { slug: string; status: string; isTest: boolean };
const xml = (value: string) => value.replace(/[<>&"']/g, char => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!));

export function sitemap(campaigns: Campaign[], comingSoon: boolean) {
  const paths = comingSoon ? ['/'] : ['/', '/ganadores', ...campaigns.filter(c => c.status === 'LIVE' && !c.isTest).map(c => `/rifa/${encodeURIComponent(c.slug)}`)];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    [...new Set(paths)].map(path => `<url><loc>${xml(origin + path)}</loc></url>`).join('') + '</urlset>';
}

export function registerSeo(app: FastifyInstance, load: () => Promise<{campaigns: Campaign[]; comingSoon: boolean}>) {
  app.get('/robots.txt', async (_request, reply) => reply.type('text/plain; charset=utf-8').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`
  ));
  app.get('/sitemap.xml', async (_request, reply) => {
    const {campaigns, comingSoon} = await load();
    return reply.type('application/xml; charset=utf-8').header('Cache-Control','no-cache').send(sitemap(campaigns, comingSoon));
  });
}
