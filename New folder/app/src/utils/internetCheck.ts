import dns from 'dns';

let cachedResult: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Check if internet is available by resolving DNS for google.com.
 * Caches result for 30 seconds to avoid hammering DNS.
 */
export function checkInternet(): Promise<boolean> {
  const now = Date.now();
  if (cachedResult !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return Promise.resolve(cachedResult);
  }

  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      cachedResult = !err;
      cacheTimestamp = Date.now();
      resolve(!err);
    });
  });
}

/**
 * Clear the cached internet status.
 */
export function clearInternetCache(): void {
  cachedResult = null;
  cacheTimestamp = 0;
}
