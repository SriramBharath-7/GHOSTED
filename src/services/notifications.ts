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
 *
 * This module only talks to the OS. When to ask for permission, and what the
 * Settings switch shows, is decided in one place: the game store.
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
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.status === 'undetermined' ? 'undetermined' : 'denied';
}

async function ensureChannel(Notifications: NotificationsModule) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Habit reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

/** Asks the OS when it still allows asking, and returns the resulting state. */
export async function requestPermission(): Promise<PermissionState> {
  const Notifications = await load();
  if (!Notifications) return 'unsupported';
  // Android 13+ shows the prompt only once a channel exists.
  await ensureChannel(Notifications);
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  return (await Notifications.requestPermissionsAsync()).granted ? 'granted' : 'denied';
}

let queue: Promise<void> = Promise.resolve();

/**
 * Rebuilds scheduled reminders (all habits, or one) so the OS matches the
 * database. Calls run one at a time in order, so a later "off" always wins
 * over an earlier rebuild. Never rejects: reminders must not block an action.
 */
export function syncReminders(
  db: Db,
  today: DateKey,
  options: { enabled: boolean; habitId?: number },
): Promise<void> {
  queue = queue.then(() => rebuild(db, today, options)).catch(() => undefined);
  return queue;
}

async function rebuild(db: Db, today: DateKey, options: { enabled: boolean; habitId?: number }) {
  const Notifications = await load();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = options.habitId === undefined ? PREFIX : `${PREFIX}${options.habitId}-`;
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!options.enabled || (await getPermission()) !== 'granted') return;
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
    // A malformed time (e.g. from a hand-edited backup) skips only this habit.
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) continue;
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
}
