import { COMGA_BLOCKERS, COMGA_COLS, COMGA_ROWS, COMGA_SPAWN, TILE } from '@cozy/game-data';
import { BaseRoom, type WorldSpec } from './base.js';

/** Authoritative multiplayer room for Cơm Gà Xối Mỡ 68 Biên Hòa. */
export class ComGaRoom extends BaseRoom {
  override maxClients = 60;

  protected world(): WorldSpec {
    return {
      width: COMGA_COLS * TILE,
      height: COMGA_ROWS * TILE,
      blockers: COMGA_BLOCKERS,
      spawn: COMGA_SPAWN,
    };
  }

  protected presenceKey() {
    return 'comga:bienhoa';
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'comga';
    this.state.label = 'Cơm Gà Xối Mỡ 68 Biên Hòa';
  }
}
