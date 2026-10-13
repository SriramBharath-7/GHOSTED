import { VAULT_MILESTONES } from '@/config/game';
import { type Db, nowIso, transaction } from '@/db/db';
import { type DateKey, diffDays } from '@/domain/dates';

/**
 * The private counter. Nothing outside the Vault screen may import this file:
 * its table is excluded from habits, stats, Perfect Days, reminders and the
 * main backup.
 */
export interface VaultRun {
  id: number;
  startDate: DateKey;
  /** null = the run in progress. */
  endDate: DateKey | null;
}

export function listRuns(db: Db): Promise<VaultRun[]> {
  return db.getAllAsync<VaultRun>(
    'SELECT id, start_date AS startDate, end_date AS endDate FROM vault_runs ORDER BY start_date DESC, id DESC',
    [],
  );
}

export function startRun(db: Db, startDate: DateKey): Promise<void> {
  return transaction(db, async () => {
    const current = await db.getFirstAsync('SELECT id FROM vault_runs WHERE end_date IS NULL', []);
    if (current) return;
    await db.runAsync('INSERT INTO vault_runs (start_date, end_date, created_at) VALUES (?, NULL, ?)', [
      startDate,
      nowIso(),
    ]);
  });
}

/** Ends the current run (kept in history) and starts a new one today. */
export function resetRun(db: Db, today: DateKey): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync('UPDATE vault_runs SET end_date = ? WHERE end_date IS NULL', [today]);
    await db.runAsync('INSERT INTO vault_runs (start_date, end_date, created_at) VALUES (?, NULL, ?)', [
      today,
      nowIso(),
    ]);
  });
}

/** Corrects the start of the run in progress. */
export function setCurrentStart(db: Db, startDate: DateKey): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync('UPDATE vault_runs SET start_date = ? WHERE end_date IS NULL', [startDate]);
  });
}

export function runLength(run: VaultRun, today: DateKey): number {
  return Math.max(0, diffDays(run.startDate, run.endDate ?? today));
}

export interface VaultSummary {
  current: VaultRun | null;
  days: number;
  best: number;
  /** Days across every run, including the current one. */
  total: number;
  past: VaultRun[];
  /** Last milestone passed (0 before the first), for gauge progress. */
  previousMilestone: number;
  nextMilestone: number | null;
  /** Milestone just reached (days === milestone), for a quiet acknowledgement. */
  reachedToday: number | null;
}

export function summarizeVault(runs: VaultRun[], today: DateKey): VaultSummary {
  const current = runs.find((run) => run.endDate === null) ?? null;
  const days = current ? runLength(current, today) : 0;
  return {
    current,
    days,
    best: runs.reduce((best, run) => Math.max(best, runLength(run, today)), 0),
    total: runs.reduce((sum, run) => sum + runLength(run, today), 0),
    past: runs.filter((run) => run.endDate !== null),
    previousMilestone: [...VAULT_MILESTONES].reverse().find((m) => m <= days) ?? 0,
    nextMilestone: current ? (VAULT_MILESTONES.find((m) => m > days) ?? null) : null,
    reachedToday: current && VAULT_MILESTONES.includes(days) ? days : null,
  };
}
