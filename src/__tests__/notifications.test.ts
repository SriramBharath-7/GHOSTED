import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { REMINDER_HORIZON_DAYS } from '@/config/game';
import { listHabits } from '@/repo/habits';
import { setCompletion, setHabitArchived, updateHabit } from '@/repo/progress';
import { startRun } from '@/repo/vault';
import { getPermission, requestPermission, syncReminders } from '@/services/notifications';
import { seededDb } from './helpers/testDb';

let mockExpoGo = false;
jest.mock('expo', () => ({ isRunningInExpoGo: () => mockExpoGo }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const TODAY = '2026-10-04';
const api = jest.mocked(Notifications);
const permission = (status: 'granted' | 'denied' | 'undetermined', canAskAgain = status !== 'denied') => ({
  status,
  granted: status === 'granted',
  canAskAgain,
  expires: 'never',
}) as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;
const scheduledIds = () => api.scheduleNotificationAsync.mock.calls.map(([request]) => request.identifier);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 4, 12).getTime());
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  api.getPermissionsAsync.mockResolvedValue(permission('granted'));
  api.requestPermissionsAsync.mockResolvedValue(permission('granted'));
  api.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

afterEach(() => jest.restoreAllMocks());

describe('permission', () => {
  it('maps the OS answer to a single state', async () => {
    api.getPermissionsAsync.mockResolvedValueOnce(permission('undetermined'));
    expect(await getPermission()).toBe('undetermined');
    api.getPermissionsAsync.mockResolvedValueOnce(permission('denied'));
    expect(await getPermission()).toBe('denied');
    expect(await getPermission()).toBe('granted');
  });

  it('creates the Android channel before prompting (Android 13 needs one)', async () => {
    api.getPermissionsAsync.mockResolvedValue(permission('undetermined'));
    expect(await requestPermission()).toBe('granted');
    expect(api.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(api.setNotificationChannelAsync.mock.invocationCallOrder[0])
      .toBeLessThan(api.requestPermissionsAsync.mock.invocationCallOrder[0]);
  });

  it('never prompts again once the OS stops allowing it', async () => {
    api.getPermissionsAsync.mockResolvedValue(permission('denied', false));
    expect(await requestPermission()).toBe('denied');
    expect(api.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('syncReminders', () => {
  it('schedules the seeded 8:30 PM reminder for the reminder horizon', async () => {
    await syncReminders(await seededDb(TODAY), TODAY, { enabled: true });
    expect(api.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_HORIZON_DAYS);
    expect(api.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: `habit-1-${TODAY}`,
      content: expect.objectContaining({ title: 'Regenesis Command' }),
      trigger: { type: 'date', date: new Date(2026, 9, 4, 20, 30), channelId: 'reminders' },
    }));
  });

  it('never schedules without permission, even when enabled, and never prompts', async () => {
    api.getPermissionsAsync.mockResolvedValue(permission('undetermined'));
    await syncReminders(await seededDb(TODAY), TODAY, { enabled: true });
    api.getPermissionsAsync.mockResolvedValue(permission('denied'));
    await syncReminders(await seededDb(TODAY), TODAY, { enabled: true });
    expect(api.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('disabling cancels only GHOSTED habit reminders', async () => {
    api.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'habit-1-2026-10-04' },
      { identifier: 'other-notification' },
    ] as Notifications.NotificationRequest[]);
    await syncReminders(await seededDb(TODAY), TODAY, { enabled: false });
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(api.cancelScheduledNotificationAsync).toHaveBeenCalledWith('habit-1-2026-10-04');
    expect(api.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other-notification');
  });

  it('a one-habit resync replaces only that habit, at its new time', async () => {
    const db = await seededDb(TODAY);
    const [regenesis, iron] = await listHabits(db);
    await updateHabit(db, iron.id, { ...iron, reminderEnabled: true, reminderTime: '07:00' }, TODAY);
    await updateHabit(db, regenesis.id, { ...regenesis, reminderTime: '21:15' }, TODAY);
    api.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: `habit-${regenesis.id}-${TODAY}` },
      { identifier: `habit-${iron.id}-2026-10-05` },
    ] as Notifications.NotificationRequest[]);
    await syncReminders(db, TODAY, { enabled: true, habitId: regenesis.id });
    expect(api.cancelScheduledNotificationAsync.mock.calls).toEqual([[`habit-${regenesis.id}-${TODAY}`]]);
    expect(scheduledIds().every((id) => id?.startsWith(`habit-${regenesis.id}-`))).toBe(true);
    expect(api.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      trigger: expect.objectContaining({ date: new Date(2026, 9, 4, 21, 15) }),
    }));
  });

  it('skips today once done, archived habits, unscheduled days and malformed times', async () => {
    const db = await seededDb(TODAY);
    const [regenesis, iron, kernel] = await listHabits(db);
    await setCompletion(db, regenesis.id, TODAY, true, TODAY);
    await updateHabit(db, iron.id, { ...iron, reminderEnabled: true, reminderTime: '7:00 PM', daysMask: 0b1000001 }, TODAY);
    await updateHabit(db, kernel.id, { ...kernel, reminderEnabled: true, reminderTime: '06:00', daysMask: 0b1000001 }, TODAY);
    await syncReminders(db, TODAY, { enabled: true });
    const ids = scheduledIds();
    expect(ids).not.toContain(`habit-${regenesis.id}-${TODAY}`);
    expect(ids.filter((id) => id?.startsWith(`habit-${regenesis.id}-`))).toHaveLength(REMINDER_HORIZON_DAYS - 1);
    expect(ids.some((id) => id?.startsWith(`habit-${iron.id}-`))).toBe(false);
    // Weekends only: Sat 10th and Sun 11th, Sat 17th (Sun 4th is today, 06:00 already passed).
    expect(ids.filter((id) => id?.startsWith(`habit-${kernel.id}-`))).toEqual([
      `habit-${kernel.id}-2026-10-10`, `habit-${kernel.id}-2026-10-11`, `habit-${kernel.id}-2026-10-17`,
    ]);

    api.scheduleNotificationAsync.mockClear();
    await setHabitArchived(db, regenesis.id, true, TODAY);
    await syncReminders(db, TODAY, { enabled: true, habitId: regenesis.id });
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('never reads or sends private data', async () => {
    const db = await seededDb(TODAY);
    await startRun(db, '2026-09-01');
    const reads = jest.spyOn(db, 'getAllAsync');
    await syncReminders(db, TODAY, { enabled: true });
    expect(JSON.stringify(api.scheduleNotificationAsync.mock.calls)).not.toMatch(/now or never|vault/i);
    expect(reads.mock.calls.every(([sql]) => !sql.includes('vault'))).toBe(true);
  });

  it('runs syncs in order, so a later "off" wins over a rebuild already in flight', async () => {
    const db = await seededDb(TODAY);
    const scheduled = new Set<string>();
    api.getAllScheduledNotificationsAsync.mockImplementation(async () =>
      [...scheduled].map((identifier) => ({ identifier }) as Notifications.NotificationRequest));
    api.cancelScheduledNotificationAsync.mockImplementation(async (id) => void scheduled.delete(id));
    api.scheduleNotificationAsync.mockImplementation(async (request) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      scheduled.add(request.identifier!);
      return request.identifier!;
    });
    await Promise.all([
      syncReminders(db, TODAY, { enabled: true }),
      syncReminders(db, TODAY, { enabled: false }),
    ]);
    expect(scheduled.size).toBe(0);
  });

  it('native failures stay best-effort and never reject the caller', async () => {
    api.getAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('Native API unavailable'));
    await expect(syncReminders(await seededDb(TODAY), TODAY, { enabled: true })).resolves.toBeUndefined();
    // The queue keeps working after a failure.
    await syncReminders(await seededDb(TODAY), TODAY, { enabled: true });
    expect(api.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_HORIZON_DAYS);
  });
});

describe('Expo Go on Android and the web preview', () => {
  it('never loads the native module and reports reminders as unsupported', async () => {
    mockExpoGo = true;
    let service!: typeof import('@/services/notifications');
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports -- Fresh module instances with Expo Go on. */
      const rn: typeof import('react-native') = require('react-native');
      Object.defineProperty(rn.Platform, 'OS', { value: 'android', configurable: true });
      service = require('@/services/notifications');
      /* eslint-enable @typescript-eslint/no-require-imports */
    });
    mockExpoGo = false;
    expect(service.remindersSupported).toBe(false);
    // 'unsupported' is only returned when the native module was never loaded.
    expect(await service.getPermission()).toBe('unsupported');
    expect(await service.requestPermission()).toBe('unsupported');
    await expect(service.syncReminders(await seededDb(TODAY), TODAY, { enabled: true })).resolves.toBeUndefined();
    expect(api.getPermissionsAsync).not.toHaveBeenCalled();
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
