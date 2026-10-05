import { create } from 'zustand';
import type { CaveSnapshot } from '@cozy/game-data';
export const useCave = create<{
  snapshot: CaveSnapshot | null;
  prompt: string;
  setSnapshot: (snapshot: CaveSnapshot | null) => void;
  setPrompt: (prompt: string) => void;
}>((set) => ({
  snapshot: null,
  prompt: '',
  setSnapshot: (snapshot) => set({ snapshot }),
  setPrompt: (prompt) => set({ prompt }),
}));
