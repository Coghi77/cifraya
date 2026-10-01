import type { PrismaClient } from '@prisma/client';

export function createReservationExpirer(db: PrismaClient, notify: () => void) {
  let inFlight: Promise<void> | null = null;

  async function expireBatch() {
    const overdue = await db.reservation.findMany({
      where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
      select: { id: true },
      take: 100,
    });
    let expiredAny = false;
    for (const { id } of overdue) {
      const expired = await db.$transaction(async tx => {
        const changed = await tx.reservation.updateMany({
          where: { id, status: 'ACTIVE', expiresAt: { lte: new Date() } },
          data: { status: 'EXPIRED' },
        });
        if (changed.count) {
          await tx.entryNumber.updateMany({
            where: { reservationId: id, status: 'RESERVED' },
            data: { status: 'AVAILABLE', reservationId: null },
          });
        }
        return changed.count > 0;
      });
      expiredAny ||= expired;
    }
    if (expiredAny) notify();
  }

  return function expireReservations() {
    if (inFlight) return inFlight;
    inFlight = expireBatch().finally(() => { inFlight = null; });
    return inFlight;
  };
}
