import type { Client } from '@colyseus/core';
import { FARM_BLOCKERS, FARM_HEIGHT, FARM_SPAWN, FARM_WIDTH } from '@cozy/game-data';
import type { SessionInfo } from '../api.js';
import { BaseRoom, getDeps, type WorldSpec } from './base.js';

/** One room instance per farm owner (farm:${ownerId}). */
export class FarmRoom extends BaseRoom {
  override maxClients = 30;
  private ownerId = '';
  private userPermissions = new Map<string, { isOwner: boolean }>();

  protected world(): WorldSpec {
    return {
      width: FARM_WIDTH,
      height: FARM_HEIGHT,
      blockers: FARM_BLOCKERS,
      spawn: FARM_SPAWN,
    };
  }

  protected presenceKey() {
    return `farm:${this.ownerId}`;
  }

  override async onCreate(options: { ownerId: string }) {
    this.ownerId = options.ownerId;
    this.setup();
    this.state.kind = 'farm';
    this.state.label = 'Trang Trại Cá Nhân';

    this.onMessage('farm:water', (client, msg: { plotIndex?: number }) => {
      if (typeof msg?.plotIndex !== 'number' || msg.plotIndex < 0 || msg.plotIndex > 35) return;
      const p = this.state.players.get(client.sessionId);
      this.broadcast('farm:plot_watered', {
        plotIndex: msg.plotIndex,
        wateredBy: client.sessionId,
        userId: p?.userId,
        name: p?.name,
        at: Date.now(),
      });
    });

    this.onMessage('farm:harvest', (client, msg: { plotIndex?: number }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const perm = this.userPermissions.get(p.userId);
      if (!perm?.isOwner) {
        client.send('notice', {
          kind: 'error',
          text: 'Khách không được phép thu hoạch nông sản của chủ trại!',
        });
        return;
      }
      if (typeof msg?.plotIndex !== 'number' || msg.plotIndex < 0 || msg.plotIndex > 35) return;
      this.broadcast('farm:plot_harvested', {
        plotIndex: msg.plotIndex,
        harvestedBy: p.userId,
        at: Date.now(),
      });
    });
  }

  override async onAuth(client: Client, options: { token?: string; ownerId?: string; farmToken?: string }) {
    const session = (await super.onAuth(client, options)) as SessionInfo;
    const access = await getDeps().api.farmAccess(this.ownerId, session.userId, options.farmToken);
    if (!access.allowed) {
      throw new Error('Mật khẩu trang trại không chính xác hoặc trang trại đang riêng tư.');
    }
    this.userPermissions.set(session.userId, { isOwner: access.isOwner });
    return session;
  }

  override async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (p) {
      this.userPermissions.delete(p.userId);
    }
    await super.onLeave(client, consented);
  }

  get owner() {
    return this.ownerId;
  }

  isClientOwner(sessionId: string): boolean {
    const p = this.state.players.get(sessionId);
    if (!p) return false;
    return !!this.userPermissions.get(p.userId)?.isOwner;
  }
}
