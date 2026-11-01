import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

// GHOSTED V7.1 â€” Android SQLite mirror and recovery layer.
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

// Diagnostic probe uses an isolated table; never reads or modifies profile or Vault records.
async function nativeSelfTest() {
  if (!nativeReady || status.state !== 'sqlite-ready') {
    return { ok: false, reason: 'Native SQLite is not ready', ...status };
  }
  const marker = `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    await pending;
    await CapacitorSQLite.execute({
      database: DB,
      statements: 'CREATE TABLE IF NOT EXISTS diagnostic_probe (probe_key TEXT PRIMARY KEY NOT NULL, test_value TEXT NOT NULL);',
      transaction: true,
    });
    await CapacitorSQLite.run({
      database: DB,
      statement: 'INSERT INTO diagnostic_probe (probe_key, test_value) VALUES (?, ?)',
      values: [marker, marker], transaction: true,
    });
    const result = await CapacitorSQLite.query({
      database: DB,
      statement: 'SELECT test_value FROM diagnostic_probe WHERE probe_key = ? LIMIT 1',
      values: [marker],
    });
    const ok = result.values?.[0]?.test_value === marker;
    await CapacitorSQLite.run({
      database: DB,
      statement: 'DELETE FROM diagnostic_probe WHERE probe_key = ?',
      values: [marker], transaction: true,
    });
    return { ok, result: ok ? 'WRITE / READ / DELETE VERIFIED' : 'READBACK MISMATCH', ...status };
  } catch (error) {
    return { ok: false, result: 'PROBE FAILED', error: String(error), ...status };
  }
}

window.GHOSTED_NATIVE_DB = {
  mirror: saveNative,
  status: () => ({ ...status }),
  flush: () => pending,
  selfTest: nativeSelfTest,
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
  await bootstrapCloudProfile();
  for (let i = 1; i <= 5; i++) {
    await injectClassic(`/js/ghosted-0${i}.js`);
  }
}

let ghostedStartup;

// GHOSTED V7.4: explicit, opt-in cloud snapshot testing. No background sync.
const CLOUD_STORAGE_KEY = 'ghosted:web-os:personal:history:v68';
const CLOUD_REVISION_KEY = 'ghosted:cloud:ack-revision:v1';
const CLOUD_OWNER_ID = '9c63d03e-cafd-41bb-b753-72b05daa0710';
const CLOUD_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
let cloudSession = null;
const cloudState = { configured: !!(CLOUD_URL && CLOUD_KEY), signedIn: false, lastError: null };

async function cloudRequest(path, { method = 'GET', body, token, extraHeaders = {} } = {}) {
  if (!cloudState.configured) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY first');
  const response = await fetch(`${CLOUD_URL}${path}`, {
    method,
    headers: {
      apikey: CLOUD_KEY,
      Authorization: `Bearer ${token || CLOUD_KEY}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.message || value?.msg || value?.error_description || value?.error || `HTTP ${response.status}`);
  return value;
}

async function cloudSignIn() {
  const email = window.prompt('GHOSTED private operator email');
  if (!email) return { ok: false, reason: 'Cancelled' };
  const password = window.prompt('GHOSTED Supabase password (not stored by GHOSTED)');
  if (!password) return { ok: false, reason: 'Cancelled' };
  try {
    const auth = await cloudRequest('/auth/v1/token?grant_type=password', {
      method: 'POST', body: { email, password },
    });
    if (!auth.access_token || !auth.user?.id) throw new Error('No authenticated session');
    cloudSession = { accessToken: auth.access_token, refreshToken: auth.refresh_token, userId: auth.user.id, expiresAt: Date.now() + auth.expires_in * 1000 };
    cloudState.signedIn = true;
    cloudState.lastError = null;
    persistCloudSession();
    return { ok: true, userId: cloudSession.userId, note: 'Private-device session persists through restart; sign out on shared devices' };
  } catch (error) { cloudState.lastError = String(error); throw error; }
}

let refreshingCloudSession = null;
async function requireCloudSession() {
  if (!cloudSession || cloudSession.userId !== CLOUD_OWNER_ID) throw new Error('Cloud session missing or unexpected operator; sign in again');
  if (cloudSession.expiresAt > Date.now() + 60000) return cloudSession;
  if (!cloudSession.refreshToken) throw new Error('Cloud session expired; sign in again');
  if (!refreshingCloudSession) {
    refreshingCloudSession = (async () => {
      const old = cloudSession;
      const auth = await cloudRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: { refresh_token: old.refreshToken },
      });
      if (auth.user?.id !== CLOUD_OWNER_ID || !auth.access_token || !auth.refresh_token) {
        throw new Error('Cloud refresh returned unexpected operator or invalid session');
      }
      if (cloudSession !== old) throw new Error('Cloud session changed while refreshing');
      cloudSession = { accessToken: auth.access_token, refreshToken: auth.refresh_token,
        userId: auth.user.id, expiresAt: Date.now() + auth.expires_in * 1000 };
      persistCloudSession();
      return cloudSession;
    })().finally(() => { refreshingCloudSession = null; });
  }
  return refreshingCloudSession;
}

async function cloudInspect() {
  const session = await requireCloudSession();
  const filter = encodeURIComponent(CLOUD_STORAGE_KEY);
  const rows = await cloudRequest(`/rest/v1/ghosted_snapshots?storage_key=eq.${filter}&select=revision,updated_at,storage_key`, {
    token: session.accessToken,
  });
  const row = rows?.[0] || null;
  return { remoteExists: !!row, revision: row?.revision ?? null, updatedAt: row?.updated_at ?? null, localAcknowledgedRevision: window.localStorage.getItem(CLOUD_REVISION_KEY) };
}

function cloudLocalProfile() {
  const raw = window.localStorage.getItem(CLOUD_STORAGE_KEY);
  if (!raw) throw new Error('No local profile; upload blocked to prevent default-state replacement');
  const profile = JSON.parse(raw);
  if (!profile || typeof profile !== 'object' || Array.isArray(profile) || !profile.days || !Array.isArray(profile.purchased) || profile.isSample || profile.schemaVersion !== 4) {
    throw new Error('Local profile validation failed or is a demo; upload blocked');
  }
  return profile;
}

async function cloudUpload() {
  const session = await requireCloudSession();
  const profile = cloudLocalProfile();
  const remote = await cloudInspect();
  const acknowledged = window.localStorage.getItem(CLOUD_REVISION_KEY);
  if (remote.remoteExists && (!acknowledged || Number(acknowledged) !== remote.revision)) {
    throw new Error('Cloud already has another or newer snapshot. Upload blocked to prevent overwriting it');
  }
  if (!window.confirm(`Upload the local GHOSTED profile to private Supabase? Remote revision: ${remote.revision ?? 'empty'}. Vault remains local.`)) {
    return { ok: false, reason: 'Cancelled' };
  }
  const revision = await cloudRequest('/rest/v1/rpc/ghosted_put_snapshot', {
    method: 'POST', token: session.accessToken,
    body: {
      p_storage_key: CLOUD_STORAGE_KEY,
      p_payload: profile,
      p_expected_revision: remote.revision,
    },
  });
  if (!Number.isSafeInteger(Number(revision)) || Number(revision) < 1) throw new Error('Unexpected revision result');
  window.localStorage.setItem(CLOUD_REVISION_KEY, String(revision));
  window.localStorage.setItem(CLOUD_SYNC_HASH, stableProfile(profile));
  return { ok: true, uploadedRevision: Number(revision), note: 'Explicit upload finished; automatic sync is not enabled' };
}



// V7.5: opt-in readback and recovery; no background synchronization.
function validateCloudRecoveryProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.schemaVersion !== 4 || value.isSample === true
      || !value.days || typeof value.days !== 'object' || Array.isArray(value.days)
      || !Array.isArray(value.purchased)) {
    throw new Error('Cloud snapshot fails GHOSTED profile validation');
  }
  for (const [day, ids] of Object.entries(value.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(ids)
        || ids.some(id => !Number.isInteger(id) || id < 1 || id > 999)) {
      throw new Error('Cloud snapshot contains invalid day history');
    }
  }
  return value;
}

async function cloudReadSnapshot() {
  const session = await requireCloudSession();
  if (session.userId !== CLOUD_OWNER_ID) throw new Error('Unexpected operator account');
  const filter = encodeURIComponent(CLOUD_STORAGE_KEY);
  const rows = await cloudRequest(`/rest/v1/ghosted_snapshots?storage_key=eq.${filter}&select=revision,updated_at,payload`, {
    token: session.accessToken,
  });
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Expected exactly one private cloud snapshot');
  const row = rows[0];
  if (!Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 1) throw new Error('Invalid remote revision');
  validateCloudRecoveryProfile(row.payload);
  return row;
}

async function cloudPreviewRestore() {
  const remote = await cloudReadSnapshot();
  const localRaw = window.localStorage.getItem(CLOUD_STORAGE_KEY);
  let localDays = null;
  if (localRaw !== null) {
    try { localDays = Object.keys(JSON.parse(localRaw).days || {}).length; }
    catch { localDays = 'unreadable'; }
  }
  return {
    remoteRevision: Number(remote.revision),
    updatedAt: remote.updated_at,
    remoteSavedDays: Object.keys(remote.payload.days).length,
    localSavedDays: localDays,
    localProfileExists: localRaw !== null,
    willReplaceLocalProfile: true,
    vaultUntouched: true,
    automaticSync: false,
  };
}

function cloudDownloadLocalBackup(raw) {
  const exportData = JSON.stringify({
    format: 'GHOSTED_V7_5_PRE_RESTORE_LOCAL_COPY',
    storageKey: CLOUD_STORAGE_KEY,
    exportedAt: new Date().toISOString(),
    profile: raw === null ? null : JSON.parse(raw),
  });
  const blob = new Blob([exportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `GHOSTED_PRE_RESTORE_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.append(link);
  try { link.click(); }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
}

async function cloudRestore() {
  const preview = await cloudPreviewRestore();
  const originalRaw = window.localStorage.getItem(CLOUD_STORAGE_KEY);
  if (!window.confirm(`GHOSTED CLOUD RECOVERY\nRemote revision: ${preview.remoteRevision}\nRemote saved days: ${preview.remoteSavedDays}\nLocal saved days: ${preview.localSavedDays}\nThis replaces ONLY the local public profile. Vault stays local. Continue to backup step?`)) {
    return { ok: false, reason: 'Cancelled before backup' };
  }
  cloudDownloadLocalBackup(originalRaw);
  const response = window.prompt('Check your Downloads folder for the PRE_RESTORE backup. Once you have verified the file exists, type RESTORE to replace the local public profile.');
  if (response !== 'RESTORE') return { ok: false, reason: 'Backup confirmation not given; local data unchanged' };
  const fresh = await cloudReadSnapshot();
  if (Number(fresh.revision) !== preview.remoteRevision) throw new Error('Remote revision changed; restore cancelled');
  if (window.localStorage.getItem(CLOUD_STORAGE_KEY) !== originalRaw) throw new Error('Local data changed during restore; cancelled');
  const newRaw = JSON.stringify(fresh.payload);
  try {
    window.localStorage.setItem(CLOUD_STORAGE_KEY, newRaw);
    if (window.localStorage.getItem(CLOUD_STORAGE_KEY) !== newRaw) throw new Error('Local write readback mismatch');
    window.localStorage.setItem(CLOUD_REVISION_KEY, String(fresh.revision));
    window.localStorage.setItem(CLOUD_SYNC_HASH, stableProfile(fresh.payload));
    window.GHOSTED_NATIVE_DB?.mirror(CLOUD_STORAGE_KEY, newRaw);
  } catch (error) {
    if (originalRaw === null) window.localStorage.removeItem(CLOUD_STORAGE_KEY);
    else window.localStorage.setItem(CLOUD_STORAGE_KEY, originalRaw);
    throw error;
  }
  return {
    ok: true,
    restoredRevision: Number(fresh.revision),
    savedDays: Object.keys(fresh.payload.days).length,
    note: 'Local profile restored. RELOAD the page to load it into GHOSTED. Vault untouched; auto sync off.',
  };
}

// V7.6: guarded, opt-in polling sync of ONLY the public profile. Vault keys are never synced.
const CLOUD_SYNC_HASH = 'ghosted:cloud:ack-profile:v76';
const CLOUD_SYNC_RECOVERY = 'ghosted:cloud:auto-recovery:v76';
const CLOUD_SYNC_SESSION = 'ghosted:cloud:session:v76';
const CLOUD_SYNC_ARMED = 'ghosted:cloud:armed:v76';
const cloudSync = { enabled: false, busy: false, mode: 'off', lastCheck: null, lastError: null };
let cloudSyncTimer = null;

function stableProfile(value) {
  if (Array.isArray(value)) return `[${value.map(stableProfile).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableProfile(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

function stopCloudSync(reason = 'disabled') {
  cloudSync.enabled = false;
  cloudSync.mode = reason;
  if (cloudSyncTimer) clearInterval(cloudSyncTimer);
  cloudSyncTimer = null;
  try { localStorage.removeItem(CLOUD_SYNC_ARMED); } catch {}
  return { ...cloudSync };
}

async function syncCycle() {
  if (!cloudSync.enabled || cloudSync.busy || !navigator.onLine) return { skipped: true };
  cloudSync.busy = true;
  try {
    const session = await requireCloudSession();
    if (session.userId !== CLOUD_OWNER_ID) throw new Error('Unexpected operator account');
    const acknowledged = Number(localStorage.getItem(CLOUD_REVISION_KEY));
    const baseline = localStorage.getItem(CLOUD_SYNC_HASH);
    if (!baseline || !Number.isSafeInteger(acknowledged) || acknowledged < 1) throw new Error('No trusted sync baseline; use previewRestore / manual restore');
    const localRaw = localStorage.getItem(CLOUD_STORAGE_KEY);
    if (!localRaw) throw new Error('Missing local profile; sync stopped');
    const localProfile = validateCloudRecoveryProfile(JSON.parse(localRaw));
    const localHash = stableProfile(localProfile);
    const remote = await cloudReadSnapshot();
    const remoteRevision = Number(remote.revision);
    const remoteHash = stableProfile(remote.payload);
    const localDirty = localHash !== baseline;
    const remoteDirty = remoteRevision !== acknowledged;
    if (remoteDirty && localDirty) throw new Error('SYNC_CONFLICT: Both devices changed. No data overwritten. Export backup and resolve manually.');
    if (remoteDirty && !localDirty) {
      const snapshot = JSON.stringify({ format: 'GHOSTED_V76_AUTO_RECOVERY', createdAt: new Date().toISOString(), profile: localProfile, revision: acknowledged });
      localStorage.setItem(CLOUD_SYNC_RECOVERY, snapshot);
      if (localStorage.getItem(CLOUD_STORAGE_KEY) !== localRaw) throw new Error('Local profile changed during download');
      const replacement = JSON.stringify(remote.payload);
      localStorage.setItem(CLOUD_STORAGE_KEY, replacement);
      localStorage.setItem(CLOUD_REVISION_KEY, String(remoteRevision));
      localStorage.setItem(CLOUD_SYNC_HASH, remoteHash);
      window.GHOSTED_NATIVE_DB?.mirror(CLOUD_STORAGE_KEY, replacement);
      cloudSync.mode = 'remote-restored-reloading';
      cloudSync.enabled = false;
      window.location.reload();
      return { downloadedRevision: remoteRevision, reloading: true };
    }
    if (!remoteDirty && remoteHash !== baseline) throw new Error('Cloud baseline mismatch; sync stopped');
    if (localDirty) {
      const revision = Number(await cloudRequest('/rest/v1/rpc/ghosted_put_snapshot', {
        method: 'POST', token: session.accessToken,
        body: { p_storage_key: CLOUD_STORAGE_KEY, p_payload: localProfile, p_expected_revision: acknowledged },
      }));
      if (revision !== acknowledged + 1) throw new Error('Unexpected cloud revision; sync stopped');
      localStorage.setItem(CLOUD_REVISION_KEY, String(revision));
      localStorage.setItem(CLOUD_SYNC_HASH, localHash);
      cloudSync.mode = 'uploaded';
      return { uploadedRevision: revision };
    }
    cloudSync.mode = 'in-sync';
    return { inSync: true, revision: acknowledged };
  } catch (error) {
    const reason = String(error);
    cloudSync.lastError = reason;

    const temporary =
      !navigator.onLine ||
      error instanceof TypeError ||
      /failed to fetch|networkerror|network request failed|fetch failed|timeout|HTTP 429|HTTP 5\d\d/i.test(reason);

    if (temporary) {
      cloudSync.mode = 'waiting-for-connection';
      console.warn('[GHOSTED cloud sync] Will retry:', error);
      return { retrying: true, reason };
    }

    stopCloudSync('halted');
    console.error('[GHOSTED cloud sync] Halted safely:', error);
    return { halted: true, reason };
  } finally {
    cloudSync.busy = false;
    cloudSync.lastCheck = new Date().toISOString();
  }
}

async function enableCloudSync() {
  if (!cloudState.configured) throw new Error('Supabase not configured in this build');
  const session = await requireCloudSession();
  if (session.userId !== CLOUD_OWNER_ID) throw new Error('Unexpected operator account');
  const local = cloudLocalProfile();
  const remote = await cloudReadSnapshot();
  const localHash = stableProfile(local);
  const remoteHash = stableProfile(remote.payload);
  const acknowledged = Number(localStorage.getItem(CLOUD_REVISION_KEY));
  const baseline = localStorage.getItem(CLOUD_SYNC_HASH);
  if (baseline && baseline !== localHash) {
    if (Number(remote.revision) !== acknowledged) throw new Error('SYNC_CONFLICT: Both copies may have changed; no overwrite');
  } else if (!baseline && remoteHash !== localHash) {
    throw new Error('Initial cloud/local profiles differ. Use previewRestore and manual recovery first');
  }
  if (Number(remote.revision) !== acknowledged) {
    if (!baseline || baseline !== localHash) throw new Error('Cloud revision differs and local changes exist; resolve manually');
  } else if (!baseline) localStorage.setItem(CLOUD_SYNC_HASH, localHash);
  if (!window.confirm('Enable guarded cloud sync for this browser session? It will auto-upload local changes and auto-download remote changes only when the other copy is unchanged. Conflicts halt sync. Vault is excluded.')) return { ok: false, reason: 'Cancelled' };
  cloudSync.enabled = true;
  cloudSync.mode = 'running';
  cloudSync.lastError = null;
  try { localStorage.setItem(CLOUD_SYNC_ARMED, '1'); } catch {}
  if (cloudSyncTimer) clearInterval(cloudSyncTimer);
  cloudSyncTimer = setInterval(() => { void syncCycle(); }, 15000);
  const result = await syncCycle();
  return { ok: cloudSync.enabled, ...result, mode: cloudSync.mode };
}

// V7.8: the cloud session survives page reload / app restart. Refresh tokens are
// sensitive: this is private-device storage, not a security boundary against XSS.
function persistCloudSession() {
  try { localStorage.setItem(CLOUD_SYNC_SESSION, JSON.stringify(cloudSession)); } catch {}
}

function resumeCloudSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLOUD_SYNC_SESSION) || 'null');
    if (saved?.userId === CLOUD_OWNER_ID && saved.refreshToken && saved.accessToken) {
      cloudSession = saved;
      cloudState.signedIn = true;
    }
  } catch {}
}

// Import cloud data BEFORE the legacy habit scripts initialize their own state.
// Never overwrite existing local changes when provenance is uncertain.
async function bootstrapCloudProfile() {
  if (!cloudState.configured || !navigator.onLine) return;
  const localRaw = localStorage.getItem(CLOUD_STORAGE_KEY);
  if (!cloudSession) {
    // Sign in once per device; an offline/cancelled launch stays safely local.
    try { await cloudSignIn(); }
    catch (error) { console.warn('[GHOSTED cloud] Initial sign-in unavailable; staying local:', error); }
  }
  if (!cloudSession) return;
  try {
    await requireCloudSession();
    const remote = await cloudReadSnapshot();
    const remoteHash = stableProfile(remote.payload);
    const remoteRevision = Number(remote.revision);
    const currentRaw = localStorage.getItem(CLOUD_STORAGE_KEY);
    if (currentRaw === null) {
      const replacement = JSON.stringify(remote.payload);
      localStorage.setItem(CLOUD_STORAGE_KEY, replacement);
      localStorage.setItem(CLOUD_REVISION_KEY, String(remoteRevision));
      localStorage.setItem(CLOUD_SYNC_HASH, remoteHash);
      window.GHOSTED_NATIVE_DB?.mirror(CLOUD_STORAGE_KEY, replacement);
      cloudSync.mode = 'first-install-restored';
    } else {
      const localHash = stableProfile(validateCloudRecoveryProfile(JSON.parse(currentRaw)));
      const ack = Number(localStorage.getItem(CLOUD_REVISION_KEY));
      const baseline = localStorage.getItem(CLOUD_SYNC_HASH);
      if (!baseline && localHash === remoteHash) {
        localStorage.setItem(CLOUD_REVISION_KEY, String(remoteRevision));
        localStorage.setItem(CLOUD_SYNC_HASH, remoteHash);
      } else if (baseline && localHash === baseline && ack !== remoteRevision) {
        // Remote moved while this device was offline; no unsynced local edits.
        localStorage.setItem(CLOUD_SYNC_RECOVERY, JSON.stringify({
          format: 'GHOSTED_V78_PRE_CLOUD_RECOVERY', createdAt: new Date().toISOString(),
          profile: JSON.parse(currentRaw), revision: ack,
        }));
        const replacement = JSON.stringify(remote.payload);
        localStorage.setItem(CLOUD_STORAGE_KEY, replacement);
        localStorage.setItem(CLOUD_REVISION_KEY, String(remoteRevision));
        localStorage.setItem(CLOUD_SYNC_HASH, remoteHash);
        window.GHOSTED_NATIVE_DB?.mirror(CLOUD_STORAGE_KEY, replacement);
      } else if (!baseline && localHash !== remoteHash) {
        // A newly installed APK can contain seeded history but no cloud revision.
        // Never silently upload that seed or overwrite unpublished local work.
        const approved = window.confirm(
          'GHOSTED has local progress but has not linked it to the cloud yet. ' +
          'Use your verified Supabase profile on this device? A copy of the current ' +
          'local profile will be retained for recovery. Cancel keeps local data unchanged.'
        );
        if (!approved) {
          cloudSync.mode = 'needs-manual-reconciliation';
        } else {
          const recovery = JSON.stringify({
            format: 'GHOSTED_V78_PRE_FIRST_LINK_RECOVERY',
            createdAt: new Date().toISOString(),
            profile: JSON.parse(currentRaw),
          });
          // Fail closed if the local backup cannot be saved or read back.
          localStorage.setItem(CLOUD_SYNC_RECOVERY, recovery);
          if (localStorage.getItem(CLOUD_SYNC_RECOVERY) !== recovery) {
            throw new Error('Cannot verify local recovery backup; cloud link cancelled');
          }
          if (localStorage.getItem(CLOUD_STORAGE_KEY) !== currentRaw) {
            throw new Error('Local profile changed during first cloud link; cancelled');
          }
          const replacement = JSON.stringify(remote.payload);
          localStorage.setItem(CLOUD_STORAGE_KEY, replacement);
          localStorage.setItem(CLOUD_REVISION_KEY, String(remoteRevision));
          localStorage.setItem(CLOUD_SYNC_HASH, remoteHash);
          window.GHOSTED_NATIVE_DB?.mirror(CLOUD_STORAGE_KEY, replacement);
          cloudSync.mode = 'first-link-cloud-restored';
        }
      }
    }
    if (localStorage.getItem(CLOUD_SYNC_HASH) && cloudSync.mode !== 'needs-manual-reconciliation') {
      localStorage.setItem(CLOUD_SYNC_ARMED, '1');
      cloudSync.enabled = true;
      cloudSync.mode = 'running';
      if (cloudSyncTimer) clearInterval(cloudSyncTimer);
      cloudSyncTimer = setInterval(() => { void syncCycle(); }, 15000);
      void syncCycle();
    }
  } catch (error) {
    cloudSync.lastError = String(error);
    cloudSync.mode = 'cloud-unavailable-local-preserved';
    console.warn('[GHOSTED cloud] Local profile preserved:', error);
  }
}

window.addEventListener('online', () => {
  if (cloudSync.enabled) void syncCycle();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && cloudSync.enabled) void syncCycle();
});

window.addEventListener('focus', () => {
  if (cloudSync.enabled) void syncCycle();
});

resumeCloudSession();
ghostedStartup = startGhosted().catch(error => {
  console.error('[GHOSTED] Startup failed:', error);
  status.state = 'startup-error';
  status.lastError = String(error);
});

window.GHOSTED_CLOUD = Object.freeze({
  enableSync: enableCloudSync,
  disableSync: stopCloudSync,
  syncNow: syncCycle,
  syncStatus: () => ({ ...cloudSync }),
  previewRestore: cloudPreviewRestore,
  restore: cloudRestore,
  status: () => ({ ...cloudState, sessionActive: !!cloudSession && cloudSession.expiresAt > Date.now() + 30000, automaticSync: cloudSync.enabled }),
  signIn: async () => {
    const result = await cloudSignIn();
    if (!result.ok) return result;
    const before = localStorage.getItem(CLOUD_STORAGE_KEY);
    await bootstrapCloudProfile();
    // Refresh the in-memory habit engine only when cloud recovery changed its state.
    // No reload is needed if this is the pre-script startup sign-in.
    if (before !== localStorage.getItem(CLOUD_STORAGE_KEY)) {
      await ghostedStartup;
      window.location.reload();
    }
    return { ...result, sync: cloudSync.mode };
  },
  inspect: cloudInspect,
  upload: cloudUpload,
  logout: () => { stopCloudSync(); cloudSession = null; cloudState.signedIn = false; try { localStorage.removeItem(CLOUD_SYNC_SESSION); } catch {} return { ok: true }; },
});
