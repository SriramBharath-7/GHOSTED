import { create } from 'zustand';
import type { Rank } from '@/config/ranks';

/**
 * Brief lighting cues for the existing Ghost portrait.
 */
export type CharacterState =
  | 'idle'
  | 'habitComplete'
  | 'training'
  | 'reading'
  | 'celebrate'
  | 'levelUp'
  | 'victory';

/** Big moments, shown one at a time by the overlay host. */
export type FxEvent =
  | { type: 'levelUp'; oldLevel: number; level: number; newRank: Rank | null }
  | { type: 'perfectDay'; done: number; xp: number; coins: number }
  | { type: 'acquired'; name: string; icon: string; cost?: number }
  | { type: 'missionComplete'; name: string; icon: string };

interface FxState {
  queue: (FxEvent & { id: number })[];
  character: { state: CharacterState; nonce: number };
  push: (event: FxEvent) => void;
  dismiss: () => void;
  cue: (state: CharacterState) => void;
}

let nextId = 1;

export const useFx = create<FxState>((set) => ({
  queue: [],
  character: { state: 'idle', nonce: 0 },
  push: (event) => set((s) => ({ queue: [...s.queue, { ...event, id: nextId++ }] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
  cue: (state) => set((s) => ({ character: { state, nonce: s.character.nonce + 1 } })),
}));

/** Triggers a character reaction from anywhere (non-React code included). */
export const cueCharacter = (state: CharacterState) => useFx.getState().cue(state);
