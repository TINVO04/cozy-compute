import { FISH, type FishSpecies } from '@cozy/game-data';

/** Uniform random in [0, 1). Injectable so reward math is testable and deterministic. */
export type Rng = () => number;

export function softCapMultiplier(
  rewardedToday: number,
  dailySoftCap: number,
  overCapMultiplier: number,
): number {
  return rewardedToday >= dailySoftCap ? overCapMultiplier : 1;
}

export function applyMultiplier(amount: number, multiplier: number): number {
  return Math.max(0, Math.round(amount * multiplier));
}

/**
 * Rolls a catch. Faster reactions shift weight toward rarer fish.
 * quality = 1 for an instant reaction, 0 at the edge of the window.
 */
export function rollFish(
  rng: Rng,
  reactionMs: number,
  windowMs: number,
  table: FishSpecies[] = FISH,
  rodBonus: number = 0,
): FishSpecies {
  const quality = Math.max(0, Math.min(1, 1 - reactionMs / windowMs));
  const boost: Record<FishSpecies['rarity'], number> = {
    common: 1,
    rare: 1 + quality + rodBonus * 0.4,
    epic: 1 + quality * 2 + rodBonus * 1.0,
    legendary: 1 + quality * 3 + rodBonus * 1.8,
  };
  const weights = table.map((f) => f.weight * boost[f.rarity]);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < table.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return table[i]!;
  }
  return table[table.length - 1]!;
}

export function deliveryTimeLimitMs(distanceTiles: number, msPerTile: number, minTimeMs: number): number {
  return Math.max(minTimeMs, Math.round(distanceTiles * msPerTile));
}

/** Base reward plus a bonus proportional to how much time was left. */
export function timedReward(
  baseCoin: number,
  maxBonusCoin: number,
  elapsedMs: number,
  limitMs: number,
): number {
  if (elapsedMs > limitMs) return 0;
  const remaining = Math.max(0, limitMs - elapsedMs) / limitMs;
  return baseCoin + Math.round(maxBonusCoin * remaining);
}

export interface EventScore {
  userId: string;
  score: number;
}

export interface EventPlacement extends EventScore {
  placement: number;
  coin: number;
  fame: number;
}

/** Ranks event participants. Ties share a placement; everyone who took part gets participation rewards. */
export function rankEvent(
  scores: EventScore[],
  cfg: {
    coinPerPoint: number;
    placementCoin: readonly number[];
    participationCoin: number;
    fame: number;
    placementFame: readonly number[];
  },
): EventPlacement[] {
  const sorted = [...scores].sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId));
  let placement = 0;
  let lastScore = Number.NaN;
  return sorted.map((s, i) => {
    if (s.score !== lastScore) {
      placement = i + 1;
      lastScore = s.score;
    }
    const podium = s.score > 0 ? placement - 1 : -1;
    const coin =
      cfg.participationCoin +
      s.score * cfg.coinPerPoint +
      (podium >= 0 ? (cfg.placementCoin[podium] ?? 0) : 0);
    const fame = cfg.fame + (podium >= 0 ? (cfg.placementFame[podium] ?? 0) : 0);
    return { ...s, placement, coin, fame };
  });
}

/** Coin needed to mint AI Credit worth `cents` US cents of quota. */
export function coinCostForCents(cents: number, coinPerUsd: number): number {
  if (!Number.isInteger(cents) || cents <= 0) throw new Error('cents must be a positive integer');
  return Math.ceil((cents * coinPerUsd) / 100);
}

/** AI Credit (cents) consumed to allocate `budgetCents` of quota to a key spanning models with given multipliers. */
export function creditCostForBudget(budgetCents: number, multipliers: number[]): number {
  if (!Number.isInteger(budgetCents) || budgetCents <= 0)
    throw new Error('budgetCents must be a positive integer');
  const m = multipliers.length ? Math.max(...multipliers) : 1;
  return Math.ceil(budgetCents * m);
}

export interface EligibilityPolicy {
  minAccountAgeHours: number;
  requireOnboarding: boolean;
  minUniqueActivities: number;
  minFame: number;
  minTrustScore: number;
  cooldownHours: number;
}

export interface EligibilityStats {
  accountCreatedAt: Date;
  onboardingComplete: boolean;
  uniqueActivities: number;
  fame: number;
  trustScore: number;
  lastRedemptionAt: Date | null;
  now: Date;
}

export interface EligibilityCheck {
  id: 'account_age' | 'onboarding' | 'activities' | 'fame' | 'trust' | 'cooldown';
  label: string;
  met: boolean;
  detail: string;
}

export function checkEligibility(
  p: EligibilityPolicy,
  s: EligibilityStats,
): { eligible: boolean; checks: EligibilityCheck[] } {
  const ageHours = (s.now.getTime() - s.accountCreatedAt.getTime()) / 3_600_000;
  const sinceLast = s.lastRedemptionAt
    ? (s.now.getTime() - s.lastRedemptionAt.getTime()) / 3_600_000
    : Infinity;
  const checks: EligibilityCheck[] = [
    {
      id: 'account_age',
      label: 'Thời gian tạo tài khoản',
      met: ageHours >= p.minAccountAgeHours,
      detail: `${Math.floor(ageHours)}h / ${p.minAccountAgeHours}h`,
    },
    {
      id: 'onboarding',
      label: 'Hoàn thành hướng dẫn tân thủ',
      met: !p.requireOnboarding || s.onboardingComplete,
      detail: s.onboardingComplete ? 'Đã hoàn thành' : 'Chưa xong',
    },
    {
      id: 'activities',
      label: 'Tham gia các hoạt động thị trấn',
      met: s.uniqueActivities >= p.minUniqueActivities,
      detail: `${s.uniqueActivities} / ${p.minUniqueActivities}`,
    },
    { id: 'fame', label: 'Điểm danh tiếng', met: s.fame >= p.minFame, detail: `${s.fame} / ${p.minFame}` },
    {
      id: 'trust',
      label: 'Mức độ tin cậy tài khoản',
      met: s.trustScore >= p.minTrustScore,
      detail: s.trustScore >= p.minTrustScore ? 'Tốt' : 'Đang xem xét',
    },
    {
      id: 'cooldown',
      label: 'Thời gian chờ nhận thưởng',
      met: sinceLast >= p.cooldownHours,
      detail:
        sinceLast === Infinity
          ? 'Sẵn sàng'
          : sinceLast >= p.cooldownHours
            ? 'Sẵn sàng'
            : `Còn lại ${Math.ceil(p.cooldownHours - sinceLast)}h`,
    },
  ];
  return { eligible: checks.every((c) => c.met), checks };
}

export const FAME_TITLES = [
  { min: 0, title: 'Cư Dân Mới Đến' },
  { min: 50, title: 'Gương Mặt Thân Quen' },
  { min: 200, title: 'Khách Thuê Gương Mẫu' },
  { min: 600, title: 'Ngôi Sao Khu Phố' },
  { min: 1500, title: 'Huyền Thoại Thị Trấn' },
] as const;

export function fameTitle(fame: number): string {
  let title: string = FAME_TITLES[0].title;
  for (const t of FAME_TITLES) if (fame >= t.min) title = t.title;
  return title;
}

/** Apartment score: decor of placed items plus a variety bonus for distinct items. */
export function apartmentScore(objects: { itemId: string }[], decorById: Record<string, number>): number {
  const decor = objects.reduce((sum, o) => sum + (decorById[o.itemId] ?? 0), 0);
  const variety = new Set(objects.map((o) => o.itemId)).size;
  return decor + variety * 2;
}

export function startOfUtcWeek(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Population standard deviation, used for timing regularity checks. */
export function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
}
