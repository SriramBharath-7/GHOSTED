import { SEED_HABITS } from '@/config/seed';
import { type Db, nowIso } from '@/db/db';
import type { DateKey } from '@/domain/dates';
import { type HabitTimeline, PAUSED, type ScheduleVersion } from '@/domain/schedule';

export interface Habit {
  id: number;
  title: string;
  icon: string;
  description: string;
  question: string;
  accent: string;
  /** Configured weekdays (what the editor shows). History lives in `schedules`. */
  daysMask: number;
  xpReward: number;
  coinReward: number;
  reminderTime: string | null;
  reminderEnabled: boolean;
  sortOrder: number;
  startDate: DateKey;
  archived: boolean;
  createdAt: string;
  schedules: ScheduleVersion[];
}

export interface HabitInput {
  title: string;
  icon: string;
  description: string;
  question: string;
  accent: string;
  daysMask: number;
  xpReward: number;
  coinReward: number;
  reminderTime: string | null;
  reminderEnabled: boolean;
}

interface HabitRow {
  id: number;
  title: string;
  icon: string;
  description: string;
  question: string;
  accent: string;
  days_mask: number;
  xp_reward: number;
  coin_reward: number;
  reminder_time: string | null;
  reminder_enabled: number;
  sort_order: number;
  start_date: string;
  archived: number;
  created_at: string;
}

export function timelineOf(habit: Pick<Habit, 'startDate' | 'schedules'>): HabitTimeline {
  return { startDate: habit.startDate, schedules: habit.schedules };
}

export async function listHabits(
  db: Db,
  options: { includeArchived?: boolean } = {},
): Promise<Habit[]> {
  const rows = await db.getAllAsync<HabitRow>(
    `SELECT * FROM habits ${options.includeArchived ? '' : 'WHERE archived = 0'} ORDER BY sort_order, id`,
    [],
  );
  const versions = await db.getAllAsync<{
    habit_id: number;
    effective_from: string;
    days_mask: number;
  }>('SELECT habit_id, effective_from, days_mask FROM habit_schedules ORDER BY effective_from', []);
  const byHabit = new Map<number, ScheduleVersion[]>();
  for (const v of versions) {
    const list = byHabit.get(v.habit_id) ?? [];
    list.push({ effectiveFrom: v.effective_from, daysMask: v.days_mask });
    byHabit.set(v.habit_id, list);
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    icon: row.icon,
    description: row.description,
    question: row.question,
    accent: row.accent,
    daysMask: row.days_mask,
    xpReward: row.xp_reward,
    coinReward: row.coin_reward,
    reminderTime: row.reminder_time,
    reminderEnabled: row.reminder_enabled === 1,
    sortOrder: row.sort_order,
    startDate: row.start_date,
    archived: row.archived === 1,
    createdAt: row.created_at,
    schedules: byHabit.get(row.id) ?? [],
  }));
}

export async function getHabit(db: Db, id: number): Promise<Habit | null> {
  const all = await listHabits(db, { includeArchived: true });
  return all.find((habit) => habit.id === id) ?? null;
}

/** Records `mask` as the schedule from `date` on (one version per day). */
export async function setScheduleFrom(db: Db, habitId: number, date: DateKey, mask: number) {
  await db.runAsync(
    `INSERT INTO habit_schedules (habit_id, effective_from, days_mask) VALUES (?, ?, ?)
     ON CONFLICT(habit_id, effective_from) DO UPDATE SET days_mask = excluded.days_mask`,
    [habitId, date, mask],
  );
}

/** Inserts a habit tracked from `today`. Caller owns the transaction. */
export async function insertHabit(db: Db, input: HabitInput, today: DateKey): Promise<number> {
  const order = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM habits',
    [],
  );
  const { lastInsertRowId } = await db.runAsync(
    `INSERT INTO habits (title, icon, description, question, accent, days_mask, xp_reward, coin_reward,
       reminder_time, reminder_enabled, sort_order, start_date, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      input.title.trim(),
      input.icon,
      input.description.trim(),
      input.question.trim(),
      input.accent,
      input.daysMask,
      input.xpReward,
      input.coinReward,
      input.reminderTime,
      input.reminderEnabled ? 1 : 0,
      order?.next ?? 0,
      today,
      nowIso(),
    ],
  );
  await setScheduleFrom(db, lastInsertRowId, today, input.daysMask);
  return lastInsertRowId;
}

/** Updates fields; a changed schedule applies from `today` forward. Caller owns the transaction. */
export async function updateHabitRow(db: Db, habit: Habit, input: HabitInput, today: DateKey) {
  await db.runAsync(
    `UPDATE habits SET title = ?, icon = ?, description = ?, question = ?, accent = ?, days_mask = ?,
       xp_reward = ?, coin_reward = ?, reminder_time = ?, reminder_enabled = ? WHERE id = ?`,
    [
      input.title.trim(),
      input.icon,
      input.description.trim(),
      input.question.trim(),
      input.accent,
      input.daysMask,
      input.xpReward,
      input.coinReward,
      input.reminderTime,
      input.reminderEnabled ? 1 : 0,
      habit.id,
    ],
  );
  if (!habit.archived && input.daysMask !== habit.daysMask) {
    await setScheduleFrom(db, habit.id, today, input.daysMask);
  }
}

export async function setArchivedRow(db: Db, habit: Habit, archived: boolean, today: DateKey) {
  await db.runAsync('UPDATE habits SET archived = ? WHERE id = ?', [archived ? 1 : 0, habit.id]);
  await setScheduleFrom(db, habit.id, today, archived ? PAUSED : habit.daysMask);
}

/** First-launch data. Runs once; production starts with zero history. */
export async function seedIfEmpty(db: Db, today: DateKey): Promise<boolean> {
  const existing = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM habits', []);
  const seeded = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'seeded'",
    [],
  );
  if ((existing?.n ?? 0) > 0 || seeded) return false;
  for (const seed of SEED_HABITS) {
    await insertHabit(
      db,
      {
        title: seed.title,
        icon: seed.icon,
        description: seed.description,
        question: seed.question,
        accent: seed.accent,
        daysMask: seed.daysMask,
        xpReward: seed.xp,
        coinReward: seed.coins,
        reminderTime: seed.reminder,
        reminderEnabled: seed.reminder !== null,
      },
      today,
    );
  }
  await db.runAsync("INSERT INTO settings (key, value) VALUES ('seeded', 'true')", []);
  return true;
}
