import { PERFECT_DAY_BONUS } from '@/config/game';
import { type Db, nowIso, transaction } from '@/db/db';
import { type DateKey, addDays, eachDay, weekdayOf } from '@/domain/dates';
import { isScheduled, maskIncludes } from '@/domain/schedule';
import { isPerfectDay } from '@/domain/stats';
import {
  type HabitInput,
  getHabit,
  insertHabit,
  listHabits,
  setArchivedRow,
  timelineOf,
  updateHabitRow,
} from './habits';
import { addLedger } from './ledger';

/**
 * Commands that move XP/coins. Invariant kept by every function here:
 * SUM(ledger habit entries) == SUM(completions.xp_awarded / coins_awarded),
 * and perfect_days matches what completions say.
 */

export interface CompletionChange {
  habitId: number;
  date: DateKey;
  completed: boolean;
  /** Net XP/coins moved, including any Perfect Day bonus change. */
  xp: number;
  coins: number;
  perfectDay: 'gained' | 'lost' | null;
}

export async function completionsBetween(
  db: Db,
  from: DateKey,
  to: DateKey,
): Promise<{ habit_id: number; date: DateKey }[]> {
  return db.getAllAsync('SELECT habit_id, date FROM completions WHERE date BETWEEN ? AND ?', [
    from,
    to,
  ]);
}

export async function completionDates(db: Db, habitId: number): Promise<Set<DateKey>> {
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT date FROM completions WHERE habit_id = ?',
    [habitId],
  );
  return new Set(rows.map((row) => row.date));
}

/**
 * Brings Perfect Day analytics in line with completions. New bonuses may only
 * be granted on rewardDate; history corrections and deletion pass no date.
 * Existing bonuses are reversed exactly when a day stops being perfect.
 * Caller owns the transaction.
 */
export async function resyncPerfectDays(
  db: Db,
  from: DateKey,
  to: DateKey,
  rewardDate?: DateKey,
): Promise<{ gained: DateKey[]; lost: DateKey[]; xp: number; coins: number }> {
  const result = { gained: [] as DateKey[], lost: [] as DateKey[], xp: 0, coins: 0 };
  if (from > to) return result;
  const habits = await listHabits(db, { includeArchived: true });
  const done = new Set(
    (await completionsBetween(db, from, to)).map((row) => `${row.habit_id}|${row.date}`),
  );
  const existing = new Set(
    (
      await db.getAllAsync<{ date: string }>(
        'SELECT date FROM perfect_days WHERE date BETWEEN ? AND ?',
        [from, to],
      )
    ).map((row) => row.date),
  );

  for (const date of eachDay(from, to)) {
    const perfect = isPerfectDay(
      habits.map((habit) => ({
        timeline: timelineOf(habit),
        done: done.has(`${habit.id}|${date}`),
      })),
      date,
    );
    if (perfect && !existing.has(date)) {
      const xp = date === rewardDate ? PERFECT_DAY_BONUS.xp : 0;
      const coins = date === rewardDate ? PERFECT_DAY_BONUS.coins : 0;
      await db.runAsync('INSERT INTO perfect_days (date, created_at) VALUES (?, ?)', [
        date,
        nowIso(),
      ]);
      await addLedger(db, {
        kind: 'perfect_day',
        xp,
        coins,
        date,
      });
      result.gained.push(date);
      result.xp += xp;
      result.coins += coins;
    } else if (!perfect && existing.has(date)) {
      // Reverse exactly what was granted, even if the bonus config changed since.
      const net = await db.getFirstAsync<{ xp: number; coins: number }>(
        `SELECT COALESCE(SUM(xp), 0) AS xp, COALESCE(SUM(coins), 0) AS coins FROM ledger
         WHERE date = ? AND kind IN ('perfect_day', 'perfect_day_undo')`,
        [date],
      );
      await db.runAsync('DELETE FROM perfect_days WHERE date = ?', [date]);
      await addLedger(db, {
        kind: 'perfect_day_undo',
        xp: -(net?.xp ?? 0),
        coins: -(net?.coins ?? 0),
        date,
      });
      result.lost.push(date);
      result.xp -= net?.xp ?? 0;
      result.coins -= net?.coins ?? 0;
    }
  }
  return result;
}

/**
 * Marks a habit done/not done for a day. Returns null when nothing changed,
 * which is how repeated taps are prevented from farming XP.
 */
export function setCompletion(
  db: Db,
  habitId: number,
  date: DateKey,
  done: boolean,
  today: DateKey,
): Promise<CompletionChange | null> {
  return transaction(db, async () => {
    if (date > today) throw new Error('Future days cannot be completed.');
    const habit = await getHabit(db, habitId);
    if (!habit) throw new Error('Habit not found.');

    if (!done) {
      const row = await db.getFirstAsync<{ id: number; xp_awarded: number; coins_awarded: number }>(
        'SELECT id, xp_awarded, coins_awarded FROM completions WHERE habit_id = ? AND date = ?',
        [habitId, date],
      );
      if (!row) return null;
      await db.runAsync('DELETE FROM completions WHERE id = ?', [row.id]);
      await addLedger(db, {
        kind: 'habit_undo',
        xp: -row.xp_awarded,
        coins: -row.coins_awarded,
        habitId,
        date,
        refId: row.id,
      });
      const sync = await resyncPerfectDays(db, date, date);
      return {
        habitId,
        date,
        completed: false,
        xp: -row.xp_awarded + sync.xp,
        coins: -row.coins_awarded + sync.coins,
        perfectDay: sync.lost.length ? 'lost' : null,
      };
    }

    const backfill = date < habit.startDate;
    if (backfill) {
      // Backfilling before tracking began: tracking now starts on that day.
      if (!maskIncludes(habit.schedules[0]?.daysMask ?? 0, weekdayOf(date))) {
        throw new Error('That day is not on this habit’s schedule.');
      }
      await db.runAsync('UPDATE habits SET start_date = ? WHERE id = ?', [date, habitId]);
      await db.runAsync(
        'UPDATE habit_schedules SET effective_from = ? WHERE habit_id = ? AND effective_from = ?',
        [date, habitId, habit.schedules[0].effectiveFrom],
      );
    } else if (!isScheduled(timelineOf(habit), date)) {
      throw new Error('That day is not on this habit’s schedule.');
    }

    // Past edits correct analytics only. Keep awards on the row so undo still
    // reverses existing (including pre-update) completions exactly.
    const xp = date === today ? habit.xpReward : 0;
    const coins = date === today ? habit.coinReward : 0;
    const insert = await db.runAsync(
      `INSERT INTO completions (habit_id, date, xp_awarded, coins_awarded, created_at)
       VALUES (?, ?, ?, ?, ?) ON CONFLICT(habit_id, date) DO NOTHING`,
      [habitId, date, xp, coins, nowIso()],
    );
    if (insert.changes === 0) return null;
    await addLedger(db, {
      kind: 'habit',
      xp,
      coins,
      habitId,
      date,
      refId: insert.lastInsertRowId,
    });
    // A backfill also makes the days up to the old start count, so resync them all.
    const sync = await resyncPerfectDays(db, date, backfill ? addDays(habit.startDate, -1) : date, today);
    return {
      habitId,
      date,
      completed: true,
      xp: xp + sync.xp,
      coins: coins + sync.coins,
      perfectDay: sync.gained.includes(date) ? 'gained' : sync.lost.length ? 'lost' : null,
    };
  });
}

export function createHabit(db: Db, input: HabitInput, today: DateKey): Promise<number> {
  return transaction(db, async () => {
    const id = await insertHabit(db, input, today);
    await resyncPerfectDays(db, today, today, today);
    return id;
  });
}

export function updateHabit(db: Db, id: number, input: HabitInput, today: DateKey): Promise<void> {
  return transaction(db, async () => {
    const habit = await getHabit(db, id);
    if (!habit) throw new Error('Habit not found.');
    await updateHabitRow(db, habit, input, today);
    await resyncPerfectDays(db, today, today, today);
  });
}

export function setHabitArchived(
  db: Db,
  id: number,
  archived: boolean,
  today: DateKey,
): Promise<void> {
  return transaction(db, async () => {
    const habit = await getHabit(db, id);
    if (!habit || habit.archived === archived) return;
    await setArchivedRow(db, habit, archived, today);
    await resyncPerfectDays(db, today, today, today);
  });
}

/** Deletes a habit with its history and takes back the XP/coins it earned. */
export function deleteHabit(db: Db, id: number, today: DateKey): Promise<void> {
  return transaction(db, async () => {
    const habit = await getHabit(db, id);
    if (!habit) return;
    const earned = await habitEarnings(db, id);
    if (earned.count > 0) {
      await addLedger(db, {
        kind: 'habit_deleted',
        xp: -earned.xp,
        coins: -earned.coins,
        habitId: id,
        note: habit.title,
      });
    }
    await db.runAsync('DELETE FROM completions WHERE habit_id = ?', [id]);
    await db.runAsync('DELETE FROM habit_schedules WHERE habit_id = ?', [id]);
    await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
    await resyncPerfectDays(db, habit.startDate, today);
  });
}

/** What a habit has earned so far (also used for the delete confirmation copy). */
export async function habitEarnings(
  db: Db,
  id: number,
): Promise<{ xp: number; coins: number; count: number }> {
  const row = await db.getFirstAsync<{ xp: number; coins: number; n: number }>(
    `SELECT COALESCE(SUM(xp_awarded), 0) AS xp, COALESCE(SUM(coins_awarded), 0) AS coins,
       COUNT(*) AS n FROM completions WHERE habit_id = ?`,
    [id],
  );
  return { xp: row?.xp ?? 0, coins: row?.coins ?? 0, count: row?.n ?? 0 };
}
