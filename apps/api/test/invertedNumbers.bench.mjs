import { performance } from 'node:perf_hooks';
import { chooseBaseNumbers, invertedValues } from '../dist/invertedNumbers.js';

const inventory = Array.from({ length: 10_000 }, (_, value) => value);
const inventorySet = new Set(inventory);
const times = [];
for (let run = 0; run < 200; run++) {
  const started = performance.now();
  const base = chooseBaseNumbers(inventory, 7, 4, true);
  const inverted = invertedValues(base, 4, inventorySet);
  if (inverted?.length !== 7) throw new Error('Benchmark returned an invalid package');
  times.push(performance.now() - started);
}
times.sort((a, b) => a - b);
console.log(JSON.stringify({ iterations: times.length, inventory: inventory.length, packageSize: 7, medianMs: Number(times[99].toFixed(2)), p95Ms: Number(times[189].toFixed(2)), maxMs: Number(times[199].toFixed(2)) }));
