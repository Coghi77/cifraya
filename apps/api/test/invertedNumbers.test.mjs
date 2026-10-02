import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseBaseNumbers, invertedValues, reverseNumber } from '../dist/invertedNumbers.js';

test('reverses fixed-width numbers including leading zeroes', () => {
  assert.equal(reverseNumber(12, 2), 21);
  assert.equal(reverseNumber(120, 3), 21); // 120 -> 021
  assert.equal(reverseNumber(1200, 4), 21); // 1200 -> 0021
  assert.equal(reverseNumber(0, 4), 0);
});

test('only offers distinct, available inverses', () => {
  assert.deepEqual(invertedValues([9705, 7239, 7051], 4, new Set([5079, 9327, 1507])), [5079, 9327, 1507]);
  assert.equal(invertedValues([12, 21], 2, new Set([12, 21])), null);
  assert.equal(invertedValues([11], 2, new Set([11])), null);
  assert.deepEqual(invertedValues([120], 3, new Set([21])), [21]);
  assert.equal(invertedValues([120], 3, new Set()), null);
});

test('generated package can take all inverses without duplicates', () => {
  const inventory = Array.from({ length: 10_000 }, (_, value) => value);
  for (let run = 0; run < 30; run++) {
    const picked = chooseBaseNumbers(inventory, 7, 4, true);
    assert.equal(picked.length, 7);
    const inverse = invertedValues(picked, 4, new Set(inventory));
    assert.equal(inverse.length, 7);
    assert.equal(new Set([...picked, ...inverse]).size, 14);
  }
});
