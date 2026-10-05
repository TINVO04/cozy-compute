import { randomUUID } from 'node:crypto';
import type { Client } from '@colyseus/core';
import {
  CAVE_BLOCKERS,
  CAVE_GATE,
  CAVE_HEIGHT,
  CAVE_MAX_FLOOR,
  CAVE_RESOURCES,
  CAVE_SHOP,
  CAVE_SPAWN,
  CAVE_STAIRS,
  CAVE_WEAPONS,
  CAVE_WIDTH,
  caveFloor,
  caveNear,
  MARTIAL_SKILLS,
  type CaveAccount,
  type CaveEffect,
  type CaveEnemy,
  type CaveOre,
  type CaveResource,
  type CaveSnapshot,
} from '@cozy/game-data';
import type { SessionInfo } from '../api.js';
import { BaseRoom, getDeps, type WorldSpec, type ClientData } from './base.js';
import type { PlayerState } from '../schema.js';
import { CaveCombat } from './cave-combat.js';

/** Private expeditions share the MMO movement/chat protocol. All combat is simulated here. */
export class CaveRoom extends BaseRoom {
  override maxClients = 1;
  private ownerId = '';
  private floor = 0;
  private hp = 100;
  private enemies: CaveEnemy[] = [];
  private ores: CaveOre[] = [];
  private account: CaveAccount | null = null;
  private nextAction = 0;
  private lastSnapshot = 0;
  private busy = false;
  private runId = randomUUID();
  private pendingLoot: { requestId: string; item: CaveResource; quantity: number; x: number; y: number }[] =
    [];
  private nextLootRetry = 0;
  private combat = new CaveCombat((effect) => this.broadcast('cave:martial', effect));

  protected override playerSpeedFor(d: ClientData, p: PlayerState) {
    return this.combat.busy || this.hp <= 0 ? 0 : super.playerSpeedFor(d, p);
  }

  protected world(): WorldSpec {
    return { width: CAVE_WIDTH, height: CAVE_HEIGHT, blockers: CAVE_BLOCKERS, spawn: CAVE_SPAWN };
  }
  protected presenceKey() {
    return `cave:${this.ownerId}`;
  }

  override onCreate(options: { ownerId?: string }) {
    if (!options.ownerId) throw new Error('Thiếu người khám phá.');
    this.ownerId = options.ownerId;
    this.setup();
    this.state.kind = 'cave';
    this.state.label = 'Cửa Hang Ngọc';
    this.onMessage('cave:sync', (client) => this.snapshot(client));
    this.onMessage('cave:action', (client, msg: unknown) => {
      if (!msg || typeof msg !== 'object') return;
      const action = (msg as { action?: unknown }).action;
      if (typeof action !== 'string') return;
      if (action === 'cast') {
        const skill = (msg as { skill?: unknown }).skill;
        const p = this.state.players.get(client.sessionId);
        const now = Date.now();
        if (
          typeof skill === 'string' &&
          p?.connected &&
          this.floor &&
          this.hp > 0 &&
          now >= this.nextAction
        ) {
          if (this.combat.start(skill, p, client.sessionId, now)) {
            this.nextAction = now + 450;
            this.snapshot();
          }
        }
        return;
      }
      if (action === 'attack' || action === 'interact' || action === 'retreat') this.action(client, action);
      else if (action === 'buy' || action === 'sell') {
        const b = msg as { item?: unknown; requestId?: unknown };
        if (typeof b.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(b.requestId)) return;
        void this.trade(client, action, b.requestId, typeof b.item === 'string' ? b.item : undefined);
      }
    });
  }

  override async onAuth(client: Client, options: { token?: string; ownerId?: string }) {
    const session = (await super.onAuth(client, options)) as SessionInfo;
    if (session.userId !== this.ownerId || !(await getDeps().redis.get(`cave:entry:${session.userId}`)))
      throw new Error('Hãy đi đến cuối đường bên phải thị trấn để vào hang.');
    this.account = await getDeps().api.cave({
      userId: session.userId,
      action: 'load',
      requestId: randomUUID(),
    });
    const learned = await getDeps().redis.smembers(`martial:skills:${session.userId}`);
    this.combat.learned = MARTIAL_SKILLS.filter((s) => s.id === 'slash' || learned.includes(s.id)).map(
      (s) => s.id,
    );
    return session;
  }

  private snapshot(client?: Client) {
    if (!this.account) return;
    const data: CaveSnapshot = {
      floor: this.floor,
      hp: this.hp,
      account: this.account,
      enemies: this.enemies,
      ores: this.ores,
      cleared: this.floor > 0 && this.enemies.every((e) => e.hp <= 0),
      combat: {
        now: Date.now(),
        learned: this.combat.learned,
        energy: this.combat.energy,
        cooldowns: this.combat.cooldowns,
        casting: this.combat.casting,
        guardUntil: this.combat.guardUntil,
      },
    };
    if (client) client.send('cave:state', data);
    else this.broadcast('cave:state', data);
  }
  private effect(effect: CaveEffect) {
    this.broadcast('cave:effect', effect);
  }
  private notice(client: Client, text: string) {
    client.send('notice', { kind: 'info', text });
  }

  private enterFloor(floor: number, client: Client) {
    if (this.pendingLoot.length || this.busy) {
      this.notice(client, 'Đang cất vật phẩm vào túi. Vui lòng đợi một chút.');
      return;
    }
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    this.combat.cancel();
    this.floor = floor;
    this.state.label = floor ? `Hang Ngọc · Tầng ${floor}` : 'Cửa Hang Ngọc';
    this.runId = randomUUID();
    const contents = floor ? caveFloor(floor) : { enemies: [], ores: [] };
    this.enemies = contents.enemies;
    this.ores = contents.ores;
    p.x = CAVE_SPAWN.x;
    p.y = CAVE_SPAWN.y;
    if (!floor) {
      this.hp = 100;
      this.combat.energy = 100;
    }
    this.nextAction = Date.now() + 600;
    this.effect({ kind: 'portal', x: p.x, y: p.y });
    this.snapshot();
  }

  private action(client: Client, action: 'attack' | 'interact' | 'retreat') {
    const p = this.state.players.get(client.sessionId);
    const now = Date.now();
    if (!p?.connected || !this.account || now < this.nextAction || this.hp <= 0) return;
    if (this.combat.busy && action !== 'retreat') return;
    this.nextAction = now + 450;
    if (action === 'retreat') {
      this.enterFloor(0, client);
      return;
    }
    if (!this.floor) {
      if (action !== 'interact') return;
      if (caveNear(p, CAVE_GATE, 96)) this.enterFloor(1, client);
      else if (caveNear(p, CAVE_SHOP, 110)) client.send('cave:shop', {});
      else if (p.x < 160) client.send('cave:exit', {});
      return;
    }
    if (action === 'interact') {
      const ore = this.ores.find((o) => o.hp > 0 && caveNear(p, o, 66));
      if (ore) {
        ore.hp--;
        this.effect({ kind: 'mine', x: ore.x, y: ore.y });
        if (!ore.hp) this.loot(ore.id, ore.resource, 2 + this.floor, ore.x, ore.y);
      } else if (caveNear(p, CAVE_STAIRS)) {
        if (this.enemies.some((e) => e.hp > 0))
          this.notice(client, 'Hạ hết quái để mở lối xuống tầng tiếp theo.');
        else if (this.floor === CAVE_MAX_FLOOR) {
          this.notice(client, 'Đã chinh phục Hang Ngọc! Trở về shop để bán chiến lợi phẩm.');
          this.enterFloor(0, client);
        } else this.enterFloor(this.floor + 1, client);
      } else if (p.x < 160) this.enterFloor(0, client);
    } else {
      const target = this.enemies
        .filter((e) => e.hp > 0 && caveNear(p, e, 82))
        .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0];
      const angle = target
        ? Math.atan2(target.y - p.y, target.x - p.x)
        : [Math.PI / 2, Math.PI, 0, -Math.PI / 2][p.dir];
      this.effect({
        kind: 'slash',
        x: p.x,
        y: p.y,
        angle,
        color: CAVE_WEAPONS.find((w) => w.id === this.account!.weapon)!.color,
      });
      if (target) {
        const damage = CAVE_WEAPONS.find((w) => w.id === this.account!.weapon)!.damage;
        this.damageEnemy(target, damage);
      }
    }
    this.snapshot();
  }

  private damageEnemy(target: CaveEnemy, damage: number) {
    if (target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - damage);
    this.effect({ kind: 'hit', x: target.x, y: target.y, amount: damage });
    if (!target.hp) {
      this.effect({ kind: 'defeat', x: target.x, y: target.y });
      this.loot(
        target.id,
        target.kind === 'golem' || this.floor >= 3 ? 'crystal' : 'iron',
        target.kind === 'golem' ? 12 : 2,
        target.x,
        target.y,
      );
    }
  }

  private loot(id: string, item: CaveResource, quantity: number, x: number, y: number) {
    this.pendingLoot.push({ requestId: `${this.runId}:${id}`, item, quantity, x, y });
    void this.flushLoot();
  }
  private async flushLoot() {
    if (this.busy || !this.pendingLoot.length || Date.now() < this.nextLootRetry) return;
    this.busy = true;
    const loot = this.pendingLoot[0]!;
    try {
      this.account = await getDeps().api.cave({ userId: this.ownerId, action: 'loot', ...loot });
      this.pendingLoot.shift();
      const resource = CAVE_RESOURCES.find((r) => r.id === loot.item)!;
      this.effect({
        kind: 'loot',
        x: loot.x,
        y: loot.y,
        amount: loot.quantity,
        label: resource.name,
        color: resource.color,
      });
      this.snapshot();
    } catch {
      this.nextLootRetry = Date.now() + 2000;
      this.broadcast('notice', {
        kind: 'warning',
        text: 'Đang thử lưu lại chiến lợi phẩm. Hãy đợi trước khi rời hang.',
      });
    } finally {
      this.busy = false;
    }
  }

  private async trade(client: Client, action: 'buy' | 'sell', requestId: string, item?: string) {
    const p = this.state.players.get(client.sessionId);
    if (!p?.connected || this.floor || this.busy || !caveNear(p, CAVE_SHOP, 110)) return;
    this.busy = true;
    try {
      this.account = await getDeps().api.cave({ userId: this.ownerId, action, requestId, item });
      this.snapshot();
      this.effect({
        kind: 'loot',
        x: p.x,
        y: p.y,
        label: action === 'buy' ? 'Đã trang bị vũ khí!' : 'Đã nhận Coin!',
        color: 0xffd785,
      });
      client.send('cave:trade', { ok: true });
    } catch (error) {
      client.send('cave:trade', {
        ok: false,
        message: error instanceof Error ? error.message : 'Giao dịch thất bại.',
      });
    } finally {
      this.busy = false;
    }
  }

  protected override tick(dtMs: number) {
    super.tick(dtMs);
    const now = Date.now();
    const p = this.state.players.values().next().value;
    if (!p?.connected || this.hp <= 0) this.combat.cancel();
    if (p?.connected && this.floor && this.hp > 0) {
      this.combat.update(
        p,
        this.enemies,
        this.account?.weapon ?? 'training',
        now,
        dtMs,
        (enemy, damage) => this.damageEnemy(enemy, damage),
        (amount) => {
          const restored = Math.min(amount, 100 - this.hp);
          this.hp += restored;
          return restored;
        },
      );
      for (const enemy of this.enemies) {
        if (!enemy.hp) continue;
        const distance = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (enemy.windup) {
          if (now >= enemy.windup) {
            enemy.windup = 0;
            enemy.nextAttack = now + 1200;
            this.effect({
              kind: 'slash',
              x: enemy.x,
              y: enemy.y,
              angle: Math.atan2(p.y - enemy.y, p.x - enemy.x),
              color: 0xff7b8d,
            });
            if (distance < 64) {
              const baseDamage = enemy.kind === 'golem' ? 24 : 4 + this.floor * 2;
              const damage = Math.ceil(baseDamage * (now < this.combat.guardUntil ? 0.25 : 1));
              this.hp = Math.max(0, this.hp - damage);
              this.effect({ kind: 'hurt', x: p.x, y: p.y, amount: damage });
            }
          }
        } else if (distance < 48 && now >= enemy.nextAttack) {
          enemy.windup = now + 650;
        } else if (distance > 36 && distance < 250) {
          const speed = enemy.kind === 'bat' ? 72 : enemy.kind === 'golem' ? 32 : 48;
          const step = Math.min(distance - 36, (speed * Math.min(dtMs, 100)) / 1000);
          enemy.x += ((p.x - enemy.x) / distance) * step;
          enemy.y += ((p.y - enemy.y) / distance) * step;
        }
        if (!this.hp) break;
      }
      if (!this.hp) {
        const client = this.clients[0];
        if (client) {
          this.notice(client, 'Bạn đã kiệt sức. Được cứu về cửa hang, giữ lại tài nguyên đã nhặt.');
          this.enterFloor(0, client);
        }
      }
    }
    // A save in flight may delay rescue; retry after durable loot completes.
    if (!this.hp && !this.busy && !this.pendingLoot.length && this.clients[0])
      this.enterFloor(0, this.clients[0]);
    if (now - this.lastSnapshot >= 100) {
      this.lastSnapshot = now;
      this.snapshot();
    }
    void this.flushLoot();
  }
}
