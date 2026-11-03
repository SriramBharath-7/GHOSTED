import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const begin=source.indexOf('function cloudConflictPreview(){');
const end=source.indexOf('let v8BackupVerified=false;',begin);
assert.ok(begin>0&&end>begin,'V8.1 conflict preview and recovery must exist in actual main.js');
const extracted=source.slice(begin,end);
const cp=x=>JSON.parse(JSON.stringify(x));
const baseline=()=>({schemaVersion:4,days:{'2026-11-01':[1]},rewardLedger:{'2026-11-01':{xp:15,coins:5}},purchased:[],settings:{sound:false}});
function setup({verified=true,advanced=false,localModified=false}={}){
 const original=baseline(),phone=cp(original),cloud=cp(original),latest=cp(original);
 phone.days['2026-11-01'].push(2);phone.settings.sound=true;
 cloud.days['2026-11-01'].push(3);cloud.settings.sound='cloud';
 latest.days['2026-11-01'].push(4);
 const live=cp(phone);
 if(localModified)live.days['2026-11-01'].push(5);
 const map=new Map([
  ['profile',JSON.stringify(live)],
  ['conflict',JSON.stringify({format:'GHOSTED_V79_CONFLICT',createdAt:'2026-11-01T00:00:00Z',
   revision:12,local:phone,remote:cloud,details:['daily-record:2026-11-01']})]
 ]);
 const localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
 const cloudSync={busy:false,mode:'conflict-protected'};
 let cloudWrites=0;
 const api=new Function(
 'localStorage','CLOUD_SYNC_CONFLICT','CLOUD_STORAGE_KEY','validateCloudRecoveryProfile',
 'cloudEqual','cloudBase','cloudReadSnapshot','cloudSync','cloudNotice','v8BackupVerified',
  extracted+'\nreturn {cloudConflictPreview,refreshProtectedConflict};'
 )(localStorage,'conflict','profile',p=>{if(p?.schemaVersion!==4)throw Error('Invalid profile');return p},
 (a,b)=>JSON.stringify(a)===JSON.stringify(b),()=>original,
 async()=>{cloudWrites++;return {revision:advanced?13:12,payload:advanced?latest:cloud}},cloudSync,()=>{},verified);
 return {api,map,original,phone,cloud,latest,live,get reads(){return cloudWrites}};
}
test('preview displays Android-only and website-only completions without modifying profiles',()=>{
 const x=setup();const before=x.map.get('conflict'),result=x.api.cloudConflictPreview();
 assert.equal(result.onlyAndroid.length,1);
 assert.equal(result.onlyWebsite.length,1);
 assert.ok(result.onlyAndroid[0].includes('PROTOCOL 2'));
 assert.ok(result.onlyWebsite[0].includes('PROTOCOL 3'));
 assert.equal(x.map.get('conflict'),before);
});
test('refresh requires an exported backup before changing saved conflict metadata',async()=>{
 const x=setup({verified:false});
 const orig=x.map.get('conflict');
 await assert.rejects(()=>x.api.refreshProtectedConflict(),/SAVE BOTH COPIES/);
 assert.equal(x.map.get('conflict'),orig);
 assert.equal(x.reads,0);
});
test('refresh archives both old copies while preserving newer Android and cloud changes',async()=>{
 const x=setup({verified:true,advanced:true,localModified:true});
 const result=await x.api.refreshProtectedConflict();
 assert.equal(result.refreshPanel,true);
 const saved=JSON.parse(x.map.get('conflict'));
 assert.equal(saved.revision,13);
 assert.deepEqual(saved.local,x.live);assert.deepEqual(saved.remote,x.latest);
 assert.deepEqual(saved.previousVersions[0].local,x.phone);
 assert.deepEqual(saved.previousVersions[0].remote,x.cloud);
 assert.deepEqual(JSON.parse(x.map.get('profile')),x.live);
 assert.equal(x.reads,1);
});
test('no-op refresh does not mutate saved copies',async()=>{
 const x=setup({verified:true,advanced:false,localModified:false});
 const before=x.map.get('conflict');
 const done=await x.api.refreshProtectedConflict();
 assert.match(done.note,/already current/);
 assert.equal(x.map.get('conflict'),before);
});
