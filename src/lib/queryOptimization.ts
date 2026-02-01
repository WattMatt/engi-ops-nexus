/**
 * Query Optimization Utilities
 * Helpers to avoid common database query anti-patterns like N+1 queries
 */

/**
 * Batch fetch related records to avoid N+1 queries
 * Instead of fetching related data in a loop, this fetches all related records in one query
 * 
 * Usage:
 * ```ts
 * // Instead of N queries:
 * for (const item of items) {
 *   await supabase.from('related').select().eq('parent_id', item.id);
 * }
 * 
 * // Use 1 query:
 * const ids = items.map(i => i.id);
 * await supabase.from('related').select().in('parent_id', ids);
 * ```
 */

/**
 * Deduplicate an array of items by a key function
 */
export function deduplicateBy<T>(
  items: T[],
  keyFn: (item: T) => string
): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Chunk an array into smaller arrays for batch processing
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process items in batches to avoid overwhelming the database
 */
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processFn: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const batches = chunk(items, batchSize);
  const results: R[] = [];
  
  for (const batch of batches) {
    const batchResults = await processFn(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Memoize expensive database queries with a TTL
 */
const queryCache = new Map<string, { data: unknown; expiry: number }>();

export function memoizedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttlMs: number = 60000 // Default 1 minute
): Promise<T> {
  const cached = queryCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return Promise.resolve(cached.data as T);
  }
  
  return queryFn().then(data => {
    queryCache.set(cacheKey, { data, expiry: Date.now() + ttlMs });
    return data;
  });
}

/**
 * Clear memoized query cache
 */
export function clearQueryCache(keyPattern?: string): void {
  if (keyPattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(keyPattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

/**
 * Group an array by a key function
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/**
 * Create a lookup map from an array by a key function
 */
export function keyBy<T, K extends string>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return map;
}

/**
 * Pick specific fields from an object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific fields from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete (result as any)[key];
  }
  return result;
}
