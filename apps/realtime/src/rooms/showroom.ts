import type { Client } from '@colyseus/core';
import { SHOWROOM, SHOWROOM_BLOCKERS } from '@cozy/game-data';
import { BaseRoom, getDeps } from './base.js';

export class ShowroomRoom extends BaseRoom {
  override maxClients = 60;
  protected world() {
    return { ...SHOWROOM, blockers: SHOWROOM_BLOCKERS };
  }
  protected presenceKey() {
    return 'showroom';
  }
  override onCreate() {
    this.setup();
    this.state.kind = 'showroom';
    this.state.label = 'Phòng trưng bày · Gara Bạc Hà';
  }
  override async onAuth(client: Client, options: { token?: string }) {
    const session = await super.onAuth(client, options);
    if (!(await getDeps().redis.getdel('showroom:entry:' + session.userId)))
      throw new Error('Hãy đến cửa Gara Bạc Hà và nhấn E để vào.');
    return session;
  }
}
