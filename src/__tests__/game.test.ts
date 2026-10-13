import { getDb, openDatabase } from '@/db/database';
import { listHabits } from '@/repo/habits';
import { getPerfectDayCount } from '@/repo/ledger';
import { setCompletion, setHabitArchived } from '@/repo/progress';
import { syncReminders } from '@/services/notifications';
import { useFx } from '@/state/fx';
import { useGame } from '@/state/game';
import { seededDb } from './helpers/testDb';

jest.mock('@/db/database', () => ({ getDb: jest.fn(), openDatabase: jest.fn() }));
jest.mock('@/services/notifications', () => ({
  getPermission: jest.fn(async () => 'granted'),
  requestPermission: jest.fn(async () => 'granted'),
  syncReminders: jest.fn(async () => undefined),
}));
jest.mock('@/services/haptics', () => ({
  setHapticsEnabled: jest.fn(),
  haptics: { complete: jest.fn(), undo: jest.fn() },
}));
jest.mock('@/services/sound', () => ({ setSoundEnabled: jest.fn(), playSound: jest.fn() }));

const TODAY = '2026-10-04';

beforeEach(async () => {
  jest.clearAllMocks();
  useGame.setState(useGame.getInitialState(), true);
  useFx.setState(useFx.getInitialState(), true);
  jest.mocked(getDb).mockReturnValue(await seededDb(TODAY));
  useGame.setState({ today: TODAY });
  await useGame.getState().commit();
});

it('boot loads state, then reconciles reminders with the saved switch and OS permission', async () => {
  jest.mocked(openDatabase).mockResolvedValue(getDb());
  await useGame.getState().boot();
  expect(useGame.getState().ready).toBe(true);
  expect(useGame.getState().reminderPermission).toBe('granted');
  expect(syncReminders).toHaveBeenCalledWith(getDb(), expect.any(String), { enabled: true });
});

it('shows one DAY COMPLETE for five visible habits and keeps it once-only after undo or store reload', async () => {
  const habits = await listHabits(getDb());
  for (const habit of habits) await useGame.getState().setHabitDone(habit.id, TODAY, true);
  expect(useFx.getState().queue.filter((e) => e.type === 'perfectDay')).toEqual([
    expect.objectContaining({ type: 'perfectDay', done: 5, xp: 210, coins: 70 }),
  ]);
  expect(useFx.getState().queue.filter((e) => e.type === 'levelUp')).toEqual([
    expect.objectContaining({ oldLevel: 1, level: 2 }),
  ]);
  await useGame.getState().setHabitDone(habits[0].id, TODAY, false);
  await useGame.getState().commit();
  await useGame.getState().setHabitDone(habits[0].id, TODAY, true);
  expect(useFx.getState().queue.filter((e) => e.type === 'perfectDay')).toHaveLength(1);
});

it('rapid completions cannot duplicate level-up or Perfect Day notifications', async () => {
  const habits = await listHabits(getDb());
  await Promise.all(habits.map((habit) => useGame.getState().setHabitDone(habit.id, TODAY, true)));
  expect(useFx.getState().queue.filter((e) => e.type === 'levelUp')).toHaveLength(1);
  expect(useFx.getState().queue.filter((e) => e.type === 'perfectDay')).toHaveLength(1);
});

it('historical corrections update analytics without rewards, rank progress or ceremonies', async () => {
  const db = await seededDb('2026-10-01');
  jest.mocked(getDb).mockReturnValue(db);
  const habits = await listHabits(db);
  for (const habit of habits) await setCompletion(db, habit.id, '2026-10-03', true, TODAY);
  await useGame.getState().commit();
  await useGame.getState().setHabitDone(habits[0].id, '2026-10-03', false);
  await useGame.getState().setHabitDone(habits[0].id, '2026-10-03', true);
  // Oct 3 is a Perfect Day in analytics, but it was never earned on the day.
  expect(await getPerfectDayCount(db)).toBe(1);
  expect(useGame.getState().player).toMatchObject({ totalXp: 0, coins: 0, perfectDays: 0 });
  expect(useFx.getState().queue).toHaveLength(0);
});

it('the overall score keeps an archived habit’s real history', async () => {
  const db = await seededDb('2026-10-01');
  jest.mocked(getDb).mockReturnValue(db);
  const habits = await listHabits(db);
  // Oct 1-3: four habits done every day, No Junk UPF missed every day, then archived.
  for (const day of ['2026-10-01', '2026-10-02', '2026-10-03']) {
    for (const habit of habits.slice(0, 4)) await setCompletion(db, habit.id, day, true, TODAY);
  }
  await useGame.getState().commit();
  expect(useGame.getState().player.score30).toBeCloseTo(12 / 15);
  await setHabitArchived(db, habits[4].id, true, TODAY);
  await useGame.getState().commit();
  expect(useGame.getState().habits).toHaveLength(4);
  expect(useGame.getState().player.score30).toBeCloseTo(12 / 15);
});
