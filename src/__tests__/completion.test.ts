import { PERFECT_DAY_BONUS } from '@/config/game';
import type { Db } from '@/db/db';
import { maskFromWeekdays } from '@/domain/schedule';
import { listHabits } from '@/repo/habits';
import { getBalances, getPerfectDayCount } from '@/repo/ledger';
import {
  createHabit,
  deleteHabit,
  setCompletion,
  setHabitArchived,
  updateHabit,
} from '@/repo/progress';
import { seededDb } from './helpers/testDb';

const TODAY = '2026-10-04';

async function habitByTitle(db: Db, title: string) {
  const habit = (await listHabits(db, { includeArchived: true })).find((h) => h.title === title);
  if (!habit) throw new Error(`missing ${title}`);
  return habit;
}

/** The invariant every command must keep. */
async function expectLedgerMatchesCompletions(db: Db) {
  const habitLedger = await db.getFirstAsync<{ xp: number; coins: number }>(
    `SELECT COALESCE(SUM(xp),0) AS xp, COALESCE(SUM(coins),0) AS coins FROM ledger
     WHERE kind IN ('habit','habit_undo','habit_deleted')`,
    [],
  );
  const completions = await db.getFirstAsync<{ xp: number; coins: number }>(
    'SELECT COALESCE(SUM(xp_awarded),0) AS xp, COALESCE(SUM(coins_awarded),0) AS coins FROM completions',
    [],
  );
  expect(habitLedger).toEqual(completions);
  const bonuses = await db.getAllAsync<{ date: string; xp: number; coins: number; perfect: number }>(
    `SELECT l.date, SUM(l.xp) AS xp, SUM(l.coins) AS coins,
       EXISTS(SELECT 1 FROM perfect_days p WHERE p.date = l.date) AS perfect
     FROM ledger l WHERE kind IN ('perfect_day','perfect_day_undo') GROUP BY l.date`,
    [],
  );
  for (const bonus of bonuses) {
    // Corrected historical Perfect Days count in analytics without new rewards.
    expect(bonus.xp).toBe(bonus.perfect && bonus.xp > 0 ? PERFECT_DAY_BONUS.xp : 0);
    expect(bonus.coins).toBe(bonus.xp > 0 ? PERFECT_DAY_BONUS.coins : 0);
  }
}

describe('seeded habits', () => {
  it('seeds the five visible habits with their exact names, once', async () => {
    const db = await seededDb(TODAY);
    const habits = await listHabits(db);
    expect(habits.map((h) => h.title)).toEqual([
      'Regenesis Command',
      'The Iron Monarch',
      'The Kernel Strike',
      'The Phoenix 65',
      'No Junk UPF',
    ]);
    const regenesis = habits[0];
    expect(regenesis.question).toBe('Did you complete the Hair protocol (Minoxidil and Finasteride)?');
    expect(regenesis.reminderTime).toBe('20:30');
    expect(regenesis.reminderEnabled).toBe(true);
    expect(await getBalances(db)).toEqual({ xp: 0, coins: 0 });
    const history = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM completions', []);
    expect(history?.n).toBe(0);
  });
});

describe('completing habits', () => {
  it('awards XP and coins once per habit per day', async () => {
    const db = await seededDb(TODAY);
    const iron = await habitByTitle(db, 'The Iron Monarch');

    const first = await setCompletion(db, iron.id, TODAY, true, TODAY);
    expect(first).toMatchObject({ completed: true, xp: iron.xpReward, coins: iron.coinReward });

    // Second tap on the same day: nothing happens.
    expect(await setCompletion(db, iron.id, TODAY, true, TODAY)).toBeNull();
    expect(await getBalances(db)).toEqual({ xp: iron.xpReward, coins: iron.coinReward });
    await expectLedgerMatchesCompletions(db);
  });

  it('undo reverses exactly what was awarded', async () => {
    const db = await seededDb(TODAY);
    const iron = await habitByTitle(db, 'The Iron Monarch');
    await setCompletion(db, iron.id, TODAY, true, TODAY);

    const undo = await setCompletion(db, iron.id, TODAY, false, TODAY);
    expect(undo).toMatchObject({ completed: false, xp: -iron.xpReward, coins: -iron.coinReward });
    expect(await getBalances(db)).toEqual({ xp: 0, coins: 0 });
    expect(await setCompletion(db, iron.id, TODAY, false, TODAY)).toBeNull();
    await expectLedgerMatchesCompletions(db);
  });

  it('cannot farm XP by toggling repeatedly or by concurrent taps', async () => {
    const db = await seededDb(TODAY);
    const kernel = await habitByTitle(db, 'The Kernel Strike');
    for (let i = 0; i < 5; i++) {
      await setCompletion(db, kernel.id, TODAY, true, TODAY);
      await setCompletion(db, kernel.id, TODAY, false, TODAY);
    }
    await Promise.all([
      setCompletion(db, kernel.id, TODAY, true, TODAY),
      setCompletion(db, kernel.id, TODAY, true, TODAY),
      setCompletion(db, kernel.id, TODAY, true, TODAY),
    ]);
    expect(await getBalances(db)).toEqual({ xp: kernel.xpReward, coins: kernel.coinReward });
    await expectLedgerMatchesCompletions(db);
  });

  it('keeps the reward a completion was given even if the habit is retuned later', async () => {
    const db = await seededDb(TODAY);
    const habit = await habitByTitle(db, 'No Junk UPF');
    await setCompletion(db, habit.id, TODAY, true, TODAY);
    await updateHabit(db, habit.id, { ...habit, xpReward: 999, coinReward: 99 }, TODAY);
    await setCompletion(db, habit.id, TODAY, false, TODAY);
    expect(await getBalances(db)).toEqual({ xp: 0, coins: 0 });
  });

  it('rejects future days and unscheduled days', async () => {
    const db = await seededDb('2026-09-01');
    const habit = await habitByTitle(db, 'The Phoenix 65');
    await expect(setCompletion(db, habit.id, '2026-10-05', true, TODAY)).rejects.toThrow('Future');
    await updateHabit(db, habit.id, { ...habit, daysMask: maskFromWeekdays([1, 3, 5]) }, '2026-10-01');
    await expect(setCompletion(db, habit.id, TODAY, true, TODAY)).rejects.toThrow('schedule');
    // Before the schedule change it was a daily habit, so a past Sunday is still valid.
    await expect(setCompletion(db, habit.id, '2026-09-27', true, TODAY)).resolves.toMatchObject({
      completed: true,
    });
  });

  it('backfills analytics before tracking started without granting XP, coins or bonuses', async () => {
    const db = await seededDb(TODAY);
    const habit = await habitByTitle(db, 'Regenesis Command');
    const change = await setCompletion(db, habit.id, '2026-10-02', true, TODAY);
    expect((await habitByTitle(db, 'Regenesis Command')).startDate).toBe('2026-10-02');
    // No other habit was tracked on Oct 2, so that day is now a Perfect Day.
    expect(change?.perfectDay).toBe('gained');
    expect(change).toMatchObject({ xp: 0, coins: 0 });
    expect(await getBalances(db)).toEqual({ xp: 0, coins: 0 });
    // Oct 3 is now tracked but not done: a miss, not a Perfect Day.
    expect(await getPerfectDayCount(db)).toBe(1);
    await expectLedgerMatchesCompletions(db);
  });

  it('repeated historical edits and concurrent backfills never create rewards', async () => {
    const db = await seededDb('2026-10-01');
    const habits = await listHabits(db);
    const past = '2026-10-02';
    await Promise.all(habits.flatMap((h) => [
      setCompletion(db, h.id, past, true, TODAY),
      setCompletion(db, h.id, past, true, TODAY),
    ]));
    expect(await getPerfectDayCount(db)).toBe(1);
    for (let i = 0; i < 3; i++) {
      await setCompletion(db, habits[0].id, past, false, TODAY);
      await setCompletion(db, habits[0].id, past, true, TODAY);
    }
    expect(await getBalances(db)).toEqual({ xp: 0, coins: 0 });
    await expectLedgerMatchesCompletions(db);
  });

  it('preserves previously earned history until an explicit undo reverses its exact awards', async () => {
    const past = '2026-10-02';
    const db = await seededDb(past);
    const habits = await listHabits(db);
    for (const habit of habits) await setCompletion(db, habit.id, past, true, past);
    const before = await getBalances(db);
    expect(await setCompletion(db, habits[0].id, past, true, TODAY)).toBeNull();
    expect(await getBalances(db)).toEqual(before);
    await updateHabit(db, habits[0].id, { ...habits[0], xpReward: 999, coinReward: 999 }, TODAY);
    const undo = await setCompletion(db, habits[0].id, past, false, TODAY);
    expect(undo).toMatchObject({
      xp: -habits[0].xpReward - PERFECT_DAY_BONUS.xp,
      coins: -habits[0].coinReward - PERFECT_DAY_BONUS.coins,
    });
    const afterUndo = await getBalances(db);
    await setCompletion(db, habits[0].id, past, true, TODAY);
    expect(await getBalances(db)).toEqual(afterUndo);
    expect(await getPerfectDayCount(db)).toBe(1);
    await expectLedgerMatchesCompletions(db);
  });
});

describe('perfect day', () => {
  it('grants the bonus when every visible habit is done and takes it back on undo', async () => {
    const db = await seededDb(TODAY);
    const habits = await listHabits(db);
    let last = null;
    for (const habit of habits) last = await setCompletion(db, habit.id, TODAY, true, TODAY);
    expect(last?.perfectDay).toBe('gained');
    expect(await getPerfectDayCount(db)).toBe(1);

    const total = habits.reduce((sum, h) => sum + h.xpReward, 0);
    expect((await getBalances(db)).xp).toBe(total + PERFECT_DAY_BONUS.xp);

    const undo = await setCompletion(db, habits[0].id, TODAY, false, TODAY);
    expect(undo?.perfectDay).toBe('lost');
    expect(await getPerfectDayCount(db)).toBe(0);
    expect((await getBalances(db)).xp).toBe(total - habits[0].xpReward);
    await expectLedgerMatchesCompletions(db);
  });

  it('ignores archived habits and re-checks when a habit is added', async () => {
    const db = await seededDb(TODAY);
    const habits = await listHabits(db);
    await setHabitArchived(db, habits[4].id, true, TODAY);
    for (const habit of habits.slice(0, 4)) await setCompletion(db, habit.id, TODAY, true, TODAY);
    expect(await getPerfectDayCount(db)).toBe(1);

    await createHabit(
      db,
      {
        title: 'New',
        icon: '✨',
        description: '',
        question: '',
        accent: '#fff',
        daysMask: 127,
        xpReward: 10,
        coinReward: 1,
        reminderTime: null,
        reminderEnabled: false,
      },
      TODAY,
    );
    expect(await getPerfectDayCount(db)).toBe(0);
    await expectLedgerMatchesCompletions(db);
  });
});

describe('deleting a habit', () => {
  it('updates historical Perfect Days without granting bonuses for deleting a missing habit', async () => {
    const past = '2026-10-02';
    const db = await seededDb(past);
    const habits = await listHabits(db);
    for (const habit of habits.slice(0, 4)) await setCompletion(db, habit.id, past, true, past);
    const before = await getBalances(db);
    await deleteHabit(db, habits[4].id, TODAY);
    expect(await getPerfectDayCount(db)).toBe(1);
    expect(await getBalances(db)).toEqual(before);
    await expectLedgerMatchesCompletions(db);
  });

  it('removes its history and the XP/coins it earned', async () => {
    const db = await seededDb('2026-10-01');
    const iron = await habitByTitle(db, 'The Iron Monarch');
    const regenesis = await habitByTitle(db, 'Regenesis Command');
    await setCompletion(db, iron.id, '2026-10-02', true, TODAY);
    await setCompletion(db, iron.id, '2026-10-03', true, TODAY);
    await setCompletion(db, regenesis.id, TODAY, true, TODAY);

    await deleteHabit(db, iron.id, TODAY);
    expect(await getBalances(db)).toEqual({ xp: regenesis.xpReward, coins: regenesis.coinReward });
    expect((await listHabits(db, { includeArchived: true })).map((h) => h.id)).not.toContain(iron.id);
    await expectLedgerMatchesCompletions(db);
  });
});
