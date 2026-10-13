import { type BindValue, type Db, transaction } from '@/db/db';
import { SCHEMA_VERSION } from '@/db/migrations';
import type { DateKey } from '@/domain/dates';
import { seedIfEmpty } from './habits';

/**
 * JSON backups. The main backup never contains Vault data; the Vault exports
 * its own file from inside the Vault.
 */
const TABLES = {
  main: [
    'settings',
    'habits',
    'habit_schedules',
    'completions',
    'ledger',
    'perfect_days',
    'rewards',
    'purchases',
    'inventory',
    'redemptions',
    'goals',
  ],
  vault: ['vault_runs'],
} as const;

export type BackupKind = keyof typeof TABLES;

export interface BackupFile {
  app: 'GHOSTED';
  kind: BackupKind;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Record<string, BindValue>[]>;
}

export class BackupError extends Error {}

export async function exportBackup(db: Db, kind: BackupKind): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const table of TABLES[kind]) {
    tables[table] = await db.getAllAsync<Record<string, BindValue>>(`SELECT * FROM ${table}`, []);
  }
  return { app: 'GHOSTED', kind, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tables };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validates untrusted JSON before anything touches the database. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('This file is not valid JSON.');
  }
  if (!isRecord(data) || data.app !== 'GHOSTED') throw new BackupError('This is not a GHOSTED backup.');
  if (data.kind !== 'main' && data.kind !== 'vault') throw new BackupError('Unknown backup type.');
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('This backup was made by a newer version of GHOSTED.');
  }
  if (!isRecord(data.tables)) throw new BackupError('Backup has no data.');
  const allowed: readonly string[] = TABLES[data.kind];
  for (const [table, rows] of Object.entries(data.tables)) {
    if (!allowed.includes(table)) throw new BackupError(`Unexpected table "${table}".`);
    if (!Array.isArray(rows) || !rows.every(isRecord)) throw new BackupError(`Table "${table}" is malformed.`);
    for (const row of rows) {
      for (const value of Object.values(row)) {
        if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
          throw new BackupError(`Table "${table}" contains an invalid value.`);
        }
      }
    }
  }
  return data as unknown as BackupFile;
}

/** Replaces the backup's tables wholesale. All-or-nothing: any bad row rolls back everything. */
export function importBackup(db: Db, file: BackupFile): Promise<number> {
  return transaction(db, async () => {
    let count = 0;
    // Children before parents on delete, parents before children on insert (FKs).
    for (const table of [...TABLES[file.kind]].reverse()) {
      await db.runAsync(`DELETE FROM ${table}`, []);
    }
    for (const table of TABLES[file.kind]) {
      const columns = new Set(
        (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`, [])).map((c) => c.name),
      );
      for (const row of file.tables[table] ?? []) {
        const keys = Object.keys(row).filter((key) => columns.has(key));
        if (keys.length === 0) continue;
        await db.runAsync(
          `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((key) => row[key]),
        );
        count++;
      }
    }
    return count;
  });
}

/** Wipes everything on this device (including the Vault table) and re-seeds the habits. */
export function resetAllData(db: Db, today: DateKey): Promise<void> {
  return transaction(db, async () => {
    for (const table of [...TABLES.main, ...TABLES.vault].reverse()) {
      await db.runAsync(`DELETE FROM ${table}`, []);
    }
    await seedIfEmpty(db, today);
  });
}
