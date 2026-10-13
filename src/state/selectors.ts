import { HISTORY_WINDOW_DAYS } from '@/config/game';
import { type DateKey, addDays } from '@/domain/dates';
import { isScheduled } from '@/domain/schedule';
import { type HabitHistory, completionRate, currentStreak, missedRun } from '@/domain/stats';
import { type Habit, timelineOf } from '@/repo/habits';

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

/** Completion rate over the last 30 days across all visible habits (null without data). */
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
