import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const begin=source.indexOf('function stableProfile(');
const end=source.indexOf('async function enableCloudSync()',begin);
assert.ok(begin>=0&&end>begin,'Actual syncCycle source markers were not found');
const syncCode=source.slice(begin,end);
const clone=x=>JSON.parse(JSON.stringify(x));
const baseline=()=>({
 schemaVersion:4,days:{'2026-11-01':[1]},
 rewardLedger:{'2026-11-01':{xp:15,coins:5,bonus:false,awards:{'1':{xp:15,coins:5}}}},
 settings:{scanlines:true,sounds:false},purchased:[],purchaseRecords:[],
 protocolEdits:{},scheduleHistory:{},customProtocols:[],mildDays:{}
});
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']'
 :x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}'
 :JSON.stringify(x);
function createDevice({shared,profile=baseline(),ack=7,base=baseline(),net=true,validator,receipts=false}={}){
 const store=new Map(),keys={
  CLOUD_STORAGE_KEY:'public-profile',CLOUD_SYNC_BASELINE:'baseline',CLOUD_SYNC_HASH:'hash',
  CLOUD_REVISION_KEY:'ack',CLOUD_SYNC_RECOVERY:'recovery',CLOUD_SYNC_CONFLICT:'conflict',
  CLOUD_SYNC_ARMED:'armed',CLOUD_V8_INTENT:'intent'
 };
 store.set(keys.CLOUD_STORAGE_KEY,JSON.stringify(profile));
 store.set(keys.CLOUD_REVISION_KEY,String(ack));
 store.set(keys.CLOUD_SYNC_HASH,canonical(baseline()));
 if(base)store.set(keys.CLOUD_SYNC_BASELINE,JSON.stringify(base));
 const localStorage={
  getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k)
 };
 const server=shared||{revision:7,payload:baseline(),writes:0};
 const cloudSync={enabled:true,busy:false,mode:'running',lastError:null,
  failures:0,lastSuccess:null,nextRetryAt:0};
 const network={onLine:net};
 const document={body:null,getElementById:()=>null};
 let readCount=0,applyCount=0,onWrite=null;
 const window={
  GHOSTED_CAN_APPLY_CLOUD_PROFILE:()=>true,
  GHOSTED_APPLY_CLOUD_PROFILE:raw=>{store.set(keys.CLOUD_STORAGE_KEY,raw);applyCount++;return true},
  GHOSTED_RECONCILE_CLOUD_MERGE:(next,b,l,r)=>validator?validator(next,b,l,r):{ok:true,profile:next}
 };
 const validate=p=>{
  if(!p||p.schemaVersion!==4||!Array.isArray(p.purchased)||!p.days||p.isSample)
   throw Error('Invalid public profile');
  return p;
 };
 const body=syncCode+'\nreturn {syncCycle, cloudConflictStatus, cloudBase};';
 const create=new Function('localStorage','window','document','navigator',
  'cloudSync','cloudSyncTimer','cloudState','CLOUD_OWNER_ID',
  'CLOUD_STORAGE_KEY','CLOUD_SYNC_BASELINE','CLOUD_SYNC_HASH',
  'CLOUD_REVISION_KEY','CLOUD_SYNC_RECOVERY','CLOUD_SYNC_CONFLICT',
  'CLOUD_SYNC_ARMED','CLOUD_V8_RECEIPTS','CLOUD_V8_INTENT',
  'requireCloudSession','cloudReadSnapshot','cloudRequest','validateCloudRecoveryProfile','v8AcknowledgeIntent',body);
 const api=create(localStorage,window,document,network,cloudSync,null,{configured:true},
  'operator',keys.CLOUD_STORAGE_KEY,keys.CLOUD_SYNC_BASELINE,keys.CLOUD_SYNC_HASH,
  keys.CLOUD_REVISION_KEY,keys.CLOUD_SYNC_RECOVERY,keys.CLOUD_SYNC_CONFLICT,
  keys.CLOUD_SYNC_ARMED,receipts,keys.CLOUD_V8_INTENT,
  async()=>({userId:'operator',accessToken:'test'}),
  async()=>{readCount++;return clone({revision:server.revision,payload:server.payload})},
  async(path,opts)=>{
   if(opts.body.p_expected_revision!==server.revision)throw Error('GHOSTED_REVISION_CONFLICT');
   if(onWrite)await onWrite();
   server.revision++;server.payload=clone(opts.body.p_payload);server.writes++;
   return server.revision;
  },validate,()=>{});
 return {
  api,cloudSync,store,server,network,window,
  get profile(){return JSON.parse(store.get(keys.CLOUD_STORAGE_KEY))},
  get ack(){return Number(store.get(keys.CLOUD_REVISION_KEY))},
  get applies(){return applyCount},get reads(){return readCount},
  get conflict(){const raw=store.get(keys.CLOUD_SYNC_CONFLICT);return raw?JSON.parse(raw):null},
  get backup(){return store.get(keys.CLOUD_SYNC_RECOVERY)},
  setOnWrite(fn){onWrite=fn},
  edit(fn){const p=JSON.parse(store.get(keys.CLOUD_STORAGE_KEY));fn(p);store.set(keys.CLOUD_STORAGE_KEY,JSON.stringify(p));}
 };
}
test('offline device retains changes without upload and later syncs once',async()=>{
 const shared={revision:7,payload:baseline(),writes:0};
 const phone=createDevice({shared,net:false});phone.edit(x=>x.settings.sounds=true);
 assert.deepEqual(await phone.api.syncCycle(),{skipped:true});
 assert.equal(shared.writes,0);assert.equal(phone.profile.settings.sounds,true);
 phone.network.onLine=true;
 assert.equal((await phone.api.syncCycle()).uploadedRevision,8);
 assert.equal(shared.writes,1);assert.equal(phone.ack,8);
});
test('remote-only change refreshes active terminal without reboot',async()=>{
 const shared={revision:8,payload:baseline(),writes:0};
 shared.payload.settings.sounds=true;
 const phone=createDevice({shared});
 assert.equal((await phone.api.syncCycle()).downloadedRevision,8);
 assert.equal(phone.profile.settings.sounds,true);
 assert.equal(phone.applies,1);assert.equal(phone.ack,8);
});
test('two independent device settings merge through actual CAS cycle',async()=>{
 const shared={revision:7,payload:baseline(),writes:0};
 const phone=createDevice({shared}),web=createDevice({shared});
 phone.edit(x=>x.settings.scanlines=false);
 web.edit(x=>x.settings.sounds=true);
 assert.equal((await web.api.syncCycle()).uploadedRevision,8);
 const done=await phone.api.syncCycle();
 assert.equal(done.mergedRevision,9);
 assert.equal(shared.payload.settings.scanlines,false);
 assert.equal(shared.payload.settings.sounds,true);
 assert.equal(phone.profile.settings.sounds,true);
 assert.equal(shared.writes,2);
});
test('conflicting same-field edits stop, preserving both copies',async()=>{
 const shared={revision:7,payload:baseline(),writes:0};
 const phone=createDevice({shared}),web=createDevice({shared});
 phone.edit(x=>x.settings.sounds='phone');
 web.edit(x=>x.settings.sounds='web');
 await web.api.syncCycle();
 const response=await phone.api.syncCycle();
 assert.equal(response.conflict,true);
 assert.equal(phone.cloudSync.enabled,false);
 assert.equal(shared.payload.settings.sounds,'web');
 assert.equal(phone.profile.settings.sounds,'phone');
 assert.equal(phone.conflict.local.settings.sounds,'phone');
 assert.equal(phone.conflict.remote.settings.sounds,'web');
});
test('an untrusted historical ancestor never triggers automatic overwrite',async()=>{
 const shared={revision:8,payload:baseline(),writes:0};
 shared.payload.settings.sounds=true;
 const phone=createDevice({shared,base:null});
 phone.edit(x=>x.settings.scanlines=false);
 const result=await phone.api.syncCycle();
 assert.equal(result.conflict,true);assert.equal(shared.writes,0);
 assert.equal(phone.profile.settings.scanlines,false);assert.ok(phone.conflict);
});
test('local edit occurring during POST stays local and is retried without loss',async()=>{
 const shared={revision:7,payload:baseline(),writes:0};
 const phone=createDevice({shared});
 phone.edit(x=>x.settings.sounds=true);
 phone.setOnWrite(()=>phone.edit(x=>x.settings.scanlines=false));
 assert.equal((await phone.api.syncCycle()).uploadedRevision,8);
 assert.equal(phone.profile.settings.scanlines,false);
 phone.setOnWrite(null);
 const again=await phone.api.syncCycle();
 assert.equal(again.uploadedRevision,9);
 assert.equal(shared.payload.settings.scanlines,false);
 assert.equal(shared.payload.settings.sounds,true);
});
test('a remote same-day reward conflict invokes actual reward validation guard',async()=>{
 const shared={revision:7,payload:baseline(),writes:0};
 let called=0;
 const phone=createDevice({shared,validator:()=>{called++;return {ok:false,reason:'ambiguous bonus'}}});
 const web=createDevice({shared});
 phone.edit(x=>{x.days['2026-11-01']=[1,2];x.rewardLedger['2026-11-01']={xp:35,coins:10,bonus:false,awards:{1:{xp:15,coins:5},2:{xp:20,coins:5}}}});
 web.edit(x=>{x.days['2026-11-01']=[1,3];x.rewardLedger['2026-11-01']={xp:45,coins:15,bonus:false,awards:{1:{xp:15,coins:5},3:{xp:30,coins:10}}}});
 await web.api.syncCycle();
 assert.equal((await phone.api.syncCycle()).conflict,true);
 assert.equal(called,1);assert.equal(shared.writes,1);
 assert.equal(phone.profile.rewardLedger['2026-11-01'].xp,35);
});
test('receipt of existing cloud upload after lost ack is recovered without new CAS',async()=>{
 const shared={revision:8,payload:baseline(),writes:0};
 shared.payload.settings.sounds=true;
 const phone=createDevice({shared,receipts:true});
 phone.edit(x=>x.settings.sounds=true);
 const pending={id:'test',storageKey:'public-profile',hash:canonical(shared.payload),
  localHash:canonical(phone.profile),expected:7};
 phone.store.set('intent',JSON.stringify(pending));
 const response=await phone.api.syncCycle();
 assert.equal(response.recoveredAcknowledgment,true);
 assert.equal(phone.ack,8);assert.equal(shared.writes,0);
});
test('online revision race is marked retryable and does not corrupt local profile',async()=>{
 const shared={revision:7,payload:baseline(),writes:0};
 const phone=createDevice({shared});phone.edit(x=>x.settings.sounds=true);
 phone.setOnWrite(()=>{shared.revision=8;throw Error('GHOSTED_REVISION_CONFLICT')});
 const response=await phone.api.syncCycle();
 assert.equal(response.retrying,true);
 assert.equal(phone.profile.settings.sounds,true);
 assert.equal(phone.cloudSync.mode,'cloud-race-retry');
});

test('lost acknowledgement plus newer local edit advances baseline without discarding edit',async()=>{
 const shared={revision:8,payload:baseline(),writes:0};
 shared.payload.settings.sounds=true;
 const phone=createDevice({shared,receipts:true});
 phone.edit(x=>{x.settings.sounds=true;x.settings.scanlines=false;});
 const lastUploaded=clone(shared.payload);
 const pending={id:'old-accepted-id',storageKey:'public-profile',
  hash:canonical(lastUploaded),localHash:canonical(lastUploaded),expected:7};
 phone.store.set('intent',JSON.stringify(pending));
 const result=await phone.api.syncCycle();
 assert.equal(result.retry,true);
 assert.equal(phone.ack,8);
 assert.equal(phone.profile.settings.sounds,true);
 assert.equal(phone.profile.settings.scanlines,false);
 assert.equal(shared.writes,0);
 const next=await phone.api.syncCycle();
 assert.equal(next.uploadedRevision,9);
 assert.equal(shared.payload.settings.scanlines,false);
});
