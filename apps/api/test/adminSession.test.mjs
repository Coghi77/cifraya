import assert from 'node:assert/strict';
import test from 'node:test';
import { issueAdminSession, verifyAdminSession } from '../dist/adminSession.js';

const secret = 'local-test-secret-with-at-least-24-characters';
const now = Date.UTC(2026, 9, 1, 12, 0, 0);

test('admin session remains valid when verified by a fresh instance with the same secret', () => {
  const token = issueAdminSession(secret, now);
  assert.equal(verifyAdminSession(token, secret, now + 60_000), true);
  assert.equal(verifyAdminSession(token, secret, now + 8 * 60 * 60_000), false);
});

test('admin session rejects tampering and a different server secret', () => {
  const token = issueAdminSession(secret, now);
  assert.equal(verifyAdminSession(token, 'different-server-secret-with-at-least-24-characters', now), false);
  assert.equal(verifyAdminSession(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'), secret, now), false);
  assert.equal(verifyAdminSession(secret, secret, now), false);
});
