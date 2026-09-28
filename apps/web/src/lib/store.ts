import type { ZoneId } from '@cozy/game-data';
import { create } from 'zustand';

export type Panel =
  | null
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
  | 'fishdex';
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
  room: { kind: 'town' | 'apartment'; ownerId?: string; label: string };
  toasts: Toast[];
  chat: ChatLine[];
  delivery: DeliveryJob | null;
  inspectUserId: string | null;
  editingApartment: boolean;
  reducedMotion: boolean;
  muted: boolean;
  myUserId: string | null;
  setPanel: (p: Panel) => void;
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
  editingApartment: false,
  reducedMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  muted: localStorage.getItem('cozy.muted') === '1',
  myUserId: null,
  setPanel: (panel) => set({ panel }),
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
}));
