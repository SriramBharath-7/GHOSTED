import { listHabits } from '@/repo/habits';
import { listInventory, listRedemptions, redeemItem } from '@/repo/inventory';
import { getBalances } from '@/repo/ledger';
import { setCompletion } from '@/repo/progress';
import { createReward, deleteReward, getReward, purchaseReward } from '@/repo/rewards';
import { seededDb } from './helpers/testDb';

const TODAY = '2026-10-04';

async function dbWithCoins() {
  const db = await seededDb(TODAY);
  for (const habit of await listHabits(db)) await setCompletion(db, habit.id, TODAY, true, TODAY);
  return db;
}

const reward = { name: 'Cheat Meal', icon: '🍔', description: 'One meal, no guilt.', category: 'Food', cost: 30, stock: null };

describe('shop', () => {
  it('checks balance, deducts coins and puts the item in inventory', async () => {
    const db = await dbWithCoins();
    const before = (await getBalances(db)).coins;
    const id = await createReward(db, reward);

    const result = await purchaseReward(db, id);
    expect(result).toMatchObject({ ok: true, balance: before - 30 });
    expect((await getBalances(db)).coins).toBe(before - 30);

    const inventory = await listInventory(db);
    expect(inventory).toHaveLength(1);
    expect(inventory[0]).toMatchObject({ name: 'Cheat Meal', quantity: 1, rewardId: id });

    await purchaseReward(db, id);
    expect((await listInventory(db))[0].quantity).toBe(2);
  });

  it('refuses when coins are short, without side effects', async () => {
    const db = await seededDb(TODAY);
    const id = await createReward(db, reward);
    expect(await purchaseReward(db, id)).toEqual({ ok: false, reason: 'insufficient', shortBy: 30 });
    expect(await listInventory(db)).toEqual([]);
    expect((await getBalances(db)).coins).toBe(0);
  });

  it('respects limited stock', async () => {
    const db = await dbWithCoins();
    const id = await createReward(db, { ...reward, cost: 1, stock: 1 });
    expect((await purchaseReward(db, id)).ok).toBe(true);
    expect(await purchaseReward(db, id)).toEqual({ ok: false, reason: 'out_of_stock' });
    expect((await getReward(db, id))?.stock).toBe(0);
  });

  it('keeps owned items when the reward is deleted', async () => {
    const db = await dbWithCoins();
    const id = await createReward(db, { ...reward, cost: 1 });
    await purchaseReward(db, id);
    await deleteReward(db, id);
    expect((await listInventory(db))[0]).toMatchObject({ name: 'Cheat Meal', rewardId: null });
  });
});

describe('inventory', () => {
  it('serializes rapid purchases and Use Item taps without overdrawing or double redemption', async () => {
    const db = await dbWithCoins();
    const before = (await getBalances(db)).coins;
    const id = await createReward(db, { ...reward, cost: before, stock: 1 });
    const purchases = await Promise.all([purchaseReward(db, id), purchaseReward(db, id)]);
    expect(purchases.filter((result) => result.ok)).toHaveLength(1);
    expect(await getBalances(db)).toMatchObject({ coins: 0 });
    expect(await getReward(db, id)).toMatchObject({ stock: 0 });
    const [item] = await listInventory(db);
    expect(item.quantity).toBe(1);
    const uses = await Promise.all([redeemItem(db, item.id), redeemItem(db, item.id)]);
    expect(uses).toEqual([{ ok: true, remaining: 0 }, { ok: false, reason: 'empty' }]);
    expect(await listInventory(db)).toEqual([]);
    expect(await listRedemptions(db)).toHaveLength(1);
  });

  it('redeems one copy at a time and records history', async () => {
    const db = await dbWithCoins();
    const id = await createReward(db, { ...reward, cost: 1 });
    await purchaseReward(db, id);
    await purchaseReward(db, id);
    const [item] = await listInventory(db);

    expect(await redeemItem(db, item.id)).toEqual({ ok: true, remaining: 1 });
    expect(await redeemItem(db, item.id)).toEqual({ ok: true, remaining: 0 });
    expect(await redeemItem(db, item.id)).toEqual({ ok: false, reason: 'empty' });
    expect(await listInventory(db)).toEqual([]);
    expect(await listRedemptions(db)).toHaveLength(2);
  });
});
