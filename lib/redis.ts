import Redis from 'ioredis'

let client: Redis | null = null

async function getRedis(): Promise<Redis | null> {
  if (!process.env.REDIS_URL) return null
  if (client) return client

  try {
    client = new Redis(process.env.REDIS_URL, { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 1 })
    client.on('error', () => { client = null })
    await client.connect()
    return client
  } catch {
    client = null
    return null
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const redis = await getRedis()
    if (!redis) return null
    return redis.get(key)
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  try {
    const redis = await getRedis()
    if (!redis) return
    await redis.setex(key, ttlSeconds, value)
  } catch {
    // silently fail if Redis unavailable
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = await getRedis()
    if (!redis) return
    await redis.del(key)
  } catch {
    // silently fail
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const redis = await getRedis()
    if (!redis) return
    const keys = await redis.keys(pattern)
    if (keys.length) await redis.del(keys)
  } catch {
    // silently fail
  }
}
