import type { Db } from '@/db/db';
import { MIGRATIONS, migrate } from '@/db/migrations';
import { BackupError, exportBackup, importBackup, parseBackup, resetAllData } from '@/repo/backup';
import { listHabits } from '@/repo/habits';
import { listInventory } from '@/repo/inventory';
import { getBalances } from '@/repo/ledger';
import { setCompletion, updateHabit } from '@/repo/progress';
import { createReward, listRewards } from '@/repo/rewards';
import { createTestDb, seededDb } from './helpers/testDb';

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

  it('restores a v1 backup exactly as if that data had been migrated on the device', async () => {
    // A v1 install: seeded emoji with an old seed accent, a user-picked emoji, emoji rewards, an owned item.
    const v1 = createTestDb();
    await v1.execAsync(MIGRATIONS[0]);
    await v1.execAsync('PRAGMA user_version = 1');
    await v1.runAsync(
      `INSERT INTO habits (title, icon, accent, days_mask, xp_reward, coin_reward, start_date, created_at)
       VALUES ('The Iron Monarch', '🏋️', '#EF6351', 127, 15, 5, ?, ?), ('Mine', '🦊', '#123456', 127, 5, 1, ?, ?)`,
      [TODAY, TODAY, TODAY, TODAY],
    );
    await v1.runAsync(
      "INSERT INTO rewards (name, icon, cost, created_at) VALUES ('Cheat Meal', '🍔', 30, ?), ('Unicorn', '🦄', 10, ?)",
      [TODAY, TODAY],
    );
    await v1.runAsync(
      `INSERT INTO inventory (reward_id, name, icon, quantity, first_acquired_at, last_acquired_at)
       VALUES (1, 'Cheat Meal', '🍔', 1, ?, ?)`,
      [TODAY, TODAY],
    );
    const backup = JSON.stringify({ ...(await exportBackup(v1, 'main')), schemaVersion: 1 });

    const restored = await seededDb(TODAY);
    await importBackup(restored, parseBackup(backup));
    await migrate(v1); // the same data, upgraded in place

    const look = async (db: Db) => ({
      habits: (await listHabits(db)).map((h) => [h.title, h.icon, h.accent]),
      rewards: (await listRewards(db)).map((r) => [r.name, r.icon]),
      items: (await listInventory(db)).map((i) => [i.name, i.icon]),
    });
    expect(await look(restored)).toEqual(await look(v1));
    expect(await look(restored)).toEqual({
      habits: [['The Iron Monarch', 'dumbbell', '#2A8CFF'], ['Mine', '🦊', '#123456']],
      rewards: [['Cheat Meal', 'burger'], ['Unicorn', '🦄']],
      items: [['Cheat Meal', 'burger']],
    });
  });

  it('a current backup restores user choices untouched, even ones matching old seed values', async () => {
    const source = await seededDb(TODAY);
    const iron = (await listHabits(source))[1];
    await updateHabit(source, iron.id, { ...iron, icon: '🏋️', accent: '#EF6351' }, TODAY);
    const target = await seededDb(TODAY);
    await importBackup(target, parseBackup(JSON.stringify(await exportBackup(source, 'main'))));
    expect((await listHabits(target))[1]).toMatchObject({ title: 'The Iron Monarch', icon: '🏋️', accent: '#EF6351' });
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
