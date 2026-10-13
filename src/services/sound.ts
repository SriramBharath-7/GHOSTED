import { type AudioPlayer, createAudioPlayer } from 'expo-audio';

export type SoundKey =
  | 'complete'
  | 'undo'
  | 'levelUp'
  | 'perfectDay'
  | 'purchase'
  | 'redeem'
  | 'unlock';

/** Short bundled cues; the Settings switch controls every sound. */
const SOURCES: Record<SoundKey, number> = {
  complete: require('../../assets/sounds/complete.wav'),
  undo: require('../../assets/sounds/undo.wav'),
  levelUp: require('../../assets/sounds/celebrate.wav'),
  perfectDay: require('../../assets/sounds/celebrate.wav'),
  purchase: require('../../assets/sounds/purchase.wav'),
  redeem: require('../../assets/sounds/redeem.wav'),
  unlock: require('../../assets/sounds/complete.wav'),
};

let enabled = true;
const players = new Map<SoundKey, AudioPlayer>();

export function setSoundEnabled(value: boolean) {
  enabled = value;
  if (!value) {
    for (const player of players.values()) {
      try { player.pause(); } catch { /* Audio never blocks a setting change. */ }
    }
  }
}

export async function playSound(key: SoundKey) {
  const source = SOURCES[key];
  if (!enabled || source === undefined) return;
  try {
    let player = players.get(key);
    if (!player) {
      player = createAudioPlayer(source);
      player.volume = 0.45;
      players.set(key, player);
    }
    await player.seekTo(0);
    if (enabled) player.play();
  } catch {
    // A missing or broken sound must never break the action that triggered it.
  }
}
