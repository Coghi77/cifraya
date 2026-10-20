// Sources -1 and -2 mean composition starting at the first/second JPS prize.
// Positive sources remain inverses of an earlier raffle prize; zero is manual.
export function composeLotteryNumber(width: number, start: number, results: string[]) {
  if (![2, 3, 4, 5].includes(width) || ![1, 2].includes(start)) throw Error('INVALID_DRAW');
  const needed = Math.ceil(width / 2);
  const parts = results.slice(start - 1, start - 1 + needed);
  if (parts.length !== needed || parts.some(value => !/^\d{2}$/.test(value))) throw Error('INVALID_DRAW');
  return Number(parts.slice(0, Math.floor(width / 2)).join('') + (width % 2 ? parts[parts.length - 1][1] : ''));
}
