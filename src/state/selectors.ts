import { HISTORY_WINDOW_DAYS } from '@/config/game';
import { type DateKey, addDays } from '@/domain/dates';
import { isScheduled } from '@/domain/schedule';
import { type HabitHistory, completionRate, currentStreak, missedRun } from '@/domain/stats';
import { type Habit, timelineOf } from '@/repo/habits';
import type { PermissionState } from '@/services/notifications';

export function historyOf(habit: Habit, completed: ReadonlySet<DateKey>, today: DateKey): HabitHistory {
  return { timeline: timelineOf(habit), completed, today };
}

/** Habits scheduled on `date`, in the user's order. */
export function dueOn(habits: Habit[], date: DateKey): Habit[] {
  return habits.filter((habit) => isScheduled(timelineOf(habit), date));
}

export function dayProgress(
  habits: Habit[],
  recent: Record<number, ReadonlySet<DateKey>>,
  date: DateKey,
): { done: number; total: number } {
  const due = dueOn(habits, date);
  return { done: due.filter((h) => recent[h.id]?.has(date)).length, total: due.length };
}

const EMPTY: ReadonlySet<DateKey> = new Set();
export const completedSet = (recent: Record<number, ReadonlySet<DateKey>>, id: number) =>
  recent[id] ?? EMPTY;

/** Whether reminders will actually be delivered: the switch is on and the OS allows them. */
export function remindersActive(s: { settings: { reminders: boolean }; reminderPermission: PermissionState }): boolean {
  return s.settings.reminders && s.reminderPermission === 'granted';
}

/**
 * Completion rate over the last 30 days (null without data). Pass archived
 * habits too: their schedule pauses on the archive date, so the days they
 * really were due still count and archiving never rewrites the past.
 */
export function overallScore(
  habits: Habit[],
  recent: Record<number, ReadonlySet<DateKey>>,
  today: DateKey,
): number | null {
  let done = 0;
  let scheduled = 0;
  for (const habit of habits) {
    const rate = completionRate(historyOf(habit, completedSet(recent, habit.id), today), addDays(today, -29), today);
    done += rate.done;
    scheduled += rate.scheduled;
  }
  return scheduled ? done / scheduled : null;
}

/** "6-day streak" / "Missed 3 days" for a habit row, or nothing. */
export function habitNote(
  habit: Habit,
  recent: Record<number, ReadonlySet<DateKey>>,
  today: DateKey,
): { text: string; tone: 'dim' | 'warn' } | null {
  const history = historyOf(habit, completedSet(recent, habit.id), today);
  const capped = (n: number) => (n >= HISTORY_WINDOW_DAYS - 1 ? `${n}+` : `${n}`);
  const streak = currentStreak(history);
  if (streak >= 2) return { text: `${capped(streak)}-day streak`, tone: 'dim' };
  const missed = missedRun(history, HISTORY_WINDOW_DAYS);
  if (missed > 0) return { text: `Missed ${capped(missed)} ${missed === 1 ? 'day' : 'days'}`, tone: 'warn' };
  return null;
}
