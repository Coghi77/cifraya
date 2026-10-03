import assert from 'node:assert/strict';
import test from 'node:test';
import { createReservationExpirer } from '../dist/reservationExpiry.js';

test('concurrent expiry checks share one batch and release claimed numbers once', async () => {
  let reads = 0;
  let releases = 0;
  let notices = 0;
  const db = {
    reservation: { findMany: async () => { reads++; await new Promise(resolve => setTimeout(resolve, 10)); return [{ id: 'reservation-1' }]; } },
    $transaction: async callback => callback({
      reservation: { updateMany: async () => ({ count: 1 }) },
      entryNumber: { updateMany: async () => { releases++; return { count: 2 }; } },
    }),
  };
  const expire = createReservationExpirer(db, () => { notices++; });
  await Promise.all([expire(), expire(), expire()]);
  assert.equal(reads, 1);
  assert.equal(releases, 1);
  assert.equal(notices, 1);
  await expire();
  assert.equal(reads, 1);
});

test('an expiry check does not release numbers after another action changes status', async () => {
  let releases = 0;
  let notices = 0;
  const db = {
    reservation: { findMany: async () => [{ id: 'reservation-1' }] },
    $transaction: async callback => callback({
      reservation: { updateMany: async () => ({ count: 0 }) },
      entryNumber: { updateMany: async () => { releases++; } },
    }),
  };
  await createReservationExpirer(db, () => { notices++; })();
  assert.equal(releases, 0);
  assert.equal(notices, 0);
});
