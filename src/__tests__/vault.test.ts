import { SEED_HABITS } from '@/config/seed';
import { exportBackup, importBackup, parseBackup } from '@/repo/backup';
import { listHabits } from '@/repo/habits';
import { getBalances, getPerfectDayCount } from '@/repo/ledger';
import { setCompletion } from '@/repo/progress';
import { listRuns, resetRun, startRun, summarizeVault } from '@/repo/vault';
import { seededDb } from './helpers/testDb';

const TODAY = '2026-10-04';
const PRIVATE_NAME = /now or never/i;

describe('vault separation', () => {
  it('never seeds the private tracker as a visible habit', async () => {
    const db = await seededDb(TODAY);
    expect(SEED_HABITS.some((h) => PRIVATE_NAME.test(h.title))).toBe(false);
    const habits = await listHabits(db, { includeArchived: true });
    expect(habits.some((h) => PRIVATE_NAME.test(h.title))).toBe(false);
  });

  it('does not affect XP, coins or Perfect Days', async () => {
    const db = await seededDb(TODAY);
    await startRun(db, '2026-09-01');
    await resetRun(db, TODAY);
    expect(await getBalances(db)).toEqual({ xp: 0, coins: 0 });
    for (const habit of await listHabits(db)) await setCompletion(db, habit.id, TODAY, true, TODAY);
    expect(await getPerfectDayCount(db)).toBe(1);
  });

  it('is excluded from the main backup and has its own', async () => {
    const db = await seededDb(TODAY);
    await startRun(db, '2026-09-01');
    const main = await exportBackup(db, 'main');
    expect(Object.keys(main.tables)).not.toContain('vault_runs');
    expect(JSON.stringify(main)).not.toMatch(/vault/i);

    const vault = await exportBackup(db, 'vault');
    expect(vault.tables.vault_runs).toHaveLength(1);
    // A main backup file can't smuggle vault rows in.
    const forged = JSON.stringify({ ...main, tables: { ...main.tables, vault_runs: [] } });
    expect(() => parseBackup(forged)).toThrow('Unexpected table');
  });

  it('importing a main backup leaves the vault untouched', async () => {
    const db = await seededDb(TODAY);
    await startRun(db, '2026-09-01');
    const main = await exportBackup(db, 'main');
    await importBackup(db, main);
    expect(await listRuns(db)).toHaveLength(1);
  });
});

describe('vault counter', () => {
  it('counts days, keeps history on reset and tracks the best run', async () => {
    const db = await seededDb(TODAY);
    await startRun(db, '2026-09-01');
    await startRun(db, '2026-01-01'); // ignored: a run is already in progress
    let summary = summarizeVault(await listRuns(db), TODAY);
    expect(summary.days).toBe(33);

    await resetRun(db, TODAY);
    summary = summarizeVault(await listRuns(db), '2026-10-10');
    expect(summary.days).toBe(6);
    expect(summary.best).toBe(33);
    expect(summary.total).toBe(33 + 6);
    expect(summary.past).toHaveLength(1);
    expect(summary.previousMilestone).toBe(3);
    expect(summary.nextMilestone).toBe(7);
  });
});
