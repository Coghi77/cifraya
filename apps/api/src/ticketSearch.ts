import type { Prisma } from '@prisma/client';

export function ticketPrefixRange(search: string, width: number) {
  if (!/^\d+$/.test(search) || search.length > width) return null;
  const multiplier = 10 ** (width - search.length);
  const first = Number(search) * multiplier;
  return { gte: first, lte: first + multiplier - 1 };
}

export function ticketSearchWhere(search: string, width: number): Prisma.EntryNumberWhereInput | undefined {
  const term = search.trim();
  if (!term) return undefined;
  const range = ticketPrefixRange(term, width);
  return {
    OR: [
      ...(range ? [{ value: range }] : []),
      { reservation: { is: { OR: [
        { buyerName: { contains: term, mode: 'insensitive' } },
        { buyerEmail: { contains: term, mode: 'insensitive' } },
        { buyerPhone: { contains: term } },
      ] } } },
    ],
  };
}
