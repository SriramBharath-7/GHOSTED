import { addDays, eachDay } from '@/domain/dates';
import {
  EVERY_DAY,
  type HabitTimeline,
  describeMask,
  isScheduled,
  maskFromWeekdays,
  scheduledDaysBetween,
} from '@/domain/schedule';
import {
  type HabitHistory,
  completionRate,
  currentStreak,
  dayStatus,
  isPerfectDay,
  missedRun,
  monthlyHistory,
  periodChange,
  scoreSeries,
  streakSummary,
  weekdayFrequency,
} from '@/domain/stats';

const TODAY = '2026-10-04'; // Sunday
const daily = (startDate: string): HabitTimeline => ({
  startDate,
  schedules: [{ effectiveFrom: startDate, daysMask: EVERY_DAY }],
});
const history = (timeline: HabitTimeline, done: string[], today = TODAY): HabitHistory => ({
  timeline,
  completed: new Set(done),
  today,
});

describe('scheduling', () => {
  const monWedFri = maskFromWeekdays([1, 3, 5]);

  it('only schedules selected weekdays after the start date', () => {
    const t: HabitTimeline = {
      startDate: '2026-09-28',
      schedules: [{ effectiveFrom: '2026-09-28', daysMask: monWedFri }],
    };
    expect(scheduledDaysBetween(t, '2026-09-20', TODAY)).toEqual([
      '2026-09-28',
      '2026-09-30',
      '2026-10-02',
    ]);
    expect(describeMask(monWedFri)).toBe('Mon · Wed · Fri');
    expect(describeMask(EVERY_DAY)).toBe('Every day');
  });

  it('keeps the old schedule for past days after an edit', () => {
    const t: HabitTimeline = {
      startDate: '2026-09-01',
      schedules: [
        { effectiveFrom: '2026-09-01', daysMask: EVERY_DAY },
        { effectiveFrom: '2026-10-01', daysMask: monWedFri },
      ],
    };
    expect(isScheduled(t, '2026-09-27')).toBe(true); // Sunday under the old rule
    expect(isScheduled(t, '2026-10-04')).toBe(false); // Sunday under the new rule
    expect(isScheduled(t, '2026-10-02')).toBe(true); // Friday
  });

  it('treats a paused (archived) stretch as unscheduled', () => {
    const t: HabitTimeline = {
      startDate: '2026-09-01',
      schedules: [
        { effectiveFrom: '2026-09-01', daysMask: EVERY_DAY },
        { effectiveFrom: '2026-09-10', daysMask: 0 },
        { effectiveFrom: '2026-09-20', daysMask: EVERY_DAY },
      ],
    };
    expect(scheduledDaysBetween(t, '2026-09-01', '2026-09-30')).toHaveLength(9 + 11);
  });
});

describe('completion rate', () => {
  it('is completed scheduled days over scheduled days', () => {
    const h = history(daily('2026-09-25'), ['2026-09-25', '2026-09-27', '2026-10-01']);
    // Sep 25 → Oct 3 = 9 past days; today is pending and excluded.
    expect(completionRate(h, '2026-09-01', TODAY)).toEqual({ done: 3, scheduled: 9, rate: 3 / 9 });
  });

  it('counts today only once it is done', () => {
    const h = history(daily('2026-10-03'), ['2026-10-04']);
    expect(completionRate(h, '2026-10-01', TODAY)).toEqual({ done: 1, scheduled: 2, rate: 0.5 });
  });

  it('returns null with no opportunities (habit created today, nothing done)', () => {
    const h = history(daily(TODAY), []);
    expect(completionRate(h, '2026-09-01', TODAY).rate).toBeNull();
  });

  it('ignores days before the habit existed (created mid-month)', () => {
    const h = history(daily('2026-09-20'), eachDay('2026-09-20', '2026-09-30'));
    expect(completionRate(h, '2026-09-01', '2026-09-30')).toEqual({
      done: 11,
      scheduled: 11,
      rate: 1,
    });
  });

  it('compares periods and reports insufficient data', () => {
    const h = history(daily('2026-09-20'), eachDay('2026-09-20', '2026-10-03'));
    const month = periodChange(h, 30);
    expect(month.current.rate).toBe(1);
    expect(month.previous.rate).toBeNull();
    expect(month.delta).toBeNull();

    const twoMonths = history(
      daily('2026-08-01'),
      eachDay('2026-08-06', '2026-09-04').filter((_, i) => i % 2 === 0).concat(eachDay('2026-09-05', '2026-10-03')),
    );
    const change = periodChange(twoMonths, 30);
    expect(change.current.rate).toBe(1);
    expect(change.previous.rate).toBeCloseTo(15 / 30);
    expect(change.delta).toBeCloseTo(0.5);
  });
});

describe('streaks', () => {
  it('counts the current streak without breaking on a pending today', () => {
    const h = history(daily('2026-09-01'), ['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(currentStreak(h)).toBe(3);
    expect(currentStreak({ ...h, completed: new Set([...h.completed, TODAY]) })).toBe(4);
  });

  it('breaks on a missed past day', () => {
    const h = history(daily('2026-09-01'), ['2026-10-01', '2026-10-03']);
    expect(currentStreak(h)).toBe(1);
  });

  it('skips rest days on weekday schedules', () => {
    const t: HabitTimeline = {
      startDate: '2026-09-01',
      schedules: [{ effectiveFrom: '2026-09-01', daysMask: maskFromWeekdays([1, 2, 3, 4, 5]) }],
    };
    // Thu Oct 1 + Fri Oct 2 done, weekend is rest, today (Sun) rest.
    const h = history(t, ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(currentStreak(h)).toBe(4);
    expect(dayStatus(h, '2026-10-03')).toBe('rest');
  });

  it('finds best and previous streaks', () => {
    const done = [
      ...eachDay('2026-09-01', '2026-09-07'), // 7
      ...eachDay('2026-09-10', '2026-09-12'), // 3
      ...eachDay('2026-09-20', '2026-09-24'), // 5
    ];
    const summary = streakSummary(history(daily('2026-09-01'), done));
    expect(summary.best).toBe(7);
    expect(summary.current).toBe(0);
    expect(summary.top.map((run) => run.length)).toEqual([7, 5, 3]);
    expect(summary.top[0]).toEqual({ start: '2026-09-01', end: '2026-09-07', length: 7 });
  });

  it('reports how many days in a row a habit has been missed', () => {
    const h = history(daily('2026-09-01'), ['2026-09-30']);
    expect(missedRun(h)).toBe(3); // Oct 1, 2, 3
    expect(missedRun({ ...h, completed: new Set(['2026-09-30', TODAY]) })).toBe(0);
    expect(missedRun(history(daily(TODAY), []))).toBe(0);
  });
});

describe('charts data', () => {
  it('labels day status for the calendar', () => {
    const h = history(daily('2026-10-01'), ['2026-10-01']);
    expect(dayStatus(h, '2026-09-30')).toBe('untracked');
    expect(dayStatus(h, '2026-10-01')).toBe('done');
    expect(dayStatus(h, '2026-10-02')).toBe('missed');
    expect(dayStatus(h, TODAY)).toBe('pending');
    expect(dayStatus(h, addDays(TODAY, 1))).toBe('future');
  });

  it('computes weekday frequency from real data', () => {
    // Two full weeks; only Mondays and Tuesdays done.
    const done = eachDay('2026-09-20', '2026-10-03').filter((d) =>
      ['2026-09-21', '2026-09-22', '2026-09-28', '2026-09-29'].includes(d),
    );
    const freq = weekdayFrequency(history(daily('2026-09-20'), done));
    expect(freq[0]).toEqual({ weekday: 1, done: 2, scheduled: 2, rate: 1 });
    expect(freq[2]).toEqual({ weekday: 3, done: 0, scheduled: 2, rate: 0 });
    expect(freq.map((f) => f.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('builds monthly history and score series without inventing data', () => {
    const h = history(daily('2026-09-01'), eachDay('2026-09-01', '2026-09-10'));
    const bars = monthlyHistory(h, 3);
    expect(bars.map((b) => [b.month, b.done])).toEqual([
      ['2026-08', 0],
      ['2026-09', 10],
      ['2026-10', 0],
    ]);
    const year = scoreSeries(h, 'year');
    expect(year.points).toHaveLength(12);
    expect(year.points[10].value).toBeCloseTo(10 / 30);
    expect(year.points[0].value).toBeNull(); // before the habit existed
    expect(scoreSeries(h, 'month').points).toHaveLength(30);
    expect(scoreSeries(h, 'quarter').points).toHaveLength(13);
  });
});

describe('perfect day', () => {
  it('needs every scheduled habit done and ignores unscheduled ones', () => {
    const a = daily('2026-09-01');
    const weekdaysOnly: HabitTimeline = {
      startDate: '2026-09-01',
      schedules: [{ effectiveFrom: '2026-09-01', daysMask: maskFromWeekdays([1, 2, 3, 4, 5]) }],
    };
    expect(isPerfectDay([{ timeline: a, done: true }, { timeline: weekdaysOnly, done: false }], TODAY)).toBe(true);
    expect(isPerfectDay([{ timeline: a, done: false }], TODAY)).toBe(false);
    expect(isPerfectDay([], TODAY)).toBe(false);
  });
});
