import { z } from 'zod';
import { reverseNumber } from './invertedNumbers.js';

// One distinct winning ticket per position; the inventory bounds the list.
export const prizeList = z.array(z.string().trim().min(3).max(200)).min(1).max(10_000);

export function validPrizeSources(prizes: string[], sources: number[]) {
  return prizes.length === sources.length && sources.every((source, index) =>
    Number.isInteger(source) && source >= 0 && source <= index && (source === 0 || sources[source - 1] === 0));
}

export function inversePrizeNumber(sources: number[], position: number, width: number, winners: { position: number; numberValue: number }[]) {
  const source = sources[position - 1] || 0;
  if (!source) return null;
  const direct = winners.find(winner => winner.position === source);
  if (!direct) throw new Error('DIRECT_RESULT_REQUIRED');
  return reverseNumber(direct.numberValue, width);
}

export function normalizePrizeInput(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const data = input as Record<string, unknown>;
  if (Array.isArray(data.prizes)) return { ...data, prizeSources: data.prizeSources ?? data.prizes.map(() => 0) };
  if (data.prizes !== undefined) return data;
  const count = data.prizeCount ?? 1;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 3) return data;
  return { ...data, prizes: [data.prize, data.secondPrize, data.thirdPrize].slice(0, count), prizeSources: Array(count).fill(0) };
}
