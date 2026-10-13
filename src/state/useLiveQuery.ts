import { useEffect, useState } from 'react';
import type { Db } from '@/db/db';
import { getDb } from '@/db/database';
import { useGame } from './game';

/**
 * Runs `query` and re-runs it after every committed write.
 * Pass a stable function (module-level or useCallback).
 */
export function useLiveQuery<T>(query: (db: Db) => Promise<T>): T | undefined {
  const version = useGame((s) => s.version);
  const [data, setData] = useState<T>();
  useEffect(() => {
    let alive = true;
    query(getDb()).then(
      (result) => alive && setData(result),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [query, version]);
  return data;
}
