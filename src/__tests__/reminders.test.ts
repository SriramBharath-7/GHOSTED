import { Platform } from 'react-native';
import { REMINDER_HORIZON_DAYS } from '@/config/game';
import type { Db } from '@/db/db';
import { getDb, openDatabase } from '@/db/database';
import { listHabits } from '@/repo/habits';
import { updateHabit } from '@/repo/progress';
import { getSettings } from '@/repo/settings';
import { useGame } from '@/state/game';
import { remindersActive } from '@/state/selectors';
import { seededDb } from './helpers/testDb';

/**
 * End to end: game store + notification service + a fake Android notification
 * system. Checks that the saved switch, the OS permission, what is actually
 * scheduled and what the screen shows always agree.
 */
type Status = 'granted' | 'denied' | 'undetermined';
const mockOs = {
  status: 'undetermined' as Status,
  canAskAgain: true,
  answer: 'granted' as Status,
  prompts: 0,
  scheduled: new Map<string, { identifier: string; trigger: { date: Date } }>(),
  failPermissions: false,
};
const mockPermission = () => ({
  status: mockOs.status,
  granted: mockOs.status === 'granted',
  canAskAgain: mockOs.canAskAgain,
  expires: 'never',
});

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => {
    if (mockOs.failPermissions) throw new Error('Native permission API unavailable');
    return mockPermission();
  }),
  requestPermissionsAsync: jest.fn(async () => {
    mockOs.prompts++;
    mockOs.status = mockOs.answer;
    if (mockOs.answer === 'denied') mockOs.canAskAgain = false;
    return mockPermission();
  }),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockOs.scheduled.values()]),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => void mockOs.scheduled.delete(id)),
  scheduleNotificationAsync: jest.fn(async (request: { identifier: string; trigger: { date: Date } }) => {
    mockOs.scheduled.set(request.identifier, request);
    return request.identifier;
  }),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('@/db/database', () => ({ getDb: jest.fn(), openDatabase: jest.fn() }));
jest.mock('@/services/haptics', () => ({
  setHapticsEnabled: jest.fn(),
  haptics: { complete: jest.fn(), undo: jest.fn() },
}));
jest.mock('@/services/sound', () => ({ setSoundEnabled: jest.fn(), playSound: jest.fn() }));

const TODAY = '2026-10-04';
let db: Db;

/** A cold start of the app on the same device data. */
async function launch() {
  useGame.setState(useGame.getInitialState(), true);
  await useGame.getState().boot();
}

const scheduled = () => [...mockOs.scheduled.keys()].sort();
const savedSwitch = async () => (await getSettings(db)).reminders;
const shownSwitch = () => remindersActive(useGame.getState());

beforeEach(async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 4, 12), doNotFake: ['setTimeout', 'setImmediate', 'queueMicrotask', 'nextTick'] });
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  Object.assign(mockOs, { status: 'undetermined', canAskAgain: true, answer: 'granted', prompts: 0, failPermissions: false });
  mockOs.scheduled.clear();
  db = await seededDb(TODAY);
  jest.mocked(getDb).mockReturnValue(db);
  jest.mocked(openDatabase).mockResolvedValue(db);
});

afterEach(() => jest.useRealTimers());

it('fresh install: asks once, then the seeded 8:30 PM reminder is really scheduled', async () => {
  await launch();
  expect(mockOs.prompts).toBe(1);
  expect(await savedSwitch()).toBe(true);
  expect(shownSwitch()).toBe(true);
  expect(scheduled()).toHaveLength(REMINDER_HORIZON_DAYS);
  expect(mockOs.scheduled.get(`habit-1-${TODAY}`)?.trigger.date).toEqual(new Date(2026, 9, 4, 20, 30));

  await launch(); // restart: no second prompt, same reminders, no duplicates
  expect(mockOs.prompts).toBe(1);
  expect(scheduled()).toHaveLength(REMINDER_HORIZON_DAYS);
});

it('fresh install, permission denied: the switch is saved and shown OFF and nothing is scheduled', async () => {
  mockOs.answer = 'denied';
  await launch();
  expect(mockOs.prompts).toBe(1);
  expect(useGame.getState().reminderPermission).toBe('denied');
  expect(await savedSwitch()).toBe(false);
  expect(shownSwitch()).toBe(false);
  expect(scheduled()).toEqual([]);

  await launch(); // never nags again after a denial
  expect(mockOs.prompts).toBe(1);
  expect(await savedSwitch()).toBe(false);
});

it('turning reminders on while blocked keeps them off; allowing them later works', async () => {
  mockOs.answer = 'denied';
  await launch();
  expect(await useGame.getState().setRemindersEnabled(true)).toBe('denied');
  expect(mockOs.prompts).toBe(1); // the OS no longer allows asking
  expect(await savedSwitch()).toBe(false);
  expect(scheduled()).toEqual([]);

  // The user allows notifications in Android settings, comes back, flips the switch.
  mockOs.status = 'granted';
  await useGame.getState().refreshReminders();
  expect(shownSwitch()).toBe(false); // still off until they choose it
  expect(await useGame.getState().setRemindersEnabled(true)).toBe('granted');
  expect(await savedSwitch()).toBe(true);
  expect(shownSwitch()).toBe(true);
  await useGame.getState().refreshReminders(); // waits for the queued sync
  expect(scheduled()).toHaveLength(REMINDER_HORIZON_DAYS);
});

it('permission revoked in system settings: the next resume turns the switch off and clears reminders', async () => {
  await launch();
  expect(scheduled()).toHaveLength(REMINDER_HORIZON_DAYS);
  mockOs.status = 'denied';
  await useGame.getState().refreshReminders();
  expect(await savedSwitch()).toBe(false);
  expect(shownSwitch()).toBe(false);
  expect(scheduled()).toEqual([]);
});

it('disabling cancels every reminder; enabling again reschedules them', async () => {
  await launch();
  await useGame.getState().setRemindersEnabled(false);
  await useGame.getState().refreshReminders();
  expect(await savedSwitch()).toBe(false);
  expect(scheduled()).toEqual([]);

  await useGame.getState().setRemindersEnabled(true);
  await useGame.getState().refreshReminders();
  expect(mockOs.prompts).toBe(1);
  expect(scheduled()).toHaveLength(REMINDER_HORIZON_DAYS);
});

it('changing a reminder time reschedules that habit at the new time', async () => {
  await launch();
  const [regenesis] = await listHabits(db);
  await updateHabit(db, regenesis.id, { ...regenesis, reminderTime: '21:45' }, TODAY);
  await useGame.getState().commit({ reminders: regenesis.id });
  await useGame.getState().refreshReminders();
  expect(scheduled()).toHaveLength(REMINDER_HORIZON_DAYS);
  expect(mockOs.scheduled.get(`habit-${regenesis.id}-${TODAY}`)?.trigger.date).toEqual(new Date(2026, 9, 4, 21, 45));
});

it('completing today skips today’s reminder; undo brings it back', async () => {
  await launch();
  const [regenesis] = await listHabits(db);
  await useGame.getState().setHabitDone(regenesis.id, TODAY, true);
  await useGame.getState().refreshReminders();
  expect(scheduled()).not.toContain(`habit-${regenesis.id}-${TODAY}`);
  await useGame.getState().setHabitDone(regenesis.id, TODAY, false);
  await useGame.getState().refreshReminders();
  expect(scheduled()).toContain(`habit-${regenesis.id}-${TODAY}`);
});

it('a broken notification API can never stop the app from starting', async () => {
  mockOs.failPermissions = true;
  await expect(launch()).resolves.toBeUndefined();
  expect(useGame.getState().ready).toBe(true);
  expect(scheduled()).toEqual([]);
  expect(await savedSwitch()).toBe(true); // nothing decided; the next launch tries again
});
