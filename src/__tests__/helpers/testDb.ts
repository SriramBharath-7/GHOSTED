import type { BindValue, Db } from '@/db/db';
import { migrate } from '@/db/migrations';
import { seedIfEmpty } from '@/repo/habits';

interface Statement {
  run(...params: BindValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: BindValue[]): unknown;
  all(...params: BindValue[]): unknown[];
}
interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}

/**
 * Real SQLite (Node's built-in node:sqlite) behind the same interface the app
 * uses, so repository tests exercise the actual SQL and constraints. A file
 * path also lets restart tests close and reopen the same on-disk database.
 */
export function createTestDb(path = ':memory:'): Db & { close(): void } {
  const sqlite = process.getBuiltinModule('node:sqlite') as {
    DatabaseSync: new (path: string) => DatabaseSync;
  };
  const raw = new sqlite.DatabaseSync(path);
  return {
    close: () => raw.close(),
    async execAsync(source) {
      raw.exec(source);
    },
    async runAsync(source, params) {
      const result = raw.prepare(source).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, params: BindValue[]) {
      return (raw.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, params: BindValue[]) {
      return raw.prepare(source).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

export async function seededDb(today: string): Promise<Db> {
  const db = createTestDb();
  await migrate(db);
  await seedIfEmpty(db, today);
  return db;
}
