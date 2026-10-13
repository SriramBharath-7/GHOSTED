import { MIGRATIONS, SCHEMA_VERSION, migrate } from '@/db/migrations';
import {
  advanceGoal,
  createGoal,
  getGoal,
  goalProgress,
  isUpcoming,
  listGoals,
  setGoalStatus,
} from '@/repo/goals';
import { listHabits } from '@/repo/habits';
import { createTestDb, seededDb } from './helpers/testDb';

const TODAY = '2026-10-04';

describe('v1 → v2 migration', () => {
  it('keeps existing data, swaps seeded emoji for line icons, adds mission fields', async () => {
    const db = createTestDb();
    await db.execAsync(MIGRATIONS[0]);
    await db.execAsync('PRAGMA user_version = 1');
    await db.runAsync(
      `INSERT INTO habits (title, icon, accent, days_mask, xp_reward, coin_reward, start_date, created_at)
       VALUES ('Regenesis Command', '🧬', '#fff', 127, 15, 5, ?, ?), ('Mine', '🦊', '#fff', 127, 5, 1, ?, ?)`,
      [TODAY, TODAY, TODAY, TODAY],
    );
    await db.runAsync(
      `INSERT INTO goals (title, horizon, progress, created_at) VALUES ('Old mission', 'short', 40, ?)`,
      [TODAY],
    );

    await migrate(db);

    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
    expect(version?.user_version).toBe(SCHEMA_VERSION);
    const icons = (await listHabits(db)).map((h) => [h.title, h.icon]);
    expect(icons).toEqual([
      ['Regenesis Command', 'brain'],
      ['Mine', '🦊'], // user-picked emoji survives
    ]);
    const [goal] = await listGoals(db);
    expect(goal).toMatchObject({ title: 'Old mission', icon: 'target', stepsTotal: null, progress: 40 });
    expect(goalProgress(goal)).toBeCloseTo(0.4);
  });
});

it('updates untouched seed accents once while preserving custom colors and earned progress', async () => {
  const db = createTestDb();
  await db.execAsync(MIGRATIONS[0]);
  await db.execAsync(MIGRATIONS[1]);
  await db.execAsync('PRAGMA user_version = 2');
  await db.runAsync(
    `INSERT INTO habits (title, icon, accent, days_mask, xp_reward, coin_reward, start_date, created_at)
     VALUES ('The Iron Monarch', 'dumbbell', '#EF6351', 127, 15, 5, ?, ?),
       ('The Kernel Strike', 'laptop', '#123456', 127, 15, 5, ?, ?)`,
    [TODAY, TODAY, TODAY, TODAY],
  );
  await db.runAsync("INSERT INTO ledger (kind, xp, coins, date, created_at) VALUES ('habit', 15, 5, ?, ?)", [TODAY, TODAY]);
  await migrate(db);
  await migrate(db);
  expect((await listHabits(db)).map((habit) => habit.accent)).toEqual(['#2A8CFF', '#123456']);
  expect(await db.getFirstAsync('SELECT SUM(xp) AS xp, SUM(coins) AS coins FROM ledger', []))
    .toEqual({ xp: 15, coins: 5 });
});

describe('missions', () => {
  const base = {
    title: 'Complete Java Unit 2',
    description: '',
    horizon: 'short' as const,
    icon: 'code',
    category: 'Learning · Programming',
    startDate: null,
    targetDate: null,
    stepsTotal: 5,
    stepsDone: 3,
    progress: null,
    notes: '',
  };

  it('tracks step progress and caps it at the total', async () => {
    const db = await seededDb(TODAY);
    const id = await createGoal(db, base);
    let goal = await getGoal(db, id);
    expect(goal && goalProgress(goal)).toBeCloseTo(0.6);
    for (let i = 0; i < 5; i++) await advanceGoal(db, (await getGoal(db, id))!);
    goal = await getGoal(db, id);
    expect(goal?.stepsDone).toBe(5);
    await setGoalStatus(db, id, 'done');
    expect(goalProgress((await getGoal(db, id))!)).toBe(1);
  });

  it('lists missions that start later as upcoming', async () => {
    const db = await seededDb(TODAY);
    const later = await createGoal(db, { ...base, startDate: '2026-10-10' });
    const now = await createGoal(db, { ...base, startDate: TODAY });
    expect(isUpcoming((await getGoal(db, later))!, TODAY)).toBe(true);
    expect(isUpcoming((await getGoal(db, now))!, TODAY)).toBe(false);
  });
});
