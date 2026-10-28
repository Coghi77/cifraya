import sharp from 'sharp';

// Bounded in-process cache. Originals stay untouched in the database.
const cache = new Map<string, Buffer>();
const pending = new Map<string, Promise<Buffer>>();
let bytes = 0;
export function photoVariant(id: string, data: Uint8Array, width: number): Promise<Buffer> {
  const key = `${id}:${width}`;
  const saved = cache.get(key);
  if (saved) return Promise.resolve(saved);
  const running = pending.get(key);
  if (running) return running;
  const task = sharp(data, { limitInputPixels: 40_000_000 }).rotate()
    .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 100, effort: 4 }).toBuffer()
    .then(buffer => {
      while (bytes + buffer.length > 20_000_000 && cache.size) {
        const oldest = cache.keys().next().value!;
        bytes -= cache.get(oldest)!.length;
        cache.delete(oldest);
      }
      if (buffer.length <= 20_000_000) { cache.set(key, buffer); bytes += buffer.length; }
      return buffer;
    }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
