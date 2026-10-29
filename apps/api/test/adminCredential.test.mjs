import test from 'node:test';
import assert from 'node:assert/strict';
import { validAdminCredential } from '../dist/adminCredential.js';

test('password takes precedence and rejects old PIN and wrong lengths', () => {
  const env = { ADMIN_PASSWORD: 'Test-Only-Password-987654!', ADMIN_PIN: '123456' };
  assert.equal(validAdminCredential(env.ADMIN_PASSWORD, env), true);
  for (const value of ['123456', '', 'wrong', undefined, 'x'.repeat(129)]) assert.equal(validAdminCredential(value, env), false);
  assert.equal(validAdminCredential('short', { ADMIN_PASSWORD: 'short', ADMIN_PIN: '123456' }), false);
});
test('legacy access works only until a password is configured', () => {
  assert.equal(validAdminCredential('123456', { ADMIN_PIN: '123456' }), true);
  assert.equal(validAdminCredential('123456', { ADMIN_PASSWORD: '', ADMIN_PIN: '123456' }), false);
  assert.equal(validAdminCredential('123456', {}), false);
});
