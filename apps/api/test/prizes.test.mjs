import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { prizeList, normalizePrizeInput } from '../dist/prizes.js';

const input = z.preprocess(normalizePrizeInput, z.object({ prizes: prizeList }));
test('accepts ten, twenty and larger ordered prize lists', () => {
  for (const count of [1, 3, 10, 20, 100]) {
    const prizes = Array.from({ length: count }, (_, index) => `Premio ${index + 1}`);
    assert.deepEqual(input.parse({ prizes }).prizes, prizes);
  }
});
test('keeps legacy clients compatible without silently truncating prizes', () => {
  assert.deepEqual(input.parse({ prize: 'Primero', prizeCount: 3, secondPrize: 'Segundo', thirdPrize: 'Tercero' }).prizes, ['Primero', 'Segundo', 'Tercero']);
  assert.equal(input.safeParse({ prize: 'Primero', prizeCount: 20 }).success, false);
});
test('rejects empty positions and invalid lists', () => {
  for (const prizes of [[], ['   '], ['Primero', ''], 'Premio', Array(10_001).fill('Premio')]) {
    assert.equal(input.safeParse({ prizes }).success, false);
  }
});
