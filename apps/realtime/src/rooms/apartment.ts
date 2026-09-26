import type { Client } from '@colyseus/core';
import { APARTMENT_COLS, APARTMENT_ROWS, t, type Rect } from '@cozy/game-data';
import type { SessionInfo } from '../api.js';
import { BaseRoom, getDeps, type WorldSpec } from './base.js';

export const APT_TILE = 32;

export interface Furniture {
  itemId: string;
  x: number;
  y: number;
  rotation: number;
  size: { w: number; h: number };
}

/** One room instance per apartment owner. Movement collides with the saved furniture layout. */
export class ApartmentRoom extends BaseRoom {
  override maxClients = 25;
  private ownerId = '';
  private blockers: Rect[] = [];

  protected world(): WorldSpec {
    return {
      width: APARTMENT_COLS * APT_TILE,
      height: APARTMENT_ROWS * APT_TILE,
      blockers: this.blockers,
      spawn: { x: (APARTMENT_COLS * APT_TILE) / 2, y: (APARTMENT_ROWS - 0.6) * APT_TILE },
    };
  }

  protected presenceKey() {
    return `apartment:${this.ownerId}`;
  }

  override async onCreate(options: { ownerId: string }) {
    this.ownerId = options.ownerId;
    this.setup();
    this.state.kind = 'apartment';
    await this.reloadLayout();
  }

  override async onAuth(client: Client, options: { token?: string; ownerId?: string }) {
    const session = (await super.onAuth(client, options)) as SessionInfo;
    const { allowed } = await getDeps().api.apartment(this.ownerId, session.userId);
    if (!allowed) throw new Error('This apartment is private.');
    return session;
  }

  async reloadLayout() {
    const apt = await getDeps().api.apartment(this.ownerId, null);
    this.state.label = `${apt.ownerName}'s apartment`;
    this.applyLayout(apt.objects);
  }

  applyLayout(objects: Furniture[]) {
    // Back wall occupies the top row.
    const walls = [t(0, 0, APARTMENT_COLS, 1)];
    const furniture = objects
      .filter((o) => !o.itemId.includes('rug'))
      .map((o) => {
        const rotated = o.rotation === 90 || o.rotation === 270;
        const w = rotated ? o.size.h : o.size.w;
        const h = rotated ? o.size.w : o.size.h;
        return { x: o.x * APT_TILE + 3, y: o.y * APT_TILE + 6, w: w * APT_TILE - 6, h: h * APT_TILE - 8 };
      });
    this.blockers = [...walls, ...furniture];
    this.broadcast('layout', { updatedAt: Date.now() });
  }

  get owner() {
    return this.ownerId;
  }
}
