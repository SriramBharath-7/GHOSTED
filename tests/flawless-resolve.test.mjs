import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const start=source.indexOf('async function resolveFlawlessConflict(');
const end=source.indexOf('function flawlessPanel()',start);
assert.ok(start>0&&end>start,'Operator conflict resolver source missing');
const resolverCode=source.slice(start,end);
const copy=x=>JSON.parse(JSON.stringify(x));
const v=(completed,sounds)=>({schemaVersion:4,days:{'2026-11-01':completed},purchased:[],
 rewardLedger:{'2026-11-01':{xp:20,coins:8,bonus:false,awards:{1:{xp:20,coins:8}}}},
 settings:{sounds}});
const original=v([1],false);
const local=v([1,2],'phone'),remote=v([1,3],'web');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function setup({choiceApproved=true,cloud=remote,revision=8,localChanged=false,exportVerified=true}={}){
 const storage=new Map();
 storage.set('profile',JSON.stringify(localChanged?v([1,2,3],'changed'):local));
 storage.set('conflict',JSON.stringify({local:copy(local),remote:copy(remote),revision:8}));
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,x)=>storage.set(k,String(x)),removeItem:k=>storage.delete(k)};
 const server={revision,payload:copy(cloud),writes:0};
 const sync={busy:false,mode:'conflict-protected',lastError:null};
 let applications=0,confirmed=0;
 const ctx={
  localStorage,CLOUD_SYNC_CONFLICT:'conflict',CLOUD_STORAGE_KEY:'profile',CLOUD_SYNC_RECOVERY:'recovery',CLOUD_REVISION_KEY:'ack',
  cloudSync:sync,document:{getElementById:()=>null},window:{confirm:()=>{confirmed++;return choiceApproved;},GHOSTED_RECONCILE_CLOUD_MERGE:()=>({ok:false,reason:'unsafe combination'})},
  validateCloudRecoveryProfile:p=>{if(p.schemaVersion!==4)throw Error('invalid');return p;},
  cloudEqual:same,
  requireCloudSession:async()=>({accessToken:'t'}),
  cloudReadSnapshot:async()=>copy(server),
  cloudRequest:async(path,opts)=>{
   if(opts.body.p_expected_revision!==server.revision)throw Error('CAS conflict');
   server.revision++;server.payload=copy(opts.body.p_payload);server.writes++;
   return server.revision;
  },
  cloudRemember:(p,rev)=>{storage.set('ack',String(rev));storage.set('baseline',JSON.stringify(p));},
  updateCloudView:(p,raw)=>{assert.equal(storage.get('profile'),raw);storage.set('profile',JSON.stringify(p));applications++;return true;},
  cloudBase:()=>copy(original),cloudMerge:()=>({ok:false,conflicts:['different settings']}),
  cloudNotice:()=>{},setTimeout:()=>0,resumeCloudSyncSafely:async()=>({ok:true})
 };
 const names=Object.keys(ctx),args=Object.values(ctx);
 const resolver=new Function(...names,
  'let v8BackupVerified='+String(exportVerified)+';\n'+resolverCode+'\nreturn resolveFlawlessConflict;')(...args);
 return {resolver,storage,server,sync,get applications(){return applications},get confirmations(){return confirmed}};
}
test('a conflict decision cannot run before verified recovery export',async()=>{
 const x=setup({exportVerified:false});
 await assert.rejects(()=>x.resolver('device'),/Export both copies/);
 assert.equal(x.server.writes,0);assert.ok(x.storage.get('conflict'));
});
test('explicit keep-device decision uses CAS and clears conflict only on verified write',async()=>{
 const x=setup();
 const r=await x.resolver('device');
 assert.equal(r.ok,true);assert.equal(x.server.writes,1);
 assert.deepEqual(x.server.payload,local);assert.equal(x.storage.get('conflict'),undefined);
 assert.equal(x.storage.get('ack'),'9');assert.equal(x.confirmations,1);
});
test('explicit keep-cloud decision backs up before changing local profile',async()=>{
 const x=setup();const r=await x.resolver('cloud');
 assert.equal(r.ok,true);assert.equal(x.server.writes,0);
 assert.deepEqual(JSON.parse(x.storage.get('profile')),remote);
 assert.deepEqual(JSON.parse(x.storage.get('recovery')).profile,local);
 assert.equal(x.applications,1);
});
test('changed local profile blocks recovery without changing cloud',async()=>{
 const x=setup({localChanged:true});
 await assert.rejects(()=>x.resolver('device'),/changed after/);
 assert.equal(x.server.writes,0);assert.ok(x.storage.get('conflict'));
});
test('server advanced after capture blocks stale decision and preserves both',async()=>{
 const x=setup({revision:9,cloud:v([1,4],'newer')});
 await assert.rejects(()=>x.resolver('device'),/Cloud advanced/);
 assert.equal(x.server.writes,0);assert.ok(x.storage.get('conflict'));
});
test('cancelled user confirmation keeps both copies',async()=>{
 const x=setup({choiceApproved:false});const r=await x.resolver('device');
 assert.equal(r.cancelled,true);
 assert.equal(x.server.writes,0);assert.ok(x.storage.get('conflict'));
});
test('unsafe auto-combine is rejected rather than guessing XP rewards',async()=>{
 const x=setup();
 await assert.rejects(()=>x.resolver('combine'),/manual choice/);
 assert.equal(x.server.writes,0);assert.ok(x.storage.get('conflict'));
});
