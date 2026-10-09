export const SKIN_TONES = ['#f6d3b3', '#e8b98f', '#c98f63', '#a66b43', '#7a4a2c', '#553220'] as const;
export const HAIR_COLORS = [
  '#2b2320',
  '#6a3f24',
  '#c7853a',
  '#e9cf7d',
  '#b8b3ad',
  '#d2556a',
  '#4f6fd1',
  '#3e9b7a',
] as const;
export const HAIR_STYLES = ['short', 'long', 'bun', 'spiky', 'bald'] as const;
export const TOP_COLORS = ['#5b57a6', '#e0735b', '#3e9b7a', '#e6b84a', '#3a3f58', '#f2efe7'] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];

export interface Appearance {
  skin: number; // index into SKIN_TONES
  hairStyle: HairStyle;
  hairColor: number; // index into HAIR_COLORS
  baseTop: number; // index into TOP_COLORS, used when no top item is equipped
  /** Equipped item sprite keys by slot, resolved server side from inventory. */
  hat?: string | null;
  top?: string | null;
  face?: string | null;
  back?: string | null;
  rod?: string | null;
  sword?: string | null;
  boat?: string | null;
  vehicle?: string | null;
  heldFish?: {
    speciesId: string;
    sizeCm: number;
  } | null;
  isFishing?: boolean;
}

export const DEFAULT_APPEARANCE: Appearance = { skin: 1, hairStyle: 'short', hairColor: 1, baseTop: 0 };

export function sanitizeAppearance(
  input: unknown,
): Omit<
  Appearance,
  'hat' | 'top' | 'face' | 'back' | 'rod' | 'sword' | 'boat' | 'vehicle' | 'heldFish' | 'isFishing'
> {
  const a = (input ?? {}) as Record<string, unknown>;
  const idx = (v: unknown, max: number, fallback: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < max ? v : fallback;
  const hairStyle = HAIR_STYLES.includes(a.hairStyle as HairStyle) ? (a.hairStyle as HairStyle) : 'short';
  return {
    skin: idx(a.skin, SKIN_TONES.length, DEFAULT_APPEARANCE.skin),
    hairStyle,
    hairColor: idx(a.hairColor, HAIR_COLORS.length, DEFAULT_APPEARANCE.hairColor),
    baseTop: idx(a.baseTop, TOP_COLORS.length, DEFAULT_APPEARANCE.baseTop),
  };
}
