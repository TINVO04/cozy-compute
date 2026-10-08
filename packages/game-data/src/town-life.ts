import { BLOCKERS, MAP_HEIGHT, MAP_WIDTH } from './map.js';
import { redLightCrossing } from './vehicles.js';
import { getBienHoaTime, type TimeOfDayPhase, type WeatherCondition } from './weather.js';

export interface LifePoint {
  x: number;
  y: number;
}
export interface TownActor extends LifePoint {
  id: string;
  kind: string;
  variant: number;
  mode: string;
  dir: number;
  moving: boolean;
  altitude: number;
  speech: string;
}
export const VENDOR_RADIUS = 72;

export interface TownEnvironment {
  condition?: WeatherCondition | string | null;
  precipitationMm?: number | null;
  timePhase?: TimeOfDayPhase | string | null;
  solarHour?: number | null;
  now?: Date | number | null;
  isRaining?: boolean;
  isNight?: boolean;
}

export function isRainyOrStormy(condition?: string | null, precipitationMm?: number | null): boolean {
  if (precipitationMm !== undefined && precipitationMm !== null && precipitationMm > 0) return true;
  if (!condition) return false;
  return (
    condition === 'drizzle' ||
    condition === 'rain' ||
    condition === 'heavy_rain' ||
    condition === 'thunderstorm'
  );
}

export function isNightTime(
  phase?: string | null,
  solarHour?: number | null,
  now?: Date | number | null,
): boolean {
  if (phase) return phase === 'night';
  if (solarHour !== undefined && solarHour !== null) return solarHour >= 18.5 || solarHour < 5.0;
  if (now !== undefined && now !== null) {
    const d = typeof now === 'number' ? new Date(now) : now;
    return getBienHoaTime(null, d).phase === 'night';
  }
  return false;
}

export function shouldHideTownLife(env?: TownEnvironment | null): boolean {
  if (!env) return false;
  if (env.isRaining || env.isNight) return true;
  if (isRainyOrStormy(env.condition, env.precipitationMm)) return true;
  if (isNightTime(env.timePhase, env.solarHour, env.now)) return true;
  return false;
}
export const STREET_VENDORS = [
  {
    name: 'Cô Lan · Bánh mì',
    call: 'Bánh mì nóng giòn đây!',
    lines: [
      'Cô đạp một vòng phố là bánh vừa thơm tới!',
      'Bí quyết của cô là dưa chua giòn và bánh mới ra lò.',
      'Con cứ dạo phố đi, lát cô lại ghé ngang nhé!',
    ],
  },
  {
    name: 'Chú Tư · Cà phê',
    call: 'Cà phê phin thơm đây!',
    lines: [
      'Chú vừa pha xong một mẻ cà phê phin.',
      'Sáng đạp xe quanh Biên Hòa, chiều ngắm sông là vui rồi.',
      'Quán Bean There ở phía bắc cũng có chỗ ngồi rất mát đấy!',
    ],
  },
  {
    name: 'Dì Sáu · Trái cây',
    call: 'Ổi, xoài ngọt đây bà con!',
    lines: [
      'Trái cây hôm nay dì lựa từ sớm đó.',
      'Mấy chú mèo ở quảng trường cứ đi theo xe dì suốt.',
      'Nhớ đi chậm qua đàn chim nhé, chúng đang ăn hạt.',
    ],
  },
  {
    name: 'Anh Bình · Kem',
    call: 'Kem mát lạnh đây!',
    lines: [
      'Chuông xe leng keng là biết anh tới rồi!',
      'Chạy xe bán kem quanh phố vui nhất lúc gặp mấy bạn nhỏ.',
      'Anh nghỉ chân một chút rồi lại đạp xe tiếp đây.',
    ],
  },
  {
    name: 'Cô Hạnh · Hoa',
    call: 'Hoa tươi cho một ngày vui!',
    lines: [
      'Xe cô chở cúc vàng với vài bó hoa hồng.',
      'Có nắng nhẹ thế này hoa giữ màu đẹp lắm.',
      'Cô sẽ ghé quảng trường rồi vòng về con đường phía nam.',
    ],
  },
  {
    name: 'Bác Năm · Bắp',
    call: 'Bắp luộc nóng hổi đây!',
    lines: [
      'Bắp mới luộc còn thơm lắm con ơi.',
      'Bác bán rong ở khu phố này bao nhiêu năm rồi.',
      'Dừng xe nói chuyện với con một lát cũng vui!',
    ],
  },
] as const;

// Main street connects the west/east map gates. Leave enough space outside
// the world for the entire bicycle and speech bubble to enter/exit naturally.
const VENDOR_OFFSCREEN_MARGIN = 128;
export const MAX_PASSING_VENDORS = 4;
export const PIGEON_FEEDING_SPOTS = [
  { x: 700, y: 596 },
  { x: 862, y: 562 },
  { x: 670, y: 414 },
];
export function lifeGroundClear(x: number, y: number, padding = 6): boolean {
  return (
    x > 40 &&
    y > 40 &&
    x < MAP_WIDTH - 40 &&
    y < MAP_HEIGHT - 40 &&
    !BLOCKERS.some(
      (r) => x > r.x - padding && x < r.x + r.w + padding && y > r.y - padding && y < r.y + r.h + padding,
    )
  );
}
interface Brain {
  home: LifePoint;
  target: LifePoint;
  timer: number;
  age: number;
  line: number;
  cooldown: number;
  carrierId?: string;
}

/** Runs only in the authoritative room (and isolated rendering fixtures). */
export class TownLifeSimulation {
  readonly actors: TownActor[] = [];
  private residents: TownActor[] = [];
  private brains = new Map<string, Brain>();
  private nextVendorIn = 0;
  private visitSerial = 0;
  private lastVendorVariant = -1;
  private hidden = false;
  constructor(private random: () => number = Math.random) {
    const add = (kind: string, variant: number, p: LifePoint) => {
      if (kind !== 'vendor' && !lifeGroundClear(p.x, p.y)) {
        const original = p;
        search: for (let radius = 8; radius < 120; radius += 8) {
          for (let direction = 0; direction < 8; direction++) {
            const angle = (direction * Math.PI) / 4;
            const candidate = {
              x: original.x + Math.cos(angle) * radius,
              y: original.y + Math.sin(angle) * radius,
            };
            if (lifeGroundClear(candidate.x, candidate.y)) {
              p = candidate;
              break search;
            }
          }
        }
      }
      const id = `${kind}-${this.actors.length}`;
      const actor: TownActor = {
        id,
        kind,
        variant,
        ...p,
        mode: kind === 'pigeon' ? 'feeding' : 'roaming',
        dir: 2,
        moving: false,
        altitude: 0,
        speech: '',
      };
      this.actors.push(actor);
      if (kind !== 'vendor') {
        this.residents.push(actor);
      }
      const isCat = kind === 'cat';
      const initialTarget = isCat ? this.wander(p, 48) : { ...p };
      this.brains.set(id, {
        home: { ...p },
        target: initialTarget,
        timer: isCat ? 0.3 + random() * 1.2 : 1 + random() * 3,
        age: random() * 15,
        line: 0,
        cooldown: 0,
      });
    };
    [
      { x: 120, y: 140 }, // North-West near Pagoda / Western gate
      { x: 260, y: 720 }, // South-West near Com Ga 68 & Bida club
      { x: 760, y: 550 }, // Central Park & Fountain
      { x: 1210, y: 350 }, // North-East near Apartments & Furniture
      { x: 1080, y: 840 }, // South-East near Pier & Uncle Ba's Fishing Shop
    ].forEach((p, i) => add('cat', i, p));
    PIGEON_FEEDING_SPOTS.forEach((p, flock) => {
      for (let i = 0; i < 3; i++)
        add('pigeon', flock, {
          x: p.x + Math.cos(i * 2.4) * (12 + i * 3),
          y: p.y + Math.sin(i * 2.4) * (10 + i * 3),
        });
    });
    this.arriveVendor();
  }

  private arriveVendor() {
    if (this.hidden) return;
    const visitors = this.actors.filter((a) => a.kind === 'vendor');
    if (visitors.length >= MAX_PASSING_VENDORS) {
      this.nextVendorIn = 3;
      return;
    }
    const available = STREET_VENDORS.map((_, i) => i).filter(
      (i) => i !== this.lastVendorVariant && !visitors.some((a) => a.variant === i),
    );
    const variant = available[Math.floor(this.random() * available.length)]!;
    const eastbound = this.random() < 0.5;
    const start = {
      x: eastbound ? -VENDOR_OFFSCREEN_MARGIN : MAP_WIDTH + VENDOR_OFFSCREEN_MARGIN,
      y: eastbound ? 362 : 342,
    };
    const target = {
      x: eastbound ? MAP_WIDTH + VENDOR_OFFSCREEN_MARGIN : -VENDOR_OFFSCREEN_MARGIN,
      y: start.y,
    };
    const id = `vendor-${this.visitSerial++}`;
    this.actors.push({
      id,
      kind: 'vendor',
      variant,
      ...start,
      mode: 'riding',
      dir: eastbound ? 2 : 1,
      moving: true,
      altitude: 0,
      speech: '',
    });
    this.brains.set(id, { home: start, target, timer: 0, age: this.random() * 19, line: 0, cooldown: 0 });
    this.lastVendorVariant = variant;
    this.nextVendorIn = 18 + this.random() * 14;
  }

  talk(id: unknown, player: LifePoint): { name: string; text: string } | null {
    const actor = this.actors.find((a) => a.id === id && a.kind === 'vendor');
    if (!actor || Math.hypot(player.x - actor.x, player.y - actor.y) > VENDOR_RADIUS) return null;
    const brain = this.brains.get(actor.id)!;
    if (brain.cooldown > 0) return null;
    const vendor = STREET_VENDORS[actor.variant]!;
    actor.speech = vendor.lines[brain.line++ % vendor.lines.length]!;
    actor.mode = 'talking';
    actor.moving = false;
    brain.timer = 6;
    brain.cooldown = 1;
    return { name: vendor.name, text: actor.speech };
  }

  pickUpCat(id: unknown, carrierId?: string, playerPos?: LifePoint): boolean {
    const cat = this.actors.find((a) => a.id === id && a.kind === 'cat');
    if (!cat || cat.mode === 'carried') return false;
    const brain = this.brains.get(cat.id);
    if (!brain) return false;
    cat.mode = 'carried';
    cat.speech = 'Meo meo~ ❤️';
    cat.moving = false;
    cat.altitude = 0;
    if (playerPos) {
      cat.x = playerPos.x;
      cat.y = playerPos.y;
    }
    brain.carrierId = carrierId ?? 'carrier';
    brain.timer = 999999;
    brain.cooldown = 5;
    return true;
  }

  putDownCat(id: unknown, pos: LifePoint): boolean {
    const cat =
      this.actors.find((a) => a.id === id && a.kind === 'cat') ??
      this.residents.find((r) => r.id === id && r.kind === 'cat');
    if (!cat) return false;
    let dropPos = { x: Math.round(pos.x), y: Math.round(pos.y) };
    if (!lifeGroundClear(dropPos.x, dropPos.y)) {
      search: for (let radius = 6; radius < 80; radius += 6) {
        for (let dir = 0; dir < 8; dir++) {
          const ang = (dir * Math.PI) / 4;
          const cand = {
            x: Math.round(pos.x + Math.cos(ang) * radius),
            y: Math.round(pos.y + Math.sin(ang) * radius),
          };
          if (lifeGroundClear(cand.x, cand.y)) {
            dropPos = cand;
            break search;
          }
        }
      }
    }
    cat.x = dropPos.x;
    cat.y = dropPos.y;
    cat.mode = 'roaming';
    cat.speech = 'Meo~';
    cat.moving = false;
    cat.altitude = 0;
    const brain = this.brains.get(cat.id);
    if (brain) {
      brain.home = { ...dropPos };
      brain.target = { ...dropPos };
      brain.carrierId = undefined;
      brain.timer = 2 + this.random() * 2;
      brain.cooldown = 4;
    }
    const resident = this.residents.find((r) => r.id === cat.id);
    if (resident) {
      resident.x = dropPos.x;
      resident.y = dropPos.y;
    }
    if (!this.actors.some((a) => a.id === cat.id)) {
      this.actors.push(cat);
    }
    return true;
  }

  updateCarrierPos(id: string, pos: LifePoint) {
    const cat = this.actors.find((a) => a.id === id && a.kind === 'cat');
    if (cat && cat.mode === 'carried') {
      cat.x = pos.x;
      cat.y = pos.y;
    }
  }

  update(dtMs: number, now: number, players: readonly LifePoint[], env?: TownEnvironment) {
    const dt = Math.min(0.1, Math.max(0, dtMs / 1000));
    const shouldHide = shouldHideTownLife(env);
    if (shouldHide) {
      if (!this.hidden) {
        const talkingOrCarried = this.actors.filter((a) => a.mode === 'talking' || a.mode === 'carried');
        if (talkingOrCarried.length === 0) {
          this.hidden = true;
          this.actors.length = 0;
          return;
        } else {
          for (let i = this.actors.length - 1; i >= 0; i--) {
            const a = this.actors[i]!;
            if (a.mode !== 'talking' && a.mode !== 'carried') {
              this.actors.splice(i, 1);
            }
          }
        }
      } else {
        return;
      }
    }
    if (this.hidden) {
      this.hidden = false;
      this.actors.length = 0;
      for (const res of this.residents) {
        const brain = this.brains.get(res.id);
        if (brain) {
          res.x = brain.home.x;
          res.y = brain.home.y;
          brain.target = { ...brain.home };
          brain.timer = 1 + this.random() * 3;
        }
        res.mode = res.kind === 'pigeon' ? 'feeding' : 'roaming';
        res.moving = false;
        res.altitude = 0;
        res.speech = '';
        this.actors.push(res);
      }
      this.nextVendorIn = 2 + this.random() * 4;
    }
    this.nextVendorIn -= dt;
    if (this.nextVendorIn <= 0 && !shouldHide) this.arriveVendor();
    const departed = new Set<string>();
    const startled = new Set<number>();
    for (const a of this.actors)
      if (
        a.kind === 'pigeon' &&
        a.mode !== 'flying' &&
        players.some((p) => Math.hypot(a.x - p.x, a.y - p.y) < 66)
      )
        startled.add(a.variant);
    for (const a of this.actors) {
      const b = this.brains.get(a.id)!;
      b.timer -= dt;
      b.cooldown -= dt;
      b.age += dt;
      a.moving = false;
      if (a.kind === 'vendor') {
        if (a.mode === 'talking' && b.timer > 0) continue;
        a.mode = 'riding';
        a.speech = b.age % 19 < 3 ? STREET_VENDORS[a.variant]!.call : '';
        const target = b.target;
        const next = this.step(a, target, 42 * dt);
        if (redLightCrossing(a, next, now)) {
          a.mode = 'waiting';
          continue;
        }
        if (players.some((p) => Math.hypot(next.x - p.x, next.y - p.y) < 25)) {
          a.mode = 'waiting';
          continue;
        }
        this.move(a, next);
        if (Math.hypot(a.x - target.x, a.y - target.y) < 1) departed.add(a.id);
      } else if (a.kind === 'cat') {
        if (a.mode === 'carried') {
          continue;
        }
        const near = players.find((p) => Math.hypot(a.x - p.x, a.y - p.y) < 40);
        if (near && b.cooldown <= 0) {
          const angle = Math.atan2(a.y - near.y, a.x - near.x);
          b.target = this.safeTarget(a, { x: a.x + Math.cos(angle) * 62, y: a.y + Math.sin(angle) * 62 });
          a.mode = 'scampering';
          a.speech = 'Meo!';
          b.timer = 2;
          b.cooldown = 4;
        } else if (b.timer <= 0) {
          const roll = this.random();
          if (roll < 0.25) {
            a.mode = 'sleeping';
            b.timer = 4 + this.random() * 5;
            a.speech = this.random() < 0.35 ? 'Khò... khò...' : '';
          } else if (roll < 0.5) {
            a.mode = 'grooming';
            b.timer = 3 + this.random() * 4;
            a.speech = '';
          } else {
            a.mode = 'roaming';
            b.target = this.wander(b.home, 48);
            b.timer = 3 + this.random() * 4;
            a.speech = '';
          }
        }
        if (a.mode !== 'grooming' && a.mode !== 'sleeping')
          this.move(a, this.step(a, b.target, (a.mode === 'scampering' ? 62 : 17) * dt), true);
      } else {
        if (startled.has(a.variant) && a.mode !== 'flying') {
          const nearest = [...players].sort(
            (p, q) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(a.x - q.x, a.y - q.y),
          )[0]!;
          const angle = Math.atan2(a.y - nearest.y, a.x - nearest.x) + (this.random() - 0.5) * 0.9;
          b.target = this.safeTarget(a, { x: a.x + Math.cos(angle) * 125, y: a.y + Math.sin(angle) * 125 });
          a.mode = 'flying';
          b.timer = 3.2 + this.random();
        }
        if (a.mode === 'flying') {
          this.move(a, this.step(a, b.target, 92 * dt));
          const unsafe = players.some((p) => Math.hypot(a.x - p.x, a.y - p.y) < 85);
          if (b.timer < 0.8 && !lifeGroundClear(a.x, a.y)) b.timer = 1.2;
          if (b.timer < 0.8 && unsafe) {
            b.target = this.wander(b.home, 130);
            b.timer = 2;
          }
          const height = b.timer > 0.8 ? 35 : Math.max(0, b.timer / 0.8) * 35;
          a.altitude += Math.sign(height - a.altitude) * Math.min(Math.abs(height - a.altitude), dt * 75);
          if (b.timer <= 0 && !unsafe) {
            a.mode = 'feeding';
            a.altitude = 0;
            b.timer = 1.5;
          }
        } else if (b.timer <= 0) {
          b.target = this.wander(b.home, 34);
          b.timer = 1 + this.random() * 3;
        } else this.move(a, this.step(a, b.target, 10 * dt), true);
      }
    }
    for (let i = this.actors.length - 1; i >= 0; i--) {
      const actor = this.actors[i]!;
      if (departed.has(actor.id)) {
        this.brains.delete(actor.id);
        this.actors.splice(i, 1);
      }
    }
  }
  private wander(home: LifePoint, radius: number): LifePoint {
    for (let i = 0; i < 12; i++) {
      const p = {
        x: home.x + (this.random() - 0.5) * radius * 2,
        y: home.y + (this.random() - 0.5) * radius * 2,
      };
      if (lifeGroundClear(p.x, p.y)) return p;
    }
    return { ...home };
  }
  private safeTarget(from: LifePoint, target: LifePoint) {
    return lifeGroundClear(target.x, target.y) ? target : this.wander(from, 70);
  }
  private step(a: LifePoint, target: LifePoint, distance: number) {
    const d = Math.hypot(target.x - a.x, target.y - a.y);
    const f = d ? Math.min(1, distance / d) : 0;
    return { x: a.x + (target.x - a.x) * f, y: a.y + (target.y - a.y) * f };
  }
  private move(a: TownActor, p: LifePoint, grounded = false) {
    if (grounded && !lifeGroundClear(p.x, p.y)) {
      this.brains.get(a.id)!.timer = 0;
      return;
    }
    const dx = p.x - a.x,
      dy = p.y - a.y;
    a.moving = Math.hypot(dx, dy) > 0.001;
    if (a.moving) a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : dy > 0 ? 0 : 3;
    a.x = p.x;
    a.y = p.y;
  }
}
