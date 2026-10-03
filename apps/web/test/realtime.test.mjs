import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('realtime coalesces bursts, reconnects and pauses hidden tabs', async () => {
  const source = readFileSync(new URL('../src/realtime.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const { startRealtime } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const previous = Object.fromEntries(['window', 'document', 'navigator', 'EventSource'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const timeouts = new Map();
  let nextId = 0;
  const win = new EventTarget();
  Object.assign(win, { setTimeout: fn => { timeouts.set(++nextId, fn); return nextId; }, clearTimeout: id => timeouts.delete(id), setInterval: () => ++nextId, clearInterval: () => {} });
  const doc = new EventTarget(); doc.visibilityState = 'visible';
  const streams = [];
  class Stream extends EventTarget { constructor() { super(); this.closed = false; streams.push(this); } close() { this.closed = true; } }
  for (const [key, value] of Object.entries({ window: win, document: doc, navigator: { onLine: true }, EventSource: Stream })) Object.defineProperty(globalThis, key, { value, configurable: true });
  const flush = () => { for (const [id, fn] of timeouts) { timeouts.delete(id); fn(); } };
  let notices = 0;
  win.addEventListener('cifraya:update', () => notices++);
  let stop;
  try {
    stop = startRealtime(); flush();
    for (let n = 0; n < 100; n++) streams[0].dispatchEvent(new Event('update'));
    flush(); assert.equal(notices, 2);
    doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(streams[0].closed, true);
    streams[0].dispatchEvent(new Event('update')); flush(); assert.equal(notices, 2);
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange')); flush();
    assert.equal(streams.length, 2); assert.equal(notices, 3);
    streams[1].dispatchEvent(new Event('open')); flush(); assert.equal(notices, 4);
    stop(); assert.equal(streams[1].closed, true);
  } finally {
    stop?.();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
