import * as SQLite from 'expo-sqlite';
import type { DateKey } from '@/domain/dates';
import { seedIfEmpty } from '@/repo/habits';
import { type Db, transaction } from './db';
import { migrate } from './migrations';

let instance: Db | null = null;

/** Opens, migrates and (first launch only) seeds the on-device database. */
export async function openDatabase(today: DateKey): Promise<Db> {
  if (instance) return instance;
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
  await migrate(db);
  await transaction(db, () => seedIfEmpty(db, today));
  instance = db;
  return db;
}

export function getDb(): Db {
  if (!instance) throw new Error('Database used before openDatabase() finished.');
  return instance;
}
