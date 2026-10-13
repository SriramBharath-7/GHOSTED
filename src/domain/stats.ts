import {
  type DateKey,
  type MonthKey,
  MONTHS_SHORT,
  addDays,
  addMonths,
  dayOfMonth,
  firstOfMonth,
  lastOfMonth,
  minKey,
  monthLabel,
  monthOf,
  weekdayOf,
} from './dates';
import { type HabitTimeline, isScheduled, scheduledDaysBetween } from './schedule';

/**
 * Deterministic habit analytics. Rules, applied everywhere:
 * - Only scheduled days are opportunities.
 * - Past scheduled days without a completion are misses.
 * - Today counts only once it is completed (an unfinished today is "pending", never a miss).
 */
export interface HabitHistory {
  timeline: HabitTimeline;
  completed: ReadonlySet<DateKey>;
  today: DateKey;
}

export type DayStatus = 'done' | 'missed' | 'pending' | 'rest' | 'future' | 'untracked';

export function dayStatus(h: HabitHistory, date: DateKey): DayStatus {
  if (date > h.today) return 'future';
  if (h.completed.has(date)) return 'done';
  if (date < h.timeline.startDate) return 'untracked';
  if (!isScheduled(h.timeline, date)) return 'rest';
  return date === h.today ? 'pending' : 'missed';
}

export interface Rate {
  done: number;
  scheduled: number;
  /** null when there were no opportunities in the range. */
  rate: number | null;
}

export function completionRate(h: HabitHistory, from: DateKey, to: DateKey): Rate {
  let done = 0;
  let scheduled = 0;
  for (const day of scheduledDaysBetween(h.timeline, from, minKey(to, h.today))) {
    if (h.completed.has(day)) {
      done++;
      scheduled++;
    } else if (day < h.today) {
      scheduled++;
    }
  }
  return { done, scheduled, rate: scheduled > 0 ? done / scheduled : null };
}

export interface StreakRun {
  start: DateKey;
  end: DateKey;
  length: number;
}

/** Runs of consecutive completed scheduled days. Rest days don't break a run. */
export function streakRuns(h: HabitHistory): StreakRun[] {
  const runs: StreakRun[] = [];
  let run: StreakRun | null = null;
  for (const day of scheduledDaysBetween(h.timeline, h.timeline.startDate, h.today)) {
    if (h.completed.has(day)) {
      if (run) {
        run.end = day;
        run.length++;
      } else {
        run = { start: day, end: day, length: 1 };
      }
    } else if (day < h.today) {
      if (run) runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

export function currentStreak(h: HabitHistory): number {
  let streak = 0;
  for (let day = h.today; day >= h.timeline.startDate; day = addDays(day, -1)) {
    if (!isScheduled(h.timeline, day)) continue;
    if (h.completed.has(day)) streak++;
    else if (day !== h.today) break;
  }
  return streak;
}

/** Consecutive missed scheduled days up to yesterday. 0 once today is done. */
export function missedRun(h: HabitHistory, cap = 365): number {
  if (h.completed.has(h.today)) return 0;
  let missed = 0;
  for (let day = addDays(h.today, -1); day >= h.timeline.startDate && missed < cap; day = addDays(day, -1)) {
    if (!isScheduled(h.timeline, day)) continue;
    if (h.completed.has(day)) break;
    missed++;
  }
  return missed;
}

export interface StreakSummary {
  current: number;
  best: number;
  /** Longest runs first, at most `limit`. */
  top: StreakRun[];
  /** End date of the run still in progress, or null. */
  liveEnd: DateKey | null;
}

export function streakSummary(h: HabitHistory, limit = 5): StreakSummary {
  const runs = streakRuns(h);
  const current = currentStreak(h);
  const top = [...runs].sort((a, b) => b.length - a.length || (a.end < b.end ? 1 : -1));
  return {
    current,
    best: top[0]?.length ?? 0,
    top: top.slice(0, limit),
    // When a streak is alive it is always the most recent run.
    liveEnd: current > 0 ? (runs[runs.length - 1]?.end ?? null) : null,
  };
}

export interface PeriodChange {
  current: Rate;
  previous: Rate;
  /** Percentage-point change; null when either period had no opportunities. */
  delta: number | null;
}

/** Compares the last `days` days with the `days` before them. */
export function periodChange(h: HabitHistory, days: number): PeriodChange {
  const currentFrom = addDays(h.today, -(days - 1));
  const current = completionRate(h, currentFrom, h.today);
  const previous = completionRate(h, addDays(currentFrom, -days), addDays(currentFrom, -1));
  const delta =
    current.rate !== null && previous.rate !== null ? current.rate - previous.rate : null;
  return { current, previous, delta };
}

export type ScoreRange = 'month' | 'quarter' | 'year' | 'all';

export interface SeriesPoint {
  key: string;
  label: string;
  value: number | null;
}

export interface ScoreSeries {
  points: SeriesPoint[];
  caption: string;
}

export function scoreSeries(h: HabitHistory, range: ScoreRange): ScoreSeries {
  switch (range) {
    case 'month': {
      const points: SeriesPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const day = addDays(h.today, -i);
        points.push({
          key: day,
          label: `${dayOfMonth(day)}`,
          value: completionRate(h, addDays(day, -6), day).rate,
        });
      }
      return { points, caption: 'Rolling 7-day completion, last 30 days' };
    }
    case 'quarter': {
      const points: SeriesPoint[] = [];
      for (let i = 12; i >= 0; i--) {
        const end = addDays(h.today, -7 * i);
        const start = addDays(end, -6);
        points.push({
          key: start,
          label: `${dayOfMonth(start)} ${MONTHS_SHORT[Number(start.slice(5, 7)) - 1]}`,
          value: completionRate(h, start, end).rate,
        });
      }
      return { points, caption: 'Weekly completion, last 13 weeks' };
    }
    case 'year':
      return {
        points: monthlyRates(h, addMonths(monthOf(h.today), -11)),
        caption: 'Monthly completion, last 12 months',
      };
    case 'all':
      return {
        points: monthlyRates(h, monthOf(h.timeline.startDate)),
        caption: 'Monthly completion, all time',
      };
  }
}

function monthlyRates(h: HabitHistory, fromMonth: MonthKey): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  const lastMonth = monthOf(h.today);
  for (let month = fromMonth; month <= lastMonth; month = addMonths(month, 1)) {
    points.push({
      key: month,
      label: monthLabel(month),
      value: completionRate(h, firstOfMonth(month), lastOfMonth(month)).rate,
    });
  }
  return points;
}

export interface MonthBar {
  month: MonthKey;
  label: string;
  done: number;
  scheduled: number;
}

/** Completions per calendar month for the last `months` months (oldest first). */
export function monthlyHistory(h: HabitHistory, months = 12): MonthBar[] {
  const counts = new Map<MonthKey, number>();
  for (const day of h.completed) counts.set(monthOf(day), (counts.get(monthOf(day)) ?? 0) + 1);
  const bars: MonthBar[] = [];
  const last = monthOf(h.today);
  for (let month = addMonths(last, -(months - 1)); month <= last; month = addMonths(month, 1)) {
    bars.push({
      month,
      label: monthLabel(month),
      done: counts.get(month) ?? 0,
      scheduled: completionRate(h, firstOfMonth(month), lastOfMonth(month)).scheduled,
    });
  }
  return bars;
}

export interface WeekdayFrequency {
  weekday: number;
  done: number;
  scheduled: number;
  rate: number | null;
}

/** All-time consistency per weekday, Monday first. */
export function weekdayFrequency(h: HabitHistory): WeekdayFrequency[] {
  const done = new Array<number>(7).fill(0);
  const scheduled = new Array<number>(7).fill(0);
  for (const day of scheduledDaysBetween(h.timeline, h.timeline.startDate, h.today)) {
    const wd = weekdayOf(day);
    if (h.completed.has(day)) {
      done[wd]++;
      scheduled[wd]++;
    } else if (day < h.today) {
      scheduled[wd]++;
    }
  }
  return [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({
    weekday,
    done: done[weekday],
    scheduled: scheduled[weekday],
    rate: scheduled[weekday] > 0 ? done[weekday] / scheduled[weekday] : null,
  }));
}

export interface HabitOverview {
  score30: Rate;
  allTime: Rate;
  currentStreak: number;
  bestStreak: number;
  total: number;
  month: PeriodChange;
  year: PeriodChange;
}

export function habitOverview(h: HabitHistory): HabitOverview {
  const streaks = streakSummary(h, 0);
  return {
    score30: completionRate(h, addDays(h.today, -29), h.today),
    allTime: completionRate(h, h.timeline.startDate, h.today),
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    total: h.completed.size,
    month: periodChange(h, 30),
    year: periodChange(h, 365),
  };
}

/** A day is perfect when every habit scheduled that day is complete. */
export function isPerfectDay(
  habits: { timeline: HabitTimeline; done: boolean }[],
  date: DateKey,
): boolean {
  const due = habits.filter((habit) => isScheduled(habit.timeline, date));
  return due.length > 0 && due.every((habit) => habit.done);
}
