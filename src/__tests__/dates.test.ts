import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  eachDay,
  isDateKey,
  toDateKey,
  weekdayOf,
} from '@/domain/dates';

describe('date keys', () => {
  it('uses the local calendar day, not UTC', () => {
    // 23:30 local on Oct 4 is still Oct 4 whatever the UTC offset.
    expect(toDateKey(new Date(2026, 9, 4, 23, 30))).toBe('2026-10-04');
    expect(toDateKey(new Date(2026, 9, 5, 0, 5))).toBe('2026-10-05');
  });

  it('does arithmetic across month, year and leap boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-01-01', '2027-01-01')).toBe(365);
    expect(diffDays('2026-10-10', '2026-10-04')).toBe(-6);
  });

  it('knows weekdays and month lengths', () => {
    expect(weekdayOf('2026-10-04')).toBe(0); // Sunday
    expect(weekdayOf('2026-10-07')).toBe(3); // Wednesday
    expect(daysInMonth('2028-02')).toBe(29);
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('lists days inclusively and validates keys', () => {
    expect(eachDay('2026-10-01', '2026-10-03')).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(eachDay('2026-10-03', '2026-10-01')).toEqual([]);
    expect(isDateKey('2026-02-29')).toBe(false);
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('2026-1-1')).toBe(false);
  });
});
