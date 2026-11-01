import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  PROFILE_KEY, VAULT_KEYS, FORMAT, makeOfflineBackup, parseOfflineBackup,
  newestBackup, restoreOfflineBackup, RESTORE_SAFETY_KEY
} from '../src/mobile-backup.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function memory(seed={}){
 const values=new Map(Object.entries(seed));
 return {getItem:k=>values.has(k)?values.get(k):null,
  setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
}
const profile={schemaVersion:4,days:{'2026-11-01':[1,3]},purchased:[],rewardLedger:{'2026-11-01':{xp:30,coins:10}},isSample:false};
const encrypted=JSON.stringify({version:1,salt:'abc',iv:'xyz',cipher:'encrypted-not-plaintext'});
function storage(){
 return memory({[PROFILE_KEY]:JSON.stringify(profile),[VAULT_KEYS[0]]:encrypted});
}
test('Android build has a separate local-only entrypoint and output folder',()=>{
 assert.match(read('package.json'),/"build:mobile"/);
 assert.match(read('capacitor.config.json'),/"webDir": "dist-mobile"/);
 const vite=read('vite.config.js');
 assert.match(vite,/src\/mobile\.js/);
 assert.match(vite,/mode === 'mobile'/);
 assert.match(read('index.html'),/src\/main\.js/);
 const mobile=read('src/mobile.js');
 assert.doesNotMatch(mobile,/src\/main\.js['"]/);
 assert.doesNotMatch(mobile,/supabase|cloudRequest|fetch\(/i);
});
test('Android manifest opts out of automatic cloud backup and removes Internet permission',()=>{
 const manifest=read('android/app/src/main/AndroidManifest.xml');
 assert.match(manifest,/allowBackup="false"/);
 assert.match(manifest,/android\.permission\.INTERNET" tools:node="remove"/);
});
test('creates local profile plus ciphertext-only Vault backup',()=>{
 const raw=makeOfflineBackup(storage(),'2026-11-01T10:00:00.000Z');
 const record=parseOfflineBackup(raw);
 assert.equal(record.format,FORMAT);
 assert.deepEqual(record.profile,profile);
 assert.equal(record.vault[VAULT_KEYS[0]],encrypted);
 assert.equal(record.vault[VAULT_KEYS[1]],null);
});
test('rejects unsupported or damaged external backup',()=>{
 assert.throws(()=>parseOfflineBackup('{}'));
 assert.throws(()=>makeOfflineBackup(memory({[PROFILE_KEY]:'{"schemaVersion":2}'})));
 assert.throws(()=>makeOfflineBackup(memory({[PROFILE_KEY]:JSON.stringify(profile),[VAULT_KEYS[0]]:'plaintext'})));
});
test('selects most recent valid A/B backup and ignores torn JSON',()=>{
 const old=makeOfflineBackup(storage(),'2026-10-30T10:00:00.000Z');
 const newer=makeOfflineBackup(storage(),'2026-11-01T10:00:00.000Z');
 assert.equal(newestBackup({A:old,B:newer}).slot,'B');
 assert.equal(newestBackup({A:'{"cutoff"',B:old}).slot,'B');
 assert.equal(newestBackup({A:'broken',B:'broken'}),null);
});
test('reinstall restore writes public profile and encrypted Vault with safety copy',()=>{
 const backup=parseOfflineBackup(makeOfflineBackup(storage()));
 const destination=memory({[PROFILE_KEY]:JSON.stringify({...profile,days:{}})});
 const result=restoreOfflineBackup(destination,backup);
 assert.equal(JSON.parse(destination.getItem(PROFILE_KEY)).days['2026-11-01'][1],3);
 assert.equal(result[VAULT_KEYS[0]],encrypted);
 assert.ok(destination.getItem(RESTORE_SAFETY_KEY));
});
test('does not wipe live state if pre-restore safety copy cannot be persisted',()=>{
 const old=JSON.stringify({...profile,days:{'2026-10-01':[2]}});
 const destination=memory({[PROFILE_KEY]:old});
 const originalSet=destination.setItem;
 destination.setItem=(k,v)=>{if(k===RESTORE_SAFETY_KEY)throw Error('storage full');originalSet(k,v);};
 const backup=parseOfflineBackup(makeOfflineBackup(storage()));
 assert.throws(()=>restoreOfflineBackup(destination,backup),/storage full/);
 assert.equal(destination.getItem(PROFILE_KEY),old);
});
