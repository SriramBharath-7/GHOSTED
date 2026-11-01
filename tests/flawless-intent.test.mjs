import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const begin=source.indexOf('function v8WriteIntent(');
const end=source.indexOf('async function cloudRequest(',begin);
assert.ok(begin>=0&&end>begin,'V8 intent implementation missing');
const helper=source.slice(begin,end);
const profile=()=>({schemaVersion:4,days:{'2026-11-01':[1]},purchased:[],rewardLedger:{'2026-11-01':{xp:10,coins:5}}});
function runtime(storageOverride){
 const values=new Map(),store=storageOverride||{
  getItem:k=>values.get(k)??null,
  setItem:(k,v)=>{values.set(k,String(v));},
  removeItem:k=>values.delete(k)
 };
 const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']'
  :value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'
  :JSON.stringify(value);
 let counter=0;
 const uuid={randomUUID:()=> 'test-operation-'+(++counter)};
 const api=new Function('localStorage','crypto','CLOUD_V8_INTENT','CLOUD_STORAGE_KEY',
  'stableProfile','validateCloudRecoveryProfile','CLOUD_V8_RECEIPTS',
  helper+'\nreturn {v8WriteIntent,v8AcknowledgeIntent};')(
  store,uuid,'v8-intent','profile',stable,v=>v,true);
 store.setItem('profile',JSON.stringify(profile()));
 return {api,store,values,stable};
}
test('retrying identical payload/revision reuses exactly the same operation ID',()=>{
 const x=runtime(),body={p_payload:profile(),p_expected_revision:12};
 assert.equal(x.api.v8WriteIntent(body),x.api.v8WriteIntent(body));
});
test('different payload uses a new operation ID',()=>{
 const x=runtime(),a=profile(),b=profile();b.days['2026-11-01']=[1,2];
 const first=x.api.v8WriteIntent({p_payload:a,p_expected_revision:12});
 const next=x.api.v8WriteIntent({p_payload:b,p_expected_revision:12});
 assert.notEqual(first,next);
});
test('different expected revision uses a new operation ID',()=>{
 const x=runtime(),p=profile();
 assert.notEqual(x.api.v8WriteIntent({p_payload:p,p_expected_revision:12}),
  x.api.v8WriteIntent({p_payload:p,p_expected_revision:13}));
});
test('cannot issue server operation without durable local ID',()=>{
 const storage={
  getItem:k=>k==='profile'?JSON.stringify(profile()):null,
  setItem:()=>{},
  removeItem:()=>{}
 };
 const x=runtime(storage);
 assert.throws(()=>x.api.v8WriteIntent({p_payload:profile(),p_expected_revision:12}),/not durable/);
});
test('only matching accepted snapshot acknowledges saved operation ID',()=>{
 const x=runtime(),p=profile(),body={p_payload:p,p_expected_revision:12};
 x.api.v8WriteIntent(body);
 x.api.v8AcknowledgeIntent({...p,days:{}},13);
 assert.ok(x.store.getItem('v8-intent'));
 x.api.v8AcknowledgeIntent(p,12);
 assert.ok(x.store.getItem('v8-intent'));
 x.api.v8AcknowledgeIntent(p,13);
 assert.equal(x.store.getItem('v8-intent'),null);
});
