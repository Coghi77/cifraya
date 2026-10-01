import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerSecurityHeaders } from '../dist/security.js';

test('public responses forbid framing and MIME sniffing', async () => {
  const app = Fastify();
  registerSecurityHeaders(app, true);
  app.get('/', async () => ({ ok: true }));
  const response = await app.inject('/');
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['x-frame-options'], 'DENY');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.match(response.headers['strict-transport-security'], /max-age=31536000/);
  await app.close();
});

test('admin responses cannot be cached', async () => {
  const app = Fastify();
  registerSecurityHeaders(app, false);
  app.get('/api/admin/private', async () => ({ secret: 'example' }));
  const response = await app.inject('/api/admin/private');
  assert.equal(response.headers['cache-control'], 'private, no-store');
  assert.equal(response.headers['strict-transport-security'], undefined);
  await app.close();
});
