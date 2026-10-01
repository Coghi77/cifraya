import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_LIFETIME_MS = 8 * 60 * 60_000;

export function issueAdminSession(secret: string, now = Date.now()): string {
  if (secret.length < 24) throw new Error('ADMIN_TOKEN_NOT_CONFIGURED');
  const payload = `v1.${now + SESSION_LIFETIME_MS}.${randomBytes(16).toString('hex')}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifyAdminSession(token: string, secret: string | undefined, now = Date.now()): boolean {
  if (!secret || secret.length < 24) return false;
  const match = /^v1\.(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + SESSION_LIFETIME_MS) return false;
  const payload = `v1.${match[1]}.${match[2]}`;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const received = Buffer.from(match[3], 'hex');
  return timingSafeEqual(received, expected);
}
