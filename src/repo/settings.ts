import { DEFAULT_PLAYER_NAME } from '@/config/seed';
import { type Db, transaction } from '@/db/db';
import type { DateKey } from '@/domain/dates';

export interface AppSettings {
  playerName: string;
  haptics: boolean;
  sound: boolean;
  /** Master switch for habit reminders. */
  reminders: boolean;
  /** Last day the Day Complete moment was shown (once per day). */
  lastCelebratedDay: DateKey | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  playerName: DEFAULT_PLAYER_NAME,
  haptics: true,
  sound: true,
  reminders: true,
  lastCelebratedDay: null,
};

export async function getSettings(db: Db): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
    [],
  );
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    if (key in DEFAULT_SETTINGS) {
      (settings as unknown as Record<string, unknown>)[key] = JSON.parse(value);
    }
  }
  return settings;
}

export function setSetting<K extends keyof AppSettings>(
  db: Db,
  key: K,
  value: AppSettings[K],
): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, JSON.stringify(value)],
    );
  });
}
