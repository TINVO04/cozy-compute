import { COMPANY_BLOCKERS, COMPANY_COLS, COMPANY_ROWS, COMPANY_SPAWN, TILE } from '@cozy/game-data';
import { BaseRoom, type WorldSpec } from './base.js';

/** Authoritative multiplayer room for the VietDevPro company office. */
export class CompanyRoom extends BaseRoom {
  override maxClients = 50;

  protected world(): WorldSpec {
    return {
      width: COMPANY_COLS * TILE,
      height: COMPANY_ROWS * TILE,
      blockers: COMPANY_BLOCKERS,
      spawn: COMPANY_SPAWN,
    };
  }

  protected presenceKey() {
    return 'company:vietprodev';
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'company';
    this.state.label = 'Văn Phòng VietProDev';
  }
}
