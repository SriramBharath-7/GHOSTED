import { type Db, transaction } from '@/db/db';

type OrderedTable = 'habits' | 'rewards' | 'goals';

/** Persists a user-chosen order: `ids[i]` gets sort_order i. */
export function saveOrder(db: Db, table: OrderedTable, ids: number[]): Promise<void> {
  return transaction(db, async () => {
    for (const [index, id] of ids.entries()) {
      await db.runAsync(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [index, id]);
    }
  });
}

/** Returns `ids` with the item at `index` moved one step in `direction`. */
export function moved(ids: number[], index: number, direction: -1 | 1): number[] {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
