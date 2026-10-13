import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { REMINDER_HORIZON_DAYS } from '@/config/game';
import type { Db } from '@/db/db';
import { type DateKey, addDays, keyToLocalDate } from '@/domain/dates';
import { isScheduled } from '@/domain/schedule';
import { listHabits, timelineOf } from '@/repo/habits';
import { completionsBetween } from '@/repo/progress';

/**
 * Habit reminders are one-off notifications for the next few days, skipping
 * days already completed, so a done habit never nags. Only visible habits are
 * ever scheduled; private data never reaches a notification.
 */
const CHANNEL = 'reminders';
const PREFIX = 'habit-';

/**
 * Expo Go on Android throws as soon as expo-notifications is imported (its
 * push-token setup is blocked there since SDK 53). Reminders therefore run in
 * the installed app only, and the module is loaded lazily so Expo Go still works.
 * The web build is a desktop preview and has no reminders either.
 */
export const remindersSupported =
  Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());

type NotificationsModule = typeof import('expo-notifications');
let loaded: Promise<NotificationsModule> | null = null;

function load(): Promise<NotificationsModule> | null {
  if (!remindersSupported) return null;
  loaded ??= Promise.resolve().then(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Keep native initialization behind the platform gate.
    const Notifications = require('expo-notifications') as NotificationsModule;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return Notifications;
  });
  return loaded;
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  const Notifications = await load();
  if (!Notifications) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

async function ensureChannel(Notifications: NotificationsModule) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Habit reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function requestPermission(): Promise<boolean> {
  const Notifications = await load();
  if (!Notifications) return false;
  await ensureChannel(Notifications);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Rebuilds scheduled reminders (all habits, or one). Safe to call often. */
export async function syncReminders(
  db: Db,
  today: DateKey,
  options: { enabled: boolean; habitId?: number; requestOnFirstLaunch?: boolean },
): Promise<void> {
  try {
    const Notifications = await load();
    if (!Notifications) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const prefix = options.habitId === undefined ? PREFIX : `${PREFIX}${options.habitId}-`;
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    if (!options.enabled) return;
    let permission = await getPermission();
    // Defaults are ON on a fresh install. Ask once at boot instead of requiring
    // an OFF/ON toggle; a prior denial is never prompted again automatically.
    if (options.requestOnFirstLaunch && permission === 'undetermined') {
      permission = (await requestPermission()) ? 'granted' : 'denied';
    }
    if (permission !== 'granted') return;
    await ensureChannel(Notifications);

    const habits = (await listHabits(db)).filter(
      (h) =>
        h.reminderEnabled &&
        h.reminderTime &&
        (options.habitId === undefined || h.id === options.habitId),
    );
    if (habits.length === 0) return;
    const doneToday = new Set(
      (await completionsBetween(db, today, today)).map((row) => row.habit_id),
    );
    const now = Date.now();

    for (const habit of habits) {
      const [hours, minutes] = (habit.reminderTime ?? '').split(':').map(Number);
      for (let i = 0; i < REMINDER_HORIZON_DAYS; i++) {
        const day = addDays(today, i);
        const when = keyToLocalDate(day, hours, minutes);
        if (when.getTime() <= now || !isScheduled(timelineOf(habit), day)) continue;
        if (i === 0 && doneToday.has(habit.id)) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `${PREFIX}${habit.id}-${day}`,
          content: {
            title: habit.title,
            body: habit.question || 'Still open today.',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
        });
      }
    }
  } catch {
    // Reminders are best-effort; never block a habit action on them.
  }
}
