import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { prizeList, normalizePrizeInput, validPrizeSources, inversePrizeNumber } from '../dist/prizes.js';

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

test('inverse prizes must reference an earlier direct prize', () => {
  const prizes = ['Principal', 'Inverso', 'Segundo directo', 'Segundo inverso'];
  assert.equal(validPrizeSources(prizes, [0, 1, 0, 3]), true);
  for (const sources of [[1, 0, 0, 0], [0, 2, 0, 0], [0, 1, 2, 0], [0], [0, -1, 0, 0]]) {
    assert.equal(validPrizeSources(prizes, sources), false);
  }
});

test('inverse result comes from the configured direct result with fixed width', () => {
  assert.equal(inversePrizeNumber([0, 1], 2, 4, [{ position: 1, numberValue: 1234 }]), 4321);
  assert.equal(inversePrizeNumber([0, 1], 2, 4, [{ position: 1, numberValue: 1200 }]), 21);
  assert.equal(inversePrizeNumber([0, 1], 2, 4, [{ position: 1, numberValue: 1221 }]), 1221);
  assert.equal(inversePrizeNumber([0, 0], 2, 4, [{ position: 1, numberValue: 1234 }]), null);
  assert.throws(() => inversePrizeNumber([0, 1], 2, 4, []), /DIRECT_RESULT_REQUIRED/);
});
