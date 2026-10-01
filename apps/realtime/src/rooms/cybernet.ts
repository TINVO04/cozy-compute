import { CYBERNET_BLOCKERS, CYBERNET_COLS, CYBERNET_ROWS, CYBERNET_SPAWN, TILE } from '@cozy/game-data';
import { BaseRoom, type WorldSpec } from './base.js';

/** Authoritative multiplayer room for Cyber Game HNT Trảng Dài. */
export class CyberNetRoom extends BaseRoom {
  override maxClients = 60;

  protected world(): WorldSpec {
    return {
      width: CYBERNET_COLS * TILE,
      height: CYBERNET_ROWS * TILE,
      blockers: CYBERNET_BLOCKERS,
      spawn: CYBERNET_SPAWN,
    };
  }

  protected presenceKey() {
    return 'cybernet:trangdai';
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'cybernet';
    this.state.label = 'Cyber Game HNT Trảng Dài';
  }
}
