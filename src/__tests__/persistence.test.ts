import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrate } from '@/db/migrations';
import { exportBackup } from '@/repo/backup';
import { createGoal, getGoal, setGoalStatus } from '@/repo/goals';
import { listHabits, seedIfEmpty } from '@/repo/habits';
import { listInventory, listRedemptions, redeemItem } from '@/repo/inventory';
import { getBalances, getPerfectDayCount } from '@/repo/ledger';
import { completionDates, setCompletion } from '@/repo/progress';
import { createReward, getReward, purchaseReward } from '@/repo/rewards';
import { getSettings, setSetting } from '@/repo/settings';
import { listRuns, startRun } from '@/repo/vault';
import { createTestDb } from './helpers/testDb';

const TODAY = '2026-10-04';

it('preserves the core loop across database close/reopen, including redeemed items and private data', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'ghosted-persistence-'));
  const path = join(directory, 'ghosted.db');
  let db = createTestDb(path);
  try {
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await migrate(db);
    await seedIfEmpty(db, TODAY);
    const habits = await listHabits(db);
    for (const habit of habits) await setCompletion(db, habit.id, TODAY, true, TODAY);
    const rewardId = await createReward(db, {
      name: 'Movie Night', icon: 'film', description: 'One evening', category: 'Rest', cost: 20, stock: 2,
    });
    const purchase = await purchaseReward(db, rewardId);
    expect(purchase.ok).toBe(true);
    const [item] = await listInventory(db);
    expect(await redeemItem(db, item.id)).toEqual({ ok: true, remaining: 0 });
    await setSetting(db, 'playerName', 'Restart Player');
    await setSetting(db, 'lastCelebratedDay', TODAY);
    const missionId = await createGoal(db, {
      title: 'Read five chapters', description: '', horizon: 'long', icon: 'book', category: 'Learning',
      startDate: TODAY, targetDate: null, stepsTotal: 5, stepsDone: 2, progress: null, notes: '',
    });
    await setGoalStatus(db, missionId, 'done');
    await startRun(db, '2026-09-01');
    const earned = await getBalances(db);
    const privateRuns = await listRuns(db);

    db.close();
    db = createTestDb(path);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await migrate(db);
    await seedIfEmpty(db, TODAY);

    expect(await listHabits(db)).toEqual(habits);
    expect(await getBalances(db)).toEqual(earned);
    expect(await getPerfectDayCount(db)).toBe(1);
    expect(await completionDates(db, habits[0].id)).toEqual(new Set([TODAY]));
    expect(await setCompletion(db, habits[0].id, TODAY, true, TODAY)).toBeNull();
    expect(await listInventory(db)).toEqual([]);
    expect(await listRedemptions(db)).toEqual([expect.objectContaining({ name: 'Movie Night', icon: 'film' })]);
    expect(await redeemItem(db, item.id)).toEqual({ ok: false, reason: 'empty' });
    expect(await getReward(db, rewardId)).toMatchObject({ stock: 1 });
    expect(await getGoal(db, missionId)).toMatchObject({ status: 'done', stepsDone: 5 });
    expect(await getSettings(db)).toMatchObject({ playerName: 'Restart Player', lastCelebratedDay: TODAY });
    expect(await listRuns(db)).toEqual(privateRuns);
    expect(JSON.stringify(await exportBackup(db, 'main'))).not.toMatch(/vault|now or never/i);

    const undo = await setCompletion(db, habits[0].id, TODAY, false, TODAY);
    expect(undo).not.toBeNull();
    const afterUndo = await getBalances(db);
    expect(afterUndo).toEqual({ xp: earned.xp + undo!.xp, coins: earned.coins + undo!.coins });
    db.close();
    db = createTestDb(path);
    expect(await getBalances(db)).toEqual(afterUndo);
    expect(await completionDates(db, habits[0].id)).toEqual(new Set());
    expect(await getPerfectDayCount(db)).toBe(0);
    expect(await listRedemptions(db)).toHaveLength(1);
    expect(await listRuns(db)).toEqual(privateRuns);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
