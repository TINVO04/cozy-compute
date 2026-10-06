export type { Appearance, ItemType, ClothingSlot } from '@cozy/game-data';
import type { Appearance, ItemType, ClothingSlot } from '@cozy/game-data';
import { resolveEndpoint } from './endpoints';

function resolveApiBase(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  return resolveEndpoint(env, typeof window === 'undefined' ? undefined : window.location, 'api');
}

const BASE = resolveApiBase();
const TOKEN_KEY = 'cozy.session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const session = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: () => void = () => undefined;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = session.get();
  if (token) headers.authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(
      0,
      'offline',
      'Không thể kết nối đến máy chủ game. Vui lòng kiểm tra kết nối mạng và thử lại.',
    );
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = (data?.error ?? {}) as { code?: string; message?: string; details?: unknown };
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(
      res.status,
      err.code ?? 'error',
      err.message ?? `Yêu cầu thất bại (${res.status}).`,
      err.details,
    );
  }
  return data as T;
}

export const newIdempotencyKey = () => crypto.randomUUID();

// ---------------------------------------------------------------- types
export interface Balances {
  coin: number;
  fame: number;
  aiCreditCents: number;
}

export interface Me {
  id: string;
  email: string;
  role: 'player' | 'admin';
  displayName: string;
  statusText: string;
  title: string;
  createdAt: string;
  balances: Balances;
  appearance: Appearance;
  onboarding: {
    completed: boolean;
    reward: { coin: number; fame: number };
    steps: { id: string; label: string; done: boolean }[];
  };
}

export interface ShopItem {
  enabled: boolean;
  id: string;
  type: ItemType;
  slot: ClothingSlot | null;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rarityLabel: string;
  price: number;
  sprite: string;
  size: { w: number; h: number };
  decor: number;
  owned: number;
  equipped: boolean;
  wished: boolean;
}

export interface ApartmentObject {
  id?: string;
  itemId: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  sprite: string;
  size: { w: number; h: number };
  name: string;
}

export interface Apartment {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  themeId: string;
  score: number;
  published: boolean;
  visits: number;
  isOwner: boolean;
  grid: { cols: number; rows: number };
  objects: ApartmentObject[];
}

export interface AiKey {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked' | 'expired' | 'failed' | 'exhausted';
  keyPreview: string | null;
  models: string[];
  modelIds: string[];
  budgetCents: number;
  spendCents: number;
  remainingCents: number;
  rpm: number;
  tpm: number;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  suspendedReason: string | null;
  lastSyncedAt: string | null;
}

export interface AiOverview {
  gatewayBaseUrl: string;
  paused: boolean;
  balances: { coin: number; aiCreditCents: number };
  rate: { coinPerUsd: number; minMintCents: number; maxMintCents: number };
  eligibility: { eligible: boolean; checks: { id: string; label: string; met: boolean; detail: string }[] };
  monthly: { capCents: number; usedCents: number; remainingCents: number; resetsAt: string };
  pool: { remainingCents: number; totalCents: number; resetsAt: string };
  keyPolicy: { maxActiveKeys: number; activeKeys: number; ttlDays: number; minBudgetCents: number };
  models: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    creditMultiplier: number;
    rpm: number;
    tpm: number;
    contextLimit: number | null;
  }[];
  keys: AiKey[];
}

export interface NewKeyResult {
  keyId: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  budgetUsd: number;
  expiresAt: string;
  keyPreview: string;
}

export interface EventHub {
  rules: string[];
  rewards:
    | {
        coinPerPoint: number;
        placementCoin: number[];
        participationCoin: number;
        fame: number;
        placementFame: number[];
      }
    | undefined;
  serverTime: string;
  current: null | {
    id: string;
    title: string;
    status: 'scheduled' | 'running';
    startsAt: string;
    endsAt: string;
    participants: number;
    maxPlayers: number;
    joined: boolean;
    myScore: number;
  };
  history: {
    id: string;
    title: string;
    endedAt: string;
    participants: number;
    myScore: number | null;
    myPlacement: number | null;
    winners: { name: string; score: number; placement: number }[];
  }[];
}

export interface Friend {
  id: string;
  displayName: string;
  fame: number;
  mutual: boolean;
  online: boolean;
  location: string | null;
}

export interface PlayerCard {
  id: string;
  displayName: string;
  statusText: string;
  fame: number;
  title: string;
  memberSince: string;
  apartment: { score: number } | null;
  eventPodiums: { placement: number; count: number }[];
  isFriend: boolean;
  isMuted: boolean;
  isSelf: boolean;
}

export interface FishJournalEntry {
  speciesId: string;
  count: number;
  maxSizeCm: number;
  maxWeightKg: number;
  firstCaughtAt: string;
  lastCaughtAt: string;
}

export interface BackpackFish {
  id: string;
  speciesId: string;
  sizeCm: number;
  weightKg: number;
  sizeCategory: 'small' | 'standard' | 'large' | 'giant';
  isHeld: boolean;
  favorite: boolean;
  aquariumSlot: number | null;
  caughtAt: string;
  name: string;
  rarity: string;
  habitat: string;
  coinValue: number;
}

export const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
export const num = (n: number) => n.toLocaleString('en-US');
export const formatDateSafe = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
