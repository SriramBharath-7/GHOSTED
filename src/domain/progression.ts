import { LEVEL_CURVE } from '@/config/game';
import { RANKS, type Rank } from '@/config/ranks';

export function xpToNextLevel(level: number): number {
  return LEVEL_CURVE.base + LEVEL_CURVE.step * (level - 1);
}

export interface LevelInfo {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  /** 0..1 progress toward the next level. */
  progress: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }
  const xpForNext = xpToNextLevel(level);
  return { level, totalXp: xp, xpIntoLevel: remaining, xpForNext, progress: remaining / xpForNext };
}

export interface RankInfo {
  rank: Rank;
  /** 1-based position on the ladder. */
  tier: number;
  next: Rank | null;
}

export function rankFor(level: number, perfectDays: number): RankInfo {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (level >= rank.minLevel && perfectDays >= rank.minPerfectDays) index = i;
  });
  return { rank: RANKS[index], tier: index + 1, next: RANKS[index + 1] ?? null };
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;
