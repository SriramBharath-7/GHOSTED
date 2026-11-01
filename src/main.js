import { Capacitor } from '@capacitor/core';
import { openFlawlessPanel } from './flawless-ui.js';
import { PublicJournal } from './flawless-journal.js';
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
  try { publicJournal.repair(localStorage.getItem('ghosted:web-os:personal:history:v68')); }
  catch(error) { console.warn('[GHOSTED] Public operation journal needs review:',error); }
  await bootstrapCloudProfile();
  for (let i = 1; i <= 5; i++) {
    await injectClassic(`/js/ghosted-0${i}.js`);
  }
  if(cloudSync?.enabled)setTimeout(()=>{void syncCycle();},300);
}

let ghostedStartup;

// GHOSTED V7.4: explicit, opt-in cloud snapshot testing. No background sync.
const CLOUD_STORAGE_KEY = 'ghosted:web-os:personal:history:v68';
const CLOUD_REVISION_KEY = 'ghosted:cloud:ack-revision:v1';
const CLOUD_OWNER_ID = '9c63d03e-cafd-41bb-b753-72b05daa0710';
const CLOUD_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
// Enable only AFTER the reviewed Supabase SQL migration has been applied.
const CLOUD_V8_RECEIPTS = import.meta.env.VITE_GHOSTED_V8_RPC_ENABLED === 'true';
const CLOUD_V8_INTENT = 'ghosted:cloud:upload-intent:v8';
let cloudSession = null;
const activeCloudRequests = new Set();
const publicJournal = new PublicJournal(window.localStorage);
window.GHOSTED_SYNC_APPLYING = false;
window.GHOSTED_SYNC_PREPARE_PUBLIC_WRITE = (before,after) => window.GHOSTED_SYNC_APPLYING?null:publicJournal.prepare(before,after);
window.GHOSTED_SYNC_COMMIT_PUBLIC_WRITE = id => publicJournal.commit(id);
window.GHOSTED_SYNC_JOURNAL_STATUS = () => publicJournal.status();
window.GHOSTED_SYNC_ACK_LOCAL = profile => {
  try { publicJournal.acknowledge(profile,localStorage.getItem('ghosted:web-os:personal:history:v68')); }
  catch(error){console.warn('[GHOSTED] Local operation journal acknowledgement needs review:',error);}
};
window.GHOSTED_SYNC_NOTIFY_PUBLIC_WRITE = () => {
  if(cloudSync?.enabled&&navigator.onLine)setTimeout(()=>{void syncCycle();},400);
};
const cloudState = { configured: !!(CLOUD_URL && CLOUD_KEY), signedIn: false, lastError: null };


function v8WriteIntent(payload) {
 const expected=payload.p_expected_revision??null;
 const hash=stableProfile(payload.p_payload);
 const existing=JSON.parse(localStorage.getItem(CLOUD_V8_INTENT)||'null');
 if(existing?.hash===hash&&existing.expected===expected&&existing.storageKey===CLOUD_STORAGE_KEY)
  return existing.id;
 const id=crypto.randomUUID();
 const localAtWrite=localStorage.getItem(CLOUD_STORAGE_KEY);
 if(!localAtWrite)throw Error('No local public profile for upload intent');
 const localHash=stableProfile(validateCloudRecoveryProfile(JSON.parse(localAtWrite)));
 const intent={id,expected,hash,localHash,storageKey:CLOUD_STORAGE_KEY,createdAt:new Date().toISOString()};
 const serialized=JSON.stringify(intent);
 localStorage.setItem(CLOUD_V8_INTENT,serialized);
 if(localStorage.getItem(CLOUD_V8_INTENT)!==serialized)
  throw Error('Upload operation ID not durable; cloud write blocked');
 return id;
}
function v8AcknowledgeIntent(profile,revision){
 if(!CLOUD_V8_RECEIPTS)return;
 try{
  const saved=JSON.parse(localStorage.getItem(CLOUD_V8_INTENT)||'null');
  if(saved&&saved.hash===stableProfile(profile)&&Number(revision)>Number(saved.expected??0))
   localStorage.removeItem(CLOUD_V8_INTENT);
 }catch(error){console.warn('[GHOSTED] Retained unverified upload intent',error);}
}

async function cloudRequest(path, { method = 'GET', body, token, extraHeaders = {} } = {}) {
  if(CLOUD_V8_RECEIPTS && path==='/rest/v1/rpc/ghosted_put_snapshot') {
    // Identity survives retries and app restarts; the receipt and snapshot
    // commit atomically in the optional V8 Supabase RPC.
    const id=v8WriteIntent(body);
    body={...body,p_operation_id:id};
    path='/rest/v1/rpc/ghosted_put_snapshot_v8';
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  activeCloudRequests.add(controller);
  try {
  if (!cloudState.configured) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY first');
  const response = await fetch(`${CLOUD_URL}${path}`, {
    signal: controller.signal,
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
  } finally { clearTimeout(timeout); activeCloudRequests.delete(controller); }
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
  if(localStorage.getItem(CLOUD_SYNC_CONFLICT))throw Error('Protected sync conflict; use Settings → Sync Control Center before any upload');
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
  cloudRemember(profile, Number(revision));
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
    cloudRemember(fresh.payload, Number(fresh.revision));
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
const CLOUD_SYNC_BASELINE = 'ghosted:cloud:baseline:v79';
const CLOUD_SYNC_CONFLICT = 'ghosted:cloud:conflict:v79';
const cloudSync = { enabled: false, busy: false, mode: 'off', lastCheck: null, lastError: null, failures: 0, lastSuccess: null, nextRetryAt: 0 };
let cloudSyncTimer = null;

function stableProfile(value) {
  if (Array.isArray(value)) return `[${value.map(stableProfile).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableProfile(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}


function cloudEqual(a,b){return stableProfile(a)===stableProfile(b);}
function cloudCopy(v){return v===undefined?undefined:JSON.parse(JSON.stringify(v));}
function cloudPlain(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function cloudBase(){
 const hash=localStorage.getItem(CLOUD_SYNC_HASH);
 for(const raw of [localStorage.getItem(CLOUD_SYNC_BASELINE),null]){
  try{
   const profile=raw?JSON.parse(raw):JSON.parse(localStorage.getItem(CLOUD_SYNC_RECOVERY)||'null')?.profile;
   const candidate=validateCloudRecoveryProfile(profile);
   if(stableProfile(candidate)===hash)return candidate;
  }catch{}
 }
 return null;
}
function cloudRemember(profile,revision){
 const raw=JSON.stringify(validateCloudRecoveryProfile(profile));
 localStorage.setItem(CLOUD_SYNC_BASELINE,raw);
 if(localStorage.getItem(CLOUD_SYNC_BASELINE)!==raw)throw Error('Baseline was not saved');
 localStorage.setItem(CLOUD_REVISION_KEY,String(revision));
 localStorage.setItem(CLOUD_SYNC_HASH,stableProfile(profile));
 cloudSync.lastSuccess=new Date().toISOString();cloudSync.failures=0;cloudSync.nextRetryAt=0;
 document.getElementById('ghosted-sync-attention')?.remove();
 window.GHOSTED_SYNC_ACK_LOCAL?.(profile);
 v8AcknowledgeIntent(profile,revision);
}
function cloudMerge(base,local,remote){
 const conflicts=[];
 const walk=(a,b,c,path)=>{
  if(cloudEqual(b,c))return cloudCopy(b);
  if(cloudEqual(b,a))return cloudCopy(c);
  if(cloudEqual(c,a))return cloudCopy(b);
  if(!cloudPlain(b)||!cloudPlain(c)||(!cloudPlain(a)&&a!==undefined)){
   conflicts.push(path.join('.'));return cloudCopy(b);
  }
  const out={};
  for(const k of new Set([...Object.keys(a||{}),...Object.keys(b),...Object.keys(c)])){
   const v=walk(a?.[k],b[k],c[k],[...path,k]);
   if(v!==undefined)out[k]=v;
  }
  return out;
 };
 const result=walk(base,local,remote,[]);
 const changed=(p,k)=>!cloudEqual(base[k],p[k]);
 const dates=(p,k)=>Object.keys(p[k]||{}).filter(d=>!cloudEqual(base[k]?.[d],p[k][d]));
 const localLedger=dates(local,'rewardLedger'),remoteLedger=dates(remote,'rewardLedger');
 const ld=new Set([...dates(local,'days'),...localLedger]);
 for(const d of [...dates(remote,'days'),...remoteLedger]) {
  if(ld.has(d) && (!cloudEqual(local.days?.[d],remote.days?.[d]) || !cloudEqual(local.rewardLedger?.[d],remote.rewardLedger?.[d])))
   conflicts.push('daily-record:'+d);
 }
 // Independent completion additions on the same date can be merged only if
 // both reward ledger deltas are exactly explained by disjoint award entries.
 // Never infer an undo, changed reward, or Perfect Day bonus.
 for(const day of new Set([...dates(local,'days'),...dates(remote,'days')])){
  if(!dates(local,'days').includes(day)||!dates(remote,'days').includes(day))continue;
  const bday=base.days?.[day]||[], lday=local.days?.[day], rday=remote.days?.[day];
  if(!Array.isArray(bday)||!Array.isArray(lday)||!Array.isArray(rday))continue;
  if([bday,lday,rday].some(a=>a.length!==new Set(a).size))continue;
  const common=new Set(bday);
  if(bday.some(id=>!lday.includes(id)||!rday.includes(id)))continue;
  const left=lday.filter(id=>!common.has(id)),right=rday.filter(id=>!common.has(id));
  if(!left.length||!right.length||left.some(id=>right.includes(id)))continue;
  if(!cloudEqual(local.mildDays?.[day],base.mildDays?.[day])||!cloudEqual(remote.mildDays?.[day],base.mildDays?.[day]))continue;
  const br=base.rewardLedger?.[day]||{xp:0,coins:0,bonus:false,awards:{}};
  const lr=local.rewardLedger?.[day],rr=remote.rewardLedger?.[day];
  if(!lr||!rr)continue;
  // A frozen Perfect Day can be carried across independent completions,
  // provided both sides agree on its exact credited scope. Never double-pay.
  if(br.bonus&&(!lr.bonus||!rr.bonus))continue; // Undo/bonus reversal needs review.
  const bonusScope=row=>Array.isArray(row.bonusScope)&&row.bonusScope.length
   ?[...row.bonusScope].sort((a,b)=>a-b):null;
  const paidScopes=[br,lr,rr].filter(row=>row.bonus).map(bonusScope);
  if(paidScopes.some(scope=>scope===null))continue;
  if(paidScopes.some(scope=>!cloudEqual(scope,paidScopes[0])))continue;
  const bonus=!!(br.bonus||lr.bonus||rr.bonus);
  const chosenScope=paidScopes[0]||null;
  const extras=({xp,coins,awards,bonus,bonusScope,...other})=>other;
  if(!cloudEqual(extras(br),extras(lr))||!cloudEqual(extras(br),extras(rr)))continue;
  const additions=(row,ids)=>{
   if(!row.awards||!cloudPlain(row.awards)||!Number.isSafeInteger(row.xp)||!Number.isSafeInteger(row.coins))return null;
   for(const [key,value] of Object.entries(br.awards||{}))if(!cloudEqual(row.awards[key],value))return null;
   const added={};let xp=0,coins=0;
   for(const [key,value] of Object.entries(row.awards)){
    if(Object.hasOwn(br.awards||{},key))continue;
    if(!ids.some(id=>String(id)===key)||!value||!Number.isSafeInteger(value.xp)||value.xp<0||!Number.isSafeInteger(value.coins)||value.coins<0)return null;
    added[key]=value;xp+=value.xp;coins+=value.coins;
   }
   const freshBonus=!!row.bonus&&!br.bonus;
   if(!Number.isSafeInteger(xp)||!Number.isSafeInteger(coins)||
     row.xp-br.xp!==xp+(freshBonus?50:0)||
     row.coins-br.coins!==coins+(freshBonus?20:0))return null;
   return {added,xp,coins};
  };
  const la=additions(lr,left),ra=additions(rr,right);
  if(!la||!ra)continue;
  const xp=br.xp+la.xp+ra.xp+(bonus&&!br.bonus?50:0);
  const coins=br.coins+la.coins+ra.coins+(bonus&&!br.bonus?20:0);
  if(!Number.isSafeInteger(xp)||!Number.isSafeInteger(coins))continue;
  result.days=result.days||{};
  result.days[day]=[...new Set([...bday,...left,...right])].sort((a,b)=>a-b);
  result.rewardLedger=result.rewardLedger||{};
  result.rewardLedger[day]={...br,xp,coins,bonus,awards:{...(br.awards||{}),...la.added,...ra.added}};
  if(chosenScope)result.rewardLedger[day].bonusScope=chosenScope;
  for(let j=conflicts.length-1;j>=0;j--){
   if(conflicts[j]==='days.'+day||conflicts[j].startsWith('rewardLedger.'+day+'.')||conflicts[j]==='rewardLedger.'+day||conflicts[j]==='daily-record:'+day)conflicts.splice(j,1);
  }
 }
 const rewards=['days','rewardLedger','mildDays'];
 const policy=['protocolEdits','scheduleHistory','customProtocols'];
 const spending=['purchased','purchaseRecords','redemptions','customMarketItems','legacyMarketItems'];
 const any=(p,keys)=>keys.some(k=>changed(p,k));
 if((any(local,rewards)&&any(remote,policy))||(any(remote,rewards)&&any(local,policy)))conflicts.push('rewards-vs-protocol-policy');
 if((any(local,rewards)&&any(remote,spending))||(any(remote,rewards)&&any(local,spending)))conflicts.push('rewards-vs-spending');
 // Purchases are non-idempotent without shared operation IDs. Even identical
 // looking purchase records may represent two real transactions.
 if(any(local,spending)&&any(remote,spending))conflicts.push('concurrent-spending-needs-operator');
 if(changed(local,'historicalCareerSeed')||changed(remote,'historicalCareerSeed'))conflicts.push('historical-career-seed');
 try{validateCloudRecoveryProfile(result);}catch{conflicts.push('invalid-merged-profile');}
 return {ok:conflicts.length===0,profile:result,conflicts:[...new Set(conflicts)]};
}
function saveCloudConflict(local,remote,revision,details){
 if(!localStorage.getItem(CLOUD_SYNC_CONFLICT)){
  const raw=JSON.stringify({format:'GHOSTED_V79_CONFLICT',createdAt:new Date().toISOString(),revision,local,remote,details});
  localStorage.setItem(CLOUD_SYNC_CONFLICT,raw);
  if(localStorage.getItem(CLOUD_SYNC_CONFLICT)!==raw)throw Error('Conflict copies could not be preserved');
 }
 cloudSync.mode='conflict-protected';
 cloudSync.failures=0;
 cloudSync.lastError='Conflict protected: '+details.join(', ');
 cloudSync.enabled=false;
 if(cloudSyncTimer)clearInterval(cloudSyncTimer);
 cloudSyncTimer=null;
 cloudConflictBanner();
}
function updateCloudView(profile,original){
 if(localStorage.getItem(CLOUD_STORAGE_KEY)!==original)return false;
 if(!window.GHOSTED_CAN_APPLY_CLOUD_PROFILE?.()||!window.GHOSTED_APPLY_CLOUD_PROFILE)return false;
 const raw=JSON.stringify(validateCloudRecoveryProfile(profile));
 if(!window.GHOSTED_APPLY_CLOUD_PROFILE(raw))return false;
 if(!cloudEqual(JSON.parse(localStorage.getItem(CLOUD_STORAGE_KEY)),profile))throw Error('Cloud view did not accept profile');
 return true;
}
function cloudNotice(message){
 const el=document.getElementById('toast');if(!el)return;
 el.textContent=message;el.classList.add('show');
 clearTimeout(window.__ghostedCloudNotice);
 window.__ghostedCloudNotice=setTimeout(()=>el.classList.remove('show'),2300);
}
function cloudConflictStatus(){
 const raw=localStorage.getItem(CLOUD_SYNC_CONFLICT);
 if(!raw)return {active:cloudSync.mode==='conflict-protected',saved:false,mode:cloudSync.mode,lastError:cloudSync.lastError};
 try{
  const c=JSON.parse(raw);
  return {active:cloudSync.mode==='conflict-protected',saved:true,createdAt:c.createdAt,remoteRevision:c.revision,details:c.details,
   localSavedDays:Object.keys(c.local?.days||{}).length,
   remoteSavedDays:Object.keys(c.remote?.days||{}).length,
   mode:cloudSync.mode,lastError:cloudSync.lastError};
 }catch{return {active:cloudSync.mode==='conflict-protected',saved:true,corrupt:true,mode:cloudSync.mode};}
}
function exportCloudConflict(){
 const raw=localStorage.getItem(CLOUD_SYNC_CONFLICT);
 if(!raw)throw Error('No preserved conflict to export');
 const bundle=JSON.stringify({format:'GHOSTED_V79_CONFLICT_EXPORT',exportedAt:new Date().toISOString(),originalConflict:JSON.parse(raw),currentLocal:JSON.parse(localStorage.getItem(CLOUD_STORAGE_KEY)||'null')});
 const blob=new Blob([bundle],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;
 link.download='GHOSTED_DUAL_SYNC_RECOVERY_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 document.body.append(link);
 try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 return {requested:true,note:'Check that the file downloaded. Both copies remain stored locally.'};
}
function cloudConflictBanner(){
 if(!document.body||document.getElementById('ghosted-cloud-conflict'))return;
 const box=document.createElement('div');box.id='ghosted-cloud-conflict';
 box.setAttribute('role','alert');
 box.style.cssText='position:fixed;z-index:10095;top:8px;right:8px;max-width:min(310px,calc(100vw - 16px));background:#07150f;color:#e8bd6e;border:1px solid #a77a35;border-radius:6px;padding:9px 10px;font:11px/1.5 monospace;box-shadow:0 3px 16px #000b;';
 const title=document.createElement('div');title.textContent='SYNC PAUSED // ACTION REQUIRED';
 const desc=document.createElement('div');desc.textContent='Android and website differ. Your data is preserved. SAVE BOTH creates a backup; it does not synchronize.';
 desc.style.cssText='opacity:.9;margin:3px 0 8px;';
 const resolve=document.createElement('button');resolve.type='button';resolve.textContent='[ REVIEW & RESOLVE ]';
 resolve.style.cssText='color:#92f7bd;background:#092318;border:1px solid #296a4a;border-radius:4px;padding:5px 8px;font:inherit;';
 resolve.addEventListener('click',()=>{flawlessPanel();});
 const save=document.createElement('button');save.type='button';save.textContent='[ EXPORT ]';
 save.style.cssText='background:transparent;color:#8ef1bc;border:0;margin-left:5px;font:inherit;';
 save.addEventListener('click',()=>{try{exportCloudConflict();cloudNotice('BACKUP REQUESTED // VERIFY DOWNLOAD; CONFLICT STILL PAUSED');}catch(error){cloudNotice('EXPORT FAILED // '+String(error).slice(0,90));}});
 const hide=document.createElement('button');hide.type='button';hide.textContent='[ HIDE ]';
 hide.style.cssText='background:transparent;color:#e8bd6e;border:0;margin-left:5px;font:inherit;';
 hide.addEventListener('click',()=>box.remove());
 box.append(title,desc,resolve,save,hide);document.body.append(box);
}
async function resumeCloudSyncSafely(){
 if(localStorage.getItem(CLOUD_SYNC_CONFLICT)){
  cloudSync.enabled=false;cloudSync.mode='conflict-protected';
  cloudConflictBanner();
  return {conflict:true,needsDecision:true,reason:'Protected conflict needs review; export both copies, then choose in Sync Control Center'};
 }
 if(cloudSync.busy)return {busy:true};
 if(!cloudState.configured)throw Error('Cloud not configured');
 if(navigator.onLine)await requireCloudSession();
 cloudSync.enabled=true;cloudSync.mode=navigator.onLine?'checking-conflict':'offline-queued';cloudSync.lastError=null;cloudSync.nextRetryAt=0;
 if(cloudSyncTimer)clearInterval(cloudSyncTimer);
 cloudSyncTimer=setInterval(()=>{void syncCycle();},15000);
 localStorage.setItem(CLOUD_SYNC_ARMED,'1');
 return syncCycle();
}


function cloudNeedsAttentionBanner(){
 if(!document.body||document.getElementById('ghosted-sync-attention'))return;
 const box=document.createElement('div');box.id='ghosted-sync-attention';
 box.setAttribute('role','status');
 box.style.cssText='position:fixed;z-index:10095;top:8px;right:8px;max-width:min(285px,calc(100vw - 16px));background:#07150f;color:#eac778;border:1px solid #9a7835;border-radius:6px;padding:8px 10px;font:11px/1.5 monospace;box-shadow:0 3px 16px #000b;';
 const title=document.createElement('div');title.textContent='SYNC NEEDS ATTENTION';
 const desc=document.createElement('div');desc.textContent='Your public progress remains local. Restart or diagnose sync in Settings.';
 const open=document.createElement('button');open.type='button';open.textContent='[ OPEN CONTROL ]';
 open.style.cssText='background:#10291c;color:#93f0b5;border:1px solid #37754e;margin-top:7px;padding:4px 6px;font:11px monospace;';
 open.addEventListener('click',()=>{box.remove();flawlessPanel();});
 const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='[ HIDE ]';
 dismiss.style.cssText='background:transparent;color:#eac778;border:0;margin-left:5px;font:11px monospace;';
 dismiss.addEventListener('click',()=>box.remove());
 box.append(title,desc,open,dismiss);document.body.append(box);
}


function cloudConflictPreview(){
 const raw=localStorage.getItem(CLOUD_SYNC_CONFLICT);
 if(!raw)return null;
 const saved=JSON.parse(raw);
 const android=validateCloudRecoveryProfile(JSON.parse(localStorage.getItem(CLOUD_STORAGE_KEY)||'null'));
 const website=validateCloudRecoveryProfile(saved.remote);
 const count=p=>Object.values(p.days||{}).reduce((n,ids)=>n+(Array.isArray(ids)?ids.length:0),0);
 const earned=(p,k)=>Object.values(p.rewardLedger||{}).reduce((n,row)=>n+(Number(row?.[k])||0),0)+(Number(p.historicalCareerSeed?.[k])||0);
 const list=p=>new Set(Object.entries(p.days||{}).flatMap(([day,ids])=>Array.isArray(ids)?ids.map(id=>day+' // PROTOCOL '+id):[]));
 const a=list(android),b=list(website);
 const onlyA=[...a].filter(v=>!b.has(v)),onlyB=[...b].filter(v=>!a.has(v));
 const differentDays=[...new Set([...Object.keys(android.days||{}),...Object.keys(website.days||{})])]
  .filter(day=>!cloudEqual(android.days?.[day],website.days?.[day])).sort().reverse();
 return {
  revision:saved.revision,createdAt:saved.createdAt,
  sourceLocalChanged:!cloudEqual(android,saved.local),
  baselineTrusted:!!cloudBase(),
  cloudMayHaveAdvanced:!!saved.cloudMayHaveAdvanced,
  reasons:(saved.details||[]).slice(0,6).map(String),
  android:{completions:count(android),xp:earned(android,'xp'),coins:earned(android,'coins')},
  website:{completions:count(website),xp:earned(website,'xp'),coins:earned(website,'coins')},
  onlyAndroid:onlyA.slice(-12),onlyWebsite:onlyB.slice(-12),
  differentDateCount:differentDays.length,
  firstDifferentDates:differentDays.slice(0,8),
  note:'XP and coins are total earned, not available balances. Purchases and rewards still require validation.'
 };
}
// Safe rebase of the comparison. Revisions of previous conflict copies remain
// archived locally and in the exported bundle; neither actual profile is changed.
async function refreshProtectedConflict(){
 if(!v8BackupVerified)throw Error('First SAVE BOTH COPIES and verify the download in Downloads');
 if(cloudSync.busy)throw Error('Finish the current cloud request before refreshing');
 const raw=localStorage.getItem(CLOUD_SYNC_CONFLICT);
 if(!raw)throw Error('No protected conflict');
 const original=JSON.parse(raw);
 const currentRaw=localStorage.getItem(CLOUD_STORAGE_KEY);
 const current=validateCloudRecoveryProfile(JSON.parse(currentRaw||'null'));
 const latest=await cloudReadSnapshot();
 if(localStorage.getItem(CLOUD_SYNC_CONFLICT)!==raw || localStorage.getItem(CLOUD_STORAGE_KEY)!==currentRaw)
  throw Error('Local copies changed during refresh; nothing modified');
 if(cloudEqual(original.local,current) && Number(original.revision)===Number(latest.revision)
   &&cloudEqual(original.remote,latest.payload))
  return {note:'Your protected comparison is already current. Review the differences and choose SAFE MERGE or a verified copy.'};
 const history=Array.isArray(original.previousVersions)?original.previousVersions:[];
 if(history.length>=6)throw Error('Recovery history is full. Export backups and request careful manual recovery.');
 const prior={createdAt:original.createdAt,revision:original.revision,
   local:original.local,remote:original.remote,details:original.details};
 const next={...original,format:'GHOSTED_V8_1_PROTECTED_CONFLICT',
  createdAt:new Date().toISOString(),revision:Number(latest.revision),
  local:current,remote:validateCloudRecoveryProfile(latest.payload),
  details:['Operator refreshed comparison after safely exporting earlier copies'],
  previousVersions:[...history,prior]};
 const data=JSON.stringify(next);
 localStorage.setItem(CLOUD_SYNC_CONFLICT,data);
 if(localStorage.getItem(CLOUD_SYNC_CONFLICT)!==data)throw Error('Refreshed comparison not persisted; operation not confirmed');
 v8BackupVerified=false;
 cloudSync.mode='conflict-protected';
 cloudNotice('COMPARISON UPDATED // EXPORT BOTH COPIES AGAIN');
 return {refreshPanel:true,note:'Updated comparison includes current Android and newest cloud. The prior versions are archived. Export the refreshed bundle again before resolving.'};
}

let v8BackupVerified=false;
async function restartFlawlessSync(){
 if(localStorage.getItem(CLOUD_SYNC_CONFLICT)){
  cloudSync.mode='conflict-protected';
  return {needsDecision:true,reason:'A conflict needs your decision. Save both copies first.'};
 }
 if(cloudSync.busy){
  for(const task of activeCloudRequests)task.abort();
  return {retrying:true,reason:'Current request stopping. Next cycle will verify the server before retrying.'};
 }
 return resumeCloudSyncSafely();
}
async function flawlessDiagnostics(){
 const d={
  mode:cloudSync.mode,online:navigator.onLine,enabled:cloudSync.enabled,
  busy:cloudSync.busy,failures:cloudSync.failures,nextRetryAt:cloudSync.nextRetryAt?new Date(cloudSync.nextRetryAt).toISOString():null,
  lastSuccess:cloudSync.lastSuccess,lastCheck:cloudSync.lastCheck,
  lastError:cloudSync.lastError,
  cloudRevision:localStorage.getItem(CLOUD_REVISION_KEY),
  trustedBaseline:!!cloudBase(),conflict:cloudConflictStatus(),
  pendingJournal:window.GHOSTED_SYNC_JOURNAL_STATUS?.()||null,
  serverMode:CLOUD_V8_RECEIPTS?'v8-transactional-idempotent':'legacy-cas-migration-pending'
 };
 if(cloudSession&&navigator.onLine){
  try{d.remote=(await cloudInspect()).revision;d.serverReachable=true;}
  catch(error){d.serverReachable=false;d.serverError=String(error);}
 }
 return d;
}
async function resolveFlawlessConflict(choice){
 if(!['device','cloud','combine'].includes(choice))throw Error('Unknown resolution choice');
 if(!v8BackupVerified)throw Error('Export both copies and verify the recovery file first');
 if(cloudSync.busy)throw Error('Current cloud request has not finished');
 const raw=localStorage.getItem(CLOUD_SYNC_CONFLICT);
 if(!raw)throw Error('No conflict is awaiting a decision');
 const saved=JSON.parse(raw);
 const local=validateCloudRecoveryProfile(saved.local);
 const remote=validateCloudRecoveryProfile(saved.remote);
 const localRaw=localStorage.getItem(CLOUD_STORAGE_KEY);
 if(!localRaw||!cloudEqual(JSON.parse(localRaw),local))
  throw Error('Local progress changed since conflict capture. Nothing overwritten; export the current profile too.');
 const session=await requireCloudSession();
 const latest=await cloudReadSnapshot();
 const changed=Number(latest.revision)!==Number(saved.revision)||!cloudEqual(latest.payload,remote);
 if(changed){
  // Recover from a successful CAS that lost its response, without reuploading.
  if(choice==='device'&&cloudEqual(latest.payload,local)){
   cloudRemember(local,Number(latest.revision));
   localStorage.removeItem(CLOUD_SYNC_CONFLICT);v8BackupVerified=false;
   document.getElementById('ghosted-cloud-conflict')?.remove();
   return {ok:true,note:'Previously committed device profile verified; sync state recovered'};
  }
  if(choice==='combine'){
   const base=cloudBase();
   if(base&&window.GHOSTED_RECONCILE_CLOUD_MERGE){
    const candidate=cloudMerge(base,local,remote);
    if(candidate.ok){
     const reviewed=window.GHOSTED_RECONCILE_CLOUD_MERGE(candidate.profile,base,local,remote);
     if(reviewed?.ok&&cloudEqual(latest.payload,reviewed.profile)){
      if(!updateCloudView(latest.payload,localRaw))throw Error('Merged upload was committed; finish editing and retry local acknowledgment');
      cloudRemember(latest.payload,Number(latest.revision));
      localStorage.removeItem(CLOUD_SYNC_CONFLICT);v8BackupVerified=false;
      document.getElementById('ghosted-cloud-conflict')?.remove();
      return {ok:true,note:'Previously committed merge verified and applied without duplicating rewards'};
     }
    }
   }
  }
  throw Error('Cloud advanced since the saved conflict. No data replaced. Export and review a fresh comparison.');
 }
 let target=local;
 if(choice==='combine'){
  const base=cloudBase();
  if(!base)throw Error('No trustworthy common ancestor. Automatic merge is not safe.');
  const candidate=cloudMerge(base,local,remote);
  if(!candidate.ok)throw Error('Changes require a manual choice: '+candidate.conflicts.join(', '));
  if(!window.GHOSTED_RECONCILE_CLOUD_MERGE)throw Error('Reward rules are not loaded');
  const reviewed=window.GHOSTED_RECONCILE_CLOUD_MERGE(candidate.profile,base,local,remote);
  if(!reviewed?.ok)throw Error('Reward accounting needs review: '+String(reviewed?.reason));
  target=validateCloudRecoveryProfile(reviewed.profile);
 }
 if(!window.confirm(choice==='cloud'
   ?'KEEP CLOUD: Replace the public profile on THIS DEVICE? A verified recovery export is required. Vault is untouched.'
   :'KEEP '+(choice==='device'?'DEVICE':'SAFE MERGE')+': Replace the public CLOUD profile using an exact revision check? A verified recovery export is required.'))
  return {cancelled:true,note:'Cancelled. Both copies remain unchanged'};
 if(choice==='cloud'){
  const recovery=JSON.stringify({format:'GHOSTED_V8_BEFORE_OPERATOR_CHOICE',createdAt:new Date().toISOString(),profile:local});
  localStorage.setItem(CLOUD_SYNC_RECOVERY,recovery);
  if(localStorage.getItem(CLOUD_SYNC_RECOVERY)!==recovery)throw Error('Local recovery backup could not be verified');
  if(!window.GHOSTED_CAN_APPLY_CLOUD_PROFILE?.()||!updateCloudView(remote,localRaw))
   throw Error('Finish current editing; cloud data was not applied');
  cloudRemember(remote,Number(latest.revision));
 }else{
  const newRevision=Number(await cloudRequest('/rest/v1/rpc/ghosted_put_snapshot',{
   method:'POST',token:session.accessToken,
   body:{p_storage_key:CLOUD_STORAGE_KEY,p_payload:target,p_expected_revision:Number(latest.revision)}
  }));
  if(newRevision!==Number(latest.revision)+1)throw Error('Unexpected cloud revision');
  // On a timeout the remote may already contain target. Reopen recovery to verify it.
  if(choice==='combine'&&!updateCloudView(target,localRaw))
   throw Error('Cloud accepted merged profile but local editor is busy. Close it and review recovery again.');
  cloudRemember(target,newRevision);
 }
 localStorage.removeItem(CLOUD_SYNC_CONFLICT);v8BackupVerified=false;
 document.getElementById('ghosted-cloud-conflict')?.remove();
 cloudSync.mode='resolved';cloudSync.lastError=null;
 cloudNotice('SYNC RECOVERED // NO REBOOT');
 // Resume on next tick; never overlap the still-running operator action.
 setTimeout(()=>{void resumeCloudSyncSafely().catch(error=>console.warn('[GHOSTED] Safe post-resolution resume:',error));},500);
 return {ok:true,note:'Operator decision applied safely. Synchronization will resume.'};
}
function flawlessPanel(){
 v8BackupVerified=false;
 return openFlawlessPanel({
  status:()=>({
   mode:cloudSync.mode,online:navigator.onLine,
   pending:window.GHOSTED_SYNC_JOURNAL_STATUS?.().pending??'UNKNOWN',
   serverMode:CLOUD_V8_RECEIPTS?'TRANSACTIONAL V8':'LEGACY CAS',
   revision:localStorage.getItem(CLOUD_REVISION_KEY),
   lastSuccess:cloudSync.lastSuccess,lastError:cloudSync.lastError,
   conflict:!!localStorage.getItem(CLOUD_SYNC_CONFLICT)
  }),
  restart:restartFlawlessSync,diagnostics:flawlessDiagnostics,
  reconnect:async()=>{
   const r=await cloudSignIn();
   if(!r.ok)return {note:'Sign-in cancelled; local data preserved'};
   if(localStorage.getItem(CLOUD_SYNC_CONFLICT))return {note:'Signed in. Conflict still requires operator review'};
   const resumed=await restartFlawlessSync();
   return {note:resumed?.reason||'Account reconnected and sync restarted'};
  },
  exportProfile:()=>{cloudDownloadLocalBackup(localStorage.getItem(CLOUD_STORAGE_KEY));return {note:'Verify public backup in Downloads'};},
  exportJournal:()=>{
   const raw=publicJournal.export();
   const blob=new Blob([raw],{type:'application/json'}),url=URL.createObjectURL(blob);
   const link=document.createElement('a');
   link.href=url;link.download='GHOSTED_PUBLIC_JOURNAL_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
   document.body.append(link);
   try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
   return {note:'Verify public journal export in Downloads'};
  },
  exportConflict:()=>exportCloudConflict(),
  setBackupVerified:checked=>{v8BackupVerified=!!checked;},
  preview:cloudConflictPreview,
  refreshConflict:refreshProtectedConflict,
  reopen:flawlessPanel,
  resolve:resolveFlawlessConflict
 });
}

function stopCloudSync(reason = 'disabled') {
  cloudSync.enabled = false;
  cloudSync.mode = reason;
  if (cloudSyncTimer) clearInterval(cloudSyncTimer);
  cloudSyncTimer = null;
  try { localStorage.removeItem(CLOUD_SYNC_ARMED); } catch {}
  return { ...cloudSync };
}

async function syncCycle(){
 // A saved conflict is a hard safety stop, including after an app restart.
 // Merely pressing RECHECK or enabling a poll must never bypass operator review.
 if(localStorage.getItem(CLOUD_SYNC_CONFLICT)){
  cloudSync.enabled=false;cloudSync.mode='conflict-protected';
  if(cloudSyncTimer)clearInterval(cloudSyncTimer);cloudSyncTimer=null;
  cloudConflictBanner();
  return {conflict:true,needsDecision:true};
 }
 if(!cloudSync.enabled||cloudSync.busy||!navigator.onLine)return {skipped:true};
 if(cloudSync.nextRetryAt>Date.now())return {retrying:true,nextRetryAt:new Date(cloudSync.nextRetryAt).toISOString()};
 cloudSync.busy=true;
 try{
  const session=await requireCloudSession();
  if(session.userId!==CLOUD_OWNER_ID)throw Error('Unexpected operator');
  const ack=Number(localStorage.getItem(CLOUD_REVISION_KEY));
  const hash=localStorage.getItem(CLOUD_SYNC_HASH);
  if(!hash||!Number.isSafeInteger(ack)||ack<1)throw Error('Missing trusted revision');
  const original=localStorage.getItem(CLOUD_STORAGE_KEY);
  if(!original)throw Error('Missing local profile');
  const local=validateCloudRecoveryProfile(JSON.parse(original));
  const remote=await cloudReadSnapshot();
  const revision=Number(remote.revision);
  const localDirty=!cloudEqual(local,JSON.parse(hash));
  const remoteDirty=revision!==ack;
  const base=cloudBase();
  // An upload may have committed before Android received its acknowledgment.
  // Accept a matching durable intent only if no later local edit happened.
  if(CLOUD_V8_RECEIPTS&&remoteDirty&&localDirty){
   const intent=JSON.parse(localStorage.getItem(CLOUD_V8_INTENT)||'null');
   if(intent?.storageKey===CLOUD_STORAGE_KEY&&intent.hash===stableProfile(remote.payload)){
    if(intent.localHash!==stableProfile(local)){
     // The server contains exactly the snapshot this device previously sent.
     // Local edits made after that upload remain authoritative here. Advance
     // the trusted baseline to the verified server snapshot WITHOUT replacing
     // the current local state; a subsequent cycle uploads the newer edits.
     cloudRemember(remote.payload,revision);
     cloudSync.mode='upload-ack-recovered-newer-local';
     cloudNotice('CLOUD // UPLOAD VERIFIED; LOCAL CHANGES QUEUED');
     return {retry:true,reason:'verified-previous-upload-newer-local-preserved'};
    }
    const backup=JSON.stringify({format:'GHOSTED_V8_LOST_ACK_RECOVERY',createdAt:new Date().toISOString(),profile:local,revision:ack});
    localStorage.setItem(CLOUD_SYNC_RECOVERY,backup);
    if(localStorage.getItem(CLOUD_SYNC_RECOVERY)!==backup)throw Error('Lost-ack recovery backup not verified');
    if(!updateCloudView(remote.payload,original))return {deferred:true,reason:'editor-busy-after-accepted-upload'};
    cloudRemember(remote.payload,revision);
    cloudSync.mode='acknowledgment-recovered';cloudNotice('CLOUD // UPLOAD VERIFIED');
    return {recoveredAcknowledgment:true,revision};
   }
  }
  if(!remoteDirty&&!cloudEqual(remote.payload,JSON.parse(hash)))throw Error('Cloud baseline mismatch');
  let next=null,merge=false;
  if(localDirty&&remoteDirty){
   if(!base){saveCloudConflict(local,remote.payload,revision,['trusted baseline missing']);return {conflict:true};}
   const merged=cloudMerge(base,local,remote.payload);
   if(!merged.ok){saveCloudConflict(local,remote.payload,revision,merged.conflicts);return {conflict:true,details:merged.conflicts};}
   next=merged.profile;merge=true;
   // Validate the entire merged reward timeline, including cross-day quotas.
   // The habit engine decides eligibility; the cloud layer never guesses.
   if(!window.GHOSTED_RECONCILE_CLOUD_MERGE)return {deferred:true,reason:'habit-engine-loading'};
   const reviewed=window.GHOSTED_RECONCILE_CLOUD_MERGE(next,base,local,remote.payload);
   if(!reviewed?.ok){
    saveCloudConflict(local,remote.payload,revision,['Reward review: '+String(reviewed?.reason||'not verified')]);
    return {conflict:true};
   }
   next=validateCloudRecoveryProfile(reviewed.profile);
  }else if(remoteDirty){next=remote.payload;}
  if(next){
   if(localStorage.getItem(CLOUD_STORAGE_KEY)!==original)return {retry:true};
   const backup=JSON.stringify({format:'GHOSTED_V79_BEFORE_CLOUD_APPLY',at:new Date().toISOString(),revision:ack,profile:local});
   localStorage.setItem(CLOUD_SYNC_RECOVERY,backup);
   if(localStorage.getItem(CLOUD_SYNC_RECOVERY)!==backup)throw Error('Cannot preserve local recovery copy');
   if(!window.GHOSTED_CAN_APPLY_CLOUD_PROFILE?.())return {deferred:true,reason:'editing'};
   if(merge && cloudEqual(next,remote.payload)){
    // A previous CAS may already have committed this exact merged result.
    if(!updateCloudView(next,original))return {deferred:true,reason:'editor-busy'};
    cloudRemember(next,revision);
    cloudSync.mode='merged';cloudSync.lastError=null;document.getElementById('ghosted-cloud-conflict')?.remove();cloudNotice('CLOUD // MERGED');
    return {downloadedRevision:revision};
   }
   if(merge){
    // Avoid transient local overwrite if a concurrent remote write wins first.
    const latest=await cloudReadSnapshot();
    if(Number(latest.revision)!==revision)return {retry:true,reason:'cloud-advanced'};
    if(localStorage.getItem(CLOUD_STORAGE_KEY)!==original)return {retry:true,reason:'local-advanced'};
    const newRev=Number(await cloudRequest('/rest/v1/rpc/ghosted_put_snapshot',{
     method:'POST',token:session.accessToken,
     body:{p_storage_key:CLOUD_STORAGE_KEY,p_payload:next,p_expected_revision:revision}
    }));
    if(newRev!==revision+1)throw Error('Unexpected merged revision');
    // Never acknowledge until the live profile actually accepts the merged state.
    // If a local edit races with the upload, the old baseline remains available
    // and the next cycle merges that edit against the new cloud revision.
    if(localStorage.getItem(CLOUD_STORAGE_KEY)!==original)return {retry:true,reason:'local-edited-during-merge'};
    if(!updateCloudView(next,original))return {deferred:true,reason:'editor-busy-after-merge'};
    cloudRemember(next,newRev);
    cloudSync.mode='merged';cloudSync.lastError=null;document.getElementById('ghosted-cloud-conflict')?.remove();cloudNotice('CLOUD // MERGED');
    return {mergedRevision:newRev};
   }
   if(!updateCloudView(next,original))return {deferred:true};
   cloudRemember(next,revision);
   cloudSync.mode='downloaded';cloudSync.lastError=null;document.getElementById('ghosted-cloud-conflict')?.remove();cloudNotice('CLOUD // UPDATED');
   return {downloadedRevision:revision};
  }
  if(localDirty){
   if(localStorage.getItem(CLOUD_STORAGE_KEY)!==original)return {retry:true};
   const newRev=Number(await cloudRequest('/rest/v1/rpc/ghosted_put_snapshot',{
    method:'POST',token:session.accessToken,
    body:{p_storage_key:CLOUD_STORAGE_KEY,p_payload:local,p_expected_revision:ack}
   }));
   if(newRev!==ack+1)throw Error('Unexpected upload revision');
   cloudRemember(local,newRev);
   cloudSync.mode='uploaded';cloudSync.lastError=null;document.getElementById('ghosted-cloud-conflict')?.remove();cloudNotice('CLOUD // UPLOADED');return {uploadedRevision:newRev};
  }
  if(!base)cloudRemember(remote.payload,revision);
  cloudSync.mode='in-sync';cloudSync.lastError=null;return {inSync:true,revision};
 }catch(error){
  const reason=String(error);cloudSync.lastError=reason;
  if(!navigator.onLine||error instanceof TypeError||/AbortError|aborted|failed to fetch|networkerror|fetch failed|timeout|HTTP 429|HTTP 5\d\d/i.test(reason)){
   cloudSync.mode='waiting-for-connection';cloudSync.failures=Math.min(50,cloudSync.failures+1);
   cloudSync.nextRetryAt=Date.now()+Math.min(120000,3000*2**Math.min(5,cloudSync.failures));
   return {retrying:true,reason,nextRetryAt:new Date(cloudSync.nextRetryAt).toISOString()};
  }
  if(/GHOSTED_REVISION_CONFLICT|revision conflict|stale revision|expected revision|HTTP 409|HTTP 412|23505|40001/i.test(reason)){
   cloudSync.mode='cloud-race-retry';cloudSync.nextRetryAt=Date.now()+2500;return {retrying:true,reason};
  }
  cloudSync.mode='needs-attention';cloudSync.enabled=false;
  if(cloudSyncTimer)clearInterval(cloudSyncTimer);cloudSyncTimer=null;
  cloudSync.lastError=reason;cloudNotice('SYNC NEEDS ATTENTION // OPEN SETTINGS');
  cloudNeedsAttentionBanner();
  console.error('[GHOSTED cloud sync] Paused safely:',error);
  return {needsAttention:true,reason};
 }finally{cloudSync.busy=false;cloudSync.lastCheck=new Date().toISOString();}
}

async function enableCloudSync() {
  if (localStorage.getItem(CLOUD_SYNC_CONFLICT))throw Error('Resolve or export the existing protected conflict first. Use Settings → Sync Control Center');
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
  // Do not run any startup restore when an unresolved two-device conflict is
  // preserved. The operator decision in Settings is the ONLY recovery path.
  if (localStorage.getItem(CLOUD_SYNC_CONFLICT)) {
    cloudSync.enabled=false;
    cloudSync.mode='conflict-protected';
    if(document.readyState==='loading')
      document.addEventListener('DOMContentLoaded',cloudConflictBanner,{once:true});
    else cloudConflictBanner();
    return;
  }
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
    if (localStorage.getItem(CLOUD_SYNC_CONFLICT)) {
      cloudSync.mode='conflict-protected';cloudSync.enabled=false;
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cloudConflictBanner,{once:true});
      else cloudConflictBanner();
      return;
    }
    if (localStorage.getItem(CLOUD_SYNC_HASH) && cloudSync.mode !== 'needs-manual-reconciliation') {
      if (stableProfile(remote.payload) === localStorage.getItem(CLOUD_SYNC_HASH)) {
        const saved = cloudBase();
        if (!saved) cloudRemember(remote.payload, remoteRevision);
      }
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
  cloudSync.nextRetryAt=0;
  if (cloudSync.enabled) void syncCycle();
});

window.addEventListener('offline',()=>{if(cloudSync.enabled)cloudSync.mode='offline-queued';});

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
  syncStatus: () => ({ ...cloudSync, conflict: cloudConflictStatus() }),
  conflictStatus: cloudConflictStatus,
  exportConflict: exportCloudConflict,
  resumeSync: resumeCloudSyncSafely,
  restartEngine: restartFlawlessSync,
  openControlCenter: flawlessPanel,
  journalStatus: () => publicJournal.status(),
  serverMode: () => CLOUD_V8_RECEIPTS?'v8-transactional-idempotent':'legacy-cas-migration-pending',
  diagnostics: flawlessDiagnostics,
  resolveConflict: resolveFlawlessConflict,
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
      const profile=JSON.parse(localStorage.getItem(CLOUD_STORAGE_KEY));
      if(window.GHOSTED_APPLY_CLOUD_PROFILE && window.GHOSTED_CAN_APPLY_CLOUD_PROFILE?.())
        window.GHOSTED_APPLY_CLOUD_PROFILE(JSON.stringify(profile));
      else cloudNotice('PROFILE UPDATED // OPEN SYNC CONTROL');
    }
    return { ...result, sync: cloudSync.mode };
  },
  inspect: cloudInspect,
  upload: cloudUpload,
  logout: () => { stopCloudSync(); cloudSession = null; cloudState.signedIn = false; try { localStorage.removeItem(CLOUD_SYNC_SESSION); } catch {} return { ok: true }; },
});
