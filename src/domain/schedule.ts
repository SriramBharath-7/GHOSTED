import { type DateKey, WEEKDAYS_SHORT, eachDay, weekdayOf } from './dates';

/**
 * A schedule is a 7-bit weekday mask: bit 0 = Sunday … bit 6 = Saturday.
 * Schedules are versioned (`effectiveFrom`) so editing a habit's days never
 * rewrites what was scheduled in the past. A mask of 0 means paused (archived).
 */
export const EVERY_DAY = 0b1111111;
export const PAUSED = 0;

export interface ScheduleVersion {
  effectiveFrom: DateKey;
  daysMask: number;
}

export interface HabitTimeline {
  startDate: DateKey;
  /** Sorted ascending by effectiveFrom. */
  schedules: ScheduleVersion[];
}

export function maskIncludes(mask: number, weekday: number): boolean {
  return (mask & (1 << weekday)) !== 0;
}

export function maskFromWeekdays(weekdays: number[]): number {
  return weekdays.reduce((mask, day) => mask | (1 << day), 0);
}

export function weekdaysFromMask(mask: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((day) => maskIncludes(mask, day));
}

export function describeMask(mask: number): string {
  if (mask === EVERY_DAY) return 'Every day';
  if (mask === PAUSED) return 'Paused';
  if (mask === 0b0111110) return 'Weekdays';
  if (mask === 0b1000001) return 'Weekends';
  // Monday-first reads naturally.
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((day) => maskIncludes(mask, day))
    .map((day) => WEEKDAYS_SHORT[day])
    .join(' · ');
}

/** The mask in effect on `date` (0 before the first version). */
export function maskOn(schedules: ScheduleVersion[], date: DateKey): number {
  let mask = PAUSED;
  for (const version of schedules) {
    if (version.effectiveFrom > date) break;
    mask = version.daysMask;
  }
  return mask;
}

export function isScheduled(timeline: HabitTimeline, date: DateKey): boolean {
  return (
    date >= timeline.startDate && maskIncludes(maskOn(timeline.schedules, date), weekdayOf(date))
  );
}

export function scheduledDaysBetween(
  timeline: HabitTimeline,
  from: DateKey,
  to: DateKey,
): DateKey[] {
  const start = from > timeline.startDate ? from : timeline.startDate;
  return eachDay(start, to).filter((day) => isScheduled(timeline, day));
}
