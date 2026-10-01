import type { Client } from '@colyseus/core';
import {
  BIDA_BLOCKERS,
  BIDA_COLS,
  BIDA_ROWS,
  BIDA_SPAWN,
  createBidaShotTracker,
  trackBidaShot,
  stepBilliardsPhysics,
  createStandardPockets,
  getLegalTargetsForGroup,
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
  private shots = new Map<
    string,
    {
      shooterId: string;
      elapsed: number;
      ticks: number;
      pocketed: number[];
      scratch: boolean;
      eight: boolean;
      legalTargets: number[];
      tracker: ReturnType<typeof createBidaShotTracker>;
    }
  >();
  private isMember(table: BidaTable, sid: string) {
    return table.hostId === sid || table.guestId === sid;
  }
  private hasTable(sid: string) {
    return [...this.tables.values()].some((t) => this.isMember(t, sid));
  }
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
      const table = [...this.tables.values()].find((t) => this.isMember(t, client.sessionId));
      if (table) client.send('bida:table_start', { ...table, simulating: this.shots.has(table.id) });
    });

    this.onMessage(
      'bida:create_table',
      (client, msg: { name?: string; mode?: '8ball' | 'carom' | 'practice' }) => {
        const p = this.state.players.get(client.sessionId);
        if (!p || this.hasTable(client.sessionId) || !msg || typeof msg !== 'object') return;
        if (msg.mode !== undefined && !['8ball', 'carom', 'practice'].includes(msg.mode)) return;
        if (msg.name !== undefined && typeof msg.name !== 'string') return;

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
      if (!msg || typeof msg.tableId !== 'string') return;
      const table = this.tables.get(msg.tableId);
      const p = this.state.players.get(client.sessionId);
      if (
        !table ||
        !p ||
        table.mode === 'practice' ||
        table.status !== 'waiting' ||
        this.hasTable(client.sessionId)
      )
        return;

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
      if (!msg || typeof msg.tableId !== 'string') return;
      this.handlePlayerLeaveTable(client.sessionId, msg.tableId);
    });

    this.onMessage('bida:aim', (client, msg: { tableId?: string; angle?: number }) => {
      if (
        !msg ||
        typeof msg.tableId !== 'string' ||
        typeof msg.angle !== 'number' ||
        !Number.isFinite(msg.angle)
      )
        return;
      const table = this.tables.get(msg.tableId);
      if (
        !table ||
        table.status !== 'playing' ||
        !this.isMember(table, client.sessionId) ||
        table.turn !== client.sessionId ||
        this.shots.has(table.id)
      )
        return;

      const opponent = client.sessionId === table.hostId ? table.guestId : table.hostId;
      if (opponent) {
        const oppClient = this.clients.find((c) => c.sessionId === opponent);
        oppClient?.send('bida:opponent_aim', { angle: msg.angle });
      }
    });

    this.onMessage('bida:shot', (client, msg: { tableId?: string; angle?: number; power?: number }) => {
      if (
        !msg ||
        typeof msg.tableId !== 'string' ||
        typeof msg.angle !== 'number' ||
        typeof msg.power !== 'number' ||
        !Number.isFinite(msg.angle) ||
        !Number.isFinite(msg.power)
      )
        return;
      const table = this.tables.get(msg.tableId);
      if (
        !table ||
        table.status !== 'playing' ||
        !this.isMember(table, client.sessionId) ||
        table.turn !== client.sessionId ||
        this.shots.has(table.id)
      )
        return;
      const cue = table.balls.find((b) => b.id === 0 && !b.pocketed);
      if (!cue) return;
      const power = Math.min(100, Math.max(1, msg.power));
      const angle = msg.angle % (Math.PI * 2);
      const group = client.sessionId === table.hostId ? table.hostGroup : table.guestGroup;
      this.shots.set(table.id, {
        shooterId: client.sessionId,
        elapsed: 0,
        ticks: 0,
        pocketed: [],
        scratch: false,
        eight: false,
        legalTargets: getLegalTargetsForGroup(table.balls, group ?? null),
        tracker: createBidaShotTracker(),
      });
      this.sendToTable(table, 'bida:shot_executed', { shooterId: client.sessionId, angle, power });
      const force = 4 + (power / 100) * 32;
      cue.vx = Math.cos(angle) * force;
      cue.vy = Math.sin(angle) * force;
    });

    // Client settlement claims are ignored. Only tick() can resolve a shot.
    this.onMessage('bida:shot_settled', () => undefined);

    this.onMessage('bida:rematch', (client, msg: { tableId?: string }) => {
      if (!msg || typeof msg.tableId !== 'string') return;
      const table = this.tables.get(msg.tableId);
      if (
        !table ||
        !this.isMember(table, client.sessionId) ||
        this.shots.has(table.id) ||
        (table.mode !== 'practice' && table.status !== 'finished') ||
        (table.mode !== 'practice' && !table.guestId)
      )
        return;

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

  protected override tick(dtMs: number) {
    super.tick(dtMs);
    for (const [id, shot] of this.shots) {
      const table = this.tables.get(id);
      if (!table || table.status !== 'playing') {
        this.shots.delete(id);
        continue;
      }
      shot.elapsed += Math.min(dtMs, 250);
      while (shot.elapsed >= 16) {
        shot.elapsed -= 16;
        const step = stepBilliardsPhysics(
          table.balls,
          DEFAULT_TABLE_BOUNDS,
          table.mode === 'carom' ? [] : createStandardPockets(),
        );
        trackBidaShot(shot.tracker, step);
        for (const ballId of step.pocketedThisStep) {
          if (ballId === 0) shot.scratch = true;
          else if (ballId === 8) shot.eight = true;
          else shot.pocketed.push(ballId);
        }
        if (!step.anyMoving || ++shot.ticks >= 1600) {
          table.balls.forEach((b) => {
            b.vx = 0;
            b.vy = 0;
          });
          this.shots.delete(id);
          this.settleShot(table, shot.shooterId, {
            pocketedBallIds: shot.pocketed,
            scratch: shot.scratch,
            eightBallPocketed: shot.eight,
            foul:
              !shot.legalTargets.includes(shot.tracker.firstHit ?? -1) ||
              (shot.eight && !shot.legalTargets.includes(8)),
            caromPoint: shot.tracker.caromPoint,
          });
          break;
        }
      }
    }
  }

  private settleShot(
    table: BidaTable,
    shooterId: string,
    msg: {
      pocketedBallIds: number[];
      scratch: boolean;
      eightBallPocketed: boolean;
      foul: boolean;
      caromPoint: boolean;
    },
  ) {
    if (table.mode === 'carom') {
      const point = msg.caromPoint ? 1 : 0;
      if (shooterId === table.hostId) table.score1 += point;
      else table.score2 += point;
      if (!point) table.turn = shooterId === table.hostId ? (table.guestId ?? table.hostId) : table.hostId;
      if (table.score1 >= 10 || table.score2 >= 10) {
        table.status = 'finished';
        this.sendToTable(table, 'bida:game_over', {
          winnerId: shooterId,
          winnerName: shooterId === table.hostId ? table.hostName : table.guestName,
          reason: 'Đạt 10 điểm carom 3 băng.',
        });
        this.broadcastTablesUpdate();
      } else
        this.sendToTable(table, 'bida:turn_changed', {
          turn: table.turn,
          scores: { score1: table.score1, score2: table.score2 },
          scratch: false,
          balls: table.balls,
        });
      return;
    }
    const isHost = shooterId === table.hostId;
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
      this.sendToTable(table, 'bida:turn_changed', {
        turn: shooterId,
        scores: { score1: table.score1, score2: 0 },
        scratch: Boolean(msg.scratch),
        balls: table.balls,
      });
      return;
    }

    // 8-Ball group assignment upon first pocketed legal object ball (not cue and not 8-ball)
    if (
      table.mode === '8ball' &&
      !msg.scratch &&
      !msg.foul &&
      !table.hostGroup &&
      Array.isArray(msg.pocketedBallIds)
    ) {
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

      if (remainingOwnBalls > 0 || msg.scratch || msg.foul || !shooterGroup) {
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
          winnerId: shooterId,
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
    if (msg.scratch || msg.foul || !legallyPocketedOwn) {
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
  }

  override async onLeave(client: Client, consented: boolean) {
    await super.onLeave(client, consented);
    if (this.state.players.has(client.sessionId)) return;
    for (const [tableId] of this.tables) {
      this.handlePlayerLeaveTable(client.sessionId, tableId);
    }
  }

  private handlePlayerLeaveTable(sessionId: string, tableId: string) {
    const table = this.tables.get(tableId);
    if (!table) return;

    if (!this.isMember(table, sessionId)) return;
    this.shots.delete(tableId);
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
      table.balls = table.mode === 'carom' ? createCaromRack() : createStandard8BallRack();
      table.turn = table.hostId;
      table.score1 = 0;
      table.score2 = 0;
      table.hostGroup = undefined;
      table.guestGroup = undefined;
      this.sendToTable(table, 'bida:table_start', table);
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
