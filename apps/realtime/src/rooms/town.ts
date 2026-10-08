import { MARTIAL_DOOR, caveNear, getBienHoaTime } from '@cozy/game-data';
import { randomUUID } from 'node:crypto';
import { TownLifeSimulation, type TownEnvironment } from '@cozy/game-data';
import { TownActorState } from '../schema.js';
import {
  drivingSpeed,
  onRoad,
  onDriveway,
  vehicleById,
  redLightCrossing,
  TRAFFIC_LABELS,
  TRAFFIC_FINES,
  PLAYER_SPEED,
  type TrafficViolation,
} from '@cozy/game-data';
import type { Client } from '@colyseus/core';
import { BLOCKERS, getTownReturnSpawn, MAP_HEIGHT, MAP_WIDTH, SPAWN } from '@cozy/game-data';
import type { SessionInfo } from '../api.js';
import { DuckState, EventState, type PlayerState } from '../schema.js';
import { BaseRoom, getDeps, type WorldSpec, type ClientData } from './base.js';

interface ActiveEvent {
  eventId: string;
  title: string;
  ducks: { id: string; x: number; y: number }[];
  endsAt: string;
  participants: string[];
}

const DUCK_RADIUS = 22;

export class TownRoom extends BaseRoom {
  private townLife = new TownLifeSimulation();
  private weather: TownEnvironment | null = null;

  setWeather(w: TownEnvironment) {
    this.weather = w;
  }

  private syncTownLife() {
    const active = new Set(this.townLife.actors.map((actor) => actor.id));
    for (const id of this.state.townActors.keys()) {
      if (!active.has(id)) this.state.townActors.delete(id);
    }
    for (const actor of this.townLife.actors) {
      let state = this.state.townActors.get(actor.id);
      if (!state) {
        state = new TownActorState();
        this.state.townActors.set(actor.id, state);
      }
      Object.assign(state, actor);
    }
  }
  override maxClients = 150;
  trafficEnforcementEnabled = false;
  private trafficStepMs = 50;
  private traffic = new Map<string, { x: number; y: number; offRoadMs: number; lastFine: number }>();
  private pendingFines = new Map<
    string,
    { ticketId: string; violation: TrafficViolation; retryAt: number; busy: boolean }
  >();
  private carriedCats = new Map<string, string>();
  private lastWeatherPoll = 0;
  private participants = new Set<string>();
  private eventTimer: NodeJS.Timeout | undefined;

  protected world(): WorldSpec {
    return { width: MAP_WIDTH, height: MAP_HEIGHT, blockers: BLOCKERS, spawn: SPAWN };
  }

  protected presenceKey() {
    return 'town';
  }

  override onCreate() {
    this.setup();
    this.state.kind = 'town';
    this.onMessage('showroom:enter', async (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p?.connected || !onDriveway(p.x, p.y)) {
        client.send('notice', {
          kind: 'warning',
          text: 'Đến cửa Gara Bạc Hà ở phía nam quảng trường để vào.',
        });
        return;
      }
      try {
        await getDeps().redis.set('showroom:entry:' + p.userId, '1', 'EX', 30);
        p.vehicle = '';
        client.send('showroom:travel', {});
      } catch {
        client.send('notice', { kind: 'warning', text: 'Chưa mở được cửa gara. Hãy thử lại.' });
      }
    });
    this.onMessage('martial:travel', async (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p?.connected || !caveNear(p, MARTIAL_DOOR, 100)) return;
      try {
        await getDeps().redis.set('martial:entry:' + p.userId, '1', 'EX', 30);
        client.send('martial:travel', {});
      } catch {
        client.send('notice', { kind: 'warning', text: 'Chưa mở được võ đường. Hãy thử lại.' });
      }
    });
    this.syncTownLife();
    void (async () => {
      try {
        const raw = await getDeps().redis.get('world:weather');
        if (raw) this.weather = JSON.parse(raw);
      } catch {
        // Redis optional in tests or offline
      }
    })();
    this.onMessage('town:talk', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.connected || !message || typeof message !== 'object') return;
      const reply = this.townLife.talk((message as { id?: unknown }).id, player);
      if (!reply) return;
      this.syncTownLife();
      client.send('town:dialogue', reply);
    });
    this.onMessage('town:cat:pickup', (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.connected || !message || typeof message !== 'object') return;
      const catId = (message as { id?: unknown }).id;
      if (typeof catId !== 'string') return;
      const cat = this.state.townActors.get(catId);
      if (!cat || cat.kind !== 'cat') return;
      if (Math.hypot(player.x - cat.x, player.y - cat.y) > 48) return;
      if (cat.mode === 'carried' || [...this.carriedCats.values()].includes(catId)) return;

      const success = this.townLife.pickUpCat(catId, client.sessionId, player);
      if (success) {
        this.carriedCats.set(client.sessionId, catId);
        this.syncTownLife();
      }
    });
    this.onMessage('town:cat:putdown', (client, _message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      if (!player?.connected) return;
      const catId = this.carriedCats.get(client.sessionId);
      if (!catId) return;

      const dropPos = { x: player.x, y: player.y + 4 };
      const success = this.townLife.putDownCat(catId, dropPos);
      if (success) {
        this.carriedCats.delete(client.sessionId);
        this.syncTownLife();
      }
    });
    this.onMessage('vehicle:toggle', (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (p.vehicle) {
        p.vehicle = '';
        return;
      }
      const vehicle = vehicleById(this.sessionFor(client.sessionId)?.appearance.vehicle);
      const text = !vehicle
        ? 'Hãy mua và chọn xe tại Gara Bạc Hà trước.'
        : this.trafficEnforcementEnabled && this.pendingFines.has(p.userId)
          ? 'Đang xử lý biên bản giao thông, vui lòng chờ.'
          : this.trafficEnforcementEnabled && !onRoad(p.x, p.y) && !onDriveway(p.x, p.y)
            ? 'Đến lòng đường hoặc sân gara để lên xe.'
            : '';
      if (text) {
        client.send('notice', { kind: 'warning', text });
        return;
      }
      p.vehicle = vehicle!.id;
      this.traffic.set(client.sessionId, {
        x: p.x,
        y: p.y,
        offRoadMs: 0,
        lastFine: this.traffic.get(client.sessionId)?.lastFine ?? 0,
      });
    });
    this.state.label = 'Town';
    this.onMessage('cave:travel', async (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || p.x < 46 * 32 || p.y < 320 || p.y > 384) return;
      try {
        await getDeps().redis.set(`cave:entry:${p.userId}`, '1', 'EX', 30);
        client.send('cave:travel', {});
      } catch {
        client.send('notice', { kind: 'warning', text: 'Chưa thể mở lối vào hang. Hãy thử lại.' });
      }
    });
    this.eventTimer = setInterval(() => void this.syncEvent(), 1000);
    void this.syncEvent();

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
    const catId = this.carriedCats.get(client.sessionId);
    if (catId) {
      const p = this.state.players.get(client.sessionId);
      const dropPos = p ? { x: p.x, y: p.y + 4 } : { x: 768, y: 550 };
      this.townLife.putDownCat(catId, dropPos);
      this.carriedCats.delete(client.sessionId);
      this.syncTownLife();
    }
    this.broadcast('fishing:remote_stop', { sessionId: client.sessionId });
    await super.onLeave(client, consented);
  }

  override onDispose() {
    this.carriedCats.clear();
    if (this.eventTimer) clearInterval(this.eventTimer);
  }

  protected override spawnFor(_session: SessionInfo, options?: unknown): { x: number; y: number } {
    const from = (options as { from?: string } | undefined)?.from;
    if (from) {
      return getTownReturnSpawn(from);
    }
    // Scatter slightly so a crowd does not stack on one pixel when spawning in central plaza.
    return {
      x: SPAWN.x + Math.round((Math.random() - 0.5) * 96),
      y: SPAWN.y + Math.round((Math.random() - 0.5) * 32),
    };
  }

  override onJoin(client: Client, options: unknown, session: SessionInfo) {
    super.onJoin(client, options, session);
    const p = this.state.players.get(client.sessionId);
    if (p) {
      p.inEvent = this.participants.has(session.userId);
      const optVehicle = (options as { vehicle?: string } | undefined)?.vehicle;
      if (optVehicle && optVehicle === session.appearance.vehicle && vehicleById(optVehicle)) {
        p.vehicle = optVehicle;
        this.traffic.set(client.sessionId, {
          x: p.x,
          y: p.y,
          offRoadMs: 0,
          lastFine: 0,
        });
        const data = this.data.get(client.sessionId);
        if (data) p.speed = this.playerSpeedFor(data, p);
      }
    }
  }

  /** Mirrors the event the API is running (stored in Redis) into room state. */
  async syncEvent() {
    const raw = await getDeps().redis.get('event:active');
    const active = raw ? (JSON.parse(raw) as ActiveEvent) : null;
    if (!active) {
      if (this.state.event) {
        this.state.event = undefined;
        this.participants.clear();
        this.state.players.forEach((p) => (p.inEvent = false));
      }
      return;
    }
    if (this.state.event?.id === active.eventId) return;
    const ev = new EventState();
    ev.id = active.eventId;
    ev.title = active.title;
    ev.endsAt = Date.parse(active.endsAt);
    const collected = await getDeps().redis.smembers(`event:${active.eventId}:collected`);
    for (const d of active.ducks) {
      if (collected.includes(d.id)) continue;
      const duck = new DuckState();
      duck.x = d.x;
      duck.y = d.y;
      ev.ducks.set(d.id, duck);
    }
    const scores = await getDeps().redis.hgetall(`event:${active.eventId}:scores`);
    for (const [uid, s] of Object.entries(scores)) ev.scores.set(uid, Number(s));
    this.participants = new Set(active.participants);
    this.state.players.forEach((p) => (p.inEvent = this.participants.has(p.userId)));
    this.state.event = ev;
    this.broadcast('notice', {
      kind: 'event',
      text: `${active.title} has started! Grab the ducks around town.`,
    });
  }

  protected override playerSpeedFor(_d: ClientData, p: PlayerState) {
    return p.vehicle ? drivingSpeed(p.vehicle, p.x, p.y, !this.trafficEnforcementEnabled) : PLAYER_SPEED;
  }

  protected override tick(dtMs: number) {
    this.trafficStepMs = Math.max(0, Math.min(250, dtMs));
    this.state.serverTime = Date.now();
    super.tick(dtMs);
    if (this.state.serverTime - this.lastWeatherPoll >= 5000) {
      this.lastWeatherPoll = this.state.serverTime;
      void (async () => {
        try {
          const raw = await getDeps().redis.get('world:weather');
          if (raw) this.weather = JSON.parse(raw);
        } catch {
          // Redis optional in tests or offline
        }
      })();
    }
    for (const [sid, catId] of this.carriedCats) {
      const player = this.state.players.get(sid);
      if (player?.connected) {
        this.townLife.updateCarrierPos(catId, { x: player.x, y: player.y });
      }
    }
    const bienHoa = getBienHoaTime(null, new Date(this.state.serverTime));
    const isOverridden = !!(this.weather as { isOverridden?: boolean } | null)?.isOverridden;
    const effectiveEnv: TownEnvironment = this.weather
      ? {
          ...this.weather,
          timePhase: isOverridden ? this.weather.timePhase : bienHoa.phase,
          solarHour: isOverridden ? this.weather.solarHour : bienHoa.solarHour,
          now: this.state.serverTime,
        }
      : {
          timePhase: bienHoa.phase,
          solarHour: bienHoa.solarHour,
          now: this.state.serverTime,
        };
    this.townLife.update(
      dtMs,
      this.state.serverTime,
      [...this.state.players.values()].filter((p) => p.connected),
      effectiveEnv,
    );
    this.syncTownLife();
    if (this.trafficEnforcementEnabled) {
      for (const [userId, fine] of this.pendingFines) {
        if (!fine.busy && Date.now() >= fine.retryAt) void this.settleFine(userId, fine);
      }
    } else if (this.pendingFines.size > 0) {
      this.pendingFines.clear();
    }
    for (const sid of this.traffic.keys()) if (!this.state.players.has(sid)) this.traffic.delete(sid);
  }

  private async settleFine(
    userId: string,
    fine: { ticketId: string; violation: TrafficViolation; retryAt: number; busy: boolean },
  ) {
    if (!this.trafficEnforcementEnabled) {
      this.pendingFines.delete(userId);
      return;
    }
    fine.busy = true;
    try {
      const result = await getDeps().api.trafficFine(userId, fine.ticketId, fine.violation);
      this.pendingFines.delete(userId);
      this.clientForUser(userId)?.send('traffic:fine', {
        ...result,
        violation: fine.violation,
        text: `${TRAFFIC_LABELS[fine.violation]}: phạt ${result.charged} Coin${result.charged < TRAFFIC_FINES[fine.violation] ? ' (giới hạn theo số dư)' : ''}. Xe đã dừng, nhấn V để lên lại trên đường.`,
      });
    } catch {
      fine.busy = false;
      fine.retryAt = Date.now() + 2000;
    }
  }

  protected override afterMove(p: PlayerState, _sessionId: string) {
    const now = Date.now();
    const prev = this.traffic.get(_sessionId);
    if (this.trafficEnforcementEnabled && p.vehicle && prev) {
      const moving = p.x !== prev.x || p.y !== prev.y;
      const offRoad = !onRoad(p.x, p.y) && !onDriveway(p.x, p.y);
      prev.offRoadMs = moving && offRoad ? prev.offRoadMs + this.trafficStepMs : 0;
      const violation: TrafficViolation | null = redLightCrossing(prev, p, now)
        ? 'red_light'
        : prev.offRoadMs >= 1000
          ? 'off_road'
          : null;
      if (violation && now - prev.lastFine >= 5000 && !this.pendingFines.has(p.userId)) {
        prev.lastFine = now;
        p.vehicle = '';
        this.pendingFines.set(p.userId, { ticketId: randomUUID(), violation, retryAt: 0, busy: false });
      }
    }
    if (prev) {
      prev.x = p.x;
      prev.y = p.y;
    }

    const ev = this.state.event;
    if (!ev || !p.inEvent || Date.now() > ev.endsAt) return;
    ev.ducks.forEach((duck, id) => {
      if (Math.hypot(duck.x - p.x, duck.y - p.y) > DUCK_RADIUS) return;
      ev.ducks.delete(id);
      void this.collect(ev.id, id, p);
    });
  }

  private async collect(eventId: string, duckId: string, p: PlayerState) {
    const { redis } = getDeps();
    // SADD is atomic across processes: only the first collector scores.
    const first = await redis.sadd(`event:${eventId}:collected`, duckId);
    if (!first) return;
    await redis.expire(`event:${eventId}:collected`, 3600);
    const score = await redis.hincrby(`event:${eventId}:scores`, p.userId, 1);
    this.state.event?.scores.set(p.userId, score);
    this.broadcast('notice', { kind: 'duck', text: `${p.name} found a duck!` });
  }
}
