import assert from 'node:assert/strict';
import test from 'node:test';
import { ticketPrefixRange, ticketSearchWhere } from '../dist/ticketSearch.js';

test('ticket prefixes preserve leading zeros at every raffle width', () => {
  assert.deepEqual(ticketPrefixRange('0', 2), { gte: 0, lte: 9 });
  assert.deepEqual(ticketPrefixRange('00', 3), { gte: 0, lte: 9 });
  assert.deepEqual(ticketPrefixRange('00', 4), { gte: 0, lte: 99 });
  assert.deepEqual(ticketPrefixRange('001', 4), { gte: 10, lte: 19 });
  assert.deepEqual(ticketPrefixRange('0000', 4), { gte: 0, lte: 0 });
  assert.equal(ticketPrefixRange('00000', 4), null);
  assert.equal(ticketPrefixRange('Ana', 4), null);
});

test('search includes buyer name, email and phone as well as ticket prefix', () => {
  const numeric = ticketSearchWhere('00', 4);
  assert.deepEqual(numeric.OR[0], { value: { gte: 0, lte: 99 } });
  assert.deepEqual(numeric.OR[1].reservation.is.OR.map(field => Object.keys(field)[0]), ['buyerName', 'buyerEmail', 'buyerPhone']);
  const name = ticketSearchWhere('  Alessandro ', 4);
  assert.equal(name.OR.length, 1);
  assert.equal(name.OR[0].reservation.is.OR[0].buyerName.contains, 'Alessandro');
  assert.equal(ticketSearchWhere('  ', 4), undefined);
});
