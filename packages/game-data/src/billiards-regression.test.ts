import { describe, expect, it } from 'vitest';
import {
  createCaromRack,
  createBidaShotTracker,
  trackBidaShot,
  stepBilliardsPhysics,
  type StepPhysicsResult,
} from './billiards.js';
import {
  DELIVERY_DESTINATIONS,
  ZONES,
  BLOCKERS,
  zoneCenter,
  CYBERNET_SPAWN,
  CYBERNET_BLOCKERS,
} from './map.js';
import { isWalkable } from './movement.js';

describe('billiards and venue regressions', () => {
  it('resolves maximum-power collision before the cue tunnels through a target', () => {
    const [cue, target] = createCaromRack();
    cue!.x = 200;
    cue!.y = 200;
    cue!.vx = 36;
    target!.x = 220;
    target!.y = 200;
    const result = stepBilliardsPhysics([cue!, target!]);
    expect(result.ballCollisions).toContainEqual([0, 1]);
    expect(target!.vx).toBeGreaterThan(20);
    expect(cue!.x).toBeLessThan(target!.x);
  });
  it('requires three cue cushions before the second distinct target for a carom point', () => {
    const observe = (contacts: StepPhysicsResult['contacts']) => {
      const tracker = createBidaShotTracker();
      trackBidaShot(tracker, {
        contacts,
        anyMoving: true,
        ballCollisions: [],
        cushionCollisions: [],
        pocketedThisStep: [],
      });
      return tracker.caromPoint;
    };
    const first = { type: 'ball' as const, ids: [0, 1] as [number, number] };
    const second = { type: 'ball' as const, ids: [0, 2] as [number, number] };
    const cushion = { type: 'cushion' as const, id: 0 };
    expect(observe([first, cushion, cushion, second])).toBe(false);
    expect(observe([first, second, cushion, cushion, cushion])).toBe(false);
    expect(observe([first, cushion, cushion, cushion, second])).toBe(true);
    expect(observe([first, { type: 'cushion', id: 1 }, cushion, cushion, second])).toBe(false);
  });
  it('has walkable delivery destinations and a dedicated cybernet spawn', () => {
    for (const id of DELIVERY_DESTINATIONS) {
      expect(ZONES.some((z) => z.id === id)).toBe(true);
      const center = zoneCenter(id);
      if (['comga', 'bida', 'cybernet'].includes(id))
        expect(isWalkable(center.x, center.y, BLOCKERS), id).toBe(true);
    }
    expect(isWalkable(CYBERNET_SPAWN.x, CYBERNET_SPAWN.y, CYBERNET_BLOCKERS)).toBe(true);
  });
});
