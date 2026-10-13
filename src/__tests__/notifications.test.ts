import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { REMINDER_HORIZON_DAYS } from '@/config/game';
import { listHabits } from '@/repo/habits';
import { setCompletion, setHabitArchived } from '@/repo/progress';
import { startRun } from '@/repo/vault';
import { getPermission, syncReminders } from '@/services/notifications';
import { seededDb } from './helpers/testDb';

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
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
const permission = (status: 'granted' | 'denied' | 'undetermined') => ({
  status,
  granted: status === 'granted',
  canAskAgain: status !== 'denied',
  expires: 'never',
}) as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 4, 12).getTime());
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  api.getPermissionsAsync.mockResolvedValue(permission('undetermined'));
  api.requestPermissionsAsync.mockResolvedValue(permission('granted'));
  api.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

afterEach(() => jest.restoreAllMocks());

describe('Android reminders', () => {
  it('fresh-install defaults create the channel, request permission and schedule the seeded reminder', async () => {
    const db = await seededDb(TODAY);
    expect(await getPermission()).toBe('undetermined');
    await syncReminders(db, TODAY, { enabled: true, requestOnFirstLaunch: true });
    expect(api.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(api.setNotificationChannelAsync.mock.invocationCallOrder[0])
      .toBeLessThan(api.requestPermissionsAsync.mock.invocationCallOrder[0]);
    expect(api.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_HORIZON_DAYS);
    expect(api.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ title: 'Regenesis Command' }),
      trigger: { type: 'date', date: new Date(2026, 9, 4, 20, 30), channelId: 'reminders' },
    }));
  });

  it('a denied request does not schedule notifications or block the app', async () => {
    api.requestPermissionsAsync.mockResolvedValue(permission('denied'));
    await syncReminders(await seededDb(TODAY), TODAY, { enabled: true, requestOnFirstLaunch: true });
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('respects an existing denial without prompting again on launch', async () => {
    api.getPermissionsAsync.mockResolvedValue(permission('denied'));
    await syncReminders(await seededDb(TODAY), TODAY, { enabled: true, requestOnFirstLaunch: true });
    expect(api.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('ordinary habit syncs do not prompt, and disabling reminders cancels pending reminders', async () => {
    const db = await seededDb(TODAY);
    await syncReminders(db, TODAY, { enabled: true });
    api.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'habit-1-2026-10-04' },
      { identifier: 'other-notification' },
    ] as Notifications.NotificationRequest[]);
    await syncReminders(db, TODAY, { enabled: false, requestOnFirstLaunch: true });
    expect(api.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(api.cancelScheduledNotificationAsync).toHaveBeenCalledWith('habit-1-2026-10-04');
    expect(api.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('other-notification');
  });

  it('skips completed days and archived habits, and never reads private tracker data', async () => {
    const db = await seededDb(TODAY);
    const habit = (await listHabits(db))[0];
    await startRun(db, '2026-09-01');
    await setCompletion(db, habit.id, TODAY, true, TODAY);
    const reads = jest.spyOn(db, 'getAllAsync');
    api.getPermissionsAsync.mockResolvedValue(permission('granted'));
    await syncReminders(db, TODAY, { enabled: true });
    expect(api.scheduleNotificationAsync).toHaveBeenCalledTimes(REMINDER_HORIZON_DAYS - 1);
    expect(api.scheduleNotificationAsync.mock.calls.every(([request]) => !request.identifier?.endsWith(TODAY))).toBe(true);
    expect(JSON.stringify(api.scheduleNotificationAsync.mock.calls)).not.toMatch(/now or never|vault/i);
    expect(reads.mock.calls.every(([sql]) => !sql.includes('vault'))).toBe(true);
    await setHabitArchived(db, habit.id, true, TODAY);
    api.scheduleNotificationAsync.mockClear();
    await syncReminders(db, TODAY, { enabled: true });
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('notification API errors remain best-effort and do not reject a habit action', async () => {
    api.getPermissionsAsync.mockRejectedValueOnce(new Error('Native permission API unavailable'));
    await expect(syncReminders(await seededDb(TODAY), TODAY, { enabled: true, requestOnFirstLaunch: true })).resolves.toBeUndefined();
    expect(api.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
