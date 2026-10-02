import { z } from 'zod';

// One distinct winning ticket per position; the inventory bounds the list.
export const prizeList = z.array(z.string().trim().min(3).max(200)).min(1).max(10_000);

export function normalizePrizeInput(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const data = input as Record<string, unknown>;
  if (data.prizes !== undefined) return data;
  const count = data.prizeCount ?? 1;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 3) return data;
  return { ...data, prizes: [data.prize, data.secondPrize, data.thirdPrize].slice(0, count) };
}
