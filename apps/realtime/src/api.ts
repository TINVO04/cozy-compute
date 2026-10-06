import type { Appearance, TrafficViolation, CaveAccount } from '@cozy/game-data';

export interface SessionInfo {
  userId: string;
  role: string;
  displayName: string;
  statusText: string;
  fame: number;
  appearance: Appearance;
  muted: string[];
}

export class ApiClient {
  cave(body: {
    userId: string;
    action: 'load' | 'buy' | 'sell' | 'loot';
    requestId: string;
    item?: string;
    quantity?: number;
  }) {
    return this.post<CaveAccount>('/internal/cave', body);
  }
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
  ) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': this.secret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `api ${path} ${res.status}`);
    }
    return (await res.json()) as T;
  }

  trafficFine(userId: string, ticketId: string, violation: TrafficViolation) {
    return this.post<{ charged: number; coin: number }>('/internal/traffic-fine', {
      userId,
      ticketId,
      violation,
    });
  }

  session(token: string) {
    return this.post<SessionInfo>('/internal/session', { token });
  }

  bidaResult(result: {
    id: string;
    hostId: string;
    guestId: string;
    winnerId: string;
    mode: '8ball' | 'carom';
  }) {
    return this.post('/internal/bida/result', result);
  }

  apartment(ownerId: string, viewerId: string | null) {
    return this.post<{
      allowed: boolean;
      ownerName: string;
      objects: { itemId: string; x: number; y: number; rotation: number; size: { w: number; h: number } }[];
    }>('/internal/apartment', { ownerId, viewerId });
  }

  farmAccess(ownerId: string, visitorId: string, farmToken?: string) {
    return this.post<{ allowed: boolean; isOwner: boolean }>('/internal/farm-access', {
      ownerId,
      visitorId,
      farmToken,
    });
  }
}
