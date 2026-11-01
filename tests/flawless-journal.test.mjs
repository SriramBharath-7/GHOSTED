import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicJournal, JOURNAL_KEY } from '../src/flawless-journal.js';

const makeStore=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const before=()=>({schemaVersion:4,days:{'2026-11-01':[1]},rewardLedger:{'2026-11-01':{xp:20,coins:8}},purchased:[]});
const updated=()=>({...before(),days:{'2026-11-01':[1,2]},rewardLedger:{'2026-11-01':{xp:40,coins:16}}});
const journal=store=>new PublicJournal(store,()=> 'op-'+Math.random().toString(36).slice(2),()=> '2026-11-01T00:00:00.000Z');

test('identical writes create no event',()=>{
 const s=makeStore(),j=journal(s),v=JSON.stringify(before());
 assert.equal(j.prepare(v,v),null);assert.equal(j.status().pending,0);
});
test('prepare is durable before the public profile write',()=>{
 const s=makeStore(),j=journal(s),a=JSON.stringify(before()),b=JSON.stringify(updated());
 const id=j.prepare(a,b);
 assert.ok(id);assert.equal(j.status().pending,1);
 assert.equal(JSON.parse(s.getItem(JOURNAL_KEY)).events[0].stage,'prepared');
});
test('crash before profile write removes an uncommitted operation',()=>{
 const s=makeStore(),j=journal(s),a=JSON.stringify(before()),b=JSON.stringify(updated());
 j.prepare(a,b);
 assert.equal(j.repair(a).aborted,true);assert.equal(j.status().pending,0);
});
test('crash after profile write repairs committed operation without duplicate record',()=>{
 const s=makeStore(),j=journal(s),a=JSON.stringify(before()),b=JSON.stringify(updated());
 const id=j.prepare(a,b);
 assert.equal(j.repair(b).committed,true);assert.equal(j.status().pending,1);
 assert.equal(JSON.parse(s.getItem(JOURNAL_KEY)).events[0].id,id);
});
test('acknowledgment clears only a server-confirmed snapshot',()=>{
 const s=makeStore(),j=journal(s),a=JSON.stringify(before()),b=JSON.stringify(updated());
 const id=j.prepare(a,b);j.commit(id);
 const newer={...updated(),settings:{sounds:true}},c=JSON.stringify(newer);
 const next=j.prepare(b,c);j.commit(next);
 assert.equal(j.acknowledge(updated(),c),1);assert.equal(j.status().pending,1);
 assert.equal(j.acknowledge(newer,c),1);assert.equal(j.status().pending,0);
});
test('demo state does not enter personal cloud outbox',()=>{
 const s=makeStore(),j=journal(s),demo=JSON.stringify({...updated(),isSample:true});
 assert.equal(j.prepare(null,demo),null);assert.equal(j.status().pending,0);
});
test('journal has no encrypted vault contents and records only changed sections',()=>{
 const s=makeStore(),j=journal(s),a=JSON.stringify(before()),b=JSON.stringify(updated());
 j.prepare(a,b);
 assert.ok(j.export().includes('rewardDates'));
 assert.ok(!j.export().includes('ghosted:web-os:private:personal'));
 assert.ok(!j.export().includes('"xp":40'));
});
test('journal refuses corrupted records instead of silently resetting',()=>{
 const s=makeStore(),j=journal(s);s.setItem(JOURNAL_KEY,'{"version":900,"events":[]}');
 assert.equal(j.status().healthy,false);
 assert.throws(()=>j.prepare(JSON.stringify(before()),JSON.stringify(updated())),/version invalid/);
});
