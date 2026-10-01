import type { Client } from '@colyseus/core';
import {
  BIDA_BLOCKERS,
  BIDA_COLS,
  BIDA_ROWS,
  BIDA_SPAWN,
  createCaromRack,
  createStandard8BallRack,
  DEFAULT_TABLE_BOUNDS,
  resetCueBallInKitchen,
  TILE,
  type BidaBall,
} from '@cozy/game-data';
import { BaseRoom, type WorldSpec } from './base.js';

export interface BidaTable {
  id: string;
  name: string;
  mode: '8ball' | 'carom' | 'practice';
  hostId: string;
  hostUserId: string;
  hostName: string;
  guestId?: string;
  guestUserId?: string;
  guestName?: string;
  status: 'waiting' | 'playing' | 'finished';
  turn: string;
  score1: number;
  score2: number;
  balls: BidaBall[];
  hostGroup?: 'solid' | 'stripe';
  guestGroup?: 'solid' | 'stripe';
}

/** Authoritative multiplayer room for CLB Bida H2S Trảng Dài Biên Hòa. */
export class BidaRoom extends BaseRoom {
  override maxClients = 60;
  private tables = new Map<string, BidaTable>();

  protected world(): WorldSpec {
    return {
      width: BIDA_COLS * TILE,
      height: BIDA_ROWS * TILE,
      blockers: BIDA_BLOCKERS,
      spawn: BIDA_SPAWN,
    };
  }

  protected presenceKey() {
    return 'bida:bienhoa';
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'bida';
    this.state.label = 'CLB Bida H2S Trảng Dài Biên Hòa';

    this.onMessage('bida:get_tables', (client) => {
      client.send('bida:tables_update', this.getTableSummaries());
    });

    this.onMessage(
      'bida:create_table',
      (client, msg: { name?: string; mode?: '8ball' | 'carom' | 'practice' }) => {
        const p = this.state.players.get(client.sessionId);
        if (!p) return;

        const tableId = `table_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const mode = msg.mode ?? '8ball';
        const name = msg.name?.trim() ? msg.name.trim().slice(0, 30) : `Bàn của ${p.name}`;

        const isPractice = mode === 'practice';
        const balls = mode === 'carom' ? createCaromRack() : createStandard8BallRack();

        const table: BidaTable = {
          id: tableId,
          name,
          mode,
          hostId: client.sessionId,
          hostUserId: p.userId,
          hostName: p.name,
          status: isPractice ? 'playing' : 'waiting',
          turn: client.sessionId,
          score1: 0,
          score2: 0,
          balls,
        };

        this.tables.set(tableId, table);
        client.send('bida:table_joined', table);
        this.broadcastTablesUpdate();
      },
    );

    this.onMessage('bida:join_table', (client, msg: { tableId?: string }) => {
      if (!msg.tableId) return;
      const table = this.tables.get(msg.tableId);
      const p = this.state.players.get(client.sessionId);
      if (!table || !p || table.status !== 'waiting' || table.hostId === client.sessionId) return;

      table.guestId = client.sessionId;
      table.guestUserId = p.userId;
      table.guestName = p.name;
      table.status = 'playing';
      table.balls = table.mode === 'carom' ? createCaromRack() : createStandard8BallRack();
      table.turn = table.hostId;

      this.sendToTable(table, 'bida:table_start', table);
      this.broadcastTablesUpdate();
    });

    this.onMessage('bida:leave_table', (client, msg: { tableId?: string }) => {
      if (!msg.tableId) return;
      this.handlePlayerLeaveTable(client.sessionId, msg.tableId);
    });

    this.onMessage('bida:aim', (client, msg: { tableId?: string; angle?: number }) => {
      if (!msg.tableId || typeof msg.angle !== 'number') return;
      const table = this.tables.get(msg.tableId);
      if (!table || table.status !== 'playing') return;

      const opponent = client.sessionId === table.hostId ? table.guestId : table.hostId;
      if (opponent) {
        const oppClient = this.clients.find((c) => c.sessionId === opponent);
        oppClient?.send('bida:opponent_aim', { angle: msg.angle });
      }
    });

    this.onMessage('bida:shot', (client, msg: { tableId?: string; angle?: number; power?: number }) => {
      if (!msg.tableId || typeof msg.angle !== 'number' || typeof msg.power !== 'number') return;
      const table = this.tables.get(msg.tableId);
      if (!table || table.status !== 'playing' || table.turn !== client.sessionId) return;

      this.sendToTable(table, 'bida:shot_executed', {
        shooterId: client.sessionId,
        angle: msg.angle,
        power: Math.min(100, Math.max(1, msg.power)),
      });
    });

    this.onMessage(
      'bida:shot_settled',
      (
        client,
        msg: {
          tableId?: string;
          pocketedBallIds?: number[];
          scratch?: boolean;
          eightBallPocketed?: boolean;
          balls?: BidaBall[];
        },
      ) => {
        if (!msg.tableId) return;
        const table = this.tables.get(msg.tableId);
        if (!table || table.status !== 'playing') return;
        if (table.mode !== 'practice' && table.turn !== client.sessionId) return;

        if (Array.isArray(msg.balls)) {
          table.balls = msg.balls;
        }

        const isHost = client.sessionId === table.hostId;
        const opponentId = isHost ? table.guestId : table.hostId;
        const shooterName = isHost ? table.hostName : (table.guestName ?? 'Khách');
        const opponentName = isHost ? (table.guestName ?? 'Khách') : table.hostName;

        // Practice mode handling
        if (table.mode === 'practice') {
          if (msg.scratch) {
            resetCueBallInKitchen(DEFAULT_TABLE_BOUNDS, table.balls);
          }
          if (Array.isArray(msg.pocketedBallIds)) {
            table.score1 += msg.pocketedBallIds.length;
          }
          client.send('bida:turn_changed', {
            turn: client.sessionId,
            scores: { score1: table.score1, score2: 0 },
            scratch: Boolean(msg.scratch),
            balls: table.balls,
          });
          return;
        }

        // 8-Ball group assignment upon first pocketed legal object ball (not cue and not 8-ball)
        if (table.mode === '8ball' && !table.hostGroup && Array.isArray(msg.pocketedBallIds)) {
          const firstObjId = msg.pocketedBallIds.find((id) => id > 0 && id !== 8);
          if (firstObjId) {
            const isSolid = firstObjId <= 7;
            const shooterGroup: 'solid' | 'stripe' = isSolid ? 'solid' : 'stripe';
            const oppGroup: 'solid' | 'stripe' = isSolid ? 'stripe' : 'solid';
            if (isHost) {
              table.hostGroup = shooterGroup;
              table.guestGroup = oppGroup;
            } else {
              table.guestGroup = shooterGroup;
              table.hostGroup = oppGroup;
            }
          }
        }

        const shooterGroup = isHost ? table.hostGroup : table.guestGroup;

        // 8-Ball win/loss logic
        if (msg.eightBallPocketed) {
          const remainingOwnBalls = shooterGroup
            ? table.balls.filter((b) => b.type === shooterGroup && !b.pocketed).length
            : 999;

          if (remainingOwnBalls > 0 || msg.scratch || !shooterGroup) {
            // Early 8-ball pocketed or 8-ball + scratch -> Loss!
            table.status = 'finished';
            this.sendToTable(table, 'bida:game_over', {
              winnerId: opponentId ?? '',
              winnerName: opponentName,
              reason: `${shooterName} làm rơi bi số 8 khi chưa dọn sạch nhóm bi của mình! ${opponentName} thắng cuộc!`,
            });
          } else {
            // Legally pocketed 8-ball after clearing own group -> Win!
            table.status = 'finished';
            this.sendToTable(table, 'bida:game_over', {
              winnerId: client.sessionId,
              winnerName: shooterName,
              reason: `${shooterName} xuất sắc dọn sạch toàn bộ nhóm bi và đưa bi số 8 vào lỗ thành công!`,
            });
          }
          this.broadcastTablesUpdate();
          return;
        }

        // Scratch handling: reset cue ball
        if (msg.scratch) {
          resetCueBallInKitchen(DEFAULT_TABLE_BOUNDS, table.balls);
        }

        const pocketed = Array.isArray(msg.pocketedBallIds) ? msg.pocketedBallIds.length : 0;
        if (isHost) {
          table.score1 += pocketed;
        } else {
          table.score2 += pocketed;
        }

        // Turn switching: player continues turn only if pocketed own ball and didn't scratch
        let legallyPocketedOwn = false;
        if (shooterGroup && Array.isArray(msg.pocketedBallIds)) {
          legallyPocketedOwn = msg.pocketedBallIds.some((id) => {
            const b = table.balls.find((ball) => ball.id === id);
            return b?.type === shooterGroup;
          });
        } else if (!shooterGroup && Array.isArray(msg.pocketedBallIds)) {
          legallyPocketedOwn = msg.pocketedBallIds.some((id) => id > 0 && id !== 8);
        }

        let nextTurn = table.turn;
        if (msg.scratch || !legallyPocketedOwn) {
          nextTurn = opponentId ?? table.hostId;
        }
        table.turn = nextTurn;

        this.sendToTable(table, 'bida:turn_changed', {
          turn: nextTurn,
          scores: { score1: table.score1, score2: table.score2 },
          scratch: Boolean(msg.scratch),
          balls: table.balls,
          hostGroup: table.hostGroup,
          guestGroup: table.guestGroup,
        });
      },
    );

    this.onMessage('bida:rematch', (client, msg: { tableId?: string }) => {
      if (!msg.tableId) return;
      const table = this.tables.get(msg.tableId);
      if (!table) return;

      table.balls = table.mode === 'carom' ? createCaromRack() : createStandard8BallRack();
      table.status = 'playing';
      table.score1 = 0;
      table.score2 = 0;
      table.turn = table.hostId;
      table.hostGroup = undefined;
      table.guestGroup = undefined;

      this.sendToTable(table, 'bida:table_start', table);
      this.broadcastTablesUpdate();
    });
  }

  override async onLeave(client: Client, consented: boolean) {
    await super.onLeave(client, consented);
    for (const [tableId] of this.tables) {
      this.handlePlayerLeaveTable(client.sessionId, tableId);
    }
  }

  private handlePlayerLeaveTable(sessionId: string, tableId: string) {
    const table = this.tables.get(tableId);
    if (!table) return;

    if (table.hostId === sessionId) {
      if (table.status === 'playing' && table.guestId) {
        const guestClient = this.clients.find((c) => c.sessionId === table.guestId);
        guestClient?.send('bida:game_over', {
          winnerId: table.guestId,
          winnerName: table.guestName ?? 'Bạn',
          reason: `${table.hostName} đã rời trận đấu. Bạn thắng do đối thủ bỏ cuộc!`,
        });
      }
      this.tables.delete(tableId);
      this.broadcastTablesUpdate();
    } else if (table.guestId === sessionId) {
      if (table.status === 'playing') {
        const hostClient = this.clients.find((c) => c.sessionId === table.hostId);
        hostClient?.send('bida:game_over', {
          winnerId: table.hostId,
          winnerName: table.hostName,
          reason: `${table.guestName} đã rời trận đấu. Bạn thắng do đối thủ bỏ cuộc!`,
        });
      }
      table.guestId = undefined;
      table.guestName = undefined;
      table.guestUserId = undefined;
      table.status = 'waiting';
      this.broadcastTablesUpdate();
    }
  }

  private sendToTable(table: BidaTable, event: string, payload: unknown) {
    for (const c of this.clients) {
      if (c.sessionId === table.hostId || (table.guestId && c.sessionId === table.guestId)) {
        c.send(event, payload);
      }
    }
  }

  private broadcastTablesUpdate() {
    const summaries = this.getTableSummaries();
    for (const c of this.clients) {
      c.send('bida:tables_update', summaries);
    }
  }

  private getTableSummaries() {
    return Array.from(this.tables.values()).map((t) => ({
      id: t.id,
      name: t.name,
      mode: t.mode,
      hostId: t.hostId,
      hostName: t.hostName,
      guestId: t.guestId,
      guestName: t.guestName,
      status: t.status,
      score1: t.score1,
      score2: t.score2,
      turn: t.turn,
    }));
  }
}
