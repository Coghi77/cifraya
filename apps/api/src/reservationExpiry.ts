import type { PrismaClient } from '@prisma/client';

export function createReservationExpirer(db: PrismaClient, notify: () => void, minIntervalMs = 5000) {
  let inFlight: Promise<void> | null = null;
  let nextCheck = 0;

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
    nextCheck = overdue.length === 100 ? 0 : Date.now() + minIntervalMs;
  }

  return function expireReservations() {
    if (inFlight) return inFlight;
    if (Date.now() < nextCheck) return Promise.resolve();
    inFlight = expireBatch().finally(() => { inFlight = null; });
    return inFlight;
  };
}
