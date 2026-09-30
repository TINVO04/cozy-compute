import { DNTU_BLOCKERS, DNTU_COLS, DNTU_ROWS, DNTU_SPAWN, TILE } from '@cozy/game-data';
import { BaseRoom, type WorldSpec } from './base.js';

/** Authoritative multiplayer room for Dong Nai Technology University (DNTU). */
export class UniversityRoom extends BaseRoom {
  override maxClients = 80;

  protected world(): WorldSpec {
    return {
      width: DNTU_COLS * TILE,
      height: DNTU_ROWS * TILE,
      blockers: DNTU_BLOCKERS,
      spawn: DNTU_SPAWN,
    };
  }

  protected presenceKey() {
    return 'university:dntu';
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'university';
    this.state.label = 'Đại Học Công Nghệ Đồng Nai (DNTU)';
  }
}
