import { type Db, nowIso, transaction } from '@/db/db';
import { type DateKey, addDays } from '@/domain/dates';
import { isScheduled } from '@/domain/schedule';
import { seeded } from '@/domain/seeded';
import { listHabits } from '@/repo/habits';
import { addLedger } from '@/repo/ledger';
import { resyncPerfectDays } from '@/repo/progress';

/**
 * DEV ONLY. Generates believable sample history for screenshots and testing.
 * It is reachable only from Settings when __DEV__ is true, so production
 * starts clean. To remove it: delete this file and the "Developer" block in
 * src/app/settings.tsx.
 *
 * Goes through the same tables and ledger rules as real completions, so XP,
 * coins and Perfect Days stay consistent.
 */
export function seedDemoHistory(db: Db, today: DateKey, days = 120): Promise<void> {
  return transaction(db, async () => {
    const start = addDays(today, -days);
    for (const habit of await listHabits(db)) {
      const first = habit.schedules[0];
      if (!first) continue;
      if (habit.startDate > start) {
        await db.runAsync('UPDATE habits SET start_date = ? WHERE id = ?', [start, habit.id]);
        await db.runAsync(
          'UPDATE habit_schedules SET effective_from = ? WHERE habit_id = ? AND effective_from = ?',
          [start, habit.id, first.effectiveFrom],
        );
      }
      const timeline = {
        startDate: start,
        schedules: [{ ...first, effectiveFrom: start }, ...habit.schedules.slice(1)],
      };
      for (let i = days; i >= 1; i--) {
        const day = addDays(today, -i);
        if (!isScheduled(timeline, day)) continue;
        // Consistency improves over time, with a different personality per habit.
        const chance = 0.55 + 0.35 * (1 - i / days) + (habit.id % 3) * 0.04;
        if (seeded(habit.id * 7919 + i) > chance) continue;
        const insert = await db.runAsync(
          `INSERT INTO completions (habit_id, date, xp_awarded, coins_awarded, created_at)
           VALUES (?, ?, ?, ?, ?) ON CONFLICT(habit_id, date) DO NOTHING`,
          [habit.id, day, habit.xpReward, habit.coinReward, nowIso()],
        );
        if (insert.changes === 0) continue;
        await addLedger(db, {
          kind: 'habit',
          xp: habit.xpReward,
          coins: habit.coinReward,
          habitId: habit.id,
          date: day,
          refId: insert.lastInsertRowId,
        });
      }
    }
    await resyncPerfectDays(db, start, today);
  });
}
