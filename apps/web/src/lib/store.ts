import type { ZoneId } from '@cozy/game-data';
import { create } from 'zustand';
import {
  type AdminWeatherOverride,
  type WeatherTelemetry,
  resolveEffectiveTelemetry,
} from '../game/weather-engine';

export type Panel =
  | 'cave-shop'
  | null
  | 'shop-vehicles'
  | 'shop-fashion'
  | 'shop-furniture'
  | 'shop-rods'
  | 'wardrobe'
  | 'backpack'
  | 'tackle'
  | 'events'
  | 'ai'
  | 'friends'
  | 'apartments'
  | 'profile'
  | 'ledger'
  | 'fishdex'
  | 'bida'
  | 'cybernet'
  | 'farm-password'
  | 'farm-plot'
  | 'farm-silo'
  | 'farm-shop';
export type Activity = null | 'fishing' | 'delivery' | 'cafe';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info' | 'reward';
  title: string;
  body?: string;
}

export interface ChatLine {
  id: number;
  from: string;
  userId: string;
  name: string;
  text: string;
  at: number;
}

export interface DeliveryJob {
  runId: string;
  nonce: string;
  destination: ZoneId;
  destinationLabel: string;
  package: string;
  startedAt: number;
  timeLimitMs: number;
}

interface UiState {
  panel: Panel;
  activity: Activity;
  zone: ZoneId | null;
  connection: 'connecting' | 'online' | 'reconnecting' | 'offline';
  room: {
    kind:
      | 'martial'
      | 'town'
      | 'showroom'
      | 'apartment'
      | 'company'
      | 'university'
      | 'comga'
      | 'bida'
      | 'cybernet'
      | 'farm'
      | 'ocean'
      | 'cave';
    ownerId?: string;
    label: string;
  };
  toasts: Toast[];
  chat: ChatLine[];
  delivery: DeliveryJob | null;
  inspectUserId: string | null;
  cyberStation: string | null;
  showroomVehicle: string | null;
  setShowroomVehicle: (id: string | null) => void;
  editingApartment: boolean;
  reducedMotion: boolean;
  muted: boolean;
  myUserId: string | null;
  activePlotIndex: number | null;
  farmOwnerId: string | null;
  setPanel: (p: Panel) => void;
  setCyberStation: (station: string | null) => void;
  setActivePlotIndex: (idx: number | null) => void;
  setFarmOwnerId: (id: string | null) => void;
  setActivity: (a: Activity) => void;
  setZone: (z: ZoneId | null) => void;
  setConnection: (c: UiState['connection']) => void;
  setRoom: (r: UiState['room']) => void;
  setMyUserId: (id: string | null) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  pushChat: (c: Omit<ChatLine, 'id'>) => void;
  setDelivery: (d: DeliveryJob | null) => void;
  inspect: (userId: string | null) => void;
  setEditingApartment: (v: boolean) => void;
  setMuted: (v: boolean) => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  weather: WeatherTelemetry;
  weatherOverride: AdminWeatherOverride | null;
  setWeatherTelemetry: (weather: WeatherTelemetry) => void;
  setWeatherOverride: (override: Partial<AdminWeatherOverride> | null) => void;
  resetWeatherOverride: () => void;
  triggerLightning: () => void;
  triggerWindGust: () => void;
}

let nextId = 1;

export const useUi = create<UiState>((set) => ({
  panel: null,
  activity: null,
  zone: null,
  connection: 'connecting',
  room: { kind: 'town', label: 'Town' },
  toasts: [],
  chat: [],
  delivery: null,
  inspectUserId: null,
  cyberStation: null,
  showroomVehicle: null,
  setShowroomVehicle: (showroomVehicle) => set({ showroomVehicle }),
  editingApartment: false,
  activePlotIndex: null,
  farmOwnerId: null,
  weather: resolveEffectiveTelemetry(null, null),
  weatherOverride: null,
  reducedMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  muted: localStorage.getItem('cozy.muted') === '1',
  zoom: (() => {
    if (typeof window === 'undefined') return 1;
    const v = parseFloat(localStorage.getItem('cozy.zoom') || '1');
    return isNaN(v) ? 1 : Math.max(0.5, Math.min(2.5, v));
  })(),
  myUserId: null,
  setPanel: (panel) => set({ panel }),
  setCyberStation: (cyberStation) => set({ cyberStation }),
  setActivePlotIndex: (activePlotIndex) => set({ activePlotIndex }),
  setFarmOwnerId: (farmOwnerId) => set({ farmOwnerId }),
  setActivity: (activity) => set({ activity }),
  setZone: (zone) => set({ zone }),
  setConnection: (connection) => set({ connection }),
  setRoom: (room) => set({ room }),
  setMyUserId: (myUserId) => set({ myUserId }),
  toast: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      t.kind === 'error' ? 6000 : 4000,
    );
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  pushChat: (c) => set((s) => ({ chat: [...s.chat.slice(-79), { ...c, id: nextId++ }] })),
  setDelivery: (delivery) => set({ delivery }),
  inspect: (inspectUserId) => set({ inspectUserId }),
  setEditingApartment: (editingApartment) => set({ editingApartment }),
  setMuted: (muted) => {
    localStorage.setItem('cozy.muted', muted ? '1' : '0');
    set({ muted });
  },
  setZoom: (z) => {
    set((s) => {
      const next = typeof z === 'function' ? z(s.zoom) : z;
      const clamped = Math.round(Math.max(0.5, Math.min(2.5, next)) * 100) / 100;
      try {
        localStorage.setItem('cozy.zoom', String(clamped));
      } catch {
        // localStorage may be disabled or full
      }
      return { zoom: clamped };
    });
  },
  setWeatherTelemetry: (weather) => set({ weather }),
  setWeatherOverride: (override) => {
    set((s) => {
      if (!override) {
        const next = resolveEffectiveTelemetry(null, null);
        return { weatherOverride: null, weather: next };
      }
      const merged: AdminWeatherOverride = {
        enabled: true,
        ...(s.weatherOverride ?? {}),
        ...override,
      };
      const next = resolveEffectiveTelemetry(merged, null);
      return { weatherOverride: merged, weather: next };
    });
  },
  resetWeatherOverride: () => {
    set(() => {
      const next = resolveEffectiveTelemetry(null, null);
      return { weatherOverride: null, weather: next };
    });
  },
  triggerLightning: () => {
    const now = Date.now();
    set((s) => {
      const ov = s.weatherOverride ?? { enabled: true };
      const nextOv: AdminWeatherOverride = { ...ov, enabled: true, lightningAt: now };
      return {
        weatherOverride: nextOv,
        weather: { ...s.weather, lightningTriggeredAt: now },
      };
    });
  },
  triggerWindGust: () => {
    const now = Date.now();
    set((s) => {
      const ov = s.weatherOverride ?? { enabled: true };
      const nextOv: AdminWeatherOverride = { ...ov, enabled: true, windGustAt: now };
      return {
        weatherOverride: nextOv,
        weather: { ...s.weather, windGustTriggeredAt: now },
      };
    });
  },
}));
