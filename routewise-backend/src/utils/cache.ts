import { createClient } from 'redis';

// Create Redis client
const redis = createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Too many reconnection attempts');
        return new Error('Too many retries');
      }
      return retries * 100; // Exponential backoff
    }
  }
});

// Connection event handlers
redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Connect to Redis
redis.connect().catch((err) => {
  console.error('❌ Failed to connect to Redis:', err.message);
  console.log('⚠️  Continuing without cache');
});

/**
 * Get cached value by key
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis.isReady) {
    console.warn('⚠️  Redis not ready, skipping cache read');
    return null;
  }

  try {
    const cached = await redis.get(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    console.log(`✅ Cache HIT: ${key}`);
    return parsed as T;
  } catch (error) {
    console.error(`❌ Cache read error for ${key}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Set cached value with TTL (time to live in seconds)
 */
export async function setCache(key: string, value: any, ttl: number = 300): Promise<void> {
  if (!redis.isReady) {
    console.warn('⚠️  Redis not ready, skipping cache write');
    return;
  }

  try {
    await redis.setEx(key, ttl, JSON.stringify(value));
    console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error(`❌ Cache write error for ${key}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Invalidate cache by pattern (e.g., "orders:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis.isReady) {
    console.warn('⚠️  Redis not ready, skipping cache invalidation');
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`✅ Cache INVALIDATED: ${pattern} (${keys.length} keys)`);
    }
  } catch (error) {
    console.error(`❌ Cache invalidation error for ${pattern}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Delete specific cache key
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redis.isReady) {
    console.warn('⚠️  Redis not ready, skipping cache delete');
    return;
  }

  try {
    await redis.del(key);
    console.log(`✅ Cache DELETED: ${key}`);
  } catch (error) {
    console.error(`❌ Cache delete error for ${key}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<any> {
  if (!redis.isReady) {
    return { connected: false };
  }

  try {
    const info = await redis.info('stats');
    const dbSize = await redis.dbSize();

    return {
      connected: true,
      dbSize,
      info: info.split('\r\n').reduce((acc, line) => {
        const [key, value] = line.split(':');
        if (key && value) acc[key] = value;
        return acc;
      }, {} as any)
    };
  } catch (error) {
    console.error('❌ Error getting cache stats:', error instanceof Error ? error.message : 'Unknown error');
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export { redis };
