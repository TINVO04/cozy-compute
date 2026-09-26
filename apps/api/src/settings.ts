import { z } from 'zod';
import type { Queryable } from './db.js';

export const aiPolicySchema = z.object({
  redemptionsPaused: z.boolean(),
  coinPerUsd: z.number().int().positive(),
  weeklyPoolCents: z.number().int().nonnegative(),
  rolloverEnabled: z.boolean(),
  perUserMonthlyCapCents: z.number().int().nonnegative(),
  minMintCents: z.number().int().positive(),
  maxMintCents: z.number().int().positive(),
  maxActiveKeys: z.number().int().positive().max(20),
  keyTtlDays: z.number().int().positive().max(365),
  minKeyBudgetCents: z.number().int().positive(),
  minAccountAgeHours: z.number().nonnegative(),
  requireOnboarding: z.boolean(),
  minUniqueActivities: z.number().int().nonnegative(),
  minFame: z.number().int().nonnegative(),
  minTrustScore: z.number().int().min(0).max(100),
  cooldownHours: z.number().nonnegative(),
  keySharingIpThreshold: z.number().int().positive(),
});
export type AiPolicy = z.infer<typeof aiPolicySchema>;

export const eventScheduleSchema = z.object({
  autoSchedule: z.boolean(),
  intervalMinutes: z
    .number()
    .int()
    .min(2)
    .max(24 * 60),
  lobbyMinutes: z.number().min(0.5).max(60),
  durationSeconds: z.number().int().min(30).max(900),
  duckCount: z.number().int().min(1).max(14),
  minPlayers: z.number().int().min(1).max(20),
  maxPlayers: z.number().int().min(2).max(100),
});
export type EventSchedule = z.infer<typeof eventScheduleSchema>;

export const DEFAULT_SETTINGS = {
  ai_policy: {
    redemptionsPaused: false,
    coinPerUsd: 12000,
    weeklyPoolCents: 50000,
    rolloverEnabled: false,
    perUserMonthlyCapCents: 500,
    minMintCents: 25,
    maxMintCents: 500,
    maxActiveKeys: 2,
    keyTtlDays: 30,
    minKeyBudgetCents: 25,
    minAccountAgeHours: 24,
    requireOnboarding: true,
    minUniqueActivities: 3,
    minFame: 50,
    minTrustScore: 50,
    cooldownHours: 12,
    keySharingIpThreshold: 8,
  } satisfies AiPolicy,
  event_schedule: {
    autoSchedule: true,
    intervalMinutes: 15,
    lobbyMinutes: 3,
    durationSeconds: 90,
    duckCount: 8,
    minPlayers: 1,
    maxPlayers: 20,
  } satisfies EventSchedule,
};

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
const schemas = { ai_policy: aiPolicySchema, event_schedule: eventScheduleSchema } as const;

export async function getSetting<K extends SettingKey>(
  q: Queryable,
  key: K,
): Promise<(typeof DEFAULT_SETTINGS)[K]> {
  const r = await q.query<{ value: unknown }>('SELECT value FROM settings WHERE key = $1', [key]);
  const merged = { ...DEFAULT_SETTINGS[key], ...((r.rows[0]?.value as object) ?? {}) };
  return schemas[key].parse(merged) as (typeof DEFAULT_SETTINGS)[K];
}

export function settingSchema(key: SettingKey) {
  return schemas[key];
}
