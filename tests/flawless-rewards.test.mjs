import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../public/js/ghosted-05.js',import.meta.url),'utf8');
const first=source.indexOf('window.GHOSTED_RECONCILE_CLOUD_MERGE=');
const last=source.indexOf('window.GHOSTED_CAN_APPLY_CLOUD_PROFILE=',first);
assert.ok(first>=0&&last>first,'Expected source-based reward reconciliation bridge');
const bridge=source.slice(first,last);
const copy=x=>JSON.parse(JSON.stringify(x));
const baseline={schemaVersion:4,days:{'2026-11-01':[]},rewardLedger:{'2026-11-01':{xp:0,coins:0,bonus:false,awards:{}}},purchased:[],purchaseRecords:[],customProtocols:[],protocolEdits:{},scheduleHistory:{}};
const left=copy(baseline),right=copy(baseline),merged=copy(baseline);
left.days['2026-11-01']=[1];left.rewardLedger['2026-11-01']={xp:20,coins:8,bonus:false,awards:{1:{xp:20,coins:8}}};
right.days['2026-11-01']=[2];right.rewardLedger['2026-11-01']={xp:30,coins:10,bonus:false,awards:{2:{xp:30,coins:10}}};
merged.days['2026-11-01']=[1,2];merged.rewardLedger['2026-11-01']={xp:50,coins:18,bonus:false,awards:{1:{xp:20,coins:8},2:{xp:30,coins:10}}};
function reviewer(due,blocked=[]){
 const code=[
  'let state='+JSON.stringify(left)+';',
  'const validState=v=>v.schemaVersion===4&&Array.isArray(v.purchased)&&!!v.days;',
  'const validDate=v=>/^\\d{4}-\\d{2}-\\d{2}$/.test(v);',
  "const dateAgo=()=> '2026-11-01';",
  'const perfectScope=()=> '+JSON.stringify(due)+';',
  'const eligible=(id,day)=>!'+JSON.stringify(blocked)+'.includes(String(id)+"@"+day);',
  'const full=day=>perfectScope(day).length>0&&perfectScope(day).every(id=>(state.days[day]||[]).includes(id));',
  bridge,
  'return window.GHOSTED_RECONCILE_CLOUD_MERGE;'
 ].join('\n');
 return new Function('window','structuredClone',code)({},structuredClone);
}
test('combined completions create exactly one Perfect Day award',()=>{
 const r=reviewer([1,2])(merged,baseline,left,right);
 assert.equal(r.ok,true);assert.deepEqual(r.profile.days['2026-11-01'],[1,2]);
 assert.equal(r.profile.rewardLedger['2026-11-01'].xp,100);
 assert.equal(r.profile.rewardLedger['2026-11-01'].coins,38);
 assert.deepEqual(r.profile.rewardLedger['2026-11-01'].bonusScope,[1,2]);
 assert.equal(r.adjustments.length,1);
});
test('no bonus when one of three due habits remains incomplete',()=>{
 const r=reviewer([1,2,3])(merged,baseline,left,right);
 assert.equal(r.ok,true);assert.equal(r.profile.rewardLedger['2026-11-01'].xp,50);
 assert.equal(r.profile.rewardLedger['2026-11-01'].bonus,false);
});
test('a previous Perfect Day bonus is never awarded twice',()=>{
 const already=copy(merged);already.rewardLedger['2026-11-01'].bonus=true;
 already.rewardLedger['2026-11-01'].bonusScope=[1,2];
 already.rewardLedger['2026-11-01'].xp=100;already.rewardLedger['2026-11-01'].coins=38;
 const r=reviewer([1,2])(already,baseline,left,right);
 assert.equal(r.ok,true);assert.equal(r.profile.rewardLedger['2026-11-01'].xp,100);
});
test('future-day reward merges are not credited',()=>{
 const future=copy(merged);future.days['2026-11-03']=[1,2];
 future.rewardLedger['2026-11-03']=future.rewardLedger['2026-11-01'];
 const l=copy(left),r=copy(right),b=copy(baseline);
 l.days['2026-11-03']=[1];r.days['2026-11-03']=[2];
 const reviewed=reviewer([1,2])(future,b,l,r);
 assert.equal(reviewed.ok,false);
});

test('different offline reward dates with shared quota are blocked instead of double-paid',()=>{
 const b=copy(baseline),l=copy(baseline),r=copy(baseline),combined=copy(baseline);
 b.days['2026-11-02']=[];b.rewardLedger['2026-11-02']={xp:0,coins:0,bonus:false,awards:{}};
 l.days['2026-11-01']=[2];l.rewardLedger['2026-11-01']={xp:20,coins:8,bonus:false,awards:{2:{xp:20,coins:8}}};
 r.days['2026-11-02']=[2];r.rewardLedger['2026-11-02']={xp:20,coins:8,bonus:false,awards:{2:{xp:20,coins:8}}};
 combined.days['2026-11-01']=[2];combined.days['2026-11-02']=[2];
 combined.rewardLedger['2026-11-01']=l.rewardLedger['2026-11-01'];
 combined.rewardLedger['2026-11-02']=r.rewardLedger['2026-11-02'];
 const result=reviewer([1,2],['2@2026-11-02'])(combined,b,l,r);
 assert.equal(result.ok,false);assert.match(result.reason,/quota/);
});
