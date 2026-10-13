import { getDb } from '@/db/database';
import { listHabits } from '@/repo/habits';
import { setCompletion } from '@/repo/progress';
import { syncReminders } from '@/services/notifications';
import { useFx } from '@/state/fx';
import { useGame } from '@/state/game';
import { seededDb } from './helpers/testDb';

jest.mock('@/db/database', () => ({ getDb: jest.fn(), openDatabase: jest.fn() }));
jest.mock('@/services/notifications', () => ({ syncReminders: jest.fn() }));
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

it('requests first-launch reminder setup after boot has loaded settings', async () => {
  await useGame.getState().boot();
  expect(useGame.getState().ready).toBe(true);
  expect(syncReminders).toHaveBeenCalledWith(getDb(), expect.any(String), {
    enabled: true, requestOnFirstLaunch: true,
  });
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

it('historical corrections update state without reward or completion ceremonies', async () => {
  const habits = await listHabits(getDb());
  for (const habit of habits) await setCompletion(getDb(), habit.id, '2026-10-03', true, TODAY);
  await useGame.getState().commit();
  await useGame.getState().setHabitDone(habits[0].id, '2026-10-03', false);
  await useGame.getState().setHabitDone(habits[0].id, '2026-10-03', true);
  expect(useGame.getState().player).toMatchObject({ totalXp: 0, coins: 0, perfectDays: 1 });
  expect(useFx.getState().queue).toHaveLength(0);
});
