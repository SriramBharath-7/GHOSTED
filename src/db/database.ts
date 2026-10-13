import * as SQLite from 'expo-sqlite';
import type { DateKey } from '@/domain/dates';
import { seedIfEmpty } from '@/repo/habits';
import { type Db, transaction } from './db';
import { migrate } from './migrations';

let instance: Db | null = null;
let opening: Promise<Db> | null = null;

/**
 * Opens, migrates and (first launch only) seeds the on-device database.
 * Concurrent callers share one open; a failed open can be retried.
 */
export function openDatabase(today: DateKey): Promise<Db> {
  opening ??= open(today).catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

async function open(today: DateKey): Promise<Db> {
  const raw = await SQLite.openDatabaseAsync('ghosted.db');
  await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const db: Db = {
    execAsync: (source) => raw.execAsync(source),
    runAsync: (source, params) => raw.runAsync(source, params),
    getFirstAsync: <T,>(source: string, params: SQLite.SQLiteBindValue[]) =>
      raw.getFirstAsync<T>(source, params),
    getAllAsync: <T,>(source: string, params: SQLite.SQLiteBindValue[]) =>
      raw.getAllAsync<T>(source, params),
    withTransactionAsync: (task) => raw.withTransactionAsync(task),
  };
  try {
    await migrate(db);
    await transaction(db, () => seedIfEmpty(db, today));
  } catch (error) {
    await raw.closeAsync().catch(() => undefined);
    throw error;
  }
  instance = db;
  return db;
}

export function getDb(): Db {
  if (!instance) throw new Error('Database used before openDatabase() finished.');
  return instance;
}
