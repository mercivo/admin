type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const entries = new Map<string, CacheEntry<unknown>>();

const sessionKey = (key: string) =>
  `${localStorage.getItem('mercivo_access_token') || 'anonymous'}:${key}`;

export const cachedRequest = <T>(key: string, load: () => Promise<T>, ttlMs = 30_000): Promise<T> => {
  const scopedKey = sessionKey(key);
  const cached = entries.get(scopedKey) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = load().catch((error) => {
    entries.delete(scopedKey);
    throw error;
  });
  entries.set(scopedKey, { expiresAt: Date.now() + ttlMs, promise });
  return promise;
};

export const invalidateCachedRequest = (keyPrefix: string) => {
  const suffix = `:${keyPrefix}`;
  for (const key of entries.keys()) {
    if (key.includes(suffix)) entries.delete(key);
  }
};

export const clearRequestCache = () => entries.clear();
