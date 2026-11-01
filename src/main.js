import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

// GHOSTED V7.1 — Android SQLite mirror and recovery layer.
// The existing synchronous WebView storage remains the immediate write path.
// SQLite mirrors its values for native recovery; no XP calculations run here.
const DB = 'ghosted_profile';
const KEYS = [
  'ghosted:web-os:personal:history:v68',
  'ghosted:web-os:private:personal:v68:encrypted:v1',
  'ghosted:web-os:private:demo:v68:encrypted:v1',
];
let nativeReady = false;
let pending = Promise.resolve();
const status = { platform: Capacitor.getPlatform(), state: 'browser-local', lastError: null, writes: 0 };

function saveNative(key, value) {
  if (!nativeReady || typeof value !== 'string' || !KEYS.includes(key)) return;
  // Writes are serialized to retain the latest order. Never change rewards here.
  pending = pending.catch(() => {}).then(async () => {
    await CapacitorSQLite.run({
      database: DB,
      statement: 'INSERT INTO snapshots (storage_key, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(storage_key) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at',
      values: [key, value, new Date().toISOString()],
      transaction: true,
    });
    status.writes++;
  }).catch(error => {
    status.state = 'sqlite-write-error';
    status.lastError = String(error);
    console.error('[GHOSTED SQLite] Mirror write failed', error);
  });
}

window.GHOSTED_NATIVE_DB = {
  mirror: saveNative,
  status: () => ({ ...status }),
  flush: () => pending,
};

async function prepareNativeStorage() {
  if (!Capacitor.isNativePlatform()) return;
  status.state = 'opening';
  try {
    await CapacitorSQLite.createConnection({
      database: DB, encrypted: false, mode: 'no-encryption', version: 1, readonly: false,
    });
    await CapacitorSQLite.open({ database: DB, readonly: false });
    await CapacitorSQLite.execute({
      database: DB,
      statements: 'CREATE TABLE IF NOT EXISTS snapshots (storage_key TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);',
      transaction: true,
    });
    nativeReady = true;
    // Safest first migration rule: never overwrite the user's existing WebView data.
    // Restore from SQLite only when a supported storage key is entirely missing.
    for (const key of KEYS) {
      const rows = await CapacitorSQLite.query({
        database: DB,
        statement: 'SELECT payload FROM snapshots WHERE storage_key = ? LIMIT 1',
        values: [key],
      });
      const snapshot = rows.values?.[0]?.payload;
      let local = null;
      try { local = window.localStorage.getItem(key); }
      catch (error) { console.warn('[GHOSTED SQLite] Browser storage blocked:', error); }
      if (local !== null) {
        if (local !== snapshot) saveNative(key, local);
      } else if (typeof snapshot === 'string') {
        try { window.localStorage.setItem(key, snapshot); }
        catch (error) { console.warn('[GHOSTED SQLite] Could not restore WebView storage:', error); }
      }
    }
    nativeReady = true;
    status.state = 'sqlite-ready';
  } catch (error) {
    nativeReady = false;
    status.state = 'sqlite-init-error';
    status.lastError = String(error);
    console.error('[GHOSTED SQLite] Falling back to existing WebView storage:', error);
  }
}

function injectClassic(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.body.append(script);
  });
}

// Read native data BEFORE any of the existing synchronous GHOSTED scripts run.
// Async function avoids top-level await so Vite's default ES2020 target can build.
async function startGhosted() {
  await prepareNativeStorage();
  for (let i = 1; i <= 5; i++) {
    await injectClassic(`/js/ghosted-0${i}.js`);
  }
}

startGhosted().catch(error => {
  console.error('[GHOSTED] Startup failed:', error);
  status.state = 'startup-error';
  status.lastError = String(error);
});
