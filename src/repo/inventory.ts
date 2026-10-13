import { type Db, nowIso, transaction } from '@/db/db';

export interface InventoryItem {
  id: number;
  rewardId: number | null;
  name: string;
  icon: string;
  description: string;
  category: string;
  quantity: number;
  firstAcquiredAt: string;
  lastAcquiredAt: string;
}

export interface Redemption {
  id: number;
  name: string;
  icon: string;
  redeemedAt: string;
}

export type RedeemResult = { ok: true; remaining: number } | { ok: false; reason: 'empty' | 'missing' };

export function listInventory(db: Db): Promise<InventoryItem[]> {
  return db.getAllAsync<InventoryItem>(
    `SELECT id, reward_id AS rewardId, name, icon, description, category, quantity,
       first_acquired_at AS firstAcquiredAt, last_acquired_at AS lastAcquiredAt
     FROM inventory WHERE quantity > 0 ORDER BY last_acquired_at DESC, id DESC`,
    [],
  );
}

export function listRedemptions(db: Db, limit = 20): Promise<Redemption[]> {
  return db.getAllAsync<Redemption>(
    'SELECT id, name, icon, redeemed_at AS redeemedAt FROM redemptions ORDER BY redeemed_at DESC, id DESC LIMIT ?',
    [limit],
  );
}

/** Consumes one copy and records it. */
export function redeemItem(db: Db, inventoryId: number): Promise<RedeemResult> {
  return transaction(db, async (): Promise<RedeemResult> => {
    const item = await db.getFirstAsync<{ quantity: number; name: string; icon: string }>(
      'SELECT quantity, name, icon FROM inventory WHERE id = ?',
      [inventoryId],
    );
    if (!item) return { ok: false, reason: 'missing' };
    if (item.quantity <= 0) return { ok: false, reason: 'empty' };
    await db.runAsync('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?', [inventoryId]);
    await db.runAsync(
      'INSERT INTO redemptions (inventory_id, name, icon, redeemed_at) VALUES (?, ?, ?, ?)',
      [inventoryId, item.name, item.icon, nowIso()],
    );
    return { ok: true, remaining: item.quantity - 1 };
  });
}
