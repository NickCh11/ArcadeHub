import redis from '../redis/client';

const LIMITS: Record<string, { window: number; max: number }> = {
  'group-msg': { window: 60, max: 100 },
  'join-room':  { window: 60, max: 3   },
};
const DEFAULT_LIMIT = { window: 60, max: 100 };

export async function checkRateLimit(userId: string, action: string): Promise<boolean> {
  const { window, max } = LIMITS[action] ?? DEFAULT_LIMIT;
  const key = `ratelimit:${action}:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, window);
  }
  return count <= max;
}

export async function checkReplayAttack(messageId: string): Promise<boolean> {
  const key = `seen:msg:${messageId}`;
  // NX = only set if not exists; EX = TTL in seconds (24h)
  const result = await redis.set(key, '1', 'EX', 86400, 'NX');
  // Returns 'OK' if set (first time), null if already exists
  return result === 'OK';
}
