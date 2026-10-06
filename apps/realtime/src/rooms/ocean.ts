import type { Client } from '@colyseus/core';
import {
  BOATS,
  OCEAN_BLOCKERS,
  OCEAN_HEIGHT,
  OCEAN_SPAWN,
  OCEAN_WIDTH,
  normalizeBoatId,
  type Appearance,
} from '@cozy/game-data';
import type { SessionInfo } from '../api.js';
import type { PlayerState } from '../schema.js';
import { BaseRoom, type WorldSpec } from './base.js';

export class OceanRoom extends BaseRoom {
  protected override tick(dtMs: number) {
    this.state.serverTime = Date.now();
    super.tick(dtMs);
  }
  override maxClients = 150;

  protected world(): WorldSpec {
    return {
      width: OCEAN_WIDTH,
      height: OCEAN_HEIGHT,
      blockers: OCEAN_BLOCKERS,
      spawn: OCEAN_SPAWN,
    };
  }

  protected presenceKey() {
    return 'ocean';
  }

  protected override playerSpeedFor(d: { session: SessionInfo }, _p: PlayerState): number {
    const appearance =
      typeof d.session.appearance === 'object' ? (d.session.appearance as Appearance) : undefined;
    const boatId = appearance?.boat ? normalizeBoatId(appearance.boat) : null;
    if (boatId && BOATS[boatId]) {
      return BOATS[boatId].speed;
    }
    // Fallback to Tier 1 coracle speed
    return BOATS.boat_coracle?.speed ?? 130;
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'ocean';
    this.state.label = 'Hải Trình Biển Sâu';

    this.onMessage('fishing:cast', (client, msg) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      this.broadcast(
        'fishing:remote_cast',
        {
          sessionId: client.sessionId,
          userId: p.userId,
          name: p.name,
          ...(typeof msg === 'object' && msg !== null ? msg : {}),
        },
        { except: client },
      );
    });

    this.onMessage('fishing:nibble', (client, msg) => {
      this.broadcast(
        'fishing:remote_nibble',
        {
          sessionId: client.sessionId,
          ...(typeof msg === 'object' && msg !== null ? msg : {}),
        },
        { except: client },
      );
    });

    this.onMessage('fishing:bite', (client) => {
      this.broadcast(
        'fishing:remote_bite',
        {
          sessionId: client.sessionId,
        },
        { except: client },
      );
    });

    this.onMessage('fishing:stop', (client) => {
      this.broadcast(
        'fishing:remote_stop',
        {
          sessionId: client.sessionId,
        },
        { except: client },
      );
    });
  }

  override async onLeave(client: Client, consented: boolean) {
    this.broadcast('fishing:remote_stop', { sessionId: client.sessionId });
    await super.onLeave(client, consented);
  }

  protected override spawnFor(_session: SessionInfo) {
    return {
      x: OCEAN_SPAWN.x + Math.round((Math.random() - 0.5) * 64),
      y: OCEAN_SPAWN.y + Math.round((Math.random() - 0.5) * 32),
    };
  }
}
