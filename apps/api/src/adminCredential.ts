import { createHash, timingSafeEqual } from 'node:crypto';

export function validAdminCredential(input: unknown, env: { ADMIN_PASSWORD?: string; ADMIN_PIN?: string }) {
  const expected = env.ADMIN_PASSWORD ?? env.ADMIN_PIN;
  if (typeof input !== 'string' || !expected || input.length > 128) return false;
  // A configured password takes precedence: never fall back to the old PIN.
  if (env.ADMIN_PASSWORD !== undefined && (expected.length < 20 || expected.length > 128)) return false;
  if (env.ADMIN_PASSWORD === undefined && !/^\d{6}$/.test(expected)) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(input), digest(expected));
}
