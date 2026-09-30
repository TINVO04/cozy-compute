import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  DUCK_SPOTS,
  MAP_HEIGHT,
  MAP_WIDTH,
  PATHS,
  PIER,
  PLAZA,
  SPAWN,
  TILE,
  ZONES,
  pointInRect,
  zoneAt,
} from './map.js';
import { isWalkable, PLAYER_SPEED, stepMovement } from './movement.js';

/** Use the actual movement resolver, including the avatar feet box, for each edge. */
function reachable(pavedOnly = false): Set<string> {
  const step = TILE / 2;
  const surfaces = [...PATHS, PLAZA, PIER];
  const key = (x: number, y: number) => `${x},${y}`;
  const visited = new Set([key(SPAWN.x, SPAWN.y)]);
  const queue = [SPAWN];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    for (const input of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const next = stepMovement(current, input, step / PLAYER_SPEED);
      if (next.x < step || next.x > MAP_WIDTH - step || next.y < step || next.y > MAP_HEIGHT - step) continue;
      // Boundary clamping must not introduce off-grid nodes.
      if (next.x % step || next.y % step) continue;
      if (pavedOnly && !surfaces.some((r) => pointInRect(next.x, next.y, r))) continue;
      const id = key(next.x, next.y);
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push(next);
    }
  }
  return visited;
}

describe('town layout', () => {
  it('connects every activity to spawn along paved paths or the pier', () => {
    const accessible = reachable(true);
    const zones = new Set(
      [...accessible].map((id) => {
        const [x, y] = id.split(',').map(Number);
        return zoneAt(x!, y!);
      }),
    );
    for (const zone of ZONES) expect(zones.has(zone.id), `${zone.id} needs a paved route`).toBe(true);
  });

  it('puts every building door directly in its own accessible interaction zone', () => {
    const accessible = reachable();
    for (const b of BUILDINGS) {
      const x = (b.door.x + b.door.w / 2) * TILE;
      const y = b.rect.y + b.rect.h + TILE / 2;
      expect(isWalkable(x, y), `${b.id} entrance is blocked`).toBe(true);
      expect(zoneAt(x, y), `${b.id} door opens into its interaction zone`).toBe(b.id);
      expect(accessible.has(`${x},${y}`), `${b.id} entrance is reachable`).toBe(true);
    }
  });

  it('keeps every duck spawn walkable and reachable after moving scenery', () => {
    const accessible = reachable();
    for (const p of DUCK_SPOTS) {
      expect(isWalkable(p.x, p.y), `duck at ${p.x},${p.y} is blocked`).toBe(true);
      expect(accessible.has(`${p.x},${p.y}`), `duck at ${p.x},${p.y} is unreachable`).toBe(true);
    }
  });
});
