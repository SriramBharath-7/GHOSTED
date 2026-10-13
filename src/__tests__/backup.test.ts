import { BackupError, exportBackup, importBackup, parseBackup, resetAllData } from '@/repo/backup';
import { listHabits } from '@/repo/habits';
import { getBalances } from '@/repo/ledger';
import { setCompletion } from '@/repo/progress';
import { createReward } from '@/repo/rewards';
import { seededDb } from './helpers/testDb';

const TODAY = '2026-10-04';

describe('backup', () => {
  it('round-trips all habit history and progression', async () => {
    const source = await seededDb(TODAY);
    const [habit] = await listHabits(source);
    await setCompletion(source, habit.id, TODAY, true, TODAY);
    await createReward(source, { name: 'Movie Night', icon: '🎬', description: '', category: '', cost: 100, stock: null });
    const text = JSON.stringify(await exportBackup(source, 'main'));

    const target = await seededDb('2026-01-01');
    await importBackup(target, parseBackup(text));
    expect(await getBalances(target)).toEqual(await getBalances(source));
    expect(await listHabits(target)).toEqual(await listHabits(source));
  });

  it('rejects files that are not GHOSTED backups without touching data', async () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"Other"}')).toThrow('not a GHOSTED backup');
    expect(() =>
      parseBackup(JSON.stringify({ app: 'GHOSTED', kind: 'main', schemaVersion: 999, tables: {} })),
    ).toThrow('newer version');

    const db = await seededDb(TODAY);
    const bad = { app: 'GHOSTED', kind: 'main', schemaVersion: 1, exportedAt: '', tables: { habits: [{ id: 1 }] } } as const;
    await expect(importBackup(db, parseBackup(JSON.stringify(bad)))).rejects.toThrow();
    expect(await listHabits(db)).toHaveLength(5); // rolled back
  });

  it('reset wipes history and re-seeds the habits', async () => {
    const db = await seededDb(TODAY);
    const [habit] = await listHabits(db);
    await setCompletion(db, habit.id, TODAY, true, TODAY);
    await resetAllData(db, TODAY);
    expect(await getBalances(db)).toEqual({ xp: 0, coins: 0 });
    expect(await listHabits(db)).toHaveLength(5);
  });
});
