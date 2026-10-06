import { describe, expect, it } from 'vitest';
import { clampInput, isWalkable, stepMovement, PLAYER_SPEED, PLAYER_RADIUS } from './movement.js';
import { FISH, DEFAULT_ACTIVITY_CONFIG, SHADOW_TIER_CONFIG } from './activities.js';
import { ITEM_SEEDS, STARTER_ITEMS, FISHING_RODS, BOATS } from './items.js';
import { MAP_WIDTH, MAP_HEIGHT, BLOCKERS, SPAWN, zoneAt, pointInRect, ZONES } from './map.js';

describe('game-data movement', () => {
  it('clamps movement inputs correctly', () => {
    expect(clampInput({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(clampInput({ x: 10, y: -5 })).toEqual({ x: 1, y: -1 });
    expect(clampInput({ x: -0.8, y: 0.9 })).toEqual({ x: -1, y: 1 });
    expect(clampInput({ x: Number.NaN, y: Number.POSITIVE_INFINITY })).toEqual({ x: 0, y: 0 });
  });

  it('keeps stationary position when input is zero', () => {
    const start = { x: 100, y: 100 };
    const next = stepMovement(start, { x: 0, y: 0 }, 0.05);
    expect(next).toEqual(start);
  });

  it('moves diagonally normalized at expected speed', () => {
    const start = { x: 500, y: 500 };
    const dt = 0.1;
    const next = stepMovement(start, { x: 1, y: 1 }, dt, { blockers: [] });
    const expectedDist = PLAYER_SPEED * dt;
    const actualDist = Math.hypot(next.x - start.x, next.y - start.y);
    expect(actualDist).toBeCloseTo(expectedDist, 2);
  });

  it('prevents walking outside map boundaries', () => {
    const nearRightEdge = { x: MAP_WIDTH - 2, y: 200 };
    const next = stepMovement(nearRightEdge, { x: 1, y: 0 }, 1, { blockers: [] });
    expect(next.x).toBeLessThanOrEqual(MAP_WIDTH - PLAYER_RADIUS);

    const nearLeftEdge = { x: 2, y: 200 };
    const nextLeft = stepMovement(nearLeftEdge, { x: -1, y: 0 }, 1, { blockers: [] });
    expect(nextLeft.x).toBeGreaterThanOrEqual(PLAYER_RADIUS);

    const nearBottom = { x: 200, y: MAP_HEIGHT - 2 };
    const nextBottom = stepMovement(nearBottom, { x: 0, y: 1 }, 1, { blockers: [] });
    expect(nextBottom.y).toBeLessThanOrEqual(MAP_HEIGHT - 4);
  });

  it('slides along blockers when moving obliquely', () => {
    const blocker = { x: 100, y: 100, w: 50, h: 50 };
    // Position just to the left of the blocker
    const start = { x: 100 - PLAYER_RADIUS - 1, y: 120 };
    // Try to move right and down
    const next = stepMovement(start, { x: 1, y: 1 }, 0.05, { blockers: [blocker] });
    // x movement is blocked by blocker, but y movement can slide down
    expect(next.x).toBe(start.x);
    expect(next.y).toBeGreaterThan(start.y);
  });

  it('verifies spawn point is walkable', () => {
    expect(isWalkable(SPAWN.x, SPAWN.y, BLOCKERS)).toBe(true);
  });

  it('detects zones correctly', () => {
    for (const z of ZONES) {
      const midX = z.rect.x + z.rect.w / 2;
      const midY = z.rect.y + z.rect.h / 2;
      expect(pointInRect(midX, midY, z.rect)).toBe(true);
      expect(zoneAt(midX, midY)).toBe(z.id);
    }
  });
});

describe('game-data activities', () => {
  it('adds distinct higher-tier variants with existing parents and valid size ranges', () => {
    const ids = new Set(FISH.map((f) => f.id));
    expect(ids.size).toBe(FISH.length);
    for (const rarity of ['defiant', 'sovereign']) {
      const variants = FISH.filter((f) => f.rarity === rarity);
      expect(variants).toHaveLength(4);
      for (const fish of variants) {
        expect(ids.has(fish.variantOf!)).toBe(true);
        expect(fish.variantOf).not.toBe(fish.id);
        expect(fish.maxSizeCm).toBeGreaterThan(fish.minSizeCm);
        expect(fish.weight).toBeLessThan(1);
      }
    }
  });
  it('contains correctly configured fish species with positive rewards', () => {
    expect(FISH.length).toBeGreaterThanOrEqual(5);
    for (const fish of FISH) {
      expect(fish.id).toBeTruthy();
      expect(fish.weight).toBeGreaterThan(0);
      expect(fish.coin).toBeGreaterThan(0);
      expect(fish.fame).toBeGreaterThanOrEqual(0);
      expect(['common', 'rare', 'epic', 'legendary', 'defiant', 'sovereign']).toContain(fish.rarity);
    }
  });

  it('has consistent activity defaults and soft caps', () => {
    expect(DEFAULT_ACTIVITY_CONFIG.fishing.dailySoftCap).toBeGreaterThan(0);
    expect(DEFAULT_ACTIVITY_CONFIG.delivery.baseCoin).toBeGreaterThan(0);
    expect(DEFAULT_ACTIVITY_CONFIG.cafe.steps).toBeGreaterThan(1);
    expect(DEFAULT_ACTIVITY_CONFIG.event_duck.placementCoin.length).toBe(3);
  });
});

describe('game-data items catalog', () => {
  it('has unique item ids across all item seeds', () => {
    const allIds = new Set<string>();
    for (const item of ITEM_SEEDS) {
      expect(allIds.has(item.id)).toBe(false);
      allIds.add(item.id);
      expect(item.coinPrice).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
      expect(['clothing', 'furniture', 'rod', 'boat', 'vehicle']).toContain(item.type);
    }
  });

  it('starter items all exist in ITEM_SEEDS', () => {
    const seedIds = new Set(ITEM_SEEDS.map((s) => s.id));
    for (const starter of STARTER_ITEMS) {
      expect(seedIds.has(starter.itemId)).toBe(true);
      expect(starter.quantity).toBeGreaterThan(0);
    }
  });

  it('configures boats and speeds correctly', () => {
    const boats = Object.values(BOATS);
    expect(boats.length).toBeGreaterThanOrEqual(4);
    for (const boat of boats) {
      expect(boat.id).toMatch(/^boat_/);
      expect(boat.coinPrice).toBeGreaterThan(0);
      expect(boat.speed).toBeGreaterThan(100);
      expect(['shallows', 'coastal', 'open_sea', 'abyss']).toContain(boat.seaZoneAccess);
    }
  });

  it('configures fishing rods and shadow tiers correctly', () => {
    const rods = Object.values(FISHING_RODS);
    expect(rods.length).toBeGreaterThanOrEqual(6);
    for (const rod of rods) {
      expect(rod.id).toMatch(/^rod_/);
      expect(rod.coinPrice).toBeGreaterThanOrEqual(0);
      expect(rod.shadowBonus).toBeGreaterThanOrEqual(0);
      expect(rod.reactionBonusMs).toBeGreaterThanOrEqual(0);
      expect(rod.biteSpeedBonus).toBeGreaterThanOrEqual(0);
    }

    // Shadow tiers 1-6
    for (const tier of [1, 2, 3, 4, 5, 6] as const) {
      const cfg = SHADOW_TIER_CONFIG[tier];
      expect(cfg).toBeDefined();
      expect(cfg.lengthPx).toBeGreaterThan(0);
      expect(cfg.widthPx).toBeGreaterThan(0);
      expect(cfg.swimSpeed).toBeGreaterThan(0);
    }
    expect(SHADOW_TIER_CONFIG[6].hasCrown).toBe(true);
  });
});
