import { randomInt } from 'node:crypto';

export function reverseNumber(value: number, width: number) {
  return Number(String(value).padStart(width, '0').split('').reverse().join(''));
}

export function invertedValues(base: number[], width: number, available: Set<number>) {
  const original = new Set(base);
  const reversed = base.map(value => reverseNumber(value, width));
  if (reversed.some(value => original.has(value) || !available.has(value))) return null;
  if (new Set(reversed).size !== reversed.length) return null;
  return reversed;
}

export function chooseBaseNumbers(available: number[], count: number, width: number, preferInverted: boolean) {
  if (available.length < count) return null;
  const availableSet = preferInverted ? new Set(available) : null;
  const pool = preferInverted
    ? available.filter(value => value !== reverseNumber(value, width) && availableSet!.has(reverseNumber(value, width)))
    : [...available];
  const picked: number[] = [];
  const used = new Set<number>();
  for (let index = 0; index < pool.length && picked.length < count; index++) {
    const chosen = randomInt(index, pool.length);
    [pool[index], pool[chosen]] = [pool[chosen], pool[index]];
    const value = pool[index];
    if (used.has(value)) continue;
    picked.push(value);
    used.add(value);
    if (preferInverted) used.add(reverseNumber(value, width));
  }
  if (picked.length === count) return picked;
  if (!preferInverted) return null;
  return chooseBaseNumbers(available, count, width, false);
}
