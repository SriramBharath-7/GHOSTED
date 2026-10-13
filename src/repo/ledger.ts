import { type Db, nowIso } from '@/db/db';
import { type DateKey, addDays } from '@/domain/dates';

/** Every XP/coin movement is one append-only row. Reversals are new rows, never edits. */
export type LedgerKind =
  | 'habit'
  | 'habit_undo'
  | 'habit_deleted'
  | 'perfect_day'
  | 'perfect_day_undo'
  | 'purchase';

export interface LedgerEntry {
  kind: LedgerKind;
  xp?: number;
  coins?: number;
  habitId?: number | null;
  date?: DateKey | null;
  refId?: number | null;
  note?: string;
}

export async function addLedger(db: Db, entry: LedgerEntry): Promise<void> {
  await db.runAsync(
    'INSERT INTO ledger (kind, xp, coins, habit_id, date, ref_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      entry.kind,
      entry.xp ?? 0,
      entry.coins ?? 0,
      entry.habitId ?? null,
      entry.date ?? null,
      entry.refId ?? null,
      entry.note ?? '',
      nowIso(),
    ],
  );
}

export async function getBalances(db: Db): Promise<{ xp: number; coins: number }> {
  const row = await db.getFirstAsync<{ xp: number; coins: number }>(
    'SELECT COALESCE(SUM(xp), 0) AS xp, COALESCE(SUM(coins), 0) AS coins FROM ledger',
    [],
  );
  return { xp: row?.xp ?? 0, coins: row?.coins ?? 0 };
}

/** Consecutive Perfect Days ending today (or yesterday while today is still open). */
export async function getPerfectDayStreak(db: Db, today: DateKey): Promise<number> {
  const rows = await db.getAllAsync<{ date: string }>('SELECT date FROM perfect_days ORDER BY date DESC LIMIT 800', []);
  const days = new Set(rows.map((r) => r.date));
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export async function getPerfectDayCount(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM perfect_days', []);
  return row?.n ?? 0;
}

/** Net XP/coins earned from habits and Perfect Day on one day. */
export async function getDayEarnings(db: Db, date: DateKey): Promise<{ xp: number; coins: number }> {
  const row = await db.getFirstAsync<{ xp: number; coins: number }>(
    `SELECT COALESCE(SUM(xp), 0) AS xp, COALESCE(SUM(coins), 0) AS coins FROM ledger
     WHERE date = ? AND kind IN ('habit', 'habit_undo', 'perfect_day', 'perfect_day_undo')`,
    [date],
  );
  return { xp: row?.xp ?? 0, coins: row?.coins ?? 0 };
}
