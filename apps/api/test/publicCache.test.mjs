import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicCache } from '../dist/publicCache.js';

test('1000 concurrent public reads share one database lookup', async () => {
  const cache = createPublicCache();
  let reads = 0;
  const loader = async () => { reads++; return ['raffle']; };
  const results = await Promise.all(Array.from({ length: 1000 }, () => cache.get('campaigns', loader)));
  assert.equal(reads, 1);
  assert.equal(results.length, 1000);
  cache.clear();
  await cache.get('campaigns', loader);
  assert.equal(reads, 2);
});

test('invalidating an in-flight lookup does not restore stale data', async () => {
  const cache = createPublicCache();
  let finish;
  const pending = cache.get('campaigns', () => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve();
  cache.clear();
  await cache.get('campaigns', async () => 'new');
  finish('old');
  await pending;
  assert.equal(await cache.get('campaigns', async () => 'unexpected'), 'new');
});

test('failed loaders are retried instead of cached', async () => {
  const cache = createPublicCache();
  await assert.rejects(cache.get('x', async () => { throw new Error('offline'); }));
  assert.equal(await cache.get('x', async () => 'online'), 'online');
});
