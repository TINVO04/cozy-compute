import { describe, expect, it } from 'vitest';
import { FISH } from '@cozy/game-data';
import {
  apartmentScore,
  applyMultiplier,
  checkEligibility,
  coinCostForCents,
  creditCostForBudget,
  deliveryTimeLimitMs,
  fameTitle,
  rankEvent,
  rollFish,
  softCapMultiplier,
  startOfUtcMonth,
  startOfUtcWeek,
  stddev,
  timedReward,
} from './index.js';

describe('soft cap', () => {
  it('pays full rewards below the cap and reduced rewards after', () => {
    expect(softCapMultiplier(0, 40, 0.25)).toBe(1);
    expect(softCapMultiplier(39, 40, 0.25)).toBe(1);
    expect(softCapMultiplier(40, 40, 0.25)).toBe(0.25);
    expect(applyMultiplier(14, 0.25)).toBe(4);
    expect(applyMultiplier(-5, 1)).toBe(0);
  });
});

describe('fishing', () => {
  it('returns the first fish for the lowest roll and last for the highest', () => {
    expect(rollFish(() => 0, 700, 1400).id).toBe(FISH[0]!.id);
    expect(rollFish(() => 0.999999, 700, 1400).id).toBe(FISH[FISH.length - 1]!.id);
  });

  it('makes rare fish more likely with faster reactions', () => {
    const rareShare = (reaction: number) => {
      let rare = 0;
      for (let i = 0; i < 1000; i++) if (rollFish(() => i / 1000, reaction, 1400).rarity !== 'common') rare++;
      return rare;
    };
    expect(rareShare(100)).toBeGreaterThan(rareShare(1300));
  });
});

describe('timed rewards', () => {
  it('computes delivery time limits with a floor', () => {
    expect(deliveryTimeLimitMs(10, 650, 20000)).toBe(20000);
    expect(deliveryTimeLimitMs(40, 650, 20000)).toBe(26000);
  });

  it('pays base + bonus scaled by remaining time and nothing when late', () => {
    expect(timedReward(45, 30, 0, 20000)).toBe(75);
    expect(timedReward(45, 30, 10000, 20000)).toBe(60);
    expect(timedReward(45, 30, 20000, 20000)).toBe(45);
    expect(timedReward(45, 30, 20001, 20000)).toBe(0);
  });
});

describe('event ranking', () => {
  const cfg = {
    coinPerPoint: 25,
    placementCoin: [150, 90, 60],
    participationCoin: 20,
    fame: 5,
    placementFame: [20, 12, 8],
  };
  it('awards podium, per point and participation', () => {
    const r = rankEvent(
      [
        { userId: 'b', score: 2 },
        { userId: 'a', score: 5 },
        { userId: 'c', score: 0 },
      ],
      cfg,
    );
    expect(r.map((x) => [x.userId, x.placement, x.coin, x.fame])).toEqual([
      ['a', 1, 20 + 125 + 150, 25],
      ['b', 2, 20 + 50 + 90, 17],
      ['c', 3, 20, 5],
    ]);
  });
  it('shares placements on ties', () => {
    const r = rankEvent(
      [
        { userId: 'a', score: 3 },
        { userId: 'b', score: 3 },
        { userId: 'c', score: 1 },
      ],
      cfg,
    );
    expect(r.map((x) => x.placement)).toEqual([1, 1, 3]);
    expect(r[0]!.coin).toBe(r[1]!.coin);
  });
});

describe('AI credit math', () => {
  it('rounds coin cost up', () => {
    expect(coinCostForCents(100, 12000)).toBe(12000);
    expect(coinCostForCents(1, 12345)).toBe(124);
    expect(() => coinCostForCents(0, 12000)).toThrow();
    expect(() => coinCostForCents(1.5, 12000)).toThrow();
  });
  it('uses the most expensive model multiplier', () => {
    expect(creditCostForBudget(300, [1, 2.5])).toBe(750);
    expect(creditCostForBudget(101, [1.5])).toBe(152);
    expect(creditCostForBudget(100, [])).toBe(100);
  });
});

describe('eligibility', () => {
  const policy = {
    minAccountAgeHours: 24,
    requireOnboarding: true,
    minUniqueActivities: 3,
    minFame: 50,
    minTrustScore: 50,
    cooldownHours: 12,
  };
  const now = new Date('2026-09-27T12:00:00Z');
  const base = {
    accountCreatedAt: new Date('2026-09-20T00:00:00Z'),
    onboardingComplete: true,
    uniqueActivities: 3,
    fame: 60,
    trustScore: 100,
    lastRedemptionAt: null,
    now,
  };
  it('is eligible when all checks pass', () => {
    expect(checkEligibility(policy, base).eligible).toBe(true);
  });
  it.each([
    ['account_age', { accountCreatedAt: new Date('2026-09-27T00:00:00Z') }],
    ['onboarding', { onboardingComplete: false }],
    ['activities', { uniqueActivities: 1 }],
    ['fame', { fame: 10 }],
    ['trust', { trustScore: 20 }],
    ['cooldown', { lastRedemptionAt: new Date('2026-09-27T06:00:00Z') }],
  ] as const)('fails %s', (id, patch) => {
    const r = checkEligibility(policy, { ...base, ...patch });
    expect(r.eligible).toBe(false);
    expect(r.checks.find((c) => !c.met)?.id).toBe(id);
  });
});

describe('misc', () => {
  it('titles by fame', () => {
    expect(fameTitle(0)).toBe('Cư Dân Mới Đến');
    expect(fameTitle(200)).toBe('Khách Thuê Gương Mẫu');
    expect(fameTitle(99999)).toBe('Huyền Thoại Thị Trấn');
  });
  it('scores apartments', () => {
    expect(apartmentScore([{ itemId: 'a' }, { itemId: 'a' }, { itemId: 'b' }], { a: 2, b: 5 })).toBe(9 + 4);
  });
  it('computes UTC week/month starts', () => {
    expect(startOfUtcWeek(new Date('2026-09-27T12:00:00Z')).toISOString()).toBe('2026-09-21T00:00:00.000Z');
    expect(startOfUtcMonth(new Date('2026-09-27T12:00:00Z')).toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });
  it('computes stddev', () => {
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(stddev([])).toBe(0);
  });
});
