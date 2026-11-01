// GHOSTED V8: durable local public-profile write-ahead journal.
// This records client mutations; cloud snapshots are still the authoritative CAS layer.
// Vault keys and passwords are NEVER recorded here.
export const JOURNAL_KEY = 'ghosted:sync:public-journal:v8';
export const JOURNAL_VERSION = 1;
const MAX_EVENTS = 1800;
const MAX_BYTES = 850000;
const stable = value => Array.isArray(value)
  ? '['+value.map(stable).join(',')+']'
  : value&&typeof value==='object'
    ? '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}'
    : JSON.stringify(value);
export function fingerprint(value){
 const serialized=stable(value);
 // Diagnostic fingerprint, not a cryptographic authentication tag.
 let x=0xcbf29ce484222325n;
 for(let i=0;i<serialized.length;i++){
  x^=BigInt(serialized.charCodeAt(i));
  x=(x*0x100000001b3n)&0xffffffffffffffffn;
 }
 return serialized.length+':'+x.toString(16).padStart(16,'0');
}
function readProfile(raw){
 if(raw==null)return null;
 const profile=JSON.parse(raw);
 if(!profile||typeof profile!=='object'||Array.isArray(profile)||profile.isSample)
  throw Error('Invalid public profile for journal');
 return profile;
}
function changedDateKeys(a,b,key){
 const left=a?.[key]||{},right=b?.[key]||{};
 return [...new Set([...Object.keys(left),...Object.keys(right)])]
  .filter(k=>stable(left[k])!==stable(right[k])).slice(0,500);
}
export function describeMutation(before,after){
 return {
  sections:[...new Set([...Object.keys(before||{}),...Object.keys(after||{})])]
    .filter(k=>stable(before?.[k])!==stable(after?.[k])).slice(0,80),
  days:changedDateKeys(before,after,'days'),
  rewardDates:changedDateKeys(before,after,'rewardLedger')
 };
}
export class PublicJournal {
 constructor(storage,uuid=()=>crypto.randomUUID(),clock=()=>new Date().toISOString()){
  this.storage=storage;this.uuid=uuid;this.clock=clock;
 }
 read(){
  const raw=this.storage.getItem(JOURNAL_KEY);
  if(!raw)return {version:JOURNAL_VERSION,events:[]};
  const parsed=JSON.parse(raw);
  if(parsed?.version!==JOURNAL_VERSION||!Array.isArray(parsed.events))
   throw Error('Existing journal version invalid; export before repairing');
  return parsed;
 }
 persist(record){
  const raw=JSON.stringify(record);
  if(raw.length>MAX_BYTES)throw Error('Public journal storage limit reached; export recovery');
  this.storage.setItem(JOURNAL_KEY,raw);
  if(this.storage.getItem(JOURNAL_KEY)!==raw)throw Error('Public journal write not durable');
 }
 prepare(beforeRaw,afterRaw){
  if(beforeRaw===afterRaw)return null;
  const before=readProfile(beforeRaw),after=readProfile(afterRaw);
  if(after?.schemaVersion!==4)throw Error('Unsupported public profile; sync journal blocked');
  const record=this.read();
  if(record.events.length>=MAX_EVENTS)throw Error('Sync journal capacity reached; export recovery');
  const event={
   id:this.uuid(),createdAt:this.clock(),stage:'prepared',
   before:fingerprint(before),after:fingerprint(after),
   change:describeMutation(before,after)
  };
  if(!event.id||record.events.some(x=>x.id===event.id))throw Error('Duplicate local operation ID');
  record.events.push(event);
  this.persist(record);
  return event.id;
 }
 commit(id){
  if(!id)return;
  const record=this.read(),found=record.events.find(x=>x.id===id);
  if(!found)throw Error('Operation journal lost prepared record');
  found.stage='applied';this.persist(record);
 }
 repair(currentRaw){
  const record=this.read();
  if(!record.events.length)return {repaired:false};
  const last=record.events.at(-1);
  if(last.stage!=='prepared')return {repaired:false};
  const actual=fingerprint(readProfile(currentRaw));
  if(actual===last.after){last.stage='applied';this.persist(record);return {repaired:true,committed:true};}
  if(actual===last.before){record.events.pop();this.persist(record);return {repaired:true,aborted:true};}
  return {repaired:false,needsReview:true,reason:'Local profile differs from interrupted operation'};
 }
 acknowledge(profile,currentRaw){
  const record=this.read();
  if(!record.events.length)return 0;
  const hash=fingerprint(profile);
  const actual=fingerprint(readProfile(currentRaw));
  if(hash===actual){
   const count=record.events.length;
   this.persist({version:JOURNAL_VERSION,events:[]});
   return count;
  }
  const last=record.events.findLastIndex(x=>x.stage==='applied'&&x.after===hash);
  if(last<0)return 0;
  record.events.splice(0,last+1);this.persist(record);
  return last+1;
 }
 status(){
  try{
   const record=this.read();
   return {pending:record.events.length,lastOperation:record.events.at(-1)?.createdAt||null,
    unfinished:record.events.filter(x=>x.stage==='prepared').length,healthy:true};
  }catch(error){return {pending:null,healthy:false,error:String(error)};}
 }
 export(){
  return JSON.stringify({format:'GHOSTED_V8_PUBLIC_OPERATION_JOURNAL',exportedAt:this.clock(),...this.read()},null,2);
 }
}
