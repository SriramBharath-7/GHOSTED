/**
 * The slice of expo-sqlite's SQLiteDatabase the app uses. Repositories depend
 * on this interface so tests can run them against an in-memory SQLite.
 */
export type BindValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: BindValue[]): Promise<RunResult>;
  getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs `task` inside a transaction, one at a time. Every repository write goes
 * through here: expo-sqlite transactions are not exclusive, so a write made
 * outside the queue could land inside (and roll back with) someone else's.
 * Never call `transaction` from inside another transaction (it would wait forever).
 */
export function transaction<T>(db: Db, task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    let result: T | undefined;
    await db.withTransactionAsync(async () => {
      result = await task();
    });
    return result as T;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function nowIso(): string {
  return new Date().toISOString();
}
