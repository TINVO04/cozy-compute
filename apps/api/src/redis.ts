import { Redis } from 'ioredis';

export function createRedis(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: true, lazyConnect: false });
}

export type { Redis };

export const PRESENCE_KEY = 'presence:online';

export interface PresenceInfo {
  room: string;
  roomLabel: string;
  at: number;
}

export async function getPresence(redis: Redis, userIds: string[]): Promise<Map<string, PresenceInfo>> {
  const out = new Map<string, PresenceInfo>();
  if (!userIds.length) return out;
  const values = await redis.hmget(PRESENCE_KEY, ...userIds);
  const now = Date.now();
  const staleIds: string[] = [];
  userIds.forEach((id, i) => {
    const raw = values[i];
    if (!raw) return;
    try {
      const info = JSON.parse(raw) as PresenceInfo;
      if (now - info.at < 90_000) {
        out.set(id, info);
      } else {
        staleIds.push(id);
      }
    } catch {
      staleIds.push(id);
    }
  });
  if (staleIds.length) void redis.hdel(PRESENCE_KEY, ...staleIds);
  return out;
}
