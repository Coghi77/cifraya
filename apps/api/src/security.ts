import type { FastifyInstance } from 'fastify';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "font-src 'self' data:",
].join('; ');

export function registerSecurityHeaders(app: FastifyInstance, production: boolean) {
  app.addHook('onRequest', (request, reply, done) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    reply.header('Content-Security-Policy', contentSecurityPolicy);
    if (production) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (request.url.startsWith('/api/admin/')) {
      reply.header('Cache-Control', 'private, no-store');
    }
    done();
  });
}
