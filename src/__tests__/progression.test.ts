import { LEVEL_CURVE } from '@/config/game';
import { RANKS } from '@/config/ranks';
import { levelInfo, rankFor, xpToNextLevel } from '@/domain/progression';

describe('levels', () => {
  it('starts at level 1 and follows the configured curve', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNext: LEVEL_CURVE.base });
    expect(xpToNextLevel(3)).toBe(LEVEL_CURVE.base + 2 * LEVEL_CURVE.step);
  });

  it('levels up exactly at the threshold', () => {
    const first = xpToNextLevel(1);
    expect(levelInfo(first - 1).level).toBe(1);
    expect(levelInfo(first)).toMatchObject({ level: 2, xpIntoLevel: 0 });
    expect(levelInfo(first + xpToNextLevel(2) + 10)).toMatchObject({ level: 3, xpIntoLevel: 10 });
  });

  it('never goes below level 1', () => {
    expect(levelInfo(-50)).toMatchObject({ level: 1, totalXp: 0, progress: 0 });
  });
});

describe('ranks', () => {
  it('needs both level and Perfect Days', () => {
    const second = RANKS[1];
    expect(rankFor(second.minLevel, 0).rank.id).toBe(RANKS[0].id);
    expect(rankFor(second.minLevel, second.minPerfectDays).rank.id).toBe(second.id);
    expect(rankFor(1, 999).rank.id).toBe(RANKS[0].id);
  });

  it('exposes the next rank and stops at the top', () => {
    expect(rankFor(1, 0)).toMatchObject({ tier: 1, next: RANKS[1] });
    expect(rankFor(999, 9999)).toMatchObject({ tier: RANKS.length, next: null });
  });
});
