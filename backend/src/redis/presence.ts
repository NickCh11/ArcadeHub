import redis from './client';

const PRESENCE_TTL = 35; // seconds — clients ping every 30s

export type PresenceStatus = 'online' | 'away' | 'offline';

export async function setPresence(userId: string, status: PresenceStatus): Promise<void> {
  if (status === 'offline') {
    await redis.del(`presence:${userId}`);
  } else {
    await redis.setex(`presence:${userId}`, PRESENCE_TTL, status);
  }
}

export async function getPresence(userId: string): Promise<PresenceStatus> {
  const val = await redis.get(`presence:${userId}`);
  if (!val) return 'offline';
  return val as PresenceStatus;
}

export async function getPresenceBulk(userIds: string[]): Promise<Record<string, PresenceStatus>> {
  if (userIds.length === 0) return {};
  const pipeline = redis.pipeline();
  userIds.forEach((id) => pipeline.get(`presence:${id}`));
  const results = await pipeline.exec();
  const map: Record<string, PresenceStatus> = {};
  userIds.forEach((id, i) => {
    const val = results?.[i]?.[1] as string | null;
    map[id] = (val as PresenceStatus) || 'offline';
  });
  return map;
}

export async function refreshPresence(userId: string): Promise<void> {
  const current = await redis.get(`presence:${userId}`);
  if (current) {
    await redis.expire(`presence:${userId}`, PRESENCE_TTL);
  }
}
