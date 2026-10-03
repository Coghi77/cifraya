export function createPublicCache(ttlMs = 2000) {
  const entries = new Map<string, { until: number; promise: Promise<unknown> }>();
  return {
    clear: () => entries.clear(),
    get<T>(key: string, loader: () => Promise<T>): Promise<T> {
      const cached = entries.get(key);
      if (cached && cached.until > Date.now()) return cached.promise as Promise<T>;
      if (entries.size >= 100) entries.delete(entries.keys().next().value!);
      const entry = { until: Date.now() + ttlMs, promise: Promise.resolve().then(loader) };
      entries.set(key, entry);
      entry.promise.catch(() => { if (entries.get(key) === entry) entries.delete(key); });
      return entry.promise;
    },
  };
}
