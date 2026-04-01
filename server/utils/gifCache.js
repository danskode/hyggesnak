import { LRUCache } from 'lru-cache';

const trendingCache = new LRUCache({ max: 10,  ttl: 15 * 60 * 1000 });
const searchCache   = new LRUCache({ max: 200, ttl:  5 * 60 * 1000 });

// In-flight deduplication: prevents cache stampede when cache is empty
// and multiple requests arrive simultaneously
const inflight = new Map();

async function withCache(cache, key, fetchFn) {
    const cached = cache.get(key);
    if (cached) return cached;

    if (inflight.has(key)) return inflight.get(key);

    const promise = fetchFn()
        .then(data => {
            cache.set(key, data);
            inflight.delete(key);
            return data;
        })
        .catch(err => {
            inflight.delete(key);
            throw err;
        });

    inflight.set(key, promise);
    return promise;
}

export function cachedTrending(provider, fetchFn) {
    return withCache(trendingCache, `trending:${provider}`, fetchFn);
}

export function cachedSearch(provider, query, fetchFn) {
    const key = `search:${provider}:${query.toLowerCase().trim()}`;
    return withCache(searchCache, key, fetchFn);
}
