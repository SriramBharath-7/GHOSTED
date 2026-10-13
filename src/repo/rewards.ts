import { type Db, nowIso, transaction } from '@/db/db';
import { addLedger, getBalances } from './ledger';

export interface Reward {
  id: number;
  name: string;
  icon: string;
  description: string;
  category: string;
  cost: number;
  /** null = unlimited. */
  stock: number | null;
  sortOrder: number;
}

export type RewardInput = Omit<Reward, 'id' | 'sortOrder'>;

export type PurchaseResult =
  | { ok: true; inventoryId: number; balance: number }
  | { ok: false; reason: 'insufficient'; shortBy: number }
  | { ok: false; reason: 'out_of_stock' | 'missing' };

const SELECT = `SELECT id, name, icon, description, category, cost, stock, sort_order AS sortOrder FROM rewards`;

export function listRewards(db: Db): Promise<Reward[]> {
  return db.getAllAsync<Reward>(`${SELECT} ORDER BY sort_order, id`, []);
}

export function getReward(db: Db, id: number): Promise<Reward | null> {
  return db.getFirstAsync<Reward>(`${SELECT} WHERE id = ?`, [id]);
}

export function createReward(db: Db, input: RewardInput): Promise<number> {
  return transaction(db, async () => {
    const { lastInsertRowId } = await db.runAsync(
      `INSERT INTO rewards (name, icon, description, category, cost, stock, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM rewards), ?)`,
      [
        input.name.trim(),
        input.icon,
        input.description.trim(),
        input.category.trim(),
        input.cost,
        input.stock,
        nowIso(),
      ],
    );
    return lastInsertRowId;
  });
}

export function updateReward(db: Db, id: number, input: RewardInput): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync(
      'UPDATE rewards SET name = ?, icon = ?, description = ?, category = ?, cost = ?, stock = ? WHERE id = ?',
      [
        input.name.trim(),
        input.icon,
        input.description.trim(),
        input.category.trim(),
        input.cost,
        input.stock,
        id,
      ],
    );
  });
}

/** Owned copies stay in Inventory; they just detach from the deleted reward. */
export function deleteReward(db: Db, id: number): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync('UPDATE inventory SET reward_id = NULL WHERE reward_id = ?', [id]);
    await db.runAsync('DELETE FROM rewards WHERE id = ?', [id]);
  });
}

export function purchaseReward(db: Db, rewardId: number): Promise<PurchaseResult> {
  return transaction(db, async (): Promise<PurchaseResult> => {
    const reward = await getReward(db, rewardId);
    if (!reward) return { ok: false, reason: 'missing' };
    if (reward.stock !== null && reward.stock <= 0) return { ok: false, reason: 'out_of_stock' };
    const { coins } = await getBalances(db);
    if (coins < reward.cost) return { ok: false, reason: 'insufficient', shortBy: reward.cost - coins };

    const now = nowIso();
    const purchase = await db.runAsync(
      'INSERT INTO purchases (reward_id, name, cost, created_at) VALUES (?, ?, ?, ?)',
      [reward.id, reward.name, reward.cost, now],
    );
    await addLedger(db, {
      kind: 'purchase',
      coins: -reward.cost,
      refId: purchase.lastInsertRowId,
      note: reward.name,
    });
    if (reward.stock !== null) {
      await db.runAsync('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [reward.id]);
    }
    await db.runAsync(
      `INSERT INTO inventory (reward_id, name, icon, description, category, quantity, first_acquired_at, last_acquired_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(reward_id) DO UPDATE SET quantity = quantity + 1, name = excluded.name,
         icon = excluded.icon, description = excluded.description, category = excluded.category,
         last_acquired_at = excluded.last_acquired_at`,
      [reward.id, reward.name, reward.icon, reward.description, reward.category, now, now],
    );
    const item = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM inventory WHERE reward_id = ?',
      [reward.id],
    );
    return { ok: true, inventoryId: item?.id ?? 0, balance: coins - reward.cost };
  });
}
