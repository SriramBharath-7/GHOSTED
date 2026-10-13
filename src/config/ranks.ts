/**
 * The rank ladder. Rank is long-term standing: it needs both a level and a
 * number of Perfect Days, so XP alone can't buy it. Rename or retune here only.
 */
export interface Rank {
  id: string;
  name: string;
  minLevel: number;
  minPerfectDays: number;
  /** One quiet line shown under the rank. */
  motto: string;
}

export const RANKS: readonly Rank[] = [
  { id: 'unseen', name: 'Unseen', minLevel: 1, minPerfectDays: 0, motto: 'Gone from the noise.' },
  { id: 'shade', name: 'Shade', minLevel: 4, minPerfectDays: 3, motto: 'Moving quietly.' },
  { id: 'phantom', name: 'Phantom', minLevel: 8, minPerfectDays: 10, motto: 'Work no one sees.' },
  { id: 'specter', name: 'Specter', minLevel: 14, minPerfectDays: 25, motto: 'Discipline as habit.' },
  { id: 'wraith', name: 'Wraith', minLevel: 22, minPerfectDays: 50, motto: 'Relentless.' },
  { id: 'revenant', name: 'Revenant', minLevel: 32, minPerfectDays: 90, motto: 'Returning stronger.' },
  { id: 'ascendant', name: 'Ascendant', minLevel: 45, minPerfectDays: 150, motto: 'Built, not born.' },
];
