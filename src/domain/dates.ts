/**
 * Calendar-day helpers.
 *
 * A DateKey ('YYYY-MM-DD') is the user's LOCAL calendar day. Keys are created
 * from local time once, then all arithmetic happens in UTC on the key itself,
 * so a completion never drifts to another day because of timezones or DST.
 */
export type DateKey = string;

const DAY_MS = 86_400_000;

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAYS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUtcMs(toUtcMs(value)) === value;
}

function toUtcMs(key: DateKey): number {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function fromUtcMs(ms: number): DateKey {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: DateKey, days: number): DateKey {
  return fromUtcMs(toUtcMs(key) + days * DAY_MS);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: DateKey, to: DateKey): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key: DateKey): number {
  return new Date(toUtcMs(key)).getUTCDay();
}

export function minKey(a: DateKey, b: DateKey): DateKey {
  return a < b ? a : b;
}

export function maxKey(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b;
}

/** Inclusive list of days; empty when `from` is after `to`. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const days: DateKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** 'YYYY-MM' */
export type MonthKey = string;

export function monthOf(key: DateKey): MonthKey {
  return key.slice(0, 7);
}

export function firstOfMonth(month: MonthKey): DateKey {
  return `${month}-01`;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export function daysInMonth(month: MonthKey): number {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
}

export function lastOfMonth(month: MonthKey): DateKey {
  return `${month}-${pad(daysInMonth(month))}`;
}

export function dayOfMonth(key: DateKey): number {
  return Number(key.slice(8, 10));
}

export function monthLabel(month: MonthKey, long = false): string {
  const index = Number(month.slice(5, 7)) - 1;
  return long ? MONTHS_LONG[index] : MONTHS_SHORT[index];
}

/** Local midnight of a key, for APIs that need a real Date (pickers, notifications). */
export function keyToLocalDate(key: DateKey, hours = 0, minutes = 0): Date {
  return new Date(
    Number(key.slice(0, 4)),
    Number(key.slice(5, 7)) - 1,
    Number(key.slice(8, 10)),
    hours,
    minutes,
  );
}

/** 'Wed 30' */
export function formatShortDay(key: DateKey): string {
  return `${WEEKDAYS_SHORT[weekdayOf(key)]} ${dayOfMonth(key)}`;
}

/** '4 Oct 2026' (year omitted when it matches `currentYearOf`). */
export function formatDate(key: DateKey, currentYearOf?: DateKey): string {
  const base = `${dayOfMonth(key)} ${monthLabel(monthOf(key))}`;
  return currentYearOf && currentYearOf.slice(0, 4) === key.slice(0, 4)
    ? base
    : `${base} ${key.slice(0, 4)}`;
}

/** 'Sunday, 4 October' */
export function formatLongDay(key: DateKey): string {
  return `${WEEKDAYS_LONG[weekdayOf(key)]}, ${dayOfMonth(key)} ${monthLabel(monthOf(key), true)}`;
}

/** Converts an ISO timestamp to the local DateKey it happened on. */
export function isoToDateKey(iso: string): DateKey {
  return toDateKey(new Date(iso));
}

/** '20:30' → '8:30 PM' */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
