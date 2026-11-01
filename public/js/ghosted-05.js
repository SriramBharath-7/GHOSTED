(()=>{
'use strict';
const ASSETS=window.GHOSTED_ASSETS;
const RANKS=ASSETS.ranks;
// Honorary designation: existing 100 insignias remain untouched.
if(!RANKS.some(r=>r.order===101))RANKS.push({id:'rank-101',order:101,title:'Ghost Sovereign',unlockLevel:1000,division:0,divisionName:'Beyond Division',image:RANKS[99].image,honorary:true});
const CURVE_VERSION=1;
function xpAt(level){
 if(!Number.isSafeInteger(level)||level<1)throw Error('Invalid level');
 const n=level-1,q=Math.floor(n/4),r=n%4;
 const total=50*n+2*q*(q-1)+q*r;
 if(!Number.isSafeInteger(total))throw Error('XP exceeds safe integer range');
 return total;
}
function levelAt(xp){
 if(!Number.isSafeInteger(xp)||xp<0)throw Error('Unsafe lifetime XP');
 let lo=1,hi=2;
 while(hi<10000000&&xpAt(hi)<=xp)hi*=2;
 while(lo+1<hi){const mid=Math.floor((lo+hi)/2);if(xpAt(mid)<=xp)lo=mid;else hi=mid;}
 return lo;
}

const DIVISIONS=ASSETS.divisions;
let PROTOCOLS=[
 {id:1,name:'REGENESIS COMMAND',xp:15,coins:5},
 {id:2,name:'THE IRON MONARCH',xp:50,coins:15},
 {id:3,name:'THE KERNEL STRIKE',xp:30,coins:10},
 {id:4,name:'THE PHOENIX 65',xp:30,coins:10},
 {id:5,name:'NO JUNK UPF',xp:35,coins:10}
];
 // V6.7: 14 official requisitions. Immutable prices/entitlements protect supply accounting.
 let STORE=[
  {id:1,name:'OPERATION SILVER SCREEN',price:100,detail:'Movie night at home',category:'ENTERTAINMENT'},
  {id:2,name:'CINEMA DEPLOYMENT',price:180,detail:'Movie at a theatre',category:'ENTERTAINMENT'},
  {id:3,name:'TACTICAL STANDDOWN',price:60,detail:'One hour of gaming',category:'ENTERTAINMENT'},
  {id:4,name:'EXTENDED DEPLOYMENT',price:150,detail:'Three-hour gaming session',category:'ENTERTAINMENT'},
  {id:5,name:'BINGE CLEARANCE',price:90,detail:'Three series episodes',category:'ENTERTAINMENT'},
  {id:6,name:'ENTERTAINMENT OVERRIDE',price:200,detail:'Special game or movie session',category:'ENTERTAINMENT'},
  {id:7,name:'RATION BREAK',price:90,detail:'Favourite treat or planned cheat meal',category:'FIELD RATIONS'},
  {id:8,name:'RATION AMNESTY',price:220,detail:'Flexible one-day planned food allowance',category:'FIELD RATIONS'},
  {id:9,name:'SWEET CONTRABAND',price:60,detail:'Dessert or ice cream',category:'FIELD RATIONS'},
  {id:10,name:'OFF-DUTY AUTHORIZATION',price:100,detail:'Optional entertainment evening',category:'REST & RECREATION'},
  {id:11,name:'OPERATION GHOST MODE',price:80,detail:'Bonus personal hobby time',category:'REST & RECREATION'},
  {id:12,name:'WEEKEND EXTRACTION',price:500,detail:'Full-day leisure trip',category:'REST & RECREATION'},
  {id:13,name:'TACTICAL SUPPLY DROP',price:150,detail:'Small personal purchase',category:'SUPPLY DROPS'},
  {id:14,name:'ELITE SUPPLY DROP',price:1000,detail:'Premium personal purchase',category:'SUPPLY DROPS'}
 ];
 const defaultCatalog=STORE.map(x=>({...x}));
 const LEGACY_DEFAULT_CATALOG=[
 {id:1,name:'TACTICAL REST DAY',price:150,detail:'Legacy personal rest token'},
 {id:2,name:'STEALTH PROTOCOL',price:300,detail:'Legacy focused-offline evening'},
 {id:3,name:'BLACK SITE ACCESS',price:500,detail:'Legacy planned treat'},
 {id:4,name:'GHOST SUPPLY DROP',price:200,detail:'Legacy self-care supply'},
 {id:5,name:'WEEKEND EXTRACTION',price:450,detail:'Legacy leisure time'}
 ];
 const MARKET_POLICY={
  1:{cap:2,period:'month'},2:{cap:1,period:60},3:{cap:3,period:'month'},4:{cap:1,period:'month'},
  5:{cap:1,period:'month'},6:{cap:1,period:60},7:{cap:1,period:'month'},8:{cap:1,period:90},
  9:{cap:1,period:'month'},10:{cap:1,period:'month'},11:{cap:2,period:'month'},12:{cap:1,period:90},
  13:{cap:1,period:'month'},14:{cap:1,period:180}
 };
 const MARKET_GROUPS=[
  {name:'ENTERTAINMENT TOTAL',ids:[1,2,3,4,5,6],cap:4},
  {name:'GAMING',ids:[3,4],cap:3},
  {name:'FOOD EXCEPTIONS',ids:[7,8,9],cap:2},
  {name:'MAJOR FOOD EXCEPTIONS',ids:[7,8],cap:1}
 ];
const CONCEPTS=['01_BOOT_SEQUENCE.png','02_SYSTEM_HOME.png','03_PROTOCOLS.png','04_PROTOCOL_EXECUTION.png','05_OPERATIONS.png','06_CAREER.png','07_INTEL.png','08_BLACK_MARKET.png','09_INVENTORY.png','10_VAULT_LOCKED.png'];
const STORAGE='ghosted:web-os:personal:history:v68';
const $=s=>document.querySelector(s);
const screen=$('#terminal-content'),tail=$('#terminal-tail'),viewport=$('#viewport'),command=$('#command'),clock=$('#clock');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=n=>Number(n||0).toLocaleString('en-IN');
const pad=n=>String(n).padStart(2,'0');
function keyOf(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function dateAgo(offset){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-offset);return keyOf(d);}
function initial(){
 return {schemaVersion:4, days:structuredClone(window.GHOSTED_V68_HISTORY_DAYS||{}),purchased:[],purchaseRecords:[],redemptions:{},marketPolicyVersion:1,legacyMarketItems:[],customMarketItems:[],mildDays:{},rewardLedger:{},protocolEdits:{},scheduleHistory:{},customProtocols:[],missions:[],goals:[],settings:{scanlines:true,sounds:false,helpMode:false,reminders:{enabled:false,sound:false,quietEnabled:true,quietStart:'22:00',quietEnd:'07:00',briefing:true}},reminderDeliveries:{},created:new Date().toISOString(),isSample:false,historyImport:{source:'GHOSTED_HABIT_HISTORY_IMPORT_BUNDLE',method:'screenshot-confirmed-only',events:562,importedOn:'2026-10-31',retroactiveRewards:false}};
}
const DEFAULT_MISSIONS=[{id:1,name:"COMPLETE TODAY'S PROTOCOLS",target:1,kind:'perfect',description:'Complete every scheduled public protocol today.'},{id:2,name:'ESTABLISH MOMENTUM',target:3,kind:'today',description:'Complete at least three protocols today.'},{id:3,name:'MAINTAIN DAILY CONSISTENCY',target:5,kind:'week',description:'Reach five Perfect Days within seven days.'}];
let persisted=true,storageCorrupt=false,legacyBackupRaw='';
function validDate(k){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(k)))return false;const d=new Date(k+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===k;}
function validState(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||!v.days||typeof v.days!=='object'||Array.isArray(v.days)||!Array.isArray(v.purchased))return false;
 if(Object.entries(v.days).some(([d,ids])=>!validDate(d)||!Array.isArray(ids)||ids.some(x=>!Number.isInteger(x)||x<1||x>999)))return false;
 if(v.purchased.some(x=>!Number.isInteger(x)||x<1||x>9999))return false;
 if(v.rewardLedger&&(!v.rewardLedger||typeof v.rewardLedger!=='object'||Array.isArray(v.rewardLedger)||Object.entries(v.rewardLedger).some(([d,x])=>!validDate(d)||!x||!Number.isSafeInteger(x.xp)||x.xp<0||!Number.isSafeInteger(x.coins)||x.coins<0)))return false;
 if(v.purchaseRecords&&(!Array.isArray(v.purchaseRecords)||v.purchaseRecords.some(x=>!Number.isSafeInteger(x.price)||x.price<0||!Number.isInteger(x.id))||v.purchaseRecords.reduce((a,x)=>a+x.price,0)>Number.MAX_SAFE_INTEGER))return false;
 if(v.rewardLedger&&Object.values(v.rewardLedger).reduce((a,x)=>a+x.xp,0)>Number.MAX_SAFE_INTEGER)return false;
 if(v.rewardLedger&&Object.values(v.rewardLedger).some(x=>x.bonusScope!==undefined&&(!Array.isArray(x.bonusScope)||x.bonusScope.length>999||x.bonusScope.some(id=>!Number.isInteger(id)||id<1||id>999))))return false;
 if(v.historicalCareerSeed && (v.historicalCareerSeed.version!==1 || v.historicalCareerSeed.source!=='screenshot-reconstruction' || v.historicalCareerSeed.xp!==15035 || v.historicalCareerSeed.coins!==4780 || !Number.isSafeInteger(v.historicalCareerSeed.eventsConsidered)))return false;
 if(v.settings&&(!v.settings||typeof v.settings!=='object'||Array.isArray(v.settings)))return false;
 if(v.customProtocols&&(!Array.isArray(v.customProtocols)||v.customProtocols.length>80||v.customProtocols.some(x=>!x||!Number.isInteger(x.id)||x.id<6||x.id>999||typeof x.name!=='string'||x.name.length>80||!Number.isInteger(x.xp)||x.xp<0||!Number.isInteger(x.coins)||x.coins<0||!validDate(x.createdAt))))return false;
 if(v.catalog&&(!Array.isArray(v.catalog)||v.catalog.length>100||v.catalog.some(x=>!Number.isInteger(x.id)||x.id<1||x.id>9999||!Number.isSafeInteger(x.price)||x.price<0||x.price>1000000||typeof x.name!=='string'||x.name.length>80||typeof x.detail!=='string'||x.detail.length>500)))return false;
 if(v.goals&&(!Array.isArray(v.goals)||v.goals.length>200||v.goals.some(g=>!g||!Number.isInteger(g.id)||g.id<1||!['short','long'].includes(g.category)||!['active','completed','archived'].includes(g.status)||typeof g.name!=='string'||g.name.length<2||g.name.length>90||typeof g.description!=='string'||g.description.length>800||!Array.isArray(g.objectives)||g.objectives.length<1||g.objectives.length>60||g.objectives.some(x=>!x||!Number.isInteger(x.id)||x.id<1||typeof x.title!=='string'||x.title.length<1||x.title.length>180||typeof x.done!=='boolean')||!!g.deadline&&!validDate(g.deadline))))return false;
 if(v.missions&&(!Array.isArray(v.missions)||v.missions.length>200||v.missions.some(x=>!Number.isInteger(x.id)||x.id<1||!Number.isInteger(x.target)||x.target<1||x.target>10000||typeof x.name!=='string'||x.name.length>80||typeof x.description!=='string'||x.description.length>500||!['manual','today','perfect','week'].includes(x.kind))))return false;
 if(v.marketPolicyVersion!==undefined&&v.marketPolicyVersion!==1)return false;
 if(v.customMarketItems&&(!Array.isArray(v.customMarketItems)||v.customMarketItems.length>60||v.customMarketItems.some(x=>!x||!Number.isInteger(x.id)||x.id<2001||x.id>2999||typeof x.name!=='string'||x.name.length<2||x.name.length>80||typeof x.detail!=='string'||x.detail.length>500||!Number.isSafeInteger(x.price)||x.price<1||x.price>100000||!['ENTERTAINMENT','FIELD RATIONS','REST & RECREATION','SUPPLY DROPS','PERSONAL REWARDS'].includes(x.category)||!['regular','gaming','major-food'].includes(x.kind)||!Number.isInteger(x.iconId)||x.iconId<1||x.iconId>14||!Number.isInteger(x.limitCount)||x.limitCount<1||x.limitCount>12||!['month',60,90,180].includes(x.limitPeriod)||typeof x.archived!=='boolean')))return false;
 if(v.legacyMarketItems&&(!Array.isArray(v.legacyMarketItems)||v.legacyMarketItems.length>110||v.legacyMarketItems.some(x=>!x||!Number.isInteger(x.id)||x.id<1001||x.id>9999||typeof x.name!=='string')))return false;
 if(v.mildDays&&(!v.mildDays||typeof v.mildDays!=='object'||Array.isArray(v.mildDays)||Object.entries(v.mildDays).some(([day,v])=>!validDate(day)||!v||![7,8,9].includes(v.itemId)||typeof v.redeemedAt!=='string')))return false;
 if(v.scheduleHistory&&(!v.scheduleHistory||typeof v.scheduleHistory!=='object'||Array.isArray(v.scheduleHistory)||Object.values(v.scheduleHistory).some(x=>!Array.isArray(x)||x.length>1000||x.some(v=>!validDate(v.effective)||!v.config||typeof v.config!=='object'))))return false;
 return true;
}
function load(){try{
 const raw=localStorage.getItem(STORAGE);if(!raw)return initial();
 const obj=JSON.parse(raw);if(!validState(obj))throw Error('Invalid stored state');return obj;
 }catch(e){persisted=false;storageCorrupt=true;try{legacyBackupRaw=localStorage.getItem(STORAGE)||'';}catch{}return initial();}}
let state=load();
function upgradeState(v){
 v.redemptions=(!v.redemptions||typeof v.redemptions!=='object'||Array.isArray(v.redemptions))?{}:v.redemptions;
 v.settings={scanlines:true,sounds:false,helpMode:false,...v.settings};
 // V6.4: opt-in migration. Preserve saved times; no new alerts until enabled.
 const oldRm=v.settings.reminders&&typeof v.settings.reminders==='object'&&!Array.isArray(v.settings.reminders)?v.settings.reminders:{};
 v.settings.reminders={enabled:false,sound:false,quietEnabled:true,quietStart:'22:00',quietEnd:'07:00',briefing:true,...oldRm};
 v.reminderDeliveries=v.reminderDeliveries&&typeof v.reminderDeliveries==='object'&&!Array.isArray(v.reminderDeliveries)?v.reminderDeliveries:{};
 v.customProtocols=Array.isArray(v.customProtocols)?v.customProtocols:[];
 v.protocolEdits=v.protocolEdits||{};v.scheduleHistory=v.scheduleHistory||{};
 v.missions=Array.isArray(v.missions)?v.missions:[];
 // V6.6: existing legacy missions remain in storage and backup, but new goals use a separate schema.
 v.goals=Array.isArray(v.goals)?v.goals:[];
 if(!v.rewardLedger){
  // Migrate the browser-demo's previously earned totals ONE TIME, without replaying history.
  v.rewardLedger={};
  let total=0;
  for(const [d,ids] of Object.entries(v.days)){
   if(d>dateAgo(0))continue;
   const unique=[...new Set(ids)];let xp=0,coins=0;
   for(const p of PROTOCOLS){if(unique.includes(p.id)){xp+=p.xp;coins+=p.coins;}}
   const bonus=unique.length===PROTOCOLS.length;
   if(bonus){xp+=50;coins+=20;}
   v.rewardLedger[d]={xp,coins,bonus,awards:Object.fromEntries(PROTOCOLS.filter(p=>unique.includes(p.id)).map(p=>[p.id,{xp:p.xp,coins:p.coins}]))};total+=xp;
  }
  const n=Math.floor((-99+Math.sqrt(99*99+4*total))/2),legacyLevel=Math.max(1,n+1);
  v.legacyStanding={level:legacyLevel,title:RANKS.filter(r=>r.unlockLevel<=legacyLevel&&r.order<=100).at(-1)?.title||'Ghost Recruit',xp:total,recordedAt:new Date().toISOString()};
 }
 if(!Array.isArray(v.purchaseRecords))v.purchaseRecords=v.purchased.map(id=>({id,price:STORE.find(x=>x.id===id)?.price||0,at:v.created||new Date().toISOString()}));
 // V6.7 migration: old item IDs 1–5 must not become an unrelated authorization.
  if(v.marketPolicyVersion!==1){
   const oldCatalog=Array.isArray(v.catalog)&&v.catalog.length?v.catalog:LEGACY_DEFAULT_CATALOG;
   const ids=[...new Set([...oldCatalog.map(x=>x.id),...v.purchased,...(v.purchaseRecords||[]).map(x=>x.id)])].filter(Number.isInteger);
   const map=new Map(ids.map((old,i)=>[old,1001+i]));
   v.legacyMarketItems=oldCatalog.filter(x=>map.has(x.id)).map(x=>({...x,id:map.get(x.id),legacy:true}));
   for(const id of ids)if(!v.legacyMarketItems.some(x=>x.id===map.get(id)))v.legacyMarketItems.push({id:map.get(id),name:'LEGACY REWARD '+id,detail:'Preserved legacy purchase',price:0,legacy:true});
   v.purchased=v.purchased.map(id=>map.get(id)??id);
   v.purchaseRecords=(v.purchaseRecords||[]).map(x=>({...x,id:map.get(x.id)??x.id}));
   v.redemptions=Object.fromEntries(Object.entries(v.redemptions||{}).map(([id,records])=>[String(map.get(Number(id))??id),records]));
   v.marketPolicyVersion=1;
   v.catalog=defaultCatalog.map(x=>({...x}));
  }
  v.legacyMarketItems=Array.isArray(v.legacyMarketItems)?v.legacyMarketItems:[];
  v.customMarketItems=Array.isArray(v.customMarketItems)?v.customMarketItems:[];
  v.mildDays=v.mildDays&&typeof v.mildDays==='object'&&!Array.isArray(v.mildDays)?v.mildDays:{};
  // Official catalog is canonical; never convert new items to arbitrary custom prices.
  v.catalog=defaultCatalog.map(x=>({...x}));
 // V6.5.1 migration: lock the requirements under which an already-paid
 // Perfect Day bonus was originally earned, without changing its historical XP.
 for(const [day,row] of Object.entries(v.rewardLedger||{})){
  if(!row||!row.bonus||Array.isArray(row.bonusScope))continue;
  const credited=Object.keys(row.awards||{}).map(Number).filter(id=>Number.isInteger(id)&&id>0&&id<=999);
  const recorded=Array.isArray(v.days?.[day])?v.days[day]:[];
  row.bonusScope=[...new Set(credited.length?credited:recorded)].sort((a,b)=>a-b);
 }
 // V6.9 — one-time, frozen reconciliation of screenshot-confirmed achievements.
 // Historical schedules were not exported. This is an explicitly estimated career seed,
 // NOT a rewriting of day completion records or backdated reward ledger entries.
 if(v.historyImport?.source==='GHOSTED_HABIT_HISTORY_IMPORT_BUNDLE' && Number(v.historyImport.events)===562 && !v.historicalCareerSeed){
   const snap=window.GHOSTED_V68_HISTORY_DAYS||{};
   const starting='2026-01-01',cutoff='2026-10-30';
   const weekCounts=new Map();let xp=0,coins=0,rawEvents=0,gymExcluded=0,perfectCount=0;
   const awards=new Map([[1,[15,5]],[2,[50,15]],[3,[30,10]],[4,[30,10]],[5,[35,10]]]);
   for(const date of Object.keys(snap).filter(d=>d>=starting&&d<=cutoff).sort()){
     const ids=[...new Set(snap[date]||[])];
     for(const id of ids){const reward=awards.get(id);if(!reward)continue;rawEvents++;
       if(id===2){const week=weekDates(date)[0];const previous=weekCounts.get(week)||0;weekCounts.set(week,previous+1);if(previous>=5){gymExcluded++;continue;}}
       xp+=reward[0];coins+=reward[1];
     }
     if([1,2,3,4,5].every(id=>ids.includes(id))){xp+=50;coins+=20;perfectCount++;}
   }
   // Do not seed a malformed or unrelated profile; checks protect against accidental over-credit.
   if(rawEvents===561&&gymExcluded===10&&perfectCount===3&&xp===15035&&coins===4780){
     v.historicalCareerSeed={version:1,source:'screenshot-reconstruction',start:starting,through:cutoff,
       xp,coins,eventsConsidered:rawEvents,weeklyGymOverflow:gymExcluded,verifiedFiveTaskDays:perfectCount,
       calculation:'current fixed 2026 reward rates; 5 gym payouts per ISO week; 3 all-five bonuses; historical schedules unavailable',
       provisional:true,creditedAt:new Date().toISOString()};
     v.historyImport={...v.historyImport,careerReconciled:true,retroactiveRewards:false};
   }
 }
 v.callsign='SRIRAM BHARATH';v.serviceStart='2026-01-01';
 v.settings.feedback={sound:true,haptics:true,animations:true,volume:100,...(v.settings.feedback||{})};
 v.settings.feedback.volume=Math.max(0,Math.min(100,Number(v.settings.feedback.volume)||0));
 v.schemaVersion=4;v.careerVersion=CURVE_VERSION;
 return v;
}
state=upgradeState(state);
// V6.7.2: personal requisitions live separately from the immutable official catalog.
const OFFICIAL_MARKET_GROUPS=MARKET_GROUPS.map(g=>({...g,ids:[...g.ids]}));
function refreshMarketRegistry(){
 STORE=[...defaultCatalog.map(x=>({...x})),...(state.customMarketItems||[]).filter(x=>!x.archived).map(x=>({...x}))];
 for(const key of Object.keys(MARKET_POLICY)){if(Number(key)>=2001)delete MARKET_POLICY[key];}
 MARKET_GROUPS.forEach((g,i)=>{g.ids=[...OFFICIAL_MARKET_GROUPS[i].ids];});
 for(const p of state.customMarketItems||[]){
   MARKET_POLICY[p.id]={cap:p.limitCount,period:p.limitPeriod};
   if(p.category==='ENTERTAINMENT')MARKET_GROUPS[0].ids.push(p.id);
   if(p.kind==='gaming'){MARKET_GROUPS[0].ids.push(p.id);MARKET_GROUPS[1].ids.push(p.id);}
   if(p.category==='FIELD RATIONS')MARKET_GROUPS[2].ids.push(p.id);
   if(p.kind==='major-food')MARKET_GROUPS[3].ids.push(p.id);
 }
 for(const group of MARKET_GROUPS)group.ids=[...new Set(group.ids)];
}
refreshMarketRegistry();
const BUILTIN_PROTOCOLS=PROTOCOLS.map(x=>({...x}));
function refreshCustomRegistry(){PROTOCOLS=[...BUILTIN_PROTOCOLS.map(x=>({...x})),...state.customProtocols.map(x=>({id:x.id,name:x.name,xp:x.xp,coins:x.coins}))];}
refreshCustomRegistry();
function save(){
 if(storageCorrupt){persisted=false;return false;}
 try{localStorage.setItem(STORAGE,JSON.stringify(state));window.GHOSTED_NATIVE_DB?.mirror(STORAGE,localStorage.getItem(STORAGE));persisted=true;return true}catch{persisted=false;return false;}
}
function atomicChange(fn){
 const old=structuredClone(state);const before=service();
 try{fn();if(!save())throw Error('Storage unavailable');
   try{const after=service();if(after.xp>before.xp)hardwareAchievement(before,after);else if(after.coinsBalance>before.coinsBalance){hardwareEffect('coins');fxCoinTransfer(after.coinsBalance-before.coinsBalance);}else if(after.coinsBalance<before.coinsBalance)hardwareEffect('purchase');else if(after.xp<before.xp)hardwareEffect('undo');}catch{}
   return true;
 }catch(e){state=old;return false}
}
function sampleState(){const v=initial();delete v.rewardLedger;for(let i=49;i>=1;i--){const ids=[];for(let j=1;j<=5;j++)if(((i*13+j*7)%11)<(i%9===0?3:9))ids.push(j);v.days[dateAgo(i)]=ids;}v.isSample=true;return upgradeState(v);}

let section='system',mode='',selected=1,lastEcho='',lastNote='',lastType='info';
let history=[],histCursor=0,rankPage=1,selectedDate=dateAgo(0),toastTimer,selectedShop=1,selectedItem=1,operatorIndex=0;
const cmds=['vaultexport','vaultimport','mission','reward','backup','demo','sounds','beep','vaultlock','vaultdone','help','system','status','protocols','open','complete','undo','operations','career','ranks','divisions','intel','matrix','shop','buy','inventory','vault','settings','concepts','concept','history','about','clear','reset','operator','boot','inspect','item','pedit','pday','pcal','iday','ical','hset','phset','redeem','use','matrixback','matrixnext'];
function activeProtocol(p,day=dateAgo(0)){
 if(p.id<=5)return true;
 const entry=state.customProtocols.find(x=>x.id===p.id);
 if(!entry)return false;
 const periods=entry.periods||[{from:entry.createdAt,to:null}];
 return periods.some(x=>x.from<=day&&(!x.to||x.to>day));
}
function activeProtocols(day=dateAgo(0)){return PROTOCOLS.filter(p=>activeProtocol(p,day));}
function protocolTarget(id,date){const p=planOf(id,date);if(p.frequency==='timesPerWeek')return Math.max(1,Math.min(7,Number(p.timesPerWeek)||1));if(p.frequency==='timesPerMonth')return Math.max(1,Math.min(31,Number(p.timesPerMonth)||1));if(p.frequency==='timesInDays')return Math.max(1,Math.min(Math.max(1,Number(p.timesInDaysSpan)||14),Number(p.timesInDaysCount)||3));return 1;}
function weekDates(day){const dt=new Date(day+'T12:00:00Z');const shift=(dt.getUTCDay()+6)%7;dt.setUTCDate(dt.getUTCDate()-shift);return Array.from({length:7},(_,i)=>{const d=new Date(dt);d.setUTCDate(dt.getUTCDate()+i);return d.toISOString().slice(0,10)});}
function monthDates(day){const [y,m]=day.split('-').map(Number);return Array.from({length:new Date(y,m,0).getDate()},(_,i)=>`${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);}
// V6.5: fixed-length quota windows are anchored at the effective schedule date.
// A '3 times / 14 days' target may be fulfilled on ANY 3 of those 14 days.
// Original completions and historic reward ledger entries are never rewritten.
function quotaWindowDates(id,day,p=planOf(id,day)){
 if(p.frequency==='timesPerWeek')return weekDates(day);
 if(p.frequency==='timesPerMonth')return monthDates(day);
 if(p.frequency!=='timesInDays')return [];
 const span=Math.max(1,Math.min(365,Number(p.timesInDaysSpan)||14));
 const anchor=validDate(p.effective)?p.effective:day;
 const cycle=Math.floor(dayDifference(day,anchor)/span);
 const start=new Date(anchor+'T12:00:00Z');start.setUTCDate(start.getUTCDate()+cycle*span);
 return Array.from({length:span},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
}
function windowCount(id,day,frequency='timesPerWeek',includeToday=false){
 const p={...planOf(id,day),frequency};
 return quotaWindowDates(id,day,p).filter(d=>d<day||(includeToday&&d===day)).filter(d=>done(d).includes(id)).length;
}
function periodTargetMet(id,day){
 const p=planOf(id,day);
 if(!['timesPerWeek','timesPerMonth','timesInDays'].includes(p.frequency))return false;
 // Evaluate as of the requested date: future sessions must never turn old missed days into rest days.
 return quotaWindowDates(id,day,p).filter(d=>d<=day&&d<=dateAgo(0)&&done(d).includes(id)).length>=protocolTarget(id,day);
}
function optionalRestDay(id,day){
 const p=planOf(id,day);
 if(day>dateAgo(0)||!activeProtocol({id},day)||done(day).includes(id)||!['timesPerWeek','timesPerMonth','timesInDays'].includes(p.frequency))return false;
 // The grey square represents a surplus/rest slot in the WHOLE achieved period.
 // This is display-only. Never use it to calculate rewards, due alerts or history.
 return quotaWindowDates(id,day,p).filter(d=>d<=dateAgo(0)&&done(d).includes(id)).length>=protocolTarget(id,day);
}
function quotaReached(id,day){const p=planOf(id,day);if(!['timesPerWeek','timesPerMonth','timesInDays'].includes(p.frequency))return false;return windowCount(id,day,p.frequency,true)>=protocolTarget(id,day);}
const done=(day=dateAgo(0))=>Array.isArray(state.days[day])?[...new Set(state.days[day])].filter(id=>PROTOCOLS.some(x=>x.id===id)):[];
const activeIds=(day)=>activeProtocols(day).filter(p=>eligible(p.id,day)).map(p=>p.id);
// Freeze the set of due tasks once a Perfect Day reward has been credited.
// New tasks or mid-day schedule edits cannot confiscate that previously earned bonus.
// If an originally required completion is undone, the bonus is correctly reversed.
function perfectScope(day){
 const saved=state.rewardLedger?.[day]?.bonusScope;
 return Array.isArray(saved)&&saved.length?saved:activeIds(day);
}
const full=day=>{const required=perfectScope(day);return required.length>0&&required.every(id=>done(day).includes(id));};
function earned(){
 let xp=0,coins=0,completed=0,perfectDays=0,activeDays=0;
 for(const [day,ids] of Object.entries(state.days)){if(day>dateAgo(0))continue;const arr=done(day);completed+=arr.length;if(arr.length)activeDays++;if(full(day))perfectDays++;}
 for(const v of Object.values(state.rewardLedger||{})){xp+=v.xp;coins+=v.coins;}
 if(state.historicalCareerSeed?.version===1){xp+=state.historicalCareerSeed.xp;coins+=state.historicalCareerSeed.coins;}
 return {xp,coins,completed,perfectDays,activeDays};
}
function service(){
 const e=earned();const spent=(state.purchaseRecords||[]).reduce((t,x)=>t+x.price,0);
 const level=levelAt(e.xp),prevLevelXp=xpAt(level),nextLevelXp=xpAt(level+1);
 const current=RANKS.filter(r=>r.unlockLevel<=level).at(-1)||RANKS[0];
 const next=RANKS.find(r=>r.order===current.order+1)||null;
 return {...e,level,prevLevelXp,nextLevelXp,current,next,coinsBalance:e.coins-spent,today:done(),todayCount:done().filter(id=>eligible(id,dateAgo(0))).length,todayScheduled:activeIds(dateAgo(0)).length,allTodayCount:done().filter(id=>activeProtocols().some(p=>p.id===id)).length,streak:streak()};
}
function streak(){const first=Object.keys(state.days).sort()[0]||dateAgo(0),cursor=new Date(dateAgo(0)+'T12:00:00');if(!full(keyOf(cursor)))cursor.setDate(cursor.getDate()-1);let n=0;
 while(keyOf(cursor)>=first){const d=keyOf(cursor);if(activeIds(d).length===0){cursor.setDate(cursor.getDate()-1);continue;}if(!full(d))break;n++;cursor.setDate(cursor.getDate()-1);}return n;}

function bar(p,width=21){const n=Math.max(0,Math.min(width,Math.floor(p*width)));return `<span class="progress-bar">[${'█'.repeat(n)}<span class="off">${'░'.repeat(width-n)}</span>]</span>`;}
const sectionHead=(title,aside='')=>`<div class="section-line"><span>${esc(title)}</span><span class="right">${esc(aside)}</span></div>`;
const line=(a,b='')=>`<div class="term-line">${a}${b}</div>`;
const metric=(key,v)=>`<div class="metric"><span class="key">${esc(key)}</span><span class="val">${v}</span></div>`;
const action=(label,cmd,cls='')=>`<button type="button" class="terminal-action ${cls}" data-command="${esc(cmd)}"><span class="ghosted-action-label">${esc(label)}</span></button>`;
function entry(num,name,description,cmd){return `<div class="entry"><span class="num">[${pad(num)}]</span><span class="name">${action(name,cmd)}</span><span class="description">${esc(description)}</span><span class="arrow">&gt;</span></div>`;}
function bootLines(){return `<div class="term-line"><span class="good">[OK]</span> <span class="info">BROWSER TERMINAL INITIALIZED</span></div>
<div class="term-line"><span class="good">[OK]</span> <span class="info">DOT-MATRIX OPERATOR SET LOADED (8 VARIANTS)</span></div>
<div class="term-line"><span class="good">[OK]</span> <span class="info">100 ORIGINAL RANK BADGES + GHOST SOVEREIGN</span></div>
<div class="term-line"><span class="${persisted?'good':'warn'}">[${persisted?'OK':'--'}]</span> <span class="info">BROWSER STORAGE ${persisted?'AVAILABLE':'UNAVAILABLE'}</span></div>
<div class="term-line"><span class="warn">[INFO]</span> <span class="info">STANDALONE WEB PROFILE / NO ANDROID SYNC</span></div>
<div class="term-line"><span class="good">[OK]</span> <span class="good bold">GHOSTED SESSION READY</span></div>`;}
function home(){const s=service();const progress=(s.xp-s.prevLevelXp)/(s.nextLevelXp-s.prevLevelXp);return `
<div class="v68-mobile-hide-boot">${sectionHead('SYSTEM / INITIALIZATION','REAL HISTORY // OFFLINE PERSONAL MODE')}${bootLines()}</div>
${sectionHead('OPERATOR // PROFILE',state.isSample?'DEMO HISTORY':'PERSONAL LOCAL PROFILE')}
<div class="mobile-identity"><img class="v68-mobile-portrait" src="${window.GHOSTED_V68_IMAGES.system}" alt="Dot-matrix Ghost operator"/><div><strong class="good">${esc(s.current.title)}</strong><span>LVL ${s.level}</span><span>${short(s.xp)} XP</span><span>${short(s.coinsBalance)} GC</span></div></div>
${metric('CALLSIGN',esc(state.callsign||'SRIRAM BHARATH'))}
${metric('RANK',esc(s.current.title.toUpperCase()))}
${metric('DIVISION',pad(s.current.division)+' // '+esc(s.current.divisionName.toUpperCase()))}
${metric('LEVEL',pad(s.level))}
${metric('XP',`${short(s.xp)} &nbsp; ${bar(progress,18)} <span class="info">${Math.floor(progress*100)}%</span>`)}
${metric('GHOST COINS',`<span class="warn">${short(s.coinsBalance)} GC</span>`)}
${metric('STREAK',`${s.streak} DAYS`)}
${metric('PROTOCOLS',`${s.todayCount}/${s.todayScheduled} REQUIRED TODAY`)}
${sectionHead('ACTIVE OBJECTIVE','TODAY / OPERATOR SESSION')}
<div class="spaced warn bold">&gt;&gt; ${s.todayCount===s.todayScheduled?'ALL DUE PROTOCOLS EXECUTED':'COMPLETE TODAY\'S PROTOCOLS'} (${s.todayCount}/${s.todayScheduled})</div>
<div class="info">Real-life action. Earn valid XP. Strengthen your operator.</div>
${reminderBriefingHTML()}
${sectionHead('SYSTEM NAVIGATION','TACTICAL CONTROLS // TOUCH OPERATED')}
<div class="nav-entries">${entry(1,'PROTOCOLS','Execute daily discipline', 'protocols')}
${entry(2,'OPERATIONS','Short-term & long-term goals','operations')}
${entry(3,'CAREER','Rank, skills & progression','career')}
${entry(4,'INTEL','Consistency and performance','intel')}
${entry(5,'BLACK MARKET','Restricted requisitions & Ghost Coins','shop')}
${entry(6,'INVENTORY','Owned assets and equipment','inventory')}
${entry(7,'VAULT','Encrypted personal records','vault')}
${entry(8,'SETTINGS','Device preferences','settings')}</div>
<div class="footer-actions">${action('[ DEVICE CONTROLS ]','help')}${action('[ CONSISTENCY MATRIX ]','matrix')}</div>`;}

// V5 PHASE 2 // PROTOCOLS ONLY — shared existing completion records and original reward calculations.
const PROTOCOL_CONTENT={
 1:{code:'BIOTECH / REGENESIS',summary:'Personal daily hair-care and wellness routine.',objective:'Track your chosen amino-acid and phenylalanine routine. Follow your own established plan; GHOSTED does not recommend doses.',components:['Personal amino-acid routine','Phenylalanine routine','Daily consistency check'],schedule:'DAILY / USER-DEFINED',duration:'PERSONAL ROUTINE'},
 2:{code:'STRENGTH / IRON',summary:'Strength training and physical discipline.',objective:'Show up for the workout you planned, execute safely, and record the session.',components:['Warm-up and mobility','Strength training','Recovery and cool-down'],schedule:'TRAINING DAYS / USER-DEFINED',duration:'SESSION-BASED'},
 3:{code:'CYBER / KERNEL',summary:'Hands-on cybersecurity learning and ethical hacking.',objective:'Spend at least 30 focused minutes on authorized labs, programming, networking or cybersecurity study.',components:['30-minute focused session','Authorized practice labs','Notes or completed exercise'],schedule:'DAILY / 30 MIN',duration:'30 MIN'},
 4:{code:'NUTRITION / PHOENIX',summary:'Daily protein-intake protocol.',objective:'Track your personal target of four eggs per day and your planned protein-rich meals.',components:['Four-egg daily target','Protein-rich meal preparation','Daily intake check'],schedule:'DAILY / FOOD',duration:'PERSONAL TARGET'},
 5:{code:'NUTRITION / CLEAN FUEL',summary:'Avoid junk food and prioritize whole foods.',objective:'Follow your no-junk ultra-processed-food habit and choose nutritious meals and snacks.',components:['Choose whole foods','Avoid habitual junk/UPF choices','Daily food-quality check'],schedule:'DAILY / ALL DAY',duration:'ALL DAY'}
};

// V5.2: profile edits are separate from completion and reward records.

if(!state.protocolEdits || typeof state.protocolEdits!=='object' || Array.isArray(state.protocolEdits)) state.protocolEdits={};
const PR_WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function prDefaultWeekdays(){return [...PR_WEEKDAYS];}
function prReminderToInput(v){
 if(!v)return '';
 const simple=String(v).trim();
 const m12=simple.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
 if(m12){let h=Number(m12[1])%12;if(/pm/i.test(m12[3]))h+=12;return `${String(h).padStart(2,'0')}:${m12[2]}`;}
 const m24=simple.match(/^(\d{1,2}):(\d{2})/);
 if(m24){const hh=String(Math.max(0,Math.min(23,Number(m24[1])))).padStart(2,'0');return `${hh}:${m24[2]}`;}
 return '';
}
function prReminderFromInput(v){
 if(!v)return '';
 const [hh,mm]=String(v).split(':');
 let h=Number(hh),suffix='AM';
 if(!Number.isFinite(h))return String(v);
 if(h===0)h=12;else if(h===12)suffix='PM';else if(h>12){h-=12;suffix='PM';}
 return `${h}:${mm} ${suffix}`;
}
function planOf(id,day){
 const history=state.scheduleHistory?.[id]||[];
 const entry=history.filter(x=>x.effective<=day).at(-1);
 const raw=entry?.config||((state.protocolEdits?.[id]&&!history.length)?state.protocolEdits[id]:null);
 const defaults={frequency:id===2?'timesPerWeek':'daily',weekdays:[...PR_WEEKDAYS],everyNDays:3,timesPerWeek:id===2?5:3,timesPerMonth:10,timesInDaysCount:3,timesInDaysSpan:14,effective:entry?.effective||state.created?.slice(0,10)||day};
 return {...defaults,...raw,effective:entry?.effective||defaults.effective};
}
function dayDifference(a,b){return Math.round((Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000);}
function eligible(id,day){
 if(!validDate(day)||!activeProtocol({id},day))return false;
 const p=planOf(id,day),dt=new Date(day+'T12:00:00Z');
 if(p.frequency==='daily')return true;
 if(['timesPerWeek','timesPerMonth','timesInDays'].includes(p.frequency))return windowCount(id,day,p.frequency,false)<protocolTarget(id,day);
 if(p.frequency==='selectedDays')return (p.weekdays||[]).includes(PR_WEEKDAYS[(dt.getUTCDay()+6)%7]);
 if(p.frequency==='everyNDays')return dayDifference(day,p.effective)%Math.max(1,p.everyNDays||1)===0;
 return true;
}
function refreshProtocolRewards(){for(const p of PROTOCOLS){const e=state.protocolEdits?.[p.id];if(Number.isSafeInteger(e?.xp)&&e.xp>=0)p.xp=e.xp;if(Number.isSafeInteger(e?.coins)&&e.coins>=0)p.coins=e.coins;}}
refreshProtocolRewards();
function prProfile(id){
 const custom=state.customProtocols.find(x=>x.id===id);const base=PROTOCOL_CONTENT[id]||{summary:custom?.summary||'OPERATOR-DEFINED PROTOCOL',objective:custom?.description||'Personal protocol.',components:[],duration:'CUSTOM',schedule:'OPERATOR-DEFINED'},p=PROTOCOLS.find(x=>x.id===id)||{},e=state.protocolEdits?.[id]||{};
 const defaultMode=id===2?'timesPerWeek':'daily';
 const weekdays=Array.isArray(e.weekdays)&&e.weekdays.length?e.weekdays:prDefaultWeekdays();
 return {...base,name:e.name??p.name,summary:e.summary??base.summary,objective:e.description??base.objective,
   frequency:e.frequency??defaultMode,everyNDays:e.everyNDays??3,timesPerWeek:e.timesPerWeek??(id===2?5:3),timesPerMonth:e.timesPerMonth??10,
   timesInDaysCount:e.timesInDaysCount??3,timesInDaysSpan:e.timesInDaysSpan??14,
   reminder:e.reminder??'',reminderEnabled:e.reminderEnabled??!!e.reminder,notes:e.notes??'',weekdays,components:Array.isArray(e.components)?e.components:base.components,showComponents:e.showComponents??true};
}
function prFrequencyLabel(p){
 if(p.frequency==='everyNDays')return 'EVERY '+p.everyNDays+' DAYS';
 if(p.frequency==='selectedDays')return 'SELECTED WEEKDAYS';
 if(p.frequency==='timesPerWeek')return p.timesPerWeek+' TIMES / WEEK';
 if(p.frequency==='timesPerMonth')return p.timesPerMonth+' TIMES / MONTH';
 if(p.frequency==='timesInDays')return p.timesInDaysCount+' TIMES / '+p.timesInDaysSpan+' DAYS';
 return 'EVERY DAY';
}
function prProtocolName(id){return prProfile(id).name;}
function prEditForm(id){
 const m=prProfile(id),freq=m.frequency;
 const weekdayChecks=PR_WEEKDAYS.map(day=>`<label><input type="checkbox" name="weekdays" value="${esc(day)}" ${m.weekdays.includes(day)?'checked':''}><span>${esc(day.slice(0,3).toUpperCase())}</span></label>`).join('');
 return `<div class="pr-editor-wrap pr-ghosted-editor"><div class="pr-editor-heading"><span>✎ PROTOCOL CONFIGURATION // ${pad(id)}</span><span class="info">[ EDIT MODE ]</span></div>
 <form id="pr-editor-form" data-protocol-id="${id}">
  <label>PROTOCOL NAME<input type="text" name="name" maxlength="80" required value="${esc(m.name)}"></label>
  <label>QUESTION / DESCRIPTION<textarea name="description" maxlength="1200" rows="3">${esc(m.objective)}</textarea></label>
  <label>SHORT DESCRIPTION<input type="text" name="summary" maxlength="120" value="${esc(m.summary)}"></label>
  <div class="pr-components-editor">
   <div class="pr-components-heading"><span>COMPONENTS // EDITABLE REGISTER</span><label class="pr-component-visibility"><input type="checkbox" name="showComponents" ${m.showComponents?'checked':''}><span>SHOW IN PROTOCOL</span></label></div>
   <div class="pr-component-fields" data-component-fields>${(m.components||[]).map((c,i)=>`<div class="pr-component-edit-row"><span class="pr-component-index">${pad(i+1)}</span><input type="text" name="componentText" value="${esc(c)}" maxlength="160" aria-label="Component ${i+1}"><button type="button" class="pr-comp-remove" data-component-remove aria-label="Remove component ${i+1}">×</button></div>`).join('')}</div>
   <button class="terminal-action pr-comp-add" type="button" data-component-add>[ + ADD COMPONENT ]</button>
   <small class="info">EDIT, REMOVE OR ADD COMPONENTS. HIDE ONLY AFFECTS DISPLAY, NOT SAVED ITEMS.</small>
  </div>
  <div class="pr-frequency-row"><label>FREQUENCY<select name="frequency">
    <option value="daily" ${freq==='daily'?'selected':''}>EVERY DAY</option>
    <option value="everyNDays" ${freq==='everyNDays'?'selected':''}>EVERY N DAYS</option>
    <option value="timesPerWeek" ${freq==='timesPerWeek'?'selected':''}>N TIMES PER WEEK (ANY DAYS)</option>
    <option value="selectedDays" ${freq==='selectedDays'?'selected':''}>SELECTED WEEKDAYS</option>
    <option value="timesPerMonth" ${freq==='timesPerMonth'?'selected':''}>N TIMES PER MONTH</option>
    <option value="timesInDays" ${freq==='timesInDays'?'selected':''}>N TIMES IN N DAYS</option>
   </select></label>
   <div class="pr-frequency-extra pr-mode-days" ${freq==='everyNDays'?'':'hidden'}><label>EVERY (DAYS)<input type="number" min="1" max="365" name="everyNDays" value="${m.everyNDays}"></label></div>
   <div class="pr-frequency-extra pr-mode-week" ${freq==='timesPerWeek'?'':'hidden'}><label>TIMES / WEEK<input type="number" min="1" max="7" name="timesPerWeek" value="${m.timesPerWeek}"></label></div>
   <div class="pr-frequency-extra pr-mode-month" ${freq==='timesPerMonth'?'':'hidden'}><label>TIMES / MONTH<input type="number" min="1" max="31" name="timesPerMonth" value="${m.timesPerMonth}"></label></div>
   <div class="pr-frequency-extra pr-mode-range" ${freq==='timesInDays'?'':'hidden'}><div class="pr-inline-pair"><label>TIMES<input type="number" min="1" max="31" name="timesInDaysCount" value="${m.timesInDaysCount}"></label><label>IN DAYS<input type="number" min="1" max="365" name="timesInDaysSpan" value="${m.timesInDaysSpan}"></label></div></div>
  </div>
  <label class="rm-protocol-enabled"><input type="checkbox" name="reminderEnabled" ${m.reminderEnabled?'checked':''}> ENABLE REMINDER FOR THIS PROTOCOL</label>
   <label>REMINDER TIME<input type="time" name="reminder" value="${esc(prReminderToInput(m.reminder))}"></label>
  <div class="pr-weekdays-mode" ${freq==='selectedDays'?'':'hidden'}><label>SELECT SPECIFIC WEEKDAYS</label><div class="pr-weekdays" role="group" aria-label="Active weekdays">${weekdayChecks}</div></div>
  <label>OPERATOR NOTES<textarea name="notes" maxlength="700" rows="3" placeholder="Optional notes, instructions or cues">${esc(m.notes)}</textarea></label>
  <div class="editor-rewards"><label>XP PER VALID COMPLETION<input name="xp" type="number" min="0" max="10000" step="1" value="${esc(PROTOCOLS.find(x=>x.id===id).xp)}"></label><label>GC PER VALID COMPLETION<input name="coins" type="number" min="0" max="10000" step="1" value="${esc(PROTOCOLS.find(x=>x.id===id).coins)}"></label></div>
  <p class="pr-editor-note">A weekly target can be completed on ANY days. After the target is met, further sessions still count toward consistency but award no extra XP / GC. Select weekdays only if you deliberately want fixed days. Changes take effect today.</p>
  <div class="pr-editor-actions"><button type="submit" class="terminal-action pr-primary">[ SAVE PROTOCOL ]</button><button type="button" class="terminal-action" data-editor-cancel>[ CANCEL ]</button></div>
 </form></div>`;
}
function prNewForm(){return `<div class="pr-editor-wrap pr-ghosted-editor"><div class="pr-editor-heading">+ NEW PROTOCOL // OPERATOR REGISTER</div>
<form id="pr-new-form" class="pr-create-form">
<label>PROTOCOL NAME<input name="name" maxlength="80" required placeholder="e.g. NIGHTLY RECON"></label>
<label>DESCRIPTION<textarea name="description" rows="3" placeholder="What will you do?"></textarea></label>
<label>FREQUENCY<select name="frequency"><option value="daily">EVERY DAY</option><option value="timesPerWeek">N TIMES PER WEEK — ANY DAYS</option><option value="timesPerMonth">N TIMES PER MONTH — ANY DAYS</option></select></label>
<label>WEEKLY / MONTHLY TARGET<input name="target" type="number" min="1" max="31" value="3" required></label>
<div class="pr-new-reward"><label>XP / COMPLETION<input name="xp" type="number" min="0" max="1000" value="10" required></label><label>GHOST COINS / COMPLETION<input name="coins" type="number" min="0" max="500" value="3" required></label></div>
<div class="pr-editor-note">No generated artwork required. New protocols use a clean tactical identifier. Prior completion history and earned rewards remain intact.</div>
<div class="pr-editor-actions"><button type="submit" class="terminal-action pr-primary">[ CREATE PROTOCOL ]</button><button type="button" class="terminal-action" data-editor-cancel>[ CANCEL ]</button></div></form></div>`;}
function prSaveNew(e){e.preventDefault();const f=e.target;const v=n=>f.elements.namedItem(n).value;const name=v('name').trim();const xp=Number(v('xp')),coins=Number(v('coins')),target=Number(v('target')),frequency=v('frequency');if(!name||!Number.isInteger(xp)||xp<0||xp>1000||!Number.isInteger(coins)||coins<0||coins>500||!Number.isInteger(target)||target<1||target>(frequency==='timesPerWeek'?7:31)){showToast('INVALID NAME OR TARGET');return;}
 const id=Math.max(5,...PROTOCOLS.map(x=>x.id))+1;if(id>999){showToast('MAXIMUM PROTOCOL IDS REACHED');return;}
 const today=dateAgo(0);
 const added={id,name,xp,coins,createdAt:today,periods:[{from:today,to:null}],summary:'CUSTOM OPERATOR PROTOCOL',description:v('description').trim()};
 if(!atomicChange(()=>{state.customProtocols.push(added);state.protocolEdits[id]={name,description:added.description,summary:added.summary,frequency,timesPerWeek:frequency==='timesPerWeek'?target:3,timesPerMonth:frequency==='timesPerMonth'?target:10,everyNDays:3,timesInDaysCount:3,timesInDaysSpan:14,weekdays:[...PR_WEEKDAYS],components:[],showComponents:true,xp,coins,notes:'',reminder:'',reminderEnabled:false};state.scheduleHistory[id]=[{effective:today,config:{frequency,timesPerWeek:frequency==='timesPerWeek'?target:3,timesPerMonth:frequency==='timesPerMonth'?target:10,weekdays:[...PR_WEEKDAYS]}}];})) {showToast('COULD NOT SAVE CUSTOM PROTOCOL');return;}
 refreshCustomRegistry();selected=id;section='detail';$('#overlay').dataset.dirty='0';closePopup(true);reminderRequestSync();render();showToast('CUSTOM PROTOCOL CREATED');
}
function prArchive(id,restore=false){const p=state.customProtocols.find(x=>x.id===id);if(!p)return;const today=dateAgo(0);
 if(!restore&&!confirm(`Archive ${p.name}? History and rewards are retained. This removes future due requirements.`))return;
 if(!atomicChange(()=>{p.periods=Array.isArray(p.periods)?p.periods:[{from:p.createdAt,to:null}];if(restore){p.periods.push({from:today,to:null});}else{const active=p.periods.find(x=>!x.to);if(active)active.to=today;}})){showToast('ARCHIVE ACTION FAILED');return;}
 section='protocols';reminderRequestSync();render();showToast(restore?'PROTOCOL RESTORED':'PROTOCOL ARCHIVED');
}
function prOpenEditor(id){if(!PROTOCOLS.some(p=>p.id===id))return;popup(prEditForm(id));}
function prSaveEditor(e){e.preventDefault();const form=e.target,id=Number(form.dataset.protocolId);
 if(!PROTOCOLS.some(p=>p.id===id))return;
 const v=name=>form.elements.namedItem(name).value;
 const name=v('name').trim();if(!name){form.elements.namedItem('name').focus();return;}
 const frequency=v('frequency');if(!['daily','everyNDays','timesPerWeek','timesPerMonth','timesInDays','selectedDays'].includes(frequency))return;
 const everyNDays=Number(v('everyNDays')),timesPerWeek=Number(v('timesPerWeek')),timesPerMonth=Number(v('timesPerMonth')),timesInDaysCount=Number(v('timesInDaysCount')),timesInDaysSpan=Number(v('timesInDaysSpan'));
 if(!Number.isInteger(everyNDays)||everyNDays<1||everyNDays>365||!Number.isInteger(timesPerWeek)||timesPerWeek<1||timesPerWeek>7||!Number.isInteger(timesPerMonth)||timesPerMonth<1||timesPerMonth>31||!Number.isInteger(timesInDaysCount)||timesInDaysCount<1||timesInDaysCount>31||!Number.isInteger(timesInDaysSpan)||timesInDaysSpan<1||timesInDaysSpan>365){return;}
 if(frequency==='timesInDays'&&timesInDaysCount>timesInDaysSpan){showToast('TARGET CANNOT EXCEED NUMBER OF DAYS');return;}
 if(!state.protocolEdits||typeof state.protocolEdits!=='object')state.protocolEdits={};
 const weekdays=[...form.querySelectorAll('input[name="weekdays"]:checked')].map(el=>el.value);
 if(frequency==='selectedDays'&&!weekdays.length){showToast('SELECT AT LEAST ONE WEEKDAY');return;}
 const proposed={name,summary:v('summary').trim(),description:v('description').trim(),frequency,everyNDays,timesPerWeek,timesPerMonth,timesInDaysCount,timesInDaysSpan,reminder:prReminderFromInput(v('reminder')),reminderEnabled:form.elements.namedItem('reminderEnabled').checked,notes:v('notes').trim(),weekdays:frequency==='selectedDays'?weekdays:[...PR_WEEKDAYS],components:[...form.querySelectorAll('input[name="componentText"]')].map(el=>el.value.trim()).filter(Boolean).slice(0,24),showComponents:form.elements.namedItem('showComponents').checked,xp:Number(v('xp')),coins:Number(v('coins'))};
 if(proposed.reminderEnabled&&!prReminderToInput(proposed.reminder)){showToast('CHOOSE REMINDER TIME');return;}
 if(!Number.isSafeInteger(proposed.xp)||proposed.xp<0||proposed.xp>10000||!Number.isSafeInteger(proposed.coins)||proposed.coins<0||proposed.coins>10000){showToast('INVALID REWARD VALUE');return;}
 const ok=atomicChange(()=>{
  state.protocolEdits[id]=proposed;
  if(!Array.isArray(state.scheduleHistory[id]))state.scheduleHistory[id]=[];
  state.scheduleHistory[id]=state.scheduleHistory[id].filter(x=>x.effective!==dateAgo(0));
  state.scheduleHistory[id].push({effective:dateAgo(0),config:{frequency,weekdays,everyNDays,timesPerWeek,timesPerMonth,timesInDaysCount,timesInDaysSpan}});
  state.scheduleHistory[id].sort((a,b)=>a.effective.localeCompare(b.effective));
 });
 if(!ok){showToast('PROTOCOL NOT SAVED — STORAGE ERROR');return;}
 const target=PROTOCOLS.find(p=>p.id===id);target.xp=proposed.xp;target.coins=proposed.coins;
 save();$('#overlay').dataset.dirty='0';closePopup();section='detail';selected=id;reminderRequestSync();render();showToast('PROTOCOL PROFILE SAVED');
}

let protocolScoreMode='month' ,protocolHistoryMode='month',protocolCalendarYear=new Date().getFullYear(),protocolInspectDate='';
const PROTOCOL_IMAGES=window.GHOSTED_PHASE2_IMAGES;
const prTwo=n=>String(n).padStart(2,'0');
const prToday=()=>dateAgo(0);
const prKey=(y,m,d)=>`${y}-${prTwo(m)}-${prTwo(d)}`;
const prOldest=()=>Object.keys(state.days).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0]||prToday();
const prIsTracked=d=>d>=prOldest()&&d<=prToday();
const prHas=(id,d)=>done(d).includes(id);
function prCount(id,from,to){
 let eligibleDays=0,completed=0,credited=0;
 const a=new Date(from+'T12:00:00'),b=new Date(to+'T12:00:00');
 if(!Number.isFinite(+a)||!Number.isFinite(+b))return {eligible:0,completed:0,credited:0,rate:null};
 const first=prOldest(),today=prToday(),periods=new Map();let guard=0;
 for(let d=new Date(a);d<=b&&guard++<30000;d.setDate(d.getDate()+1)){
  const k=keyOf(d);if(k<first||k>today||!activeProtocol({id},k))continue;
  if(prHas(id,k))completed++;
  const p=planOf(id,k);
  if(['timesPerWeek','timesPerMonth','timesInDays'].includes(p.frequency)){
   const windowDays=quotaWindowDates(id,k,p);
   const key=p.frequency+':'+windowDays[0];
   if(!periods.has(key))periods.set(key,{target:protocolTarget(id,k),count:0});
   if(prHas(id,k))periods.get(key).count++;
  }else if(eligible(id,k)){eligibleDays++;if(prHas(id,k))credited++;}
 }
 for(const row of periods.values()){eligibleDays+=row.target;credited+=Math.min(row.target,row.count);}
 return {eligible:eligibleDays,completed,credited,rate:eligibleDays?Math.min(100,Math.round(credited/eligibleDays*100)):null};
}
function prShiftDate(date,amount,unit){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);
 if(unit==='day')d.setDate(d.getDate()+amount);
 if(unit==='week')d.setDate(d.getDate()+amount*7);
 if(unit==='month')d.setMonth(d.getMonth()+amount);
 if(unit==='quarter')d.setMonth(d.getMonth()+amount*3);
 if(unit==='year')d.setFullYear(d.getFullYear()+amount);
 return d;
}
function prPeriodStart(date,mode){const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);
 if(mode==='week')d.setDate(d.getDate()-(d.getDay()+6)%7);
 if(mode==='month')d.setDate(1);
 if(mode==='quarter'){d.setMonth(Math.floor(d.getMonth()/3)*3,1)}
 if(mode==='year'){d.setMonth(0,1)}
 return d;
}
function prPeriodEnd(date,mode){const d=prPeriodStart(date,mode);const next=prShiftDate(d,1,mode);next.setDate(next.getDate()-1);return next;}
function prSeries(id,mode){const n=({day:14,week:12,month:12,quarter:8,year:6})[mode]||12;let today=new Date();today.setHours(12,0,0,0);let start=prPeriodStart(today,mode);
 return Array.from({length:n},(_,i)=>{const date=prShiftDate(start,i-(n-1),mode);const last=prPeriodEnd(date,mode);const from=keyOf(date),to=keyOf(last);
 const count=prCount(id,from,to);let label=mode==='day'?from.slice(5):mode==='week'?from.slice(5):mode==='month'?`${prTwo(date.getMonth()+1)}/${String(date.getFullYear()).slice(2)}`:mode==='quarter'?`Q${Math.floor(date.getMonth()/3)+1}/${String(date.getFullYear()).slice(2)}`:String(date.getFullYear());
 return {...count,from,to,label};});
}
function prScoreGraph(id,mode){const records=prSeries(id,mode),w=720,h=150,l=36,r=10,t=12,b=22,iw=w-l-r,ih=h-t-b;
 const x=i=>l+iw*i/(records.length-1), y=v=>t+ih*(1-v/100);
 let path='',run='';for(let i=0;i<records.length;i++){const v=records[i].rate;if(v===null){run='';continue}const seg=`${run?'L':'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;path+=seg;run='on';}
 const grid=[0,25,50,75,100].map(v=>`<line x1="${l}" x2="${w-r}" y1="${y(v)}" y2="${y(v)}" stroke="#1c5a62" stroke-dasharray="3 6"/><text x="2" y="${y(v)+4}" fill="#7eb6c2" font-size="10">${v}%</text>`).join('');
 const pts=records.map((v,i)=>v.rate===null?'':`<circle cx="${x(i)}" cy="${y(v.rate)}" r="3.4" fill="#29edc0"><title>${esc(v.from)} to ${esc(v.to)}: ${v.rate}% (${v.completed}/${v.eligible})</title></circle>`).join('');
 return `<svg class="pr-score-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Protocol completion rate over ${mode} periods">${grid}<path d="${path.trim()}" fill="none" stroke="#2affca" stroke-width="2.5" stroke-linejoin="round"/>${pts}${records.map((v,i)=>`<text text-anchor="middle" x="${x(i)}" y="145" fill="#7eb6c2" font-size="${mode==='day'?8:10}">${esc(v.label)}</text>`).join('')}</svg>`;
}
function prHistoryBars(id,mode){const a=prSeries(id,mode),max=Math.max(1,...a.map(v=>v.completed));return `<div class="pr-hist-bars">${a.map(v=>`<div class="pr-hist-col" title="${esc(v.from)} – ${esc(v.to)} : ${v.completed}/${v.eligible} scheduled days"><span class="pr-bar-val">${v.eligible?v.completed:'—'}</span><i style="height:${v.eligible?Math.max(2,Math.round(100*v.completed/max)):0}%"></i><span class="pr-bar-lab">${esc(v.label)}</span></div>`).join('')}</div>`;}
function prControls(id,which,current){return `<div class="pr-period-controls" role="group" aria-label="${which==='pscore'?'Score':'History'} period">${['day','week','month','quarter','year'].map(m=>`<button type="button" class="pr-period ${m===current?'is-active':''}" aria-pressed="${m===current}" data-command="${which} ${id} ${m}">${m.toUpperCase()}</button>`).join('')}</div>`;}
// V6.5.1 quota streaks count successful quota WINDOWS, not consecutive gym days.
// Day-based protocols retain their original consecutive eligible-day display.
function prQuotaStreaks(id){
 const freq=planOf(id,prToday()).frequency;
 const units={timesPerWeek:'WEEKS',timesPerMonth:'MONTHS',timesInDays:'CYCLES'};
 if(!units[freq])return null;
 const old=prOldest(),today=prToday(),groups=new Map();
 const a=new Date(old+'T12:00:00Z'),b=new Date(today+'T12:00:00Z');
 for(let d=new Date(a),guard=0;d<=b&&guard++<30000;d.setUTCDate(d.getUTCDate()+1)){
  const day=d.toISOString().slice(0,10);
  if(!activeProtocol({id},day))continue;
  const p=planOf(id,day);
  if(p.frequency!==freq)continue;
  const dates=quotaWindowDates(id,day,p),start=dates[0],end=dates.at(-1);
  const key=freq+':'+start;
  if(!groups.has(key))groups.set(key,{start,end,target:protocolTarget(id,day),count:0,activeDays:0});
  const g=groups.get(key);
  // When editing the target mid-period, use the most recent target for that period.
  g.target=protocolTarget(id,day);g.activeDays++;
  if(prHas(id,day))g.count++;
 }
 const periods=[...groups.values()].sort((x,y)=>x.start.localeCompare(y.start));
 const runs=[];let run=null;
 for(const period of periods){
  const passed=period.count>=period.target;
  const open=period.end>=today;
  if(passed){
   if(run)run={...run,end:period.end,n:run.n+1};
   else run={start:period.start,end:period.end,n:1};
  }else if(!open){if(run)runs.push(run);run=null;}
  // An unfinished *current* window does not break the successful-period streak.
 }
 if(run)runs.push(run);
 runs.sort((a,b)=>b.n-a.n||b.end.localeCompare(a.end));
 let current=0;
 for(let i=periods.length-1;i>=0;i--){
  const x=periods[i];
  if(i===periods.length-1&&x.end>=today&&x.count<x.target)continue;
  if(x.count<x.target)break;
  current++;
 }
 return {cur:current,runs,unit:units[freq]};
}
function prOverview(id){const old=prOldest(),today=prToday(),life=prCount(id,old,today),monthStart=new Date();monthStart.setDate(1);const month=prCount(id,keyOf(monthStart),today);const yesterday=prShiftDate(new Date(),-30,'day');const prev=prCount(id,keyOf(yesterday),today);
 let streak=0,cur=0,runs=[];const first=new Date(old+'T12:00:00'),end=new Date(today+'T12:00:00');
 let started='';for(let d=new Date(first),guard=0;d<=end&&guard++<1000000;d.setDate(d.getDate()+1)){const key=keyOf(d);if(!eligible(id,key))continue;if(prHas(id,key)){if(cur===0)started=key;cur++}else if(cur){runs.push({start:started,end:keyOf(prShiftDate(d,-1,'day')),n:cur});cur=0;}}
 if(cur)runs.push({start:started,end:today,n:cur});runs.sort((a,b)=>b.n-a.n||b.end.localeCompare(a.end));
 const last=prHas(id,today)?today:dateAgo(1);let c=0;for(let i=0;i<1000000;i++){const k=keyOf(prShiftDate(new Date(last+'T12:00:00'),-i,'day'));if(k<old)break;if(!eligible(id,k))continue;if(!prHas(id,k))break;c++}
 const delta=month.rate===null||prev.rate===null?null:month.rate-prev.rate;
 const quota=prQuotaStreaks(id);
 return {life,month,delta,cur:quota?quota.cur:c,runs:quota?quota.runs:runs,streakUnit:quota?quota.unit:'DAYS'};
}
function prCalendar(id){const y=protocolCalendarYear,first=new Date(y,0,1,12),end=new Date(y,11,31,12),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));const columns=[];let lastDate='';
 for(let d=new Date(start);d<=end;d.setDate(d.getDate()+7)){
 const col=[];for(let j=0;j<7;j++){const day=new Date(d);day.setDate(d.getDate()+j);const k=keyOf(day);lastDate=k;const rest=optionalRestDay(id,k);let cls=day.getFullYear()!==y?'outside':!prIsTracked(k)?'untracked':prHas(id,k)?(id===5&&state.mildDays?.[k]?'mild':'complete'):rest?'rest':'missed';
 const isSelected=k===protocolInspectDate;
 col.push(`<button class="pr-day ${cls}${isSelected?' selected':''}" type="button" data-command="pday ${id} ${k}" title="${esc(k)} — ${!prIsTracked(k)?'UNTRACKED':prHas(id,k)?(id===5&&state.mildDays?.[k]?'MILD — AUTHORIZED EXCEPTION':'STRICT / COMPLETE'):rest?'OPTIONAL REST':'NOT COMPLETE'}" aria-label="${esc(k)} ${!prIsTracked(k)?'untracked':prHas(id,k)?(id===5&&state.mildDays?.[k]?'mild authorized completion':'strict complete'):rest?'optional rest':'incomplete'}">${day.getDate()}</button>`);
 }
 columns.push(`<div class="pr-calendar-week">${col.join('')}</div>`);
 }
 return `${sectionHead('CALENDAR // COMPLETE HISTORY',`${y} / ${prOldest()} → ${prToday()}`)}
 <div class="pr-calendar-nav">${action('[ ◀ PREVIOUS YEAR ]',`pcal ${id} ${y-1}`)}<b>${y}</b>${action('[ NEXT YEAR ▶ ]',`pcal ${id} ${y+1}`)}${action('[ CURRENT YEAR ]',`pcal ${id} ${new Date().getFullYear()}`)}</div>
 <div class="pr-calendar-viewport" aria-label="Scrollable full-year calendar; swipe sideways to browse"><div class="pr-calendar-head"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div><div class="pr-calendar-track">${columns.join('')}</div></div>
 <div class="pr-calendar-key"><span><i class="complete"></i> RECORDED</span><span><i class="mild"></i> MILD / FOOD PASS</span><span><i class="missed"></i> INCOMPLETE</span><span><i class="rest"></i> TARGET MET / REST OPTIONAL</span><span><i class="untracked"></i> OUTSIDE TRACKED HISTORY</span></div>
 <p class="pr-aside">SWIPE HORIZONTALLY / SHIFT-SCROLL • USE YEAR CONTROLS TO BROWSE ANY YEAR • TAP A DATE TO INSPECT ITS RECORD</p>
 ${protocolInspectDate?prDateInspector(id,protocolInspectDate):''}`;
}
function prDateInspector(id,d){const tracked=prIsTracked(d),has=prHas(id,d),stateText=!tracked?'NO TRACKED RECORD':has?(id===5&&state.mildDays?.[d]?'MILD / AUTHORIZED':'STRICT / COMPLETE'):'MISSED / NOT COMPLETED';return `<div class="pr-date-inspect"><span class="info">INSPECT // ${esc(d)}</span><b class="${has?'good':'warn'}">${stateText}</b><span class="muted">${tracked?'Backfill supported — use the buttons to record or undo this protocol for the selected date. Historical corrections never award new XP or coins; statistics and streaks update.':'This date is outside the tracked history range.'}</span>${tracked?action(has?'[ UNDO FOR THIS DATE ]':'[ MARK COMPLETE FOR THIS DATE ]',`phset ${id} ${d} ${has?'off':'on'}`):''}${action('[ CLOSE ]',`pday ${id} close`)}</div>`;}
function prFrequency(id){const year=new Date().getFullYear(),now=new Date();const months=Array.from({length:12},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+i,1,12);return d;});
 return `<div class="pr-frequency"><div class="pr-freq-header"><span>DAY</span>${months.map(d=>`<span title="${d.toLocaleString('en',{month:'long',year:'numeric'})}">${d.toLocaleString('en',{month:'short'}).toUpperCase()}</span>`).join('')}</div>${['MON','TUE','WED','THU','FRI','SAT','SUN'].map((wd,day)=>`<div class="pr-freq-row"><span>${wd}</span>${months.map(d=>{const start=new Date(d.getFullYear(),d.getMonth(),1,12);const end=new Date(d.getFullYear(),d.getMonth()+1,0,12);let pass=0,total=0;for(let k=new Date(start);k<=end;k.setDate(k.getDate()+1)){if((k.getDay()+6)%7!==day)continue;const key=keyOf(k);if(!prIsTracked(key)||!eligible(id,key))continue;total++;if(prHas(id,key))pass++;}const ratio=total?pass/total:0;const op=total?(.18+ratio*.82).toFixed(2):.08;return `<i title="${d.toLocaleString('en',{month:'short',year:'numeric'})} ${wd}: ${pass}/${total}" style="opacity:${op}" class="${!total?'empty':''}"></i>`;}).join('')}</div>`).join('')}</div>`;
}
function prNiceDate(date){return new Date(date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function prDetailAnalytics(id){const ov=prOverview(id),completed=ov.life.completed;const today=done().includes(id);
 return `<div class="pr-analytics">
 ${sectionHead('INDIVIDUAL INTEL // PERFORMANCE','SHARED LOCAL HISTORY')}
 <div class="pr-overview"><div><b>${ov.life.rate===null?'—':ov.life.rate+'%'}</b><small>LIFETIME SCORE</small></div><div><b>${ov.month.rate===null?'—':ov.month.rate+'%'}</b><small>THIS MONTH</small></div><div><b>${completed}</b><small>TOTAL DAYS</small></div><div><b>${ov.cur}</b><small>CURRENT STREAK / ${ov.streakUnit}</small></div></div>
 ${sectionHead('SCORE // COMPLETION RATE', 'SELECT TIME SCALE')}${prControls(id,'pscore',protocolScoreMode)}${prScoreGraph(id,protocolScoreMode)}
 ${sectionHead('HISTORY // COMPLETED DAYS','SELECT TIME SCALE')}${prControls(id,'phistory',protocolHistoryMode)}${prHistoryBars(id,protocolHistoryMode)}
 ${prCalendar(id)}
 ${sectionHead('BEST STREAKS',ov.streakUnit==='DAYS'?'LONGEST CONSECUTIVE DAYS':`SUCCESSFUL ${ov.streakUnit} IN A ROW`)}
 <div class="pr-streaks">
 ${ov.runs.length?`<div class="pr-streak-list">${ov.runs.slice(0,5).map(r=>`<div class="pr-streak-item"><time>${prNiceDate(r.start)}</time><b>${r.n}</b><time>${prNiceDate(r.end)}</time></div>`).join('')}</div><div class="pr-streak-record"><time>${prNiceDate(ov.runs[0].start)}</time><div class="pr-streak-record-bar">${ov.runs[0].n} ${ov.streakUnit}</div><time>${prNiceDate(ov.runs[0].end)}</time></div>`:'<div class="muted">NO STREAK HISTORY YET</div>'}
 </div>
 ${sectionHead('FREQUENCY // WEEKDAY DISTRIBUTION','LAST 12 MONTHS')}${prFrequency(id)}
 <div class="pr-explain info">Analytics use the local schedule and saved history. Historical corrections never change earned XP or coins. This website does not synchronize with the Android app.</div>
 </div>`;
}


function protocolPage(){const s=service();const active=activeProtocols(),archived=state.customProtocols.filter(x=>!activeProtocol({id:x.id}));return `
${sectionHead('PROTOCOL REGISTRY // ACTIVE',`${active.length} ACTIVE / ${archived.length} ARCHIVED`)}
<div class="pr-create-actions">${action('[ + CREATE PROTOCOL ]','pnew','pr-create-button')}${action('[ OPEN CONSISTENCY MATRIX ]','matrix')}</div>
${sectionHead('DAILY EXECUTION REGISTER',`${s.allTodayCount}/${active.length} RECORDED TODAY`)}
<div class="pr-register-head"><span>PROTOCOL // OPEN DETAILS</span><span>FREQUENCY / GOAL</span><span>EXECUTE</span></div>
${active.map(p=>{const m=prProfile(p.id),complete=s.today.includes(p.id),due=eligible(p.id,dateAgo(0)),limited=!!(planOf(p.id,dateAgo(0)).frequency.match(/^timesPer(Week|Month)$/)),target=protocolTarget(p.id,dateAgo(0));const sessions=limited?windowCount(p.id,dateAgo(0),planOf(p.id,dateAgo(0)).frequency,true):0;const resting=limited&&sessions>=target&&!complete;return `<div class="pr-register-row">
<div class="pr-reg-title"><b class="num">[${pad(p.id)}]</b><div>${action(m.name,`open ${p.id}`,'pr-title-action')}</div></div>
<div class="pr-reg-schedule">${esc(prFrequencyLabel(m))}${limited?`<div class="pr-quota">${Math.min(target,sessions)}/${target} TARGET • ${sessions} ACTUAL</div>`:''}${m.reminder?`<small>${esc(m.reminder)}</small>`:''}</div>
<div class="pr-reg-check"><button type="button" role="checkbox" aria-checked="${complete}" aria-label="${complete?'Undo':'Complete'} ${esc(m.name)} today" class="pr-check ${complete?'checked':resting?'rest-day':''}" data-command="${complete?`undo ${p.id}`:`complete ${p.id}`}" title="${complete?'Undo this day':resting?'Target met — optional bonus activity':'Record your execution'}">${complete?'✓':resting?'·':''}</button><span class="${complete?'good':resting?'pr-rest-label':'info'}">${complete?'DONE':resting?'REST':'READY'}</span></div>
</div>`}).join('')}
${archived.length?`${sectionHead('ARCHIVED PROTOCOLS','HISTORY RETAINED')}<div class="pr-archived">${archived.map(p=>`<div class="pr-archived-row"><span>[${pad(p.id)}] ${esc(prProtocolName(p.id))}</span>${action('[ RESTORE ]',`prestore ${p.id}`)}</div>`).join('')}</div>`:''}
${sectionHead('DAILY STATUS','RECORDED / REQUIRED')}
<div class="terminal-metric-row"><span>RECORDED <b>${s.allTodayCount}</b></span><span>REQUIRED TODAY <b>${s.todayScheduled}</b></span><span>PERFECT DAY <b>${full(dateAgo(0))?'ACHIEVED':'PENDING'}</b></span></div>
<div class="pr-explain info help-copy">Tap a name to inspect or edit it. Check a box to record execution. Weekly targets accept ANY days; extra sessions still count, with no extra XP or coins.</div>`;}
function detailPage(id){const p=PROTOCOLS.find(q=>q.id===id);if(!p)return errorPage('PROTOCOL NOT FOUND');const m=prProfile(id),completed=done().includes(id),recent=Object.keys(state.days).filter(d=>d<=prToday()&&prHas(id,d)).sort().reverse().slice(0,6),ov=prOverview(id);
 return `<div class="term-line info">&lt;&lt; PROTOCOLS / PUBLIC / ${esc(m.name)} &gt;&gt;</div>
 <div class="pr-concept-hero">
 <div class="pr-concept-art ${id>5?'no-art':''}" aria-label="Protocol identity">
 ${id<=5?`<div class="pr-concept-portrait"><img src="${PROTOCOL_IMAGES[(id-1)*2]}" alt="${esc(m.name)} identity" loading="eager"></div><div class="pr-concept-equipment"><img src="${PROTOCOL_IMAGES[(id-1)*2+1]}" alt="${esc(m.name)} equipment" loading="eager"></div>`:`<div class="pr-concept-portrait"><div class="pr-custom-identity">[ ${pad(id)} ]<br>OPERATOR<br>PROTOCOL</div></div>`}
 </div>
 <div class="pr-concept-info">
   <div class="pr-concept-topline"><h2>${esc(m.name)}</h2>${action('✏️ EDIT',`pedit ${id}`,'pr-pencil')}${id>5?action('[ ARCHIVE ]',`parchive ${id}`,'pr-pencil'):''}</div>
   <div class="pr-public-badge">PUBLIC PROTOCOL</div>
   <div class="pr-concept-subtitle">${esc(m.summary)}</div>
   <div class="pr-concept-summary">${esc(m.objective)}</div>
   <div class="pr-concept-separator"></div>
   ${m.showComponents?`<div class="pr-concept-field"><span>COMPONENTS</span><div>${(m.components||[]).map(x=>`<div>${esc(x)}</div>`).join('')||'<span class="muted">NO COMPONENTS</span>'}</div></div>`:''}
   <div class="pr-concept-field"><span>FREQUENCY</span><b>${esc(prFrequencyLabel(m))}</b></div>
   <div class="pr-concept-field"><span>REMINDER</span><b>${m.reminder?esc(m.reminder):'NOT SET'}</b></div>
   <div class="pr-concept-field"><span>TYPE</span><b>PUBLIC PROTOCOL</b></div>
   <div class="pr-concept-field"><span>STATUS</span><b class="good">ACTIVE</b></div>
   <div class="pr-concept-field"><span>REWARD</span><b>${p.xp} XP / ${p.coins} GC</b></div>
 </div></div>
 ${m.notes?`${sectionHead('NOTES // OPERATOR MEMO','PROFILE SETTINGS')}<div class="pr-concept-notes">${esc(m.notes)}</div>`:''}
 ${sectionHead("TODAY'S STATUS",'LIVE BROWSER RECORD')}
 <div class="pr-concept-today"><div><span>REMINDER</span><b>${m.reminder?esc(m.reminder):'—'}</b></div><div><span>STATUS</span><b class="${completed?'good':'warn'}">${completed?'✓ COMPLETE':'◷ PENDING'}</b></div><div class="pr-concept-today-action"><span>TODAY'S ACTION</span>${action(completed?'[ ✓ UNDO ]':'[ >> EXECUTE PROTOCOL ]',completed?`undo ${id}`:`complete ${id}`,'pr-exec-action')}</div></div>
 <div class="pr-concept-stats"><div><span>CURRENT STREAK</span><b>${ov.cur} DAYS</b></div><div><span>COMPLETIONS</span><b>${ov.life.completed} TOTAL</b></div><div><span>LAST EXECUTED</span><b>${recent[0]||'—'}</b></div></div>
 ${sectionHead('RECENT HISTORY','LAST 6 EXECUTIONS')}
 <div class="pr-recent">${recent.map(d=>`<span><b class="good">[OK]</b> ${esc(d)}</span>`).join('')||'<span class="muted">NO EXECUTIONS RECORDED</span>'}</div>
 ${prDetailAnalytics(id)}
 <div class="footer-actions">${action('[ ← BACK TO PROTOCOLS ]','protocols')}${action('[ GLOBAL INTEL ]','intel')}</div>`;}


/* V6.6 / GOAL MANAGEMENT. Legacy state.missions retained unmodified for backup compatibility.
   Operations never writes public rewardLedger, protocol days, ranks, coins or Vault state. */
let opsView='home',opsCategory='short',opsSelected=null,opsShowArchived=false;
const opsKindLabel=kind=>kind==='long'?'LONG-TERM GOALS':'SHORT-TERM GOALS';
const opsGoalCode=g=>g.code||((g.category==='long'?'L':'S')+String(g.id).padStart(2,'0'));
const opsLog=(g,type,detail)=>{g.activity=Array.isArray(g.activity)?g.activity:[];g.activity.unshift({at:new Date().toISOString(),type,detail:String(detail).slice(0,140)});g.activity=g.activity.slice(0,100);g.updatedAt=new Date().toISOString();};
const opsStatus=g=>g.status==='archived'?'ARCHIVED':g.status==='completed'?'COMPLETED':'ACTIVE';
function opsProgress(g){const total=g.objectives.length,done=g.objectives.filter(x=>x.done).length;return {total,done,pct:total?Math.round(done/total*100):0};}
const opsHtmlButton=(label,command,cls='')=>`<button type="button" class="ops-action ${cls}" data-command="${esc(command)}">${esc(label)}</button>`;
function opsCategorySwitch(){return `<div class="ops-switch" role="group" aria-label="Goal category">
 <button type="button" data-command="goal list short" data-selected="${opsCategory==='short'}">[01] SHORT-TERM GOALS</button>
 <button type="button" data-command="goal list long" data-selected="${opsCategory==='long'}">[02] LONG-TERM GOALS</button></div>`;}
function opsHero(){return `<div class="ops-hero"><div class="ops-slogan">DISCIPLINE<br>CREATES<br>FREEDOM.<b></b><em>EXECUTE.<br>IMPROVE.<br>DISAPPEAR.</em><b></b></div><div class="ops-ghost"><img class="v68-hero-img" src="${window.GHOSTED_V68_IMAGES.operations}" alt="Operations tactical Ghost operator"/></div></div>`;}
function opsActivityList(count=6, only=null){const items=(only?[only]:state.goals).flatMap(g=>(g.activity||[]).map(a=>({...a,code:opsGoalCode(g),name:g.name}))).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,count);
 return items.length?`<div class="ops-activity">${items.map(a=>`<div class="ops-activity-row"><span class="good">[OK]</span><span>${esc(a.code)} // ${esc(a.detail)}</span><time>${esc(new Date(a.at).toLocaleDateString(undefined,{month:'short',day:'numeric'}))}</time></div>`).join('')}</div>`:'<div class="ops-empty">NO GOAL ACTIVITY RECORDED YET.</div>';}
function opsStats(){const visible=state.goals.filter(g=>g.status!=='archived'),complete=visible.filter(g=>g.status==='completed').length,objectives=visible.reduce((n,g)=>n+opsProgress(g).total,0),done=visible.reduce((n,g)=>n+opsProgress(g).done,0);return `<div class="ops-metrics"><div><small>ACTIVE GOALS</small><strong>${visible.length-complete}</strong></div><div><small>COMPLETED GOALS</small><strong>${complete}</strong></div><div><small>OBJECTIVES DONE</small><strong>${done}/${objectives}</strong></div></div>`;}
function opsList(){const items=state.goals.filter(g=>g.category===opsCategory&&(opsShowArchived||g.status!=='archived')).slice().sort((a,b)=>{
 const order={active:0,completed:1,archived:2};return (order[a.status]??0)-(order[b.status]??0)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));});
 const active=state.goals.filter(g=>g.category===opsCategory&&g.status==='active').length;
 return `${opsHero()}${opsCategorySwitch()}
 <div class="ops-head"><span>${opsKindLabel(opsCategory)} // ${active} ACTIVE</span>${opsHtmlButton('[+] ADD NEW',`goal create ${opsCategory}`,'ops-primary')}</div>
 <div class="ops-table-head"><span>#</span><span>GOAL</span><span>PROGRESS</span><span>STATUS</span></div>
 ${items.length?items.map(g=>{const p=opsProgress(g);return `<button type="button" class="ops-goal-row ${opsSelected===g.id?'ops-selected':''}" data-command="goal open ${g.id}" aria-label="Open ${esc(g.name)}">
 <span class="ops-goal-code">[${esc(opsGoalCode(g))}]</span><span class="ops-goal-name">${esc(g.name)}</span><span class="ops-progress-inline"><span>${p.done}/${p.total}</span><span class="ops-progress-track"><span class="ops-progress-fill" style="width:${p.pct}%"></span></span></span><span class="ops-goal-status ${g.status==='completed'?'ops-done':''}">[${opsStatus(g)}]</span></button>`;}).join(''):'<div class="ops-empty">NO GOALS IN THIS CATEGORY. SELECT [+] ADD NEW TO CREATE YOUR FIRST GOAL.</div>'}
 <div class="ops-footer">${opsHtmlButton(opsShowArchived?'[ HIDE ARCHIVED ]':'[ SHOW ARCHIVED ]','goal archived')}${opsHtmlButton('[ OPERATIONS HOME ]','goal home')}${opsHtmlButton('[ SYSTEM ]','system')}</div>`;}
function opsDetail(){const g=state.goals.find(x=>x.id===opsSelected);if(!g){opsView='list';return opsList();}
 opsCategory=g.category;const p=opsProgress(g),closed=g.status==='archived',items=g.objectives;
 const bars=items.length<=30?`<div class="ops-big-bar" style="--ops-total:${Math.max(1,items.length)}">${items.map(x=>`<i class="${x.done?'lit':''}"></i>`).join('')}</div>`:`<div class="ops-progress-track" style="max-width:none;height:22px"><span class="ops-progress-fill" style="width:${p.pct}%"></span></div>`;
 return `${opsCategorySwitch()}<div class="ops-head"><span>GOAL DETAIL // ${esc(opsGoalCode(g))}</span><small>${opsKindLabel(g.category)}</small></div>
 <section class="ops-goal-preview"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start;flex-wrap:wrap"><h2>[${esc(opsGoalCode(g))}] ${esc(g.name.toUpperCase())}</h2><span class="${closed?'warn':'good'}">[${opsStatus(g)}]</span></div>
 <div class="ops-description">${esc(g.description||'NO DESCRIPTION ENTERED')}</div><div class="ops-stats-row"><span>PROGRESS // ${p.done} / ${p.total}</span><strong class="good">${p.pct}%</strong></div>${bars}
 <div class="ops-details-meta"><span>CREATED: <strong>${esc(g.createdAt.slice(0,10))}</strong></span><span>TARGET DATE: <strong>${esc(g.deadline||'NOT SET')}</strong></span>${g.completedAt?`<span>COMPLETED: <strong>${esc(g.completedAt.slice(0,10))}</strong></span>`:''}</div>
 <div class="ops-head"><span>${g.category==='long'?'MILESTONES':'OBJECTIVES'} // ${items.length}</span><small>${closed?'ARCHIVED / READ ONLY':'TAP TO TOGGLE'}</small></div>
 ${items.map((x,i)=>`<button type="button" class="ops-objective ${x.done?'done':''}" data-command="goal toggle ${g.id} ${x.id}" ${closed?'disabled':''} aria-pressed="${!!x.done}"><span class="ops-objective-mark">${x.done?'✓':' '}</span><span class="ops-objective-label">${i+1}. ${esc(x.title)}</span></button>`).join('')}
 <div class="ops-helper">OBJECTIVES ARE SINGLE ACHIEVEMENTS; USE PROTOCOLS FOR RECURRING DAILY HABITS.</div>
 <div class="ops-footer">${closed?opsHtmlButton('[ RESTORE GOAL ]',`goal restore ${g.id}`,'ops-primary'):opsHtmlButton('[ EDIT ]',`goal edit ${g.id}`,'ops-primary')+opsHtmlButton('[ ARCHIVE ]',`goal archive ${g.id}`,'ops-warn')}${opsHtmlButton('[ DELETE ]',`goal delete ${g.id}`,'ops-danger')}</div></section>
 ${sectionHead('GOAL ACTIVITY','PERSISTENT RECORD')}${opsActivityList(12,g)}
 <div class="ops-footer">${opsHtmlButton('[ ← '+opsKindLabel(g.category)+' ]',`goal list ${g.category}`)}${opsHtmlButton('[ OPERATIONS HOME ]','goal home')}${opsHtmlButton('[ SYSTEM ]','system')}</div>`;}
function opsHome(){const s=state.goals.filter(g=>g.category==='short'&&g.status!=='archived'),l=state.goals.filter(g=>g.category==='long'&&g.status!=='archived');return `${opsHero()}${opsCategorySwitch()}
 ${sectionHead('OPERATIONS // GOAL COMMAND','SHORT / LONG')}
 <div class="term-line ops-helper">PROTOCOLS TRACK REPEATED ACTIONS. OPERATIONS TRACK LIFE GOALS AND MILESTONES. NO XP OR GC AWARDED HERE.</div>
 ${opsStats()}
 <div class="ops-head"><span>SHORT-TERM GOALS</span><small>${s.filter(g=>g.status==='active').length} ACTIVE</small></div>
 <div class="ops-stats-row"><span>${s.length} SAVED GOALS // DAYS TO WEEKS</span>${opsHtmlButton('[ OPEN → ]','goal list short')}</div>
 <div class="ops-head"><span>LONG-TERM GOALS</span><small>${l.filter(g=>g.status==='active').length} ACTIVE</small></div>
 <div class="ops-stats-row"><span>${l.length} SAVED GOALS // MONTHS TO YEARS</span>${opsHtmlButton('[ OPEN → ]','goal list long')}</div>
 ${sectionHead('RECENT GOAL ACTIVITY','LATEST FIRST')}${opsActivityList(5)}
 <div class="ops-footer">${opsHtmlButton('[ + CREATE GOAL ]',`goal create ${opsCategory}`,'ops-primary')}${opsHtmlButton('[ SYSTEM ]','system')}</div>`;}
function operationsPage(){return `<div class="ops-shell">${opsView==='detail'?opsDetail():opsView==='list'?opsList():opsHome()}</div>`;}
function opsEditor(id,category='short'){
 const found=state.goals.find(g=>g.id===id);const g=found||{id:0,category,name:'',description:'',deadline:'',objectives:[{id:1,title:'',done:false}]};
 const obj=g.objectives.length?g.objectives:[{id:1,title:'',done:false}];
 popup(`<form id="ops-editor" class="ops-editor" data-id="${g.id}">
 <h2>OPERATIONS // ${found?'EDIT':'CREATE'} GOAL</h2>
 <div class="ops-editor-grid"><label>CATEGORY<select name="category"><option value="short" ${g.category==='short'?'selected':''}>SHORT-TERM GOAL</option><option value="long" ${g.category==='long'?'selected':''}>LONG-TERM GOAL</option></select></label><label>OPTIONAL TARGET DATE<input type="date" name="deadline" value="${esc(g.deadline||'')}"></label></div>
 <label>GOAL NAME<input name="name" required minlength="2" maxlength="90" value="${esc(g.name)}" placeholder="e.g. Become Stronger"></label>
 <label>DESCRIPTION<textarea name="description" maxlength="800" placeholder="What are you working toward?">${esc(g.description)}</textarea></label>
 <div class="good bold">${g.category==='long'?'MILESTONES':'OBJECTIVES'} // CHECKLIST</div>
 <div class="ops-editor-rows" id="ops-editor-rows">${obj.map((x,i)=>`<div class="ops-editor-row" data-objective-id="${x.id}" data-objective-done="${x.done?'1':'0'}" data-objective-date="${esc(x.doneAt||'')}"><span class="info">${pad(i+1)}</span><input aria-label="Objective ${i+1}" maxlength="180" value="${esc(x.title)}" placeholder="An achievable outcome"><button type="button" title="Remove objective" data-ops-remove>×</button></div>`).join('')}</div>
 <button type="button" class="ops-editor-add" id="ops-add-objective">[ + ADD ${g.category==='long'?'MILESTONE':'OBJECTIVE'} ]</button>
 <div class="ops-helper">Each item is completed once. Changes to a finished goal may reopen it if you add unfinished objectives. No XP or coins are earned.</div>
 <div class="ops-editor-footer"><button type="submit">[ ${found?'SAVE CHANGES':'CREATE GOAL'} ]</button><button type="button" data-editor-cancel>[ CANCEL ]</button></div>
 </form>`);
}
function opsAddObjective(){const rows=document.querySelector('#ops-editor-rows');if(!rows||rows.children.length>=60){showToast('MAXIMUM 60 OBJECTIVES PER GOAL');return;}
 const row=document.createElement('div');row.className='ops-editor-row';row.dataset.objectiveId='0';row.dataset.objectiveDone='0';row.innerHTML=`<span class="info">${pad(rows.children.length+1)}</span><input maxlength="180" aria-label="New objective" placeholder="An achievable outcome"><button type="button" data-ops-remove title="Remove objective">×</button>`;rows.append(row);row.querySelector('input').focus();document.querySelector('#overlay').dataset.dirty='1';}
function opsSaveGoal(e){e.preventDefault();const f=e.target,id=Number(f.dataset.id),old=state.goals.find(x=>x.id===id),name=f.elements.namedItem('name').value.trim(),description=f.elements.namedItem('description').value.trim(),category=f.elements.namedItem('category').value,deadline=f.elements.namedItem('deadline').value;
 if(!['short','long'].includes(category)||name.length<2||name.length>90||description.length>800||(deadline&&!validDate(deadline))){showToast('CHECK GOAL DETAILS');return;}
 const rows=[...f.querySelectorAll('.ops-editor-row')];const raw=rows.map(r=>({id:Number(r.dataset.objectiveId)||0,title:(r.querySelector('input')?.value||'').trim(),done:r.dataset.objectiveDone==='1',doneAt:r.dataset.objectiveDate||null}));
 if(!raw.length||raw.length>60||raw.some(x=>!x.title||x.title.length>180)){showToast('ADD AT LEAST ONE VALID OBJECTIVE');return;}
 if(!old&&state.goals.length>=200){showToast('MAXIMUM 200 GOALS');return;}
 const now=new Date().toISOString();let targetId=id;
 const success=atomicChange(()=>{
  const existing=old?state.goals.find(x=>x.id===id):null;
  const maxId=state.goals.reduce((m,x)=>Math.max(m,x.id),0);
  const maxCode=state.goals.filter(x=>x.category===category).reduce((m,x)=>Math.max(m,Number((x.code||'').replace(/\D/g,''))||0),0);
  const code=(category==='long'?'L':'S')+String(maxCode+1).padStart(2,'0');
  const g=existing||{id:maxId+1,code,createdAt:now,activity:[],status:'active',completedAt:null};
  targetId=g.id;
  const prior=g.objectives||[];let nextNumber=Math.max(0,...prior.map(x=>x.id));
  const next=raw.map(x=>{const p=prior.find(z=>z.id===x.id);return p?{id:p.id,title:x.title,done:p.done,doneAt:p.doneAt||null}:{id:++nextNumber,title:x.title,done:false,doneAt:null};});
  if(existing&&g.category!==category)g.code=code;
  Object.assign(g,{name,description,category,deadline,objectives:next,updatedAt:now});
  const all=next.length>0&&next.every(x=>x.done);
  if(g.status!=='archived'){
   if(all){if(g.status!=='completed'){g.status='completed';g.completedAt=now;opsLog(g,'completed','Goal completed after editing objectives');}}
   else if(g.status==='completed'){g.status='active';g.completedAt=null;opsLog(g,'reopened','Goal reopened after editing objectives');}
  }
  opsLog(g,existing?'edited':'created',existing?'Goal details updated':'Goal created');
  if(!existing)state.goals.push(g);
 });
 if(!success){showToast('GOAL SAVE FAILED — STORAGE UNAVAILABLE');return;}
 const beforeRoute=v63RouteSnapshot();$('#overlay').dataset.dirty='0';closePopup(true);opsSelected=targetId;opsCategory=category;opsView='detail';section='operations';render();v63CommitNavigation(beforeRoute);showToast('GOAL SAVED');
}
function opsToggle(id,objId){const g=state.goals.find(x=>x.id===id),x=g?.objectives.find(x=>x.id===objId);if(!g||!x||g.status==='archived')return;
 const success=atomicChange(()=>{const now=new Date().toISOString();x.done=!x.done;x.doneAt=x.done?now:null;opsLog(g,x.done?'objective.completed':'objective.reopened',`${x.done?'Completed':'Reopened'}: ${x.title}`);
 const all=g.objectives.every(y=>y.done);if(all&&g.status!=='completed'){g.status='completed';g.completedAt=now;opsLog(g,'completed','All objectives completed — goal achieved');}
 else if(!all&&g.status==='completed'){g.status='active';g.completedAt=null;opsLog(g,'reopened','Goal reopened after an objective was unchecked');}});
 if(success)hardwareEffect(g.status==='completed'?'success':x.done?'switch':'undo');
 showToast(success?'PROGRESS SAVED':'PROGRESS SAVE FAILED');
}
function opsArchive(id,restore=false){const g=state.goals.find(x=>x.id===id);if(!g)return;
 const success=atomicChange(()=>{if(restore){g.status=g.objectives.every(x=>x.done)?'completed':'active';g.archivedAt=null;opsLog(g,'restored','Goal restored from archive');}else{g.status='archived';g.archivedAt=new Date().toISOString();opsLog(g,'archived','Goal archived; progress preserved');}});
 showToast(success?(restore?'GOAL RESTORED':'GOAL ARCHIVED'):'COULD NOT SAVE GOAL');}
function opsDelete(id){const g=state.goals.find(x=>x.id===id);if(!g)return;
 if(!confirm(`Permanently delete ${opsGoalCode(g)}: ${g.name}? All objectives and activity for this goal will be erased. Archiving is safer.`))return;
 const success=atomicChange(()=>{state.goals=state.goals.filter(x=>x.id!==id);});if(success){opsSelected=null;opsView='list';showToast('GOAL DELETED');}else showToast('DELETE FAILED');}
function careerPage(){const s=service();const percent=(s.xp-s.prevLevelXp)/(s.nextLevelXp-s.prevLevelXp);const next=s.next;const recent=Object.keys(state.days).filter(d=>d<=dateAgo(0)).sort().reverse();const recentComplete=recent.flatMap(d=>done(d).map(id=>({day:d,id}))).slice(0,5);const visibleRankStart=Math.max(0,Math.min(94,s.current.order-3));const visible=RANKS.slice(visibleRankStart,visibleRankStart+7);
return `
<div class="career-hero"><div class="rank-frame"><span class="corner tl"></span><span class="corner tr"></span><img src="${esc(s.current.image)}" alt="Approved ${esc(s.current.title)} insignia"/><span class="corner bl"></span><span class="corner br"></span></div><div class="career-main"><div class="label">CURRENT RANK</div><div class="rank-name warn">${esc(s.current.title.toUpperCase())}</div><div class="info">TIER ${pad(s.current.division)} &nbsp; // ${esc(s.current.divisionName.toUpperCase())}</div><div class="career-fields">${metric('LEVEL',pad(s.level))}${metric('TOTAL XP',`${short(s.xp)} / ${short(s.nextLevelXp)}`)}${metric('PROGRESS',`${bar(percent,15)} &nbsp; ${Math.floor(percent*100)}%`)}${metric('GHOST COINS',`<span class="warn">${short(s.coinsBalance)} ◎</span>`)}${metric('TIME IN SERVICE',s.activeDays+' ACTIVE DAYS // SINCE 01 JAN 2026')}${metric('CLEARANCE','TIER '+pad(s.current.division))}${metric('DISCIPLINES',s.todayCount+' / 5 TODAY')}</div><div class="info"><i>"DISCIPLINE CREATES FREEDOM."</i></div></div></div>
${sectionHead('NEXT LEVEL',`${short(s.nextLevelXp-s.xp)} XP TO LEVEL ${s.level+1}`)}
<div class="next-level-info"><span>LEVEL <b>${s.level+1}</b></span><span>CONTINUE EARNING XP THROUGH DAILY PROTOCOLS</span><span>${bar(percent,13)}</span></div>
${sectionHead('NEXT RANK UNLOCK', next?`LEVEL ${next.unlockLevel} REQUIRED`:'FINAL NAMED RANK')}
<div class="next-rank-row">${next?`<img src="${esc(next.image)}" alt="Next rank insignia"/><div><strong class="warn">${esc(next.title.toUpperCase())}</strong><div class="info">TIER ${pad(next.division)}</div></div><div class="next-rank-desc info">REQUIRES LEVEL ${next.unlockLevel}<br>Complete protocols consistently to advance through the career ladder.</div>`:'<div class="good">FINAL NAMED RANK UNLOCKED. YOUR LEVEL CAN CONTINUE INCREASING.</div>'}</div>
${sectionHead('SERVICE RECORD // SUMMARY', 'LOCAL PROFILE')}
<div class="service-dual"><div>${metric('PROTOCOLS COMPLETE',short(s.completed))}${metric('PERFECT DAYS',short(s.perfectDays))}${metric('ACTIVE DAYS',short(s.activeDays))}</div><div>${metric('GHOST COINS EARNED',short(s.coins))}${metric('CURRENT STREAK',s.streak+' DAYS')}${metric('LATEST LEVEL',pad(s.level))}</div></div>
${sectionHead('ACTIVITY HISTORY // RECENT', 'RECORDED EVENTS')}
${recentComplete.length?recentComplete.map(r=>`<div class="promotion-row"><span class="info">[${r.day}]</span><span class="good">COMPLETED ${esc(PROTOCOLS[r.id-1].name)}</span></div>`).join(''):'<div class="info">NO ACTIVITY YET. COMPLETE A PROTOCOL TO BEGIN YOUR RECORD.</div>'}
${sectionHead('RANK LADDER // OPERATOR PROGRESSION','100 ORIGINAL BADGES + 1 HONORARY RANK')}
<div class="ladder-list">${visible.map(r=>`<div class="ladder-row ${r.order===s.current.order?'current':''}"><span class="rank-no">${r.order===s.current.order?'» ':''}[${String(r.order).padStart(3,'0')}]</span><img src="${esc(r.image)}" alt="${esc(r.honorary?"Original rank insignia used as temporary artwork, NOT an approved Ghost Sovereign badge":r.title+" rank insignia")}" loading="lazy"/><span class="ladder-title">${esc(r.title.toUpperCase())}<small>TIER ${pad(r.division)} &nbsp; / &nbsp; LVL ${r.unlockLevel}</small></span><span class="rank-status">${r.order===s.current.order?'[CURRENT]':r.unlockLevel<=s.level?'[UNLOCKED]':'[LOCKED]'}</span></div>`).join('')}</div>
<div class="footer-actions">${action('[ BROWSE 101 RANKS ]','ranks 1')}${action('[ SYSTEM ]','system')}</div>`;}
function ranksPage(page=1){const s=service();page=Math.max(1,Math.min(11,page));rankPage=page;const rows=RANKS.slice((page-1)*10,page*10);return `
${sectionHead('CAREER / RANK DATABASE',`PAGE ${page} / 11`)}
<div class="info">100 original ranks (1–991), plus GHOST SOVEREIGN at Level 1000. Numeric levels never end.</div>
<div class="muted">Icons are original approved transparent rank images from the handoff.</div>
<div class="rank-list">${rows.map(r=>`<div class="rank-entry"><img loading="lazy" src="${esc(r.image)}" alt="${esc(r.honorary?"Existing rank badge temporarily shown for Ghost Sovereign, not a separate approved insignia":r.title+" insignia")}"/><div class="rank-desc"><span class="${r.order===s.current.order?'warn':r.unlockLevel<=s.level?'good':'info'}">[${String(r.order).padStart(3,'0')}] ${esc(r.title.toUpperCase())}</span><br><small>DIV ${pad(r.division)} // LVL ${r.unlockLevel}</small></div><span class="lock">${r.order===s.current.order?'[CURRENT]':r.unlockLevel<=s.level?'[UNLOCKED]':'[LOCKED]'}</span></div>`).join('')}</div>
${sectionHead('DATABASE NAVIGATION','COMMAND: ranks <1..11>')}
<div class="footer-actions">${page>1?action('[ << PREVIOUS ]',`ranks ${page-1}`):''}${page<11?action('[ NEXT >> ]',`ranks ${page+1}`):''}${action('[ CAREER ]','career')}</div>`;}
let matrixRange=28,matrixOffset=0;
function matrixPage(){
 const s=service(),range=matrixRange,dates=Array.from({length:range},(_,i)=>dateAgo((matrixOffset+1)*range-1-i));
 const first=prOldest(),validDates=dates.filter(d=>d>=first&&d<=dateAgo(0));
 const perProtocol=PROTOCOLS.map(p=>prCount(p.id,dates[0],dates[dates.length-1]));
 const completed=perProtocol.reduce((sum,x)=>sum+x.completed,0),credited=perProtocol.reduce((sum,x)=>sum+x.credited,0),possible=perProtocol.reduce((sum,x)=>sum+x.eligible,0);
 const rate=possible?Math.min(100,Math.round(credited*100/possible)):0;
 const perfect=validDates.filter(full).length,active=validDates.filter(d=>done(d).length).length;
 const left=`<div class="mx-rail"><div class="mx-rail-head">OPERATOR PROTOCOL <span>RATE</span></div>${PROTOCOLS.map(p=>{const stats=prCount(p.id,dates[0],dates[dates.length-1]),r=stats.rate??0;return `<div class="mx-rail-row"><button type="button" data-command="open ${p.id}" title="Open ${esc(prProtocolName(p.id))}"><span class="mx-rail-id">${pad(p.id)}</span><span>${esc(prProtocolName(p.id))}</span></button><span class="mx-rail-rate">${r}%</span><i style="--pct:${r}%"></i></div>`;}).join('')}</div>`;
 const headers=dates.map((d,i)=>`<div class="mx-day-head" title="${d}"><b>${i%7===0?d.slice(5,7)+'/'+d.slice(8):''}</b><small>${i%7===0?'MONITOR':''}</small></div>`).join('');
 const lanes=PROTOCOLS.map(p=>`<div class="mx-day-row" style="--mx-days:${range}">${dates.map(d=>{const known=d>=first&&d<=dateAgo(0),due=eligible(p.id,d),has=done(d).includes(p.id),n=done(d).length;return `<button type="button" data-command="day ${d}" class="mx-cell ${!known?'mx-unknown':has?(p.id===5&&state.mildDays?.[d]?'mx-mild':'mx-complete'):optionalRestDay(p.id,d)?'mx-rest':!due?'mx-unknown':n?'mx-missed':'mx-empty'}" aria-label="${esc(prProtocolName(p.id))} ${d}: ${has?'complete':'not completed'}" title="${d} • ${esc(prProtocolName(p.id))}: ${has?(p.id===5&&state.mildDays?.[d]?'MILD / AUTHORIZED':'STRICT / COMPLETE'):optionalRestDay(p.id,d)?'OPTIONAL REST':known&&due?'NOT COMPLETE':'NOT SCHEDULED / NO DATA'}"></button>`;}).join('')}</div>`).join('');
 const dayTotals=dates.map(d=>{const n=done(d).length;return `<button type="button" class="mx-total-cell" data-command="day ${d}" title="${d}: ${n}/${activeProtocols(d).length} recorded" data-level="${n}">${n||'·'}</button>`;}).join('');
 return `${sectionHead('CONSISTENCY MATRIX // MISSION CONTROL',`${range} DAY WINDOW`)}
 <div class="mx-brief"><div><span>WINDOW SCORE</span><b>${rate}%</b><small>VALID DAYS</small></div><div><span>EXECUTIONS</span><b>${completed}</b><small>${credited}/${possible} TARGETS CREDITED</small></div><div><span>PERFECT DAYS</span><b>${perfect}</b><small>OF ${validDates.length}</small></div><div><span>ACTIVE DAYS</span><b>${active}</b><small>OF ${validDates.length}</small></div></div>
 <div class="mx-selector"><div class="mx-selector-left"><b class="good">OPERATOR / EXECUTION GRID</b><span class="info">${dates[0]} → ${dates.at(-1)}</span></div><div class="mx-selector-actions">${[28,56,90].map(n=>`<button type="button" class="terminal-action" data-command="matrix ${n}" data-selected="${n===matrixRange}">[ ${n}D ]</button>`).join('')}${action('[ ◀ OLDER ]','matrixback')}${matrixOffset?action('[ NEWER ▶ ]','matrixnext'):''}</div></div>
 <div class="mx-board"><div class="mx-rails">${left}</div><div class="mx-timeline"><div class="mx-month-mark" style="--mx-days:${range}">${headers}</div>${lanes}<div class="mx-total" style="--mx-days:${range}">${dayTotals}</div></div></div>
 <div class="mx-legend"><span><i class="mx-led mx-complete"></i> EXECUTED</span><span><i class="mx-led mx-mild"></i> MILD / AUTHORIZED</span><span><i class="mx-led mx-empty"></i> NO EXECUTION</span><span><i class="mx-led mx-unknown"></i> NO RECORD</span><span>SCROLL HORIZONTALLY / TAP DAY TO CORRECT HISTORY</span></div>
 ${sectionHead('TACTICAL READOUT // RECORD INTEGRITY','SOURCE: LOCAL BROWSER RECORDS')}
 <div class="mx-readout"><div><b class="good">${rate}%</b> WINDOW CONSISTENCY</div><div><b class="info">${short(s.completed)}</b> LIFETIME EXECUTIONS</div><div><b class="warn">${short(s.perfectDays)}</b> LIFETIME PERFECT DAYS</div></div>
 <div class="info mt">MATRIX DISPLAYS INDIVIDUAL PROTOCOLS BY DAY. THE ORIGINAL GLOWING GLOBAL INTEL HEATMAP REMAINS UNCHANGED. DATES WITHOUT HISTORY ARE NOT COUNTED IN THE WINDOW RATE.</div>
 <div class="footer-actions">${action('[ GLOBAL INTEL ]','intel')}${action('[ PROTOCOL REGISTER ]','protocols')}${action('[ SYSTEM ]','system')}</div>`;
}

function dayPage(date){
 if(!validDate(date)||date>dateAgo(0))return errorPage('INVALID DATE');
 const ids=done(date),tracked=date>=prOldest()&&date<=prToday();
 return `${sectionHead('INTEL // DATE INSPECTION',date)}
 <div class="intel-date-header">
   <div>${metric('SELECTED DATE',date)}${metric('COMPLETED',`${ids.length} / ${PROTOCOLS.length}`)}${metric('PERFECT DAY',full(date)?'YES':'NO')}${metric('NO JUNK UPF',ids.includes(5)?(state.mildDays?.[date]?'MILD / AUTHORIZED':'STRICT'):'MISSED')}</div>
   <div class="info">TAP A PROTOCOL TO ${tracked?'CORRECT':'BACKFILL'} THIS DATE</div>
 </div>
 ${sectionHead('PROTOCOL REGISTER',`RECORD // ${date}`)}
 <div class="intel-history-register intel-date-register">
 ${PROTOCOLS.map(p=>{const isDone=ids.includes(p.id);return `<button type="button" class="intel-toggle ${isDone?'is-done':''}" data-command="hset ${date} ${p.id} ${isDone?'off':'on'}" aria-label="${isDone?'Undo':'Mark complete'} ${esc(prProtocolName(p.id))} on ${date}" aria-pressed="${isDone}"><span class="intel-toggle-mark">${isDone?'✓':'+'}</span><span class="intel-toggle-name">${esc(prProtocolName(p.id))}</span><span class="intel-toggle-state">${isDone?(p.id===5&&state.mildDays?.[date]?'MILD':'STRICT'):'MISSED'}</span></button>`;}).join('')}
 </div>
 <div class="notice">${tracked?'Saved corrections update history, consistency and streaks. Previously earned XP and Ghost Coins do not change.':'No previous record for this date. You can still add executions and extend your saved history.'}</div>
 <div class="footer-actions">${action('[ ← GLOBAL INTEL ]','intel')}${action('[ CONSISTENCY MATRIX ]','matrix')}${action('[ PROTOCOLS ]','protocols')}</div>`;
}

// V5 / INTEL ONLY: graph preferences are volatile UI state; no reward or saved-data migration.
let intelGraphDays=14,intelGraphMetric='completion';
function intelGraph(){
 const count=intelGraphDays;
 const dates=Array.from({length:count},(_,i)=>dateAgo(count-1-i));
 const values=dates.map(d=>{
  const ids=done(d);
  return intelGraphMetric==='xp'
   ? (state.rewardLedger?.[d]?.xp||0)
   : Math.round(done(d).filter(id=>eligible(id,d)).length/Math.max(1,activeIds(d).length)*100);
 });
 const max=intelGraphMetric==='xp'?Math.max(50,Math.ceil(Math.max(...values,0)/50)*50):100;
 const width=720,height=124,left=34,right=8,top=8,bottom=12;
 const innerW=width-left-right,innerH=height-top-bottom;
 const px=i=>left+(count===1?0:i*innerW/(count-1));
 const py=v=>top+innerH*(1-v/max);
 const points=values.map((v,i)=>[px(i),py(v)]);
 const stroke=points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
 const fill=`${stroke} L ${px(count-1).toFixed(1)} ${py(0).toFixed(1)} L ${px(0).toFixed(1)} ${py(0).toFixed(1)} Z`;
 const guide=[0,.25,.5,.75,1].map(t=>`<g><line class="plot-guide" x1="${left}" x2="${width-right}" y1="${py(t*max).toFixed(1)}" y2="${py(t*max).toFixed(1)}"/><text class="plot-axis" x="0" y="${(py(t*max)+3).toFixed(1)}">${Math.round(t*max)}</text></g>`).join('');
 const dots=points.map(([x,y],i)=>`<circle class="plot-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.8"><title>${esc(dates[i])} : ${values[i]}${intelGraphMetric==='xp'?' XP':'% completion'}</title></circle>`).join('');
 const labels=dates.map((d,i)=>`<button type="button" data-command="day ${d}" title="${d}: ${values[i]}${intelGraphMetric==='xp'?' XP':'%'}" aria-label="Inspect ${d}, ${values[i]}${intelGraphMetric==='xp'?' XP':' percent completion'}">${count===30?(i%5===0||i===count-1?d.slice(8):'·'):d.slice(8)}</button>`).join('');
 const avg=Math.round(values.reduce((n,v)=>n+v,0)/Math.max(1,count));
 const peak=Math.max(...values,0);
 const metricLabel=intelGraphMetric==='xp'?'DAILY XP':'DAILY COMPLETION %';
 const rangeActions=[7,14,30].map(n=>action(`[ ${n}D ]`,`intel ${n} ${intelGraphMetric}`));
 const metricActions=[['completion','%'],['xp','XP']].map(([m,label])=>`<button type="button" class="terminal-action" data-command="intel ${count} ${m}" data-selected="${m===intelGraphMetric}">[ ${label} ]</button>`).join('');
 return `${sectionHead('CONSISTENCY // SIGNAL GRAPH',`${count} DAY TELEMETRY`)}
 <div class="intel-graph">
 <div class="intel-graph-head"><strong>${metricLabel} // LAST ${count} DAYS</strong><div class="intel-graph-tabs"><span>WINDOW:</span>${[7,14,30].map(n=>`<button type="button" class="terminal-action" data-command="intel ${n} ${intelGraphMetric}" data-selected="${n===count}">[ ${n}D ]</button>`).join('')}<span>VIEW:</span>${metricActions}</div></div>
 <svg class="intel-graph-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${metricLabel} across ${count} days, from ${dates[0]} to ${dates[count-1]}">
 <defs><linearGradient id="intel-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#20e4d1" stop-opacity=".52"/><stop offset="100%" stop-color="#20e4d1" stop-opacity="0"/></linearGradient></defs>
 ${guide}<path class="plot-area" d="${fill}"/><path class="plot-line" d="${stroke}"/>${dots}</svg>
 <div class="intel-graph-dayrow" style="--intel-days:${count}">${labels}</div>
 <div class="intel-graph-foot"><span>AVERAGE <b>${avg}${intelGraphMetric==='xp'?' XP':'%'}</b> &nbsp; PEAK <b>${peak}${intelGraphMetric==='xp'?' XP':'%'}</b></span><span>SELECT A DAY TO INSPECT // LOCAL RECORD</span></div>
 </div>`;
}


let intelCalendarYear=new Date().getFullYear(),intelInspectDate='';
function intelHistoryCalendar(){
 const y=intelCalendarYear, first=new Date(y,0,1,12), end=new Date(y,11,31,12), start=new Date(first);
 start.setDate(start.getDate()-(start.getDay()+6)%7);
 const weeks=[];
 for(let d=new Date(start);d<=end;d.setDate(d.getDate()+7)){
  const days=[];
  for(let row=0;row<7;row++){
   const date=new Date(d);date.setDate(d.getDate()+row);
   const key=keyOf(date),n=done(key).length, tracked=key>=prOldest()&&key<=prToday();
   const future=key>prToday(),outside=date.getFullYear()!==y;
   const kind=outside||!tracked?'unknown':full(key)?'complete':n>0?'partial':'missed';
   const selected=key===intelInspectDate;
   days.push(`<button type="button" class="intel-glow-cell ${kind}${selected?' selected':''}" data-command="iday ${key}" aria-label="${esc(key)}: ${future?'FUTURE':!tracked?'NO DATA':full(key)?'COMPLETE':n>0?'PARTIAL':'MISSED'} (${n} recorded)" aria-pressed="${selected}" title="${esc(key)} — ${future?'Future date':!tracked?'No recorded history':`${n} of ${PROTOCOLS.length} protocols`}"></button>`);
  }
  weeks.push(`<div class="intel-glow-week">${days.join('')}</div>`);
 }
 const samples=Array.from({length:28},(_,i)=>dateAgo(27-i));
 const counts={complete:0,partial:0,missed:0,unknown:0};
 for(const date of samples){const n=done(date).length,tracked=date>=prOldest()&&date<=prToday();
  const kind=!tracked?'unknown':full(date)?'complete':n>0?'partial':'missed';counts[kind]++;
 }
 return `${sectionHead('PROTOCOL COMPLETION // HISTORY',`${y} / FULL-YEAR SCROLL`)}
 <div class="pr-calendar-nav intel-glow-nav">${action('[ ◀ PREVIOUS YEAR ]',`ical ${y-1}`)}<b>${y}</b>${action('[ NEXT YEAR ▶ ]',`ical ${y+1}`)}${action('[ CURRENT YEAR ]',`ical ${new Date().getFullYear()}`)}</div>
 <div class="intel-glow-grid" aria-label="Glowing full-year mission completion matrix">
   <div class="intel-glow-weekdays" aria-hidden="true">${['MON','TUE','WED','THU','FRI','SAT','SUN'].map(w=>`<span>${w}</span>`).join('')}</div>
   <div class="intel-glow-scroller pr-calendar-viewport" role="region" tabindex="0" aria-label="Scroll horizontally through the year; select a date to view its completed protocols">
      <div class="intel-glow-weeks">${weeks.join('')}</div>
   </div>
   <div class="intel-glow-legend" aria-label="Completion legend, counts for last 28 days"><small>LAST 28 DAYS</small>
    <span><i class="intel-glow-key complete"></i> COMPLETE <b>(${counts.complete})</b></span>
    <span><i class="intel-glow-key partial"></i> PARTIAL <b>(${counts.partial})</b></span>
    <span><i class="intel-glow-key missed"></i> MISSED <b>(${counts.missed})</b></span>
    ${counts.unknown?`<span><i class="intel-glow-key unknown"></i> NO DATA <b>(${counts.unknown})</b></span>`:''}
   </div>
 </div>
 <p class="intel-glow-hint">◀ SWIPE / SCROLL TO VIEW ANY WEEK OF ${y} • SELECT A SQUARE TO INSPECT OR BACKFILL • GLOW = PERFECT DAY</p>
 ${intelInspectDate?intelDateInspector(intelInspectDate):''}`;
}
function intelDateInspector(d){
 const future=d>prToday(),tracked=d>=prOldest()&&d<=prToday(),ids=done(d),count=ids.filter(id=>eligible(id,d)).length,due=activeIds(d).length;
 return `<div class="pr-date-inspect intel-glow-inspect">
 <div class="intel-inspect-heading"><span class="info">DATE // ${esc(d)}</span><b class="${count===due?'good':count>0?'info':'warn'}">${count}/${due} SCHEDULED COMPLETE</b>${action('[ ✕ CLOSE ]','iday close')}</div>
 <div class="muted">${future?'FUTURE DATE — NO EXECUTION CAN BE RECORDED YET':tracked?'MARK OR UNMARK A COMPLETION FOR THIS DATE.':'NO RECORD YET — ADD A PAST EXECUTION BELOW.'}</div>
 ${future?'':`<div class="intel-history-register intel-date-register">${PROTOCOLS.map(p=>{const marked=ids.includes(p.id);return `<button type="button" class="intel-toggle ${marked?'is-done':''}" data-command="hset ${d} ${p.id} ${marked?'off':'on'}" aria-label="${marked?'Undo':'Mark complete'} ${esc(prProtocolName(p.id))} on ${d}" aria-pressed="${marked}"><span class="intel-toggle-mark">${marked?'✓':'+'}</span><span class="intel-toggle-name">${esc(prProtocolName(p.id))}</span><span class="intel-toggle-state">${marked?'COMPLETE':'PENDING'}</span></button>`;}).join('')}</div>`}
 </div>`;
}

function intelPage(){const s=service();const recent14=Array.from({length:14},(_,i)=>dateAgo(13-i));const prev14=Array.from({length:14},(_,i)=>dateAgo(27-i));
 const counted=days=>PROTOCOLS.reduce((sum,p)=>sum+prCount(p.id,days[0],days[days.length-1]).credited,0);
 const slots=days=>PROTOCOLS.reduce((sum,p)=>sum+prCount(p.id,days[0],days[days.length-1]).eligible,0);
 const totalRecent=counted(recent14),totalPrev=counted(prev14),rate=Math.round(100*totalRecent/Math.max(1,slots(recent14)));
 const prevRate=Math.round(100*totalPrev/Math.max(1,slots(prev14))),delta=rate-prevRate,trend=delta;
 const allDates=Object.keys(state.days).filter(d=>validDate(d)&&d<=dateAgo(0)).sort();let n=0,maxStreak=0;
 for(let d=new Date((allDates[0]||dateAgo(0))+'T12:00:00');keyOf(d)<=dateAgo(0);d.setDate(d.getDate()+1)){const k=keyOf(d);if(!activeIds(k).length)continue;if(full(k)){n++;maxStreak=Math.max(maxStreak,n);}else n=0;}
 const bestDay=Math.max(...recent14.map(d=>done(d).filter(id=>eligible(id,d)).length));const now=new Date();const msg=trend>=0?`CONSISTENCY +${trend} POINTS`:`CONSISTENCY ${trend} POINTS`;
 const trendBars=recent14.map((d,i)=>{const ids=done(d),n=ids.length;return `<button class="trend-day" type="button" data-command="iday ${d}" title="${esc(d)} — ${n}/5 protocols complete"><div class="trend-stack">${Array.from({length:5},(_,j)=>`<i class="${j<n?'lit':''}"></i>`).join('')}</div><span>${d.slice(5)}</span></button>`}).join('');
return `
${sectionHead('INTEL // GLOBAL ANALYTICS','SYSTEM PERFORMANCE / LIVE BROWSER STORAGE')}
<div class="analysis-log"><div><b class="good">SIGNAL</b><span>${rate}% completion across the last 14 days. Trend ${trend>=0?'+':''}${trend} percentage points versus the previous 14-day block.</span></div><div class="help-copy"><b class="info">GUIDE</b><span>Use MISSION COMPLETION below for the scrollable calendar. Tap dates to inspect or backfill missed executions.</span></div></div>
${intelHistoryCalendar()}
${sectionHead('NO JUNK UPF // ADHERENCE', 'STRICT / MILD / MISSED')}
<div class="intel-nj-summary">${(()=>{const ds=Array.from({length:28},(_,i)=>dateAgo(27-i));const strict=ds.filter(d=>done(d).includes(5)&&!state.mildDays?.[d]).length,mild=ds.filter(d=>done(d).includes(5)&&!!state.mildDays?.[d]).length,missed=ds.filter(d=>!done(d).includes(5)&&d>=prOldest()).length;return `STRICT <b class="good">${strict}</b> &nbsp; MILD <b class="warn">${mild}</b> &nbsp; MISSED <b class="bad">${missed}</b> &nbsp; <span class="dim">/ LAST 28 DAYS</span>`;})()}</div>
${sectionHead('STREAK // METRICS','HISTORY-BASED')}
<div class="intel-metrics"><div><span>CURRENT STREAK</span><b>${s.streak}</b><small>DAYS</small></div><div><span>LONGEST STREAK</span><b>${maxStreak}</b><small>DAYS</small></div><div><span>PERFECT DAYS</span><b>${s.perfectDays}</b><small>TOTAL</small></div><div><span>COMPLETION RATE</span><b>${rate}%</b><small>LAST 14 DAYS</small></div></div>
${sectionHead('RECENT TREND // COMPLETIONS','LAST 14 DAYS')}
<div class="trend-wrap"><div class="trend-chart">${trendBars}</div><div class="trend-data"><span>COMPLETE &nbsp; ${recent14.filter(d=>full(d)).length}</span><span>PARTIAL &nbsp;&nbsp; ${recent14.filter(d=>done(d).length>0&&!full(d)).length}</span><span>NO ACTIVITY ${recent14.filter(d=>done(d).length===0).length}</span><hr><strong class="${trend>=0?'good':'warn'}">TREND ${trend>=0?'▲':'▼'} ${trend>0?'+':''}${trend}%</strong><small>VS PREV 14D</small></div></div>
${intelGraph()}
${sectionHead('ANALYSIS // SYSTEM OUTPUT','DERIVED FROM SAVED LOCAL DATA')}
<div class="analysis-log">${[
`[OK]  ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}  COMPLETION RATE: ${rate}% (14 DAYS)`,
`[OK]  ${now.toLocaleDateString('en-CA')}  ${totalRecent} EXECUTIONS IN RECENT WINDOW`,
`[OK]  ${now.toLocaleDateString('en-CA')}  ${msg} VS PREVIOUS PERIOD`,
`[OK]  ${now.toLocaleDateString('en-CA')}  BEST DAILY EXECUTION: ${bestDay}/5`,
`[OK]  ${now.toLocaleDateString('en-CA')}  ${s.perfectDays} PERFECT DAYS IN LOCAL RECORD`,
`[OK]  ${now.toLocaleDateString('en-CA')}  BROWSER DATA / NOT ANDROID RECORDS`
].map(x=>`<div><span class="good">${esc(x.slice(0,4))}</span><span class="info">${esc(x.slice(4))}</span></div>`).join('')}</div>
${sectionHead('INTEL // INSIGHTS','TACTICAL RECOMMENDATIONS')}
<div class="insight-lines"><div><b>» &nbsp; ${esc(msg)}</b><span>${trend>=0?'Recent consistency is holding or improving.':'Recent consistency decreased; rebuild daily momentum.'}</span></div><div><b>» &nbsp; FOCUS ON THE BASICS</b><span>${Math.max(0,s.todayScheduled-s.todayCount)} protocols still open today.</span></div><div><b>» &nbsp; KEEP MOMENTUM</b><span>${Math.max(0,maxStreak-s.streak+1)} perfect days to surpass your recorded streak.</span></div></div>
${sectionHead('OPERATOR // ACTIONS','TERMINAL SHORTCUTS')}
<div class="intel-actions">${entry(1,'VIEW PROTOCOLS',"Today's protocols & status",'protocols')}${entry(2,'VIEW MATRIX','Day-by-day activity history','matrix')}${entry(3,'VIEW CAREER','Rank and progression','career')}${entry(4,'SYSTEM','Return to main terminal','system')}</div>`;}
// V6.7.1 / Reusable, single-color item symbols. No emoji or external image requests.
const GHOSTED_MARKET_ICONS={"1":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"8\" y=\"13\" width=\"48\" height=\"33\" rx=\"3\"/><path d=\"M22 49v5m20-5v5M16 54h32\"/><path d=\"m28 22 13 8-13 8z\"/></svg>","2":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 21h46v8a5 5 0 0 0 0 10v7H9v-7a5 5 0 0 0 0-10z\"/><path d=\"M24 21v25\" stroke-dasharray=\"3 4\"/><path d=\"m34 28 10 6-10 6z\"/></svg>","3":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M19 24h26c7 0 10 7 12 19 1 6-5 10-10 5l-8-6H25l-8 6c-5 5-11 1-10-5 2-12 5-19 12-19z\"/><path d=\"M18 33h11M23.5 27.5v11M39 33h.1m7 5h.1\" stroke-linecap=\"round\"/></svg>","4":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M13 27h25c7 0 10 6 10 13v4c-2 3-5 3-8 0l-7-4H20l-7 4c-4 3-7 0-6-5 1-8 2-12 6-12z\"/><path d=\"M17 34h10m-5-5v10m13-5h.1\"/><circle cx=\"47\" cy=\"19\" r=\"10\"/><path d=\"M47 13v7l4 3\"/></svg>","5":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"15\" y=\"13\" width=\"34\" height=\"34\" rx=\"2\"/><rect x=\"9\" y=\"19\" width=\"34\" height=\"34\" rx=\"2\"/><path d=\"m22 28 12 8-12 8z\"/></svg>","6":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M32 7 39 20 54 22 43 33 46 49 32 42 18 49 21 33 10 22 25 20Z\"/><path d=\"M28 25 40 32 28 39Z\"/></svg>","7":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"34\" cy=\"34\" r=\"18\"/><circle cx=\"34\" cy=\"34\" r=\"12\"/><path d=\"M11 13v15m-5-15v11c0 6 10 6 10 0V13M11 28v23M56 13c-7 6-9 14-9 21h9M56 13v38\"/></svg>","8":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M11 26h42v20H11zM11 26l8-12h26l8 12M11 35h42M26 14v12M38 14v12\"/><path d=\"M26 40h12\"/></svg>","9":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M18 29h28l-4 23H22Z\"/><path d=\"M17 29h30\"/><path d=\"M24 26c-9-1-8-12 1-13 2-9 13-9 16-1 9-1 13 10 5 14\"/><path d=\"M25 39c4-5 10-5 14 0\"/><circle cx=\"32\" cy=\"45\" r=\"2.2\"/></svg>","10":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M42 10c-12 2-22 12-22 25 0 10 7 19 17 20-4 1-7 1-10 0-12-3-20-13-20-26C7 15 19 7 31 7c4 0 8 1 11 3Z\"/><path d=\"M43 35l2.8 6 6.5.8-4.7 4.5 1.2 6.6-5.8-3.1-5.8 3.1 1.2-6.6-4.7-4.5 6.5-.8Z\"/></svg>","11":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M11 47V28a21 21 0 0 1 42 0v19\"/><rect x=\"6\" y=\"30\" width=\"10\" height=\"20\" rx=\"3\"/><rect x=\"48\" y=\"30\" width=\"10\" height=\"20\" rx=\"3\"/><path d=\"M48 48c0 7-8 9-16 9h-6\"/></svg>","12":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"12\" y=\"22\" width=\"40\" height=\"32\" rx=\"3\"/><path d=\"M24 22v-6a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v6M12 34h40M19 34v20M45 34v20\"/><path d=\"M31 37c6-8 15-5 15 2 0 4-7 10-7 10s-8-7-8-12Z\"/><circle cx=\"39\" cy=\"39\" r=\"2\"/></svg>","13":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M32 8 54 20v27L32 59 10 47V20Z\"/><path d=\"M10 20 32 33 54 20M32 33v26M21 14l22 13M18 40h9v7h-9Z\"/></svg>","14":"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M32 8 54 20v27L32 59 10 47V20Z\"/><path d=\"M10 20 32 33 54 20M32 33v26\"/><path d=\"m32 15 3.2 6 6.8.9-5 5 .9 7-5.9-3.1-5.9 3.1.9-7-5-5 6.8-.9Z\"/></svg>"};
function marketIcon(id,size='large'){return `<span class="mk-vector mk-vector-${size}" aria-hidden="true">${GHOSTED_MARKET_ICONS[(state.customMarketItems||[]).find(x=>x.id===Number(id))?.iconId||id]||'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M32 8 56 32 32 56 8 32z"/></svg>'}</span>`;}

// V6.7: restricted items have one official price and entitlement policy.
const MARKET_EXTRA=Object.fromEntries(STORE.map(p=>[p.id,{
 code:'REQ-'+String(p.id).padStart(3,'0'),type:p.category,symbol:p.category==='FIELD RATIONS'?'◈':p.category==='SUPPLY DROPS'?'⬡':'◆',desc:p.detail
}]));
const allMarketItems=()=>[...STORE,...(state.customMarketItems||[]).filter(x=>x.archived),...(state.legacyMarketItems||[])];
const marketItem=id=>allMarketItems().find(x=>x.id===id);
const purchaseCount=id=>state.purchased.filter(v=>v===id).length;
const redemptionRecords=id=>{const v=state.redemptions?.[id];return Array.isArray(v)?v:v?.usedAt?[v]:[];};
const redeemedCount=id=>redemptionRecords(id).length;
const availableCount=id=>Math.max(0,purchaseCount(id)-redeemedCount(id));
const rewardUsed=id=>purchaseCount(id)>0&&availableCount(id)===0;
const rewardMeta=id=>MARKET_EXTRA[id]||(marketItem(id)&&!marketItem(id).legacy?{code:'CUS-'+String(id),type:marketItem(id).category,symbol:'◇',desc:marketItem(id).detail}:{code:'LEG-'+String(id),type:'LEGACY REWARD',symbol:'◇',desc:'Preserved reward from a previous Black Market version. Does not grant a food exception.'});
const rewardStatus=id=>availableCount(id)>0?'READY TO USE':purchaseCount(id)>0?'REDEEMED':'AVAILABLE';
const marketIso=x=>{const d=new Date(x);return Number.isFinite(d.getTime())?d:null;};
function marketPeriodStart(now,period){
 const d=new Date(now);if(period==='month')return new Date(d.getFullYear(),d.getMonth(),1);
 const start=new Date(d);start.setHours(0,0,0,0);start.setDate(start.getDate()-period+1);return start;
}
function marketNextDate(now,period,records){
 if(period==='month')return keyOf(new Date(now.getFullYear(),now.getMonth()+1,1));
 const dates=records.map(x=>marketIso(x)).filter(Boolean).sort((a,b)=>a-b);
 if(!dates.length)return keyOf(now);
 const d=new Date(dates[0]);d.setDate(d.getDate()+period);return keyOf(d);
}
function marketEvents(ids,kind,now,period){
 const start=marketPeriodStart(now,period),end=now;
 const entries=kind==='purchase'?(state.purchaseRecords||[]).filter(x=>ids.includes(x.id)).map(x=>x.at):
  ids.flatMap(id=>redemptionRecords(id).map(x=>x.usedAt));
 return entries.filter(x=>{const date=marketIso(x);return date&&date>=start&&date<=end;});
}
function marketEligibility(id,kind='purchase',now=new Date()){
 const p=MARKET_POLICY[id];if(!p)return {ok:true,label:'LEGACY REWARD',next:null,remaining:1};
 const checks=[{name:'ITEM',ids:[id],cap:p.cap,period:p.period},
   ...MARKET_GROUPS.filter(g=>g.ids.includes(id)).map(g=>({...g,period:'month'}))];
 const reasons=[],all=[];
 for(const rule of checks){const records=marketEvents(rule.ids,kind,now,rule.period),n=records.length;
  const remaining=Math.max(0,rule.cap-n);all.push({name:rule.name,used:n,limit:rule.cap,remaining});
  if(n>=rule.cap)reasons.push({reason:rule.name+' '+n+'/'+rule.cap,at:marketNextDate(now,rule.period,records)});
 }
 const next=reasons.length?reasons.map(x=>x.at).sort().at(-1):null;
 return {ok:!reasons.length,label:reasons.map(x=>x.reason).join(' / '),next,remaining:Math.min(...all.map(x=>x.remaining)),checks:all};
}
function marketSupplyLabel(id){const p=MARKET_POLICY[id];if(!p)return 'LEGACY';
 return p.cap+' / '+(p.period==='month'?'MONTH':p.period+'-DAY ROLLING WINDOW');}
function marketStatusText(id){const permit=marketEligibility(id,'purchase');return availableCount(id)>0?'IN INVENTORY':!permit.ok?'LOCKED': 'AVAILABLE';}
function marketFoodMonthCount(monthKey){return [7,8,9].flatMap(id=>redemptionRecords(id)).filter(r=>r.mildDay?.slice(0,7)===monthKey).length;}
function marketFoodDateEligible(day,id){if(![7,8,9].includes(id))return {ok:true};
 const today=dateAgo(0),month=today.slice(0,7);
 if(!validDate(day)||day>today||day.slice(0,7)!==month)return {ok:false,reason:'CHOOSE A DATE IN THE CURRENT MONTH, NOT THE FUTURE'};
 if(state.mildDays?.[day])return {ok:false,reason:'FOOD EXCEPTION ALREADY RECORDED FOR THIS DATE'};
 if(marketFoodMonthCount(month)>=2)return {ok:false,reason:'TWO MILD FOOD DAYS ALREADY USED THIS MONTH'};
 const isMajor=id===7||id===8;
 if(isMajor&&Object.entries(state.mildDays||{}).some(([d,x])=>d.slice(0,7)===month&&(x.itemId===7||x.itemId===8)))return {ok:false,reason:'ONE MAJOR FOOD EXCEPTION ALREADY USED THIS MONTH'};
 return {ok:true,convert:done(day).includes(5)};
}
function marketCompleteMild(day,id,usedAt){
 const wasComplete=done(day).includes(5); // converting STRICT must NEVER pay XP again.
 // In a historic day, this is a correction only. It must not mint retroactive rewards.
 state.mildDays=state.mildDays||{};
 state.mildDays[day]={itemId:id,redeemedAt:usedAt,mode:'MILD'};
 const eligibleNow=day===dateAgo(0)?eligible(5,day):false;
 state.days[day]=[...new Set([...done(day),5])];
 if(day!==dateAgo(0))return;
 const row=state.rewardLedger[day]||{xp:0,coins:0,bonus:false,awards:{}};
 row.awards=row.awards||{};
 const protocol=PROTOCOLS.find(x=>x.id===5);
 if(eligibleNow&&!wasComplete&&!row.awards[5]){row.awards[5]={xp:protocol.xp,coins:protocol.coins};row.xp+=protocol.xp;row.coins+=protocol.coins;}
 if(!wasComplete&&full(day)&&!row.bonus){if(!Array.isArray(row.bonusScope)||!row.bonusScope.length)row.bonusScope=activeIds(day).sort((a,b)=>a-b);row.bonus=true;row.xp+=50;row.coins+=20;}
 state.rewardLedger[day]=row;
}
function marketQuantityPanel(id){const p=MARKET_POLICY[id];if(!p)return '';
 const buy=marketEligibility(id,'purchase'),use=marketEligibility(id,'redeem');
 return `<div class="mk-limits"><div>PERSONAL LIMIT: <b>${esc(marketSupplyLabel(id))}</b></div><div>PURCHASE ALLOWANCE: <b class="${buy.ok?'good':'bad'}">${buy.checks[0].used}/${buy.checks[0].limit}</b></div><div>REDEMPTION ALLOWANCE: <b class="${use.ok?'good':'bad'}">${use.checks[0].used}/${use.checks[0].limit}</b></div>${buy.checks.slice(1).map(x=>`<div>${esc(x.name)}: <b>${x.used}/${x.limit} USED</b></div>`).join('')}${!buy.ok?`<div class="${availableCount(id)>0?'info':'bad'}">${availableCount(id)>0?'[INFO] NEW PURCHASES LOCKED; OWNED PASS MAY STILL BE USED':'[DENIED] NEW PURCHASES LOCKED'} — NEXT ELIGIBILITY ${esc(buy.next||'UNKNOWN')}</div>`:''}</div>`;
}
function shopPage(){
 const s=service(),picked=STORE.find(x=>x.id===selectedShop)||STORE[0],ready=availableCount(picked.id)>0,affordable=s.coinsBalance>=picked.price,m=rewardMeta(picked.id);
 const permission=marketEligibility(picked.id,'purchase');
 const categories=[...new Set(STORE.map(x=>x.category))];
 return `${sectionHead('BLACK MARKET // RESTRICTED SUPPLY',STORE.length+' REQUISITIONS / 14 OFFICIAL')}
 <div class="mk-boot">${line('<span class="good">[OK]</span> &nbsp; REQUISITION TERMINAL ONLINE')}${line('<span class="warn">[!]</span> &nbsp; INDIVIDUAL & SHARED LIMITS ENFORCED ON PURCHASE + REDEMPTION')}${line('<span class="info">[INFO]</span> &nbsp; MONTHLY CAPS RESET ON THE 1ST; LONG COOLDOWNS ROLL FOR 60/90/180 DAYS')}</div>
 <div class="mk-hero"><div class="mk-operator"><img class="v68-hero-img" src="${window.GHOSTED_V68_IMAGES.market}" alt="Black Market tactical Ghost operator"/></div><div class="mk-motto"><b>GEAR.<br>DATA.<br>ADVANTAGE.<br>NO QUESTIONS.</b><i></i><strong>DISCIPLINE<br>OVER IMPULSE.</strong><small>OFFICIAL 14 // + PERSONAL REQUISITIONS</small></div></div>
 ${sectionHead('OPERATOR // WALLET','GHOST COIN BALANCE')}
 <div class="mk-wallet"><span class="mk-coin">◎</span><span>GHOST COINS</span><b>${short(s.coinsBalance)} GC</b><div>SUPPLY POLICY : <b class="warn">RESTRICTED</b><br>MONTHLY LIMITS : <b class="good">ACTIVE</b></div></div>
 ${sectionHead('REQUISITION REGISTER',STORE.length+' AUTHORIZED / CUSTOM ITEMS')}
 <div class="mk-custom-toolbar">${action('[ + CREATE MARKET ITEM ]','marketnew','mk-custom-create')}<span>PERSONAL ITEMS // OWN PRICES & SUPPLY LIMITS</span></div>
 <div class="mk-table"><div class="mk-row mk-heading"><span>#</span><span>ITEM / CALLSIGN</span><span>PRICE</span><span>STATUS</span></div>${categories.map(group=>`<div class="mk-category">// ${esc(group)}</div>`+STORE.filter(x=>x.category===group).map(x=>`<button type="button" class="mk-row ${x.id===picked.id?'selected':''}" data-command="inspect ${x.id}" aria-label="Inspect ${esc(x.name)}"><span>[${pad(x.id)}]</span><span class="mk-item-with-icon">${marketIcon(x.id,"small")}<span>${esc(x.name)}</span></span><span>${x.price} GC</span><span class="${marketStatusText(x.id)==='LOCKED'?'warn':'info'}">${marketStatusText(x.id)}</span></button>`).join('')).join('')}</div>
 <div id="market-selected-data" tabindex="-1">${sectionHead('SELECTED // REQUISITION DATA',m.code)}
 <div class="mk-detail"><div class="mk-insignia">${marketIcon(picked.id)}<small>${m.code}</small></div><div class="mk-detail-copy"><strong>${esc(picked.name)}</strong><div>CATEGORY : ${esc(picked.category)}</div><div>PRICE : <b>${picked.price} GC</b></div><div>STATUS : <b>${marketStatusText(picked.id)}</b></div><p>${esc(picked.detail)}</p>${picked.id>=2001?`<div class="mk-custom-manage">${action('[ EDIT PERSONAL ITEM ]',`marketedit ${picked.id}`)} ${action('[ ARCHIVE PERSONAL ITEM ]',`marketarchive ${picked.id}`)}</div>`:''}</div></div>
 ${marketQuantityPanel(picked.id)}</div>
 ${sectionHead('TRANSACTION // REQUISITION CONTROL','LIMITS VERIFIED AT CHECKOUT')}
 <div class="mk-purchase"><strong>${ready?'» UNUSED AUTHORIZATION IN INVENTORY':'» PURCHASE '+esc(picked.name)+' FOR '+picked.price+' GC?'}</strong><div>YOUR BALANCE : <b>${short(s.coinsBalance)} GC</b></div>${ready?`<div class="good">AVAILABLE IN INVENTORY: ${availableCount(picked.id)} TOKEN(S)</div>`:`<div>AFTER PURCHASE: <b>${short(s.coinsBalance-picked.price)} GC</b></div>`}<div class="mk-actions">${ready?action('[ ▶ USE OWNED REWARD ]',`redeem ${picked.id}`,'mk-confirm'):!permission.ok?`<span class="bad">[DENIED] LIMIT REACHED — NEXT ${esc(permission.next||'UNKNOWN')}</span>`:!affordable?'<span class="warn">[ INSUFFICIENT GC ]</span>':action('[ Y ] CONFIRM PURCHASE',`buy ${picked.id}`,'mk-confirm')}${action('[ OPEN INVENTORY ]','inventory')}</div></div>
 ${(state.customMarketItems||[]).some(x=>x.archived)?`<div class="mk-archived"><b>ARCHIVED PERSONAL ITEMS</b>${state.customMarketItems.filter(x=>x.archived).map(x=>action('[ RESTORE '+esc(x.name)+' ]',`marketrestore ${x.id}`)).join(' ')}</div>`:''}
 <p class="mk-policy-note">Optional rewards are not restrictions on necessary meals, rest, recovery or spending your own money. Unused tickets never bypass redemption caps.</p>
 <div class="footer-actions">${action('[ RETURN TO SYSTEM ]','system')}${action('[ EARN COINS ]','protocols')}</div>`;
}
function inventoryPage(){
 const items=[...new Set(state.purchased)].map(id=>marketItem(id)).filter(Boolean);
 const picked=items.find(x=>x.id===selectedItem)||items[0]||null;
 const m=picked?rewardMeta(picked.id):null,ready=picked?availableCount(picked.id)>0:false;
 const eligible=picked?marketEligibility(picked.id,'redeem'):null;
 return `${sectionHead('INVENTORY // OPERATOR ASSETS','AUTHORIZED TOKENS & LEGACY RECORDS')}
 <div class="iv-statusline">${line('<span class="good">[OK]</span> &nbsp; PURCHASE RECORDS VERIFIED')}${line('<span class="good">[OK]</span> &nbsp; REDEMPTION LIMITS ACTIVE')}
 ${line('<span class="info">[INFO]</span> &nbsp; UNUSED PASSES DO NOT OVERRIDE CURRENT-MONTH RESTRICTIONS')}</div>
 ${sectionHead('INVENTORY // OPERATOR ASSETS',`ACQUIRED: ${items.length}`)}
 <div class="iv-table"><div class="iv-row iv-heading"><span>#</span><span>ASSET / ID</span><span>QTY</span><span>STATUS</span><span>ACTION</span></div>${items.length?items.map((p,i)=>`<button class="iv-row ${picked&&picked.id===p.id?'selected':''}" data-command="item ${p.id}"><span>[${pad(i+1)}]</span><span class="iv-name"><span class="iv-name-line">${marketIcon(p.id,"small")}<span class="iv-name-label">${esc(p.name)}<small>ID: ${esc(rewardMeta(p.id).code)}</small></span></span></span><span>${pad(availableCount(p.id))}</span><span class="${availableCount(p.id)?'good':'warn'}">${availableCount(p.id)?'● READY':'● USED'}</span><span class="info">[ INSPECT ]</span></button>`).join(''):'<div class="iv-empty">[ NO ACQUIRED REWARDS ]<div class="info">Earn coins with protocols, then purchase a permitted reward.</div></div>'}</div>
 ${sectionHead('SELECTED ASSET // '+(picked?esc(picked.name):'NONE'),picked?m.code:'INVENTORY')}
 ${picked?`<div class="iv-detail"><div>${metric('TYPE',esc(m.type))}${metric('ITEM ID',esc(m.code))}${metric('AVAILABLE',String(availableCount(picked.id)))}${metric('PURCHASED',String(purchaseCount(picked.id)))}${metric('REDEEMED',String(redeemedCount(picked.id)))}${metric('REDEMPTION',MARKET_POLICY[picked.id]?(eligible.ok?'<span class="good">ELIGIBLE</span>':`<span class="warn">LOCKED UNTIL ${esc(eligible.next)}</span>`):'LEGACY TOKEN')}${redeemedCount(picked.id)?metric('LAST USED',esc(new Date(redemptionRecords(picked.id).at(-1).usedAt).toLocaleString())):''}</div><div class="iv-description"><div class="iv-item-head"><div class="iv-item-icon">${marketIcon(picked.id)}</div><div class="iv-item-title"><b>${esc(picked.name)}</b><small>${esc(m.code)}</small></div></div><p>${esc(m.desc)}</p><small class="info">${picked.legacy?'Preserved prior-version reward; not a food exception.':picked.id>=2001?'PERSONAL REWARD: NO EXTRA XP OR GC. IT DOES NOT GRANT A STRICT-TO-MILD FOOD EXCEPTION.':'PURCHASED PASSES ARE USABLE IF REDEMPTION ALLOWANCE REMAINS. A FOOD PASS CAN EXPLICITLY CHANGE STRICT TO MILD WITHOUT REWARD DUPLICATION.'}</small></div></div>`:'<div class="iv-empty">SELECT AN OWNED REWARD.</div>'}
 ${picked?marketQuantityPanel(picked.id):''}
 ${sectionHead('ACTIONS // OPERATOR CONTROLS','REDEEM WHEN ELIGIBLE')}
 <div class="iv-actions">${picked?(ready?(eligible.ok?action('[ ▶ USE / REDEEM SELECTED ]',`redeem ${picked.id}`,'iv-use'):`<span class="warn">[DENIED] LIMIT REACHED — NEXT ${esc(eligible.next||'UNKNOWN')}</span>`):action('[ OPEN BLACK MARKET ]',`inspect ${picked.id}`)) :''}${action('[ BLACK MARKET ]','shop')}${action('[ RETURN TO SYSTEM ]','system')}</div>
 ${sectionHead('REDEMPTION LOG','HISTORY // NO DUPLICATE PAYOUTS')}
 <div class="iv-log">${items.flatMap(x=>redemptionRecords(x.id).map(r=>({p:x,r}))).sort((a,b)=>b.r.usedAt.localeCompare(a.r.usedAt)).map(({p,r})=>`<div><span class="good">[ USED ]</span><span>${esc(p.name)}${r.mildDay?' / MILD '+esc(r.mildDay):''}</span><time>${esc(new Date(r.usedAt).toLocaleString())}</time></div>`).join('')||'<div class="info">NO REWARDS REDEEMED YET.</div>'}</div>
 ${sectionHead('NO JUNK UPF // FOOD EXCEPTIONS',`MILD DAYS ${marketFoodMonthCount(dateAgo(0).slice(0,7))} / 2 THIS MONTH`)}
 <div class="mk-policy-note">STRICT = normal protocol completion. MILD = authorized recorded exception (counts for streak and completion). MISSED = no completion. Redeeming a food pass never grants separate XP or Ghost Coins.</div>`;
}

// Tactical user-created market requisitions — separate from the official 14.
function marketEditor(id=0){
 const p=(state.customMarketItems||[]).find(x=>x.id===id);
 if(id&&!p)return;
 const purchased=!!(p&&purchaseCount(id));
 const val=(x)=>p?.[x]??'';
 const categoryOptions=['PERSONAL REWARDS','ENTERTAINMENT','FIELD RATIONS','REST & RECREATION','SUPPLY DROPS'];
 const options=(xs,cur)=>xs.map(x=>`<option value="${esc(x)}" ${String(cur)===String(x)?'selected':''}>${esc(x)}</option>`).join('');
 popup(`<div class="mk-editor"><h2>${p?'EDIT':'CREATE'} // PERSONAL REQUISITION</h2><p class="mk-editor-note">Official 14-item catalog remains locked. Personal items use Ghost Coins and respect both individual and applicable shared limits. They cannot modify No Junk UPF, XP or GC rewards.</p>
 <form id="mk-custom-form" data-id="${id}">
 <label>ITEM / CALLSIGN<input id="mk-custom-name" required maxlength="80" value="${esc(val('name'))}" placeholder="PERSONAL REQUISITION"/></label>
 <label>DESCRIPTION<textarea id="mk-custom-detail" maxlength="500" rows="3" required placeholder="What may be redeemed using this token?">${esc(val('detail'))}</textarea></label>
 <div class="mk-edit-grid"><label>COST // GHOST COINS<input id="mk-custom-price" type="number" required min="1" max="100000" step="1" value="${p?.price||100}" ${purchased?'disabled':''}/></label><label>CATEGORY<select id="mk-custom-category" ${purchased?'disabled':''}>${options(categoryOptions,p?.category||'PERSONAL REWARDS')}</select></label></div>
 <div class="mk-edit-grid"><label>MONTHLY / ROLLING LIMIT<input id="mk-custom-cap" type="number" required min="1" max="12" value="${p?.limitCount||1}" ${purchased?'disabled':''}/></label><label>LIMIT PERIOD<select id="mk-custom-period" ${purchased?'disabled':''}>${[['month','CALENDAR MONTH'],['60','ROLLING 60 DAYS'],['90','ROLLING 90 DAYS'],['180','ROLLING 180 DAYS']].map(([v,t])=>`<option value="${v}" ${String(p?.limitPeriod||'month')===v?'selected':''}>${t}</option>`).join('')}</select></label></div>
 <label>SUBTYPE / SHARED RESTRICTIONS<select id="mk-custom-kind" ${purchased?'disabled':''}><option value="regular" ${!p||p.kind==='regular'?'selected':''}>NORMAL ITEM</option><option value="gaming" ${p?.kind==='gaming'?'selected':''}>GAMING SESSION (ENTERTAINMENT)</option><option value="major-food" ${p?.kind==='major-food'?'selected':''}>MAJOR FOOD EXCEPTION CATEGORY</option></select></label>
 <div class="mk-icon-library"><span class="label">CHOOSE ICON // REUSABLE LIBRARY</span><div class="mk-icon-choices">${Array.from({length:14},(_,i)=>{const iconId=i+1;return `<label title="${esc(defaultCatalog[i].name)}"><input type="radio" name="mk-icon-choice" value="${iconId}" ${Number(p?.iconId||1)===iconId?'checked':''}/>${marketIcon(iconId,'small')}<small>${pad(iconId)}</small></label>`;}).join('')}</div></div>
 ${purchased?'<p class="mk-editor-note warn">A PURCHASE EXISTS: PRICE, CATEGORY AND LIMITS ARE LOCKED TO PROTECT HISTORICAL TRANSACTIONS.</p>':''}
 <div class="mk-editor-actions"><button type="submit" class="terminal-action mk-custom-create">[ SAVE ITEM ]</button><button type="button" class="terminal-action" data-command="marketcancel">[ CANCEL ]</button></div>
 </form></div>`);
}
function saveMarketEditor(e){
 e.preventDefault();
 const f=e.target,id=Number(f.dataset.id||0),prior=(state.customMarketItems||[]).find(x=>x.id===id),locked=!!(prior&&purchaseCount(prior.id));
 const get=s=>f.querySelector(s)?.value??'';
 const name=get('#mk-custom-name').trim(),detail=get('#mk-custom-detail').trim();
 const price=locked?prior.price:Number(get('#mk-custom-price'));
 const category=locked?prior.category:get('#mk-custom-category');
 const limitCount=locked?prior.limitCount:Number(get('#mk-custom-cap'));
 const limitPeriod=locked?prior.limitPeriod:(get('#mk-custom-period')==='month'?'month':Number(get('#mk-custom-period')));
 const kind=locked?prior.kind:get('#mk-custom-kind');
 const iconId=Number(get('input[name="mk-icon-choice"]:checked'));
 if(name.length<2||name.length>80||!detail||detail.length>500||!Number.isSafeInteger(price)||price<1||price>100000||!Number.isInteger(limitCount)||limitCount<1||limitCount>12||!['month',60,90,180].includes(limitPeriod)||!Number.isInteger(iconId)||iconId<1||iconId>14){showToast('INVALID ITEM DETAILS');return;}
 if(!['PERSONAL REWARDS','ENTERTAINMENT','FIELD RATIONS','REST & RECREATION','SUPPLY DROPS'].includes(category)){showToast('INVALID CATEGORY');return;}
 if((kind==='gaming'&&category!=='ENTERTAINMENT')||(kind==='major-food'&&category!=='FIELD RATIONS')||!['regular','gaming','major-food'].includes(kind)){showToast('SUBTYPE MUST MATCH CATEGORY');return;}
 if(!prior&&state.customMarketItems.length>=60){showToast('PERSONAL CATALOG LIMIT REACHED');return;}
 const nextId=prior?id:Math.max(2000,...state.customMarketItems.map(x=>x.id))+1;
 if(nextId>2999){showToast('CATALOG ID LIMIT REACHED');return;}
 const entry={id:nextId,name,detail,price,category,limitCount,limitPeriod,kind,iconId,archived:prior?.archived||false,createdAt:prior?.createdAt||new Date().toISOString()};
 if(!atomicChange(()=>{if(prior)state.customMarketItems=state.customMarketItems.map(x=>x.id===id?entry:x);else state.customMarketItems.push(entry);})){showToast('SAVE FAILED — PREVIOUS ITEM PRESERVED');return;}
 refreshMarketRegistry();selectedShop=nextId;section='shop';closePopup(true);render();showToast(prior?'PERSONAL ITEM UPDATED':'PERSONAL ITEM CREATED');
 requestAnimationFrame(()=>document.getElementById('market-selected-data')?.scrollIntoView({behavior:'smooth',block:'start'}));
}
function archiveMarketItem(id,restore=false){
 const item=state.customMarketItems.find(x=>x.id===id);if(!item)return;
 if(!restore&&!confirm(`Archive ${item.name}? Existing purchases remain in Inventory.`))return;
 if(!atomicChange(()=>{item.archived=!restore;})){showToast('COULD NOT SAVE CHANGE');return;}
 refreshMarketRegistry();selectedShop=STORE[0].id;showToast(restore?'PERSONAL ITEM RESTORED':'PERSONAL ITEM ARCHIVED');
}

function marketConfirmUse(id){
 const item=marketItem(id),food=[7,8,9].includes(id),day=food?document.querySelector('#mk-mild-date')?.value:'';
 if(!item||state.pendingRedemption!==id||!availableCount(id)){showToast('NO UNUSED TOKEN / INVALID CONFIRMATION');return;}
 const permit=marketEligibility(id,'redeem');if(!permit.ok){showToast('REDEMPTION LIMIT REACHED: '+permit.label);return;}
 if(food){const check=marketFoodDateEligible(day,id);if(!check.ok){showToast(check.reason);const el=document.querySelector('.iv-redeem-dialog .mk-error');if(el)el.textContent='[DENIED] '+check.reason;return;}}
 const timestamp=new Date().toISOString(),prev=earned();
 const success=atomicChange(()=>{
  // Verify again inside the transaction; exceptions are single-use and date-bound.
  if(food&&(!marketFoodDateEligible(day,id).ok))throw Error('Food allowance already used');
  state.redemptions[id]=[...redemptionRecords(id),{usedAt:timestamp,name:item.name,mildDay:food?day:null,policyVersion:1}];
  if(food)marketCompleteMild(day,id,timestamp);
  state.pendingRedemption=null;
 });
 if(!success){showToast('REDEMPTION NOT SAVED — PREVIOUS RECORDS UNCHANGED');return;}
 $('#overlay').dataset.dirty='0';closePopup();section='inventory';selectedItem=id;
 const delta=earned().xp-prev.xp;
 lastNote=`[REDEEMED] ${item.name}${food?' — NO JUNK UPF MILD '+day:''}. ${delta>0?'NORMAL ELIGIBLE PROTOCOL REWARD +'+delta+' XP (ONCE).':'EXISTING XP PRESERVED. NO EXTRA XP OR GC.'}`;
 lastType='good';hardwareEffect('purchase');render();fxTransactionStamp('REDEEMED',item.name,food?'AUTHORIZED MILD // '+day:'ONE-TIME TOKEN USED');showToast(food?'MILD FOOD DAY RECORDED':'REWARD REDEEMED');reminderRequestSync();
}
// Public backup includes no Vault key or private contents.
function backupPackage(){const data=JSON.parse(JSON.stringify(state));delete data.pendingRedemption;return {format:'GHOSTED-WEB-BACKUP',version:4,exportedAt:new Date().toISOString(),data};}
function downloadJSON(obj,name){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function restorePackage(text){const obj=JSON.parse(text);if(obj.format!=='GHOSTED-WEB-BACKUP'||obj.version!==4||!validState(obj.data))throw Error('Invalid or unsupported backup');
 const incoming=structuredClone(obj.data);
 if(incoming.schemaVersion!==4||!incoming.rewardLedger||!Array.isArray(incoming.purchaseRecords))throw Error('Incomplete backup');
 for(const v of Object.values(incoming.rewardLedger)){if(!v.awards||typeof v.awards!=='object'||!Number.isSafeInteger(v.xp)||!Number.isSafeInteger(v.coins))throw Error('Invalid reward ledger');}
 return incoming;
}
function saveRestored(incoming){const old=state,oldStore=STORE,oldCorrupt=storageCorrupt;storageCorrupt=false;
 try{state=upgradeState(incoming);refreshMarketRegistry();refreshCustomRegistry();refreshProtocolRewards();if(!save())throw Error('Storage unavailable');return true;}
 catch{state=old;STORE=oldStore;storageCorrupt=oldCorrupt;refreshMarketRegistry();refreshCustomRegistry();return false;}
}
// Vault encrypted separately with AES-GCM, isolated from public backups and ledger.
const VAULT_KEY='ghosted:web-os:private:personal:v68:encrypted:v1';
// Demo is a separate encrypted record. The existing personal Vault is NEVER migrated, reset, or overwritten.
const VAULT_DEMO_KEY='ghosted:web-os:private:demo:v68:encrypted:v1';
const VAULT_DEMO_PASSWORD='GHOSTED-DEMO-2026';
let vaultMode='personal';
const vaultActiveKey=()=>vaultMode==='demo'?VAULT_DEMO_KEY:VAULT_KEY;

let vaultSession=null,vaultTimer=null,vaultError='';
const textBytes=x=>new TextEncoder().encode(x);
const base64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const unbase64=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
async function vaultCrypto(password,salt,operations){const material=await crypto.subtle.importKey('raw',textBytes(password),'PBKDF2',false,['deriveKey']);const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);return operations(key);}
async function vaultEncrypt(password,contents){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await vaultCrypto(password,salt,key=>crypto.subtle.encrypt({name:'AES-GCM',iv},key,textBytes(JSON.stringify(contents))));return JSON.stringify({version:1,salt:base64(salt),iv:base64(iv),cipher:base64(encrypted)});}
async function vaultDecrypt(password,raw){const v=JSON.parse(raw);if(v.version!==1)throw Error('Unknown Vault format');const bytes=await vaultCrypto(password,unbase64(v.salt),key=>crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(v.iv)},key,unbase64(v.cipher)));return JSON.parse(new TextDecoder().decode(bytes));}
function vaultTouch(){clearTimeout(vaultTimer);vaultTimer=setTimeout(vaultLock,5*60*1000);}
function vaultLock(){if(vaultSession)hardwareEffect('vaultLock');vaultSession=null;vaultError='';clearTimeout(vaultTimer);if(vaultLiveInterval){clearInterval(vaultLiveInterval);vaultLiveInterval=null;}vaultHoldCancel();if(section==='vault')render();}
function vaultStored(){try{return localStorage.getItem(vaultActiveKey());}catch{return null;}}
function vaultModeSwitch(mode){
 if(mode!=='demo'&&mode!=='personal')return;
 if(vaultSession)vaultLock();
 vaultMode=mode;
 vaultFailedAttempts=0;
 vaultError='';
 section='vault';
 render();
}

async function vaultSubmit(e){e.preventDefault();const f=e.target,pw=String(f.elements.namedItem('vaultPassword').value||''),operator=String(f.elements.namedItem('operatorId')?.value||VAULT_TEST_OPERATOR).trim().toUpperCase();
 const activeOperator=String(state.callsign||'SRIRAM BHARATH').trim().toUpperCase();if(operator!==VAULT_TEST_OPERATOR&&operator!==activeOperator&&operator!=='GHOST-001'){vaultError='UNRECOGNIZED OPERATOR ID — USE '+activeOperator;vaultFailedAttempts++;render();return;}
 if(vaultMode==='demo'&&pw!==VAULT_DEMO_PASSWORD){
  vaultFailedAttempts++;vaultError='DEMO PASSWORD: GHOSTED-DEMO-2026 — DEMO DATA IS SEPARATE FROM YOUR PERSONAL VAULT.';
  render();return;
 }
 if(!crypto?.subtle){vaultError='WEB CRYPTO REQUIRES A SECURE BROWSER CONTEXT';render();return;}
 try{const raw=vaultStored();if(!raw){if(pw.length<8&&!(vaultMode==='personal'&&pw==='1234'))throw Error('Use at least eight characters (or the requested local test password 1234)');const data=vaultNormalizeData({title:'NOW OR NEVER',done:{},notes:[],relapses:[],startAt:new Date().toISOString(),lastRelapseAt:null,longestSeconds:0});const cipher=await vaultEncrypt(pw,data);localStorage.setItem(vaultActiveKey(),cipher);window.GHOSTED_NATIVE_DB?.mirror(vaultActiveKey(),cipher);vaultSession={password:pw,data,mode:vaultMode,storageKey:vaultActiveKey()};}
 else{const data=vaultNormalizeData(await vaultDecrypt(pw,raw));vaultSession={password:pw,data,mode:vaultMode,storageKey:vaultActiveKey()};}
 vaultFailedAttempts=0;vaultError='';vaultTouch();hardwareEffect('vaultUnlock');render();fxVaultDoors();}
 catch{vaultFailedAttempts++;vaultError='AUTHENTICATION FAILED. CHECK OPERATOR ID AND VAULT PASSWORD.';render();}
}
async function vaultSave(){if(!vaultSession)return false;try{const raw=await vaultEncrypt(vaultSession.password,vaultSession.data);localStorage.setItem(vaultSession.storageKey||VAULT_KEY,raw);window.GHOSTED_NATIVE_DB?.mirror(vaultSession.storageKey||VAULT_KEY,raw);vaultTouch();return true;}catch{return false;}}
async function vaultRecord(e){e.preventDefault();if(!vaultSession)return;const f=e.target;const text=f.elements.namedItem('note').value.trim().slice(0,2000);if(!text)return;vaultSession.data.notes.push({at:new Date().toISOString(),text});if(!await vaultSave()){vaultSession.data.notes.pop();vaultError='SAVE FAILED';render();return;}render();}
// GHOSTED V6.1 // vault-only functions; encrypted storage uses the existing AES-256-GCM layer.
const VAULT_GHOST_IMAGE='';
const VAULT_CHAMBER_IMAGE='assets/vault/vault_chamber.png';
const VAULT_TEST_OPERATOR='SRIRAM BHARATH';
let vaultLiveInterval=null,vaultHoldInterval=null,vaultHoldStarted=0,vaultHoldButton=null,vaultFailedAttempts=0;
const vaultLocalDate=d=>{const t=new Date(d);return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;};
const vaultDateTime=d=>new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).toUpperCase();
function vaultNormalizeData(v){
 if(!v||typeof v!=='object')throw Error('Invalid private record');
 if(!v.done||typeof v.done!=='object')v.done={};
 if(!Array.isArray(v.notes))v.notes=[];
 if(!Array.isArray(v.relapses))v.relapses=[];
 if(!v.startAt||!Number.isFinite(Date.parse(v.startAt)))v.startAt=new Date().toISOString();
 if(!v.lastRelapseAt||!Number.isFinite(Date.parse(v.lastRelapseAt)))v.lastRelapseAt=null;
 if(!Number.isFinite(v.longestSeconds)||v.longestSeconds<0)v.longestSeconds=0;
 if(!v.title)v.title='NOW OR NEVER';
 return v;
}
const vaultClockOrigin=v=>new Date(v.lastRelapseAt||v.startAt).getTime();
const vaultElapsed=v=>Math.max(0,Math.floor((Date.now()-vaultClockOrigin(v))/1000));
function vaultPrettySeconds(s){s=Math.max(0,Math.floor(s));return {days:Math.floor(s/86400),hours:Math.floor((s%86400)/3600),minutes:Math.floor((s%3600)/60),seconds:s%60};}
function vaultSessionLongest(v){return Math.max(Math.floor(v.longestSeconds||0),vaultElapsed(v));}
function vaultTimerMarkup(v){const t=vaultPrettySeconds(vaultElapsed(v));const pad2=n=>String(n).padStart(2,'0');return `<div class="vault-clock" role="timer" aria-label="Time since last relapse"><div class="v-unit"><strong data-vault-unit="days">${String(t.days).padStart(3,'0')}</strong><span>DAYS</span></div><div class="v-unit"><strong data-vault-unit="hours">${pad2(t.hours)}</strong><span>HOURS</span></div><div class="v-unit"><strong data-vault-unit="minutes">${pad2(t.minutes)}</strong><span>MINUTES</span></div><div class="v-unit"><strong data-vault-unit="seconds">${pad2(t.seconds)}</strong><span>SECONDS</span></div></div>`;}
function vaultBanner(online){return `<header class="vault-banner"><div><h2>GHOSTED OS <span>// VAULT</span>${vaultMode==='demo'?'<small class="vault-demo-flag">DEMO // SANDBOX</small>':''}</h2><p>LOCAL &nbsp;// &nbsp;OPERATOR SESSION</p><p><span class="v-on">${online?'UNLOCKED':'LOCKED'}</span> &nbsp;//&nbsp; ${online?'AUTHENTICATED SESSION / ENCRYPTED':'CREDENTIALS REQUIRED'} <span class="v-signal"></span></p></div><div class="vault-banner-right">v6.1.1 [VAULT]<br>TACTICAL PERSONAL OS<br>DISCIPLINE // PROGRESS // FREEDOM<br><b data-vault-now>${vaultDateTime(new Date())}</b></div></header>`;}
function vaultVerification(){const has=!!vaultStored();return `<div class="vault-verification"><div><b>[OK]</b> VAULT MODULE DETECTED</div><div><b>[OK]</b> ${crypto?.subtle?'BROWSER CRYPTOGRAPHY AVAILABLE':'SECURE CONTEXT REQUIRED'}</div><div><b>[OK]</b> ${vaultMode==='demo'?'DEMO':'PERSONAL'} RECORD ${has?'FOUND':'NOT INITIALIZED'}</div><div><b>[OK]</b> AUTO-LOCK SET TO 5 MINUTES</div><div class="warnline"><b>[WARN]</b> CREDENTIALS ARE REQUIRED FOR PRIVATE ACCESS</div></div>`;}
function vaultLockedScreen(){const stored=!!vaultStored(),personalExists=(()=>{try{return !!localStorage.getItem(VAULT_KEY)}catch{return false}})();return `<div class="vault-screen locked">${vaultBanner(false)}
 <div class="vault-mode-switch" aria-label="Choose personal or demo Vault">
  <button type="button" class="${vaultMode==='personal'?'is-active':''}" data-command="vaultpersonal">[ PERSONAL VAULT ]</button>
  <button type="button" class="${vaultMode==='demo'?'is-active':''}" data-command="vaultdemo">[ 🧪 TRY DEMO VAULT ]</button>
 </div>
 <div class="vault-mode-notice">${vaultMode==='demo'?'<b>DEMO SESSION</b> // Separate encrypted test record. Your personal Vault is not changed.':'<b>PERSONAL VAULT</b> // '+(personalExists?'Your existing encrypted Vault was detected. Enter its ORIGINAL password; demo credentials cannot unlock it.':'No personal Vault exists. Sign in with SRIRAM BHARATH / 1234 to initialize your requested test Vault. WARNING: 1234 is weak and should not protect sensitive data.')}</div>
 ${vaultVerification()}<div class="vault-rule"></div>
 <div class="vault-restricted"><img class="vault-ghost-art" src="${window.GHOSTED_V68_IMAGES.vaultLocked}" alt="Hooded ghost operator in monochrome terminal scan lines"><div class="vault-restricted-text"><div class="v-private">PRIVATE.<br>ENCRYPTED.<br>YOURS.<i></i></div><div class="v-access">ACCESS<br>RESTRICTED.<br>AUTHENTICATION<br>REQUIRED.<i></i></div></div></div>
 <div class="vault-subtitle"><span>VAULT // SECURITY STATUS</span><span class="right">&lt;&lt; ENCRYPTED SESSION ONLY &gt;&gt;</span></div>
 <div class="vault-status"><span>VAULT STATE</span><strong class="danger">LOCKED</strong><span>ENCRYPTION</span><strong>${crypto?.subtle?'AES-256-GCM / PBKDF2':'UNAVAILABLE'}</strong><span>SESSION</span><strong class="danger">NOT AUTHENTICATED</strong><span>DATA ACCESS</span><strong class="danger">RESTRICTED</strong><span>ATTEMPTS (SESSION)</span><strong>${vaultFailedAttempts} / 5</strong><span>AUTO-LOCK</span><strong>5 MIN INACTIVE</strong><span>LOCAL STORAGE</span><strong>${stored?'ENCRYPTED RECORD PRESENT':'NEW VAULT'}</strong></div>
 <div class="vault-subtitle"><span>AUTHENTICATION REQUIRED</span></div>
 <div class="vault-danger-panel"><span class="v-lock-icon" aria-hidden="true">♙</span><div><b>VAULT ACCESS IS PROTECTED</b><p>This area stores password-encrypted personal records.<br>Authenticate to access the private chamber.</p></div></div>
 <form id="vault-auth" class="vault-login" autocomplete="off"><label>OPERATOR ID<input type="text" name="operatorId" value="${VAULT_TEST_OPERATOR}" required maxlength="40" autocomplete="username" spellcheck="false"></label><label>VAULT PASSWORD<input type="password" name="vaultPassword" value="${vaultMode==='demo'?VAULT_DEMO_PASSWORD:''}" placeholder="${vaultMode==='demo'?'Demo password':stored?'Enter your original Vault password':'Enter 1234 to initialize personal test Vault'}" required minlength="${stored?1:4}" autocomplete="${stored?'current-password':'new-password'}"></label>${vaultError?`<p class="v-error" role="alert">${esc(vaultError)}</p>`:''}<button type="submit">[ ${stored?'AUTHENTICATE':'INITIALIZE & AUTHENTICATE'} ]</button></form>
 <div class="vault-demo-hint"><strong>${vaultMode==='demo'?'TEST CREDENTIALS // DEMO ACCESS':'TEST MODE AVAILABLE'}</strong><div>OPERATOR ID: <code>${VAULT_TEST_OPERATOR}</code></div><div>DEMO PASSWORD: <code>${VAULT_DEMO_PASSWORD}</code></div><div>${vaultMode==='demo'?'Press AUTHENTICATE above. The demo credentials are already filled in.':'To use these, first select [ TRY DEMO VAULT ] above. They do not unlock an existing personal Vault.'}</div><div>Do not store sensitive data in the demo Vault: its password is public.</div></div>
 <div class="vault-notice">SECURITY NOTICE<br>Encrypted data stays in this browser profile. It is not a native secure enclave. No password recovery. Back up the Vault separately and avoid storing highly sensitive data with the shared demo password.</div><div class="vault-controls">${stored?action('[ EXPORT ENCRYPTED BACKUP ]','vaultexport'):''}${action('[ IMPORT ENCRYPTED BACKUP ]','vaultimport')}${action('[ RETURN TO SYSTEM ]','system')}</div></div>`;}
function vaultUnlockedScreen(){const v=vaultNormalizeData(vaultSession.data);const curr=vaultPrettySeconds(vaultElapsed(v)).days;const longest=vaultPrettySeconds(vaultSessionLongest(v)).days;const elapsed=vaultElapsed(v);const baseline=vaultLocalDate(vaultClockOrigin(v));return `<div class="vault-screen unlocked">${vaultBanner(true)}
 <section class="vault-chamber" aria-label="Vault containment chamber"><img class="vault-chamber-bg" src="${VAULT_CHAMBER_IMAGE}" alt="" aria-hidden="true"><img class="vault-chamber-ghost" src="${window.GHOSTED_V68_IMAGES.vaultUnlocked}" alt="Ghost operator within the sealed chamber"><div class="v-chamber-quote left">"SAME YOU.<br>DIFFERENT FUTURE."</div><div class="v-chamber-quote right">"NOW OR NEVER.<br>THERE IS NO<br>NEXT YOU."</div><div class="v-storage-list">HABITS<br>STREAKS<br>HISTORY<br>PROGRESS<br>REWARDS<br>PURCHASES<br>INVENTORY<br>MISSIONS<br>STATS<br>AND MORE...</div><div class="v-stored-right">LOCKED TODAY<br>TO PROTECT<br>TOMORROW.</div><div class="v-seal">SEALED<br>FOR A STRONGER YOU<br>━━━</div></section>
 <section class="vault-clock-shell"><div class="vault-clock-title">TIME SINCE LAST RELAPSE</div>${vaultTimerMarkup(v)}</section>
 <div class="vault-streak-strip"><div><span>CURRENT STREAK</span><b data-vault-current>${curr} DAYS</b></div><div><span>LONGEST STREAK</span><b data-vault-longest>${longest} DAYS</b></div></div>
 <section class="vault-operator-note"><img src="${window.GHOSTED_V68_IMAGES.vaultUnlocked}" alt="Ghost operator inside Vault"><div><blockquote>"DISCIPLINE KEEPS IT LOCKED.<br>A RELAPSE SETS IT ALL FREE."</blockquote><p>EVERY DAY YOU STAY STRONG PRESERVES YOUR PROGRESS.<br>THIS VAULT HOLDS YOUR PRIVATE GROWTH.<br>DON'T GIVE IT AWAY.</p></div></section>
 <button type="button" class="vault-relapse" id="vault-relapse-hold" aria-label="Hold for three seconds to record a relapse and reset the private streak"><span class="v-chain">⛓</span><span><strong>[ RELAPSE ]</strong><small>RESET PRIVATE STREAK TO ZERO</small></span><span class="v-hold">HOLD TO CONFIRM<br>3 SECONDS<div class="v-meter" aria-hidden="true">${Array.from({length:10},()=>'<i></i>').join('')}</div></span></button>
 <div class="vault-notice">⚠ WARNING<br>HOLDING RELAPSE FOR THREE SECONDS LOGS A PRIVATE RESET AND STARTS THE COUNTER AGAIN. It will not erase your encrypted notes, public progress, XP or Ghost Coins.</div>
 <div class="vault-subtitle"><span>VAULT // CONTROL PANEL</span><span class="right">PRIVATE RECORD ONLY</span></div>
 <form id="vault-baseline" class="vault-baseline"><label>COUNTER START DATE<input type="date" name="baselineDate" max="${vaultLocalDate(new Date())}" value="${baseline}" required></label><button type="submit">[ SET START DATE ]</button></form>
 <div class="vault-controls">${action(v.done?.[dateAgo(0)]?'[ UNDO TODAY’S PRIVATE CHECK ]':'[ MARK TODAY’S PRIVATE CHECK ]','vaultdone')}${action('[ EXPORT ENCRYPTED BACKUP ]','vaultexport')}${action('[ LOCK VAULT ]','vaultlock')}</div>
 <div class="vault-subtitle"><span>RELAPSE HISTORY</span><span class="right">${v.relapses.length} RECORDED</span></div><div class="vault-private-history">${v.relapses.length?v.relapses.slice().reverse().slice(0,20).map((r,i)=>`<div class="v-history-row"><span>${esc(vaultDateTime(r.at))}</span><span>RESET AFTER ${Math.floor(Number(r.streakSeconds||0)/86400)} DAYS</span></div>`).join(''):'<div class="muted">NO RELAPSE ENTRIES. KEEP GOING.</div>'}</div>
 <div class="vault-subtitle"><span>ENCRYPTED PRIVATE NOTES</span><span class="right">${v.notes.length} SAVED</span></div>
 <div class="vault-notes">${v.notes.slice(-12).reverse().map(n=>`<div class="vault-note"><span class="info">${esc(n.at.slice(0,16).replace('T',' '))}</span><div>${esc(n.text)}</div></div>`).join('')||'<div class="muted">NO PRIVATE NOTES YET</div>'}</div>
 <form id="vault-note" class="ghosted-form"><label>NEW PRIVATE NOTE<textarea name="note" maxlength="2000" required placeholder="Type a private entry..."></textarea></label><button type="submit" class="terminal-action">[ SAVE ENCRYPTED NOTE ]</button></form>
 <div class="vault-subfoot">PRIVATE VAULT // AES-256-GCM ENCRYPTED AT REST • FIVE-MINUTE AUTO LOCK • BROWSER-LOCAL RECORD • NO ANDROID SYNC</div></div>`;}
function vaultPage(){if(!vaultSession)return vaultLockedScreen();vaultNormalizeData(vaultSession.data);vaultTouch();setTimeout(vaultStartLiveTick,0);return vaultUnlockedScreen();}
function vaultStartLiveTick(){if(vaultLiveInterval){clearInterval(vaultLiveInterval);vaultLiveInterval=null;}if(section!=='vault'||!vaultSession)return;vaultClockTick();vaultLiveInterval=setInterval(vaultClockTick,1000);}
function vaultClockTick(){if(!vaultSession||section!=='vault'){if(vaultLiveInterval){clearInterval(vaultLiveInterval);vaultLiveInterval=null;}return;}const v=vaultSession.data,t=vaultPrettySeconds(vaultElapsed(v));const values={days:String(t.days).padStart(3,'0'),hours:String(t.hours).padStart(2,'0'),minutes:String(t.minutes).padStart(2,'0'),seconds:String(t.seconds).padStart(2,'0')};Object.entries(values).forEach(([k,val])=>{const el=document.querySelector(`[data-vault-unit="${k}"]`);if(el)el.textContent=val;});const curr=document.querySelector('[data-vault-current]'),longest=document.querySelector('[data-vault-longest]'),now=document.querySelector('[data-vault-now]');if(curr)curr.textContent=t.days+' DAYS';if(longest)longest.textContent=vaultPrettySeconds(vaultSessionLongest(v)).days+' DAYS';if(now)now.textContent=vaultDateTime(new Date());}
async function vaultSetBaseline(e){e.preventDefault();if(!vaultSession)return;const val=e.target.elements.namedItem('baselineDate').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(val))return;const [y,m,d]=val.split('-').map(Number),local=new Date(y,m-1,d);if(local.getFullYear()!==y||local.getMonth()!==m-1||local.getDate()!==d||local.getTime()>Date.now()){vaultError='INVALID START DATE';showToast(vaultError);return;}if(!confirm('Set the counter start date to '+val+'? This changes the private streak calculation, but retains your private history and notes.'))return;const before=structuredClone(vaultSession.data);vaultSession.data.startAt=local.toISOString();vaultSession.data.lastRelapseAt=null;vaultSession.data.longestSeconds=Math.max(vaultSession.data.longestSeconds||0,vaultElapsed(vaultSession.data));if(!await vaultSave()){vaultSession.data=before;showToast('SAVE FAILED — NO CHANGES');return;}render();showToast('PRIVATE COUNTER START DATE SAVED');}
async function vaultApplyRelapse(){if(!vaultSession)return;const snapshot=structuredClone(vaultSession.data);const v=vaultSession.data,seconds=vaultElapsed(v);v.longestSeconds=Math.max(v.longestSeconds||0,seconds);if(!Array.isArray(v.relapses))v.relapses=[];v.relapses.push({at:new Date().toISOString(),streakSeconds:seconds});v.lastRelapseAt=new Date().toISOString();if(!await vaultSave()){vaultSession.data=snapshot;render();showToast('RELAPSE SAVE FAILED — RECORD UNCHANGED');return;}hardwareEffect('relapse');render();showToast('RELAPSE RECORDED — COUNTER RESTARTED');}
function vaultHoldCancel(){if(vaultHoldInterval){clearInterval(vaultHoldInterval);vaultHoldInterval=null;}if(vaultHoldButton){vaultHoldButton.querySelectorAll('.v-meter i').forEach(el=>el.classList.remove('lit'));vaultHoldButton=null;}vaultHoldStarted=0;}
function vaultHoldStart(btn){if(!vaultSession||vaultHoldInterval)return;vaultHoldButton=btn;vaultHoldStarted=performance.now();vaultHoldInterval=setInterval(()=>{if(!vaultSession){vaultHoldCancel();return;}const progress=Math.min(1,(performance.now()-vaultHoldStarted)/3000);if(vaultHoldButton)vaultHoldButton.querySelectorAll('.v-meter i').forEach((el,i)=>el.classList.toggle('lit',i<Math.ceil(progress*10)));if(progress>=1){vaultHoldCancel();vaultApplyRelapse();}},45);}


/* V6.4 REMINDER ENGINE — READS schedules and completions; NEVER changes reward or Vault data. */
const RM_MAX_EVENTS=96;
let rmSyncTimer=null,rmLastSignature='',rmLastDay=dateAgo(0);
const rmPrefs=()=>state.settings.reminders;
function rmTime(v){const m=String(v||'').match(/^([01]\d|2[0-3]):([0-5]\d)$/);return m?m[0]:'';}
function rmClockValue(d){return `${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function rmQuiet(time,prefs=rmPrefs()){
 if(!prefs.quietEnabled)return false;
 const start=rmTime(prefs.quietStart)||'22:00',end=rmTime(prefs.quietEnd)||'07:00';
 if(start===end)return false;
 return start<end?(time>=start&&time<end):(time>=start||time<end);
}
function rmEligible(id,day){
 if(!activeProtocol({id},day)||done(day).includes(id))return false;
 const m=prProfile(id),clock=prReminderToInput(m.reminder);
 if(!m.reminderEnabled||!rmTime(clock))return false;
 return eligible(id,day);
}
function rmLocalDate(day,time){
 const [y,m,d]=day.split('-').map(Number),[hh,mm]=time.split(':').map(Number);
 const at=new Date(y,m-1,d,hh,mm,0,0);
 // Reject nonexistent wall clock times during DST jumps.
 if(keyOf(at)!==day||rmClockValue(at)!==time)return null;
 return at;
}
function rmUpcoming(now=new Date(),days=30,max=RM_MAX_EVENTS){
 if(!rmPrefs().enabled)return [];
 const events=[];
 for(let shift=0;shift<days;shift++){
  const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+shift,12);
  const day=keyOf(date);
  for(const p of PROTOCOLS){
   if(!rmEligible(p.id,day))continue;
   const time=prReminderToInput(prProfile(p.id).reminder);
   if(rmQuiet(time))continue;
   const at=rmLocalDate(day,time);
   if(!at||at.getTime()<=now.getTime())continue;
   events.push({key:`${day}|${p.id}|${time}`,protocolId:p.id,date:day,time,at:at.toISOString(),title:'GHOSTED OS // REMINDER',body:'A scheduled protocol is ready for your attention.'});
  }
 }
 return events.sort((a,b)=>a.at.localeCompare(b.at)||a.protocolId-b.protocolId).slice(0,max);
}
function rmStatus(){return window.GHOSTED_NATIVE_REMINDERS&&typeof window.GHOSTED_NATIVE_REMINDERS.sync==='function'?'ANDROID ADAPTER AVAILABLE':'ANDROID ADAPTER NOT CONNECTED';}
function reminderRequestSync(){
 if(rmSyncTimer!==null)clearTimeout(rmSyncTimer);
 rmSyncTimer=setTimeout(()=>{rmSyncTimer=null;reminderSyncNative();},350);
}
function reminderSyncNative(){
 const bridge=window.GHOSTED_NATIVE_REMINDERS;
 if(!bridge||typeof bridge.sync!=='function')return;
 const events=rmUpcoming(),payload={enabled:!!rmPrefs().enabled,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',events};
 const signature=JSON.stringify(payload);
 if(signature===rmLastSignature)return;
 rmLastSignature=signature;
 try{Promise.resolve(bridge.sync(payload)).catch(err=>{rmLastSignature='';console.warn('GHOSTED reminder adapter:',err);});}
 catch(err){rmLastSignature='';console.warn('GHOSTED reminder adapter:',err);}
}
function rmReminderList(now=new Date()){
 const day=keyOf(now),time=rmClockValue(now);
 return PROTOCOLS.filter(p=>rmEligible(p.id,day)&&prReminderToInput(prProfile(p.id).reminder)===time&&!rmQuiet(time));
}
function rmCheck(now=new Date()){
 const day=keyOf(now),time=rmClockValue(now);
 if(day!==rmLastDay){rmLastDay=day;reminderRequestSync();if(section==='system')render();}
 if(document.hidden||!rmPrefs().enabled||rmQuiet(time))return [];
 const matches=rmReminderList(now).filter(p=>!state.reminderDeliveries[`${day}|${p.id}|${time}`]);
 if(!matches.length)return [];
 const nowMs=Date.now();
 const ok=atomicChange(()=>{
  for(const p of matches)state.reminderDeliveries[`${day}|${p.id}|${time}`]=new Date(nowMs).toISOString();
  const keys=Object.keys(state.reminderDeliveries).sort();
  for(const k of keys.slice(0,Math.max(0,keys.length-500)))delete state.reminderDeliveries[k];
 });
 if(!ok)return [];
 showToast('REMINDER // '+matches.map(x=>prProtocolName(x.id)).join(' • '));
 if(rmPrefs().sound)playTone('warning',true);
 return matches.map(x=>x.id);
}
function rmBriefingData(now=new Date()){
 const day=keyOf(now),remaining=activeProtocols().filter(p=>eligible(p.id,day)&&!done(day).includes(p.id));
 const upcoming=rmUpcoming(now,14,1)[0]||null;
 const gym=PROTOCOLS.some(p=>p.id===2)&&activeProtocol({id:2},day)&&planOf(2,day).frequency==='timesPerWeek'?{done:windowCount(2,day,'timesPerWeek',true),target:protocolTarget(2,day)}:null;
 return {remaining:remaining.length,upcoming,gym};
}
function reminderBriefingHTML(){
 if(!rmPrefs().briefing)return '';
 const b=rmBriefingData(),n=b.upcoming,when=n?`${n.date===dateAgo(0)?'TODAY':n.date} ${n.time} // ${prProtocolName(n.protocolId)}`:rmPrefs().enabled?'NONE SCHEDULED':'REMINDERS OFF';
 return `${sectionHead('SYSTEM // DAILY BRIEFING','LIVE SCHEDULE')}
 <div class="rm-briefing"><div class="rm-brief-line"><span>PROTOCOLS STILL DUE TODAY</span><b>${b.remaining}</b></div>
 <div class="rm-brief-line"><span>NEXT REMINDER</span><b>${esc(when)}</b></div>
 ${b.gym?`<div class="rm-brief-line"><span>IRON MONARCH / WEEKLY</span><b>${Math.min(b.gym.done,b.gym.target)} / ${b.gym.target}</b></div>`:''}
 <div class="footer-actions">${action('[ REMINDER SETTINGS ]','settings')}</div></div>`;
}
function reminderSettingsHTML(){const p=rmPrefs(),check=v=>v?'checked':'',time=v=>esc(rmTime(v));return `
 ${sectionHead('REMINDER CONTROL','ANDROID-READY // OPERATOR OPT-IN')}
 <div class="rm-settings"><form id="reminder-settings" aria-label="Global reminder settings">
  <label class="rm-switch"><span><strong>MASTER REMINDERS</strong><small>Enable or silence all protocol alerts</small></span><input type="checkbox" name="enabled" ${check(p.enabled)}></label>
  <label class="rm-switch"><span><strong>REMINDER SOUND</strong><small>Short audible signal when the app is open</small></span><input type="checkbox" name="sound" ${check(p.sound)}></label>
  <label class="rm-switch"><span><strong>QUIET HOURS</strong><small>Suppress alerts during your chosen interval</small></span><input type="checkbox" name="quietEnabled" ${check(p.quietEnabled)}></label>
  <div class="rm-quiet-inputs"><label>QUIET HOURS START<input type="time" name="quietStart" value="${time(p.quietStart)}" required></label>
  <label>QUIET HOURS END<input type="time" name="quietEnd" value="${time(p.quietEnd)}" required></label></div>
  <label class="rm-switch"><span><strong>SYSTEM DAILY BRIEFING</strong><small>Show next reminder and outstanding protocols on SYSTEM</small></span><input type="checkbox" name="briefing" ${check(p.briefing)}></label>
  <div class="rm-actions"><button type="submit" class="rm-primary">[ SAVE REMINDER SETTINGS ]</button>
  ${window.GHOSTED_NATIVE_REMINDERS&&typeof window.GHOSTED_NATIVE_REMINDERS.requestPermission==='function'?action('[ ENABLE ANDROID NOTIFICATIONS ]','rmpermission'):''}</div>
  <div class="rm-status">DELIVERY: <b>${esc(rmStatus())}</b>. One reminder time per protocol. Schedule follows target eligibility; completed and optional sessions never trigger extra rewards. Quiet-hour reminders are skipped.</div>
  </form></div>`;
}
function rmSaveSettings(e){e.preventDefault();const f=e.target,x=n=>f.elements.namedItem(n),start=rmTime(x('quietStart').value),end=rmTime(x('quietEnd').value);
 if(!start||!end){showToast('CHECK QUIET-HOURS TIMES');return;}
 if(!atomicChange(()=>{state.settings.reminders={enabled:x('enabled').checked,sound:x('sound').checked,quietEnabled:x('quietEnabled').checked,quietStart:start,quietEnd:end,briefing:x('briefing').checked};})){
  showToast('REMINDER SETTINGS NOT SAVED');return;
 }
 rmLastSignature='';reminderRequestSync();render();showToast('REMINDER SETTINGS SAVED');
}
window.GHOSTED_REMINDERS={preview:(days=7)=>rmUpcoming(new Date(),Math.max(1,Math.min(30,Number(days)||7))),sync:()=>{rmLastSignature='';reminderRequestSync();},status:rmStatus};

function settingsPage(){return `${sectionHead('SETTINGS / LOCAL OPERATOR','WEB APPLICATION')}
 ${metric('STORAGE',storageCorrupt?'<span class="bad">CORRUPTED — WRITES DISABLED</span>':persisted?'AVAILABLE':'UNAVAILABLE')}
 ${metric('PROGRESS MODE','REAL HISTORY // CONFIRMED EVENTS')}${metric('HABIT IMPORT','562 CONFIRMED EVENTS // RECONCILED')}
 ${metric('OPERATOR CALLSIGN',esc(state.callsign||'SRIRAM BHARATH'))}${metric('SERVICE START','01 JAN 2026')}${metric('HISTORICAL CAREER CREDIT',state.historicalCareerSeed?short(state.historicalCareerSeed.xp)+' XP / '+short(state.historicalCareerSeed.coins)+' GC':'AWAITING HISTORY RECONCILIATION')}${metric('CREDIT STATUS','PROVISIONAL // VERIFIED EVENTS, INCOMPLETE SCHEDULE EVIDENCE')}${metric('HELP MODE',state.settings.helpMode?'ON — INSTRUCTIONS VISIBLE':'OFF — CLEAN INTERFACE')}
 ${action(state.settings.helpMode?'[ HIDE HELPER TEXT ]':'[ SHOW HELPER TEXT ]','helpmode','device-setting')}
 ${metric('SOUNDS',state.settings.sounds?'ON':'OFF')}
 ${metric('SCANLINES',state.settings.scanlines?'ON':'OFF')}
 ${metric('BACKUP','VERSION 4 — PUBLIC DATA ONLY')}
 ${reminderSettingsHTML()}
 ${sectionHead('DATABASE DIAGNOSTICS','NATIVE SQLITE CHECK')}
 <div class="muted">Android SQLite status and safe readback test. WebView storage may persist even when native SQLite is unavailable.</div>
 <div class="footer-actions">${action('[ CHECK DATABASE STATUS ]','dbstatus')}${action('[ TEST SQLITE WRITE / READ ]','dbtest')}</div>
 ${sectionHead('DATA SAFETY','MANUAL BACKUP / RESTORE')}
 <div class="notice">REAL HISTORY // 562 SCREENSHOT-CONFIRMED COMPLETIONS. UNKNOWN OR BLANK SOURCE CELLS WERE NOT IMPORTED AS MISSES. HISTORICAL SERVICE CREDIT IS PROVISIONAL AND FROZEN: 15,035 XP / 4,780 GC. ORIGINAL SCHEDULES UNKNOWN. NO AUTOMATIC REPAYMENT OF IMPORTED EVENTS.</div>
 ${action('[ MERGE CONFIRMED HABIT HISTORY ]','historymerge')}
 
 <div class="footer-actions">${action('[ EXPORT PUBLIC BACKUP ]','backup export')}${action('[ IMPORT BACKUP FILE ]','backup import')}${action('[ DOWNLOAD RAW RECOVERY ]','backup raw')}</div>
 <div class="notice">Import replaces your public web profile only after validation and explicit confirmation. It never imports, decrypts or exports the private Vault.</div>
 ${sectionHead('TACTICAL HARDWARE FEEDBACK','OPERATOR CONFIGURATION')}
 <div class="v69-feedback-settings">
   <div class="v69-setting-line"><div><b>HARDWARE SOUNDS</b><small>Dry switch, relay and confirmation tones</small></div>${action(state.settings.feedback.sound?'[ SOUND ON ]':'[ SOUND OFF ]','feedbacksound','v69-setting-toggle')}</div>
   <div class="v69-setting-line"><div><b>TACTILE RESPONSE</b><small>Native Android haptics when available</small></div>${action(state.settings.feedback.haptics?'[ HAPTICS ON ]':'[ HAPTICS OFF ]','feedbackhaptics','v69-setting-toggle')}</div>
   <div class="v69-setting-line"><div><b>INTERFACE ANIMATIONS</b><small>Scans, confirmations and career promotions</small></div>${action(state.settings.feedback.animations?'[ MOTION ON ]':'[ MOTION OFF ]','feedbackmotion','v69-setting-toggle')}</div>
   <label class="v69-volume-label" for="v69-volume">SOUND INTENSITY <strong id="v69-volume-out">${Number(state.settings.feedback.volume)||0}%</strong></label>
   <input id="v69-volume" type="range" min="0" max="100" step="5" value="${Number(state.settings.feedback.volume)||0}" aria-label="Hardware sound volume" />
   <div class="footer-actions">${action('[ TEST SWITCH ]','feedbacktest switch')}${action('[ TEST XP FLOW ]','feedbacktest xp')}${action('[ TEST COINS ]','feedbacktest coins')}${action('[ TEST PURCHASE ]','feedbacktest purchase')}${action('[ TEST REDEMPTION ]','feedbacktest redemption')}${action('[ TEST VAULT DOORS ]','feedbacktest vault')}${action('[ TEST LEVEL UP ]','feedbacktest level')}${action('[ TEST RANK ]','feedbacktest promotion')}${action('[ TEST DIVISION ]','feedbacktest division')}${action('[ TEST GHOST SOVEREIGN ]','feedbacktest sovereign')}</div>
   <div class="muted">Audio is user-activated. No continuous ambient sounds. System reduced-motion preference takes priority.</div>
 </div>
 ${sectionHead('PREFERENCES','CURRENT DEVICE')}
 <div class="footer-actions">${action('[ TOGGLE SCANLINES ]','scanlines')}${action('[ TOGGLE SOUNDS ]','sounds')}${action('[ TEST SOUND ]','beep')}</div>
 ${sectionHead('PROFILE','DESTRUCTIVE OPERATIONS REQUIRE CONFIRMATION')}
 <div class="footer-actions">${action('[ RESET PUBLIC PROFILE ]','reset')}${action('[ SYSTEM ]','system')}</div>
 <div class="notice">Android reminders will use device notifications once the native application adapter is installed. In the standalone HTML build, reminders are visible only while open; Android and website data do not automatically synchronize.</div>`;}

function conceptsPage(){return `
${sectionHead('REFERENCE ARCHIVE / ORIGINAL CONCEPTS','10 APPROVED VISUAL SCREENS')}
<div class="info">THE ORIGINAL PNG CONCEPTS FROM YOUR HANDOFF ARE INCLUDED LOCALLY.</div>
<div class="muted">Use <span class="good">concept 2</span> to compare the original SYSTEM mockup. These images are visual references, not live UI.</div>
${CONCEPTS.map((f,i)=>entry(i+1,f.slice(3,-4).replaceAll('_',' '),'VIEW ORIGINAL ARCHIVED PNG',`concept ${i+1}`)).join('')}
<div class="footer-actions">${action('[ RETURN TO SYSTEM ]','system')}</div>`;}
function aboutPage(){return `
${sectionHead('GHOSTED / PROJECT FILE','SOURCE-AWARE WEB REBUILD')}
<div class="hero-heading">DISAPPEAR. BUILD. RETURN.</div>
<div class="info">Source: GHOSTED_ASTRA_MASTER_HANDOFF.rar (2026-10-26).</div>
<div class="spaced">100 original rank badges + Ghost Sovereign • 10 original division insignias • 64×34 selected original ASCII operator • 10 concept screens • offline command interpreter.</div>
${sectionHead('IMPLEMENTATION STATUS','HONEST SCOPE')}
<div class="term-line good">[OK] REPRODUCED CONCEPT DESIGN LANGUAGE AND REAL ASSETS</div>
<div class="term-line good">[OK] OFFLINE PROFILE TRANSACTIONS, UNDO, XP, COINS, MATRIX</div>
<div class="term-line good">[OK] BROWSER PERSISTENCE AND KEYBOARD INTERACTION</div>
<div class="term-line warn">[--] EXISTING ANDROID APP SOURCE / DATABASE NOT INCLUDED</div>
<div class="term-line warn">[--] ANDROID NATIVE NOTIFICATIONS STILL REQUIRE APP INTEGRATION</div>
<div class="term-line warn">[--] APPROVED 174,201 XP / LEVEL 1000 CURVE IN USE</div>
<div class="footer-actions">${action('[ CONCEPT ARCHIVE ]','concepts')}${action('[ HELP ]','help')}</div>`;}
function helpPage(){return `${sectionHead('DEVICE CONTROLS // DIRECTORY','ALL ACTIONS ARE TOUCH ENABLED')}
<div class="device-menu-help">${[['SYSTEM','system'],['PROTOCOLS','protocols'],['OPERATIONS','operations'],['CAREER','career'],['INTEL','intel'],['CONSISTENCY MATRIX','matrix'],['BLACK MARKET','shop'],['INVENTORY','inventory'],['VAULT','vault'],['SETTINGS','settings'],['RANK DATABASE','ranks'],['STATUS','status'],['BACKUP EXPORT','backup export'],['BACKUP IMPORT','backup import'],['LOCK VAULT','vaultlock']].map(([title,cmd])=>action('[ '+title+' ]',cmd,'device-control')).join('')}</div>
<div class="help-copy pr-editor-note">GHOSTED is a tactical device interface. All main workflows are accessible by buttons, with no command input required.</div>`;}
function statusPage(){const s=service();return `${sectionHead('STATUS / LOCAL OPERATOR',`UPDATED ${new Date().toLocaleTimeString()}`)}
${metric('KERNEL','GHOSTED WEB OS v6.3')}${metric('SESSION','OFFLINE PROFILE')}${metric('PERSISTENCE',persisted?'BROWSER STORAGE OK':'MEMORY ONLY')}${metric('RANK',esc(s.current.title))}${metric('LEVEL',pad(s.level))}${metric('TOTAL XP',short(s.xp))}${metric('GHOST COINS',short(s.coinsBalance))}${metric('PROTOCOLS TODAY',s.allTodayCount+' / '+activeProtocols().length)}${metric('STREAK',s.streak+' DAYS')}
<div class="footer-actions">${action('[ SYSTEM ]','system')}${action('[ PROTOCOLS ]','protocols')}</div>`;}
function historyPage(){return `${sectionHead('SHELL / COMMAND HISTORY','CURRENT SESSION')}${history.length?history.map((h,i)=>line(`<span class="muted">${String(i+1).padStart(3,'0')}</span> &nbsp; <span class="good">${esc(h)}</span>`)).join(''):'<div class="muted">NO PREVIOUS COMMANDS.</div>'}<div class="footer-actions">${action('[ HOME ]','system')}</div>`;}
function errorPage(msg){return `${sectionHead('COMMAND PROCESSOR / ERROR','INVALID INPUT')}<div class="large-warning">[ ERROR ]</div><div class="spaced bad">${esc(msg)}</div><div class="info">Use the DEVICE CONTROLS button or the navigation keys below.</div><div class="footer-actions">${action('[ SYSTEM ]','system')}${action('[ DEVICE CONTROLS ]','help')}</div>`;}

// GHOSTED V6.3 — native browser/Android-ready Back history, scoped to screen navigation.
// No public profile data, encrypted record or password is stored in browser history.
let v63Restoring=false, v63DialogSeq=0;
const v63RouteSections=new Set(['system','protocols','detail','operations','career','ranks','intel','matrix','day','shop','inventory','vault','settings','help','about','status','history','error']);
function v63RouteSnapshot(){return {section,selected,selectedDate,rankPage,selectedShop,selectedItem,intelCalendarYear,matrixRange,matrixOffset,protocolCalendarYear,opsView,opsCategory,opsSelected,opsShowArchived};}
function v63RouteKey(v){
 if(!v)return '';
 const k=v.section;
 if(k==='operations')return `operations:${v.opsView||'home'}:${v.opsCategory||'short'}:${v.opsSelected||0}:${!!v.opsShowArchived}`;
 return k==='detail'?`detail:${v.selected}`:k==='day'?`day:${v.selectedDate}`:k==='ranks'?`ranks:${v.rankPage}`:k;
}
function v63HistoryRecord(kind='screen',scroll=0,calendarScroll=0){return {ghostedV63:true,kind,route:v63RouteSnapshot(),scroll,calendarScroll};}
function v63CaptureHistory(){
 const current=window.history.state;
 if(!current?.ghostedV63||current.kind!=='screen'||v63Restoring)return;
 try{window.history.replaceState({...current,scroll:viewport.scrollTop,calendarScroll:document.querySelector('.pr-calendar-viewport')?.scrollLeft||document.querySelector('.intel-glow-scroller')?.scrollLeft||0},'');}catch{}
}
function v63CommitNavigation(before){
 if(v63Restoring)return;
 const priorKey=v63RouteKey(before),after=v63RouteSnapshot();
 if(priorKey===v63RouteKey(after)){
  if(window.history.state?.ghostedV63&&window.history.state.kind==='screen'){
   try{window.history.replaceState({...window.history.state,route:after},'');}catch{}
  }
  return;
 }
 try{window.history.pushState(v63HistoryRecord(),'');}
 catch{/* Standalone file URL restrictions: in-page links still work. */}
}
function v63RestoreRoute(route,scroll=0,calendarScroll=0){
 if(!route||!v63RouteSections.has(route.section))return;
 const movingFromVault=section==='vault'&&route.section!=='vault';
 if(movingFromVault&&vaultSession)vaultLock();
 v63Restoring=true;
 section=route.section;
 if(['home','list','detail'].includes(route.opsView))opsView=route.opsView;
 if(['short','long'].includes(route.opsCategory))opsCategory=route.opsCategory;
 if(route.opsSelected===null||Number.isInteger(route.opsSelected))opsSelected=route.opsSelected;
 if(typeof route.opsShowArchived==='boolean')opsShowArchived=route.opsShowArchived;
 if(Number.isInteger(route.selected))selected=route.selected;
 if(typeof route.selectedDate==='string'&&validDate(route.selectedDate))selectedDate=route.selectedDate;
 if(Number.isInteger(route.rankPage))rankPage=route.rankPage;
 if(Number.isInteger(route.selectedShop))selectedShop=route.selectedShop;
 if(Number.isInteger(route.selectedItem))selectedItem=route.selectedItem;
 if(Number.isInteger(route.intelCalendarYear))intelCalendarYear=route.intelCalendarYear;
 if(Number.isInteger(route.matrixRange))matrixRange=route.matrixRange;
 if(Number.isInteger(route.matrixOffset))matrixOffset=route.matrixOffset;
 if(Number.isInteger(route.protocolCalendarYear))protocolCalendarYear=route.protocolCalendarYear;
 lastNote='';lastEcho='';render();
 requestAnimationFrame(()=>{
  viewport.scrollTop=Math.max(0,Number(scroll)||0);
  const calendar=document.querySelector('.pr-calendar-viewport')||document.querySelector('.intel-glow-scroller');
  if(calendar)calendar.scrollLeft=Math.max(0,Number(calendarScroll)||0);
 });
 v63Restoring=false;
}
function v63EditorDirty(){
 const dialog=document.getElementById('overlay');
 return !!(dialog&&!dialog.classList.contains('hidden')&&dialog.dataset.dirty==='1'&&dialog.querySelector('form'));
}
function v63CloseDialogDOM(){
 const overlay=$('#overlay');overlay.classList.add('hidden');overlay.dataset.dirty='0';
 $('#overlay-body').replaceChildren();state.pendingRedemption=null;
 const target=previousDialogFocus?.isConnected?previousDialogFocus:document.querySelector('#terminal-content [data-command]');
 if(target)target.focus({preventScroll:true});previousDialogFocus=null;
}
window.addEventListener('popstate',event=>{
 const dest=event.state;
 if(v63EditorDirty()&&!window.confirm('Discard unsaved edits and leave this dialog?')){
  try{window.history.pushState({...v63HistoryRecord('dialog'),dialogId:++v63DialogSeq},'');}catch{}
  return;
 }
 if(!$('#overlay').classList.contains('hidden'))v63CloseDialogDOM();
 if(dest?.ghostedV63){v63RestoreRoute(dest.route,dest.scroll,dest.calendarScroll);}
});
// Start at SYSTEM for a fresh open; retain browser-back history for existing sessions.
try{
 if(!window.history.state?.ghostedV63)window.history.replaceState(v63HistoryRecord(),'');
 else if(window.history.state?.route?.section)v63RestoreRoute(window.history.state.route,window.history.state.scroll,window.history.state.calendarScroll);
}catch{}

function render(){const s=service();const map={system:home,protocols:protocolPage,operations:operationsPage,career:careerPage,intel:intelPage,matrix:matrixPage,shop:shopPage,inventory:inventoryPage,vault:vaultPage,settings:settingsPage,concepts:conceptsPage,about:aboutPage,help:helpPage,status:statusPage,history:historyPage};
 let content='';if(section==='detail')content=detailPage(selected);else if(section==='ranks')content=ranksPage(rankPage);else if(section==='day')content=dayPage(selectedDate);else if(section==='error')content=errorPage(lastNote);else content=(map[section]||home)();
 screen.innerHTML=(storageCorrupt?'<div class="large-warning">STORED PUBLIC DATA MAY BE CORRUPTED — WRITES BLOCKED. OPEN SETTINGS TO EXPORT RAW RECOVERY.</div>':'')+content;
 // Route access is local to the module content; don't add a second link when one exists.
 if(section!=='system'&&!screen.querySelector('[data-command="system"]')){
  screen.insertAdjacentHTML('beforeend',`<div class="v63-system-route">${action('[ ← RETURN TO SYSTEM ]','system')}<small>GHOSTED // COMMAND HUB</small></div>`);
 }
 tail.innerHTML=lastNote&&section!=='error'?`<div class="notification"><span class="${lastType}">${esc(lastNote)}</span></div>`:'';
 document.body.classList.toggle('help-off',!state.settings.helpMode);
 document.body.dataset.section=section;$('#section-title').textContent=section==='detail'?'PROTOCOL EXECUTION':section==='ranks'?'RANK DATABASE':section==='shop'?'BLACK MARKET':section==='day'?'DATE RECORD':section.toUpperCase();
 $('#stat-callsign').textContent=String(state.callsign||'GHOST-001').toUpperCase();$('#stat-rank').textContent=s.current.title.toUpperCase();$('#stat-level').textContent=pad(s.level);$('#stat-xp').textContent=short(s.xp);$('#stat-coins').textContent=short(s.coinsBalance)+' GC';$('#stat-protocols').textContent=s.allTodayCount+' / '+activeProtocols().length;$('#stat-streak').textContent=s.streak+' DAYS';refreshOperator();$('#service-badge').src=s.current.image;$('#service-badge').style.display=s.current.honorary?'none':'';$('#service-badge').alt=s.current.honorary?'Existing Grand Ghost Commander insignia; Ghost Sovereign has no approved badge yet':s.current.title+' approved rank insignia';$('#division-name').textContent=s.current.honorary?'GHOST SOVEREIGN // HONORARY':s.current.divisionName.toUpperCase();
 $('#matrix-mini').innerHTML=Array.from({length:28},(_,i)=>{const day=dateAgo(27-i);const n=done(day).length,den=Math.max(1,activeProtocols(day).length);return `<i class="${n===0?'':n>=den?'g3':n>=Math.ceil(den*.6)?'g2':'g1'}" title="${day}: ${n}/${den}"></i>`}).join('');
 viewport.scrollTop=0;
}
function resetUI(){lastEcho='';lastNote='';section='system';render();}
function showToast(s){if(/DENIED|BLOCKED|FAILED|INVALID|ERROR|REACHED|UNAVAILABLE/i.test(String(s)))hardwareEffect('denied');const e=$('#toast');e.textContent=s;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2400);}
let previousDialogFocus=null;
function popup(content){previousDialogFocus=document.activeElement;const o=$('#overlay');$('#overlay-body').innerHTML=content;o.dataset.dirty='0';o.classList.remove('hidden');
 if(!v63Restoring){try{window.history.pushState({...v63HistoryRecord('dialog'),dialogId:++v63DialogSeq},'');}catch{}}
 $('#close-overlay').focus();}
function closePopup(commitNewRoute=false){if(v63EditorDirty()&&!window.confirm('Discard unsaved edits?'))return false;
 const dialogHistory=window.history.state?.ghostedV63&&window.history.state.kind==='dialog';
 v63CloseDialogDOM();
 if(dialogHistory&&!v63Restoring){if(commitNewRoute){try{window.history.replaceState(v63HistoryRecord(),'');}catch{}}else window.history.back();}
 return true;}
function setProtocolOnDate(id,date,on,{source='history'}={}){
 if(!PROTOCOLS.some(p=>p.id===id))return false;
 if(!validDate(date)||date>dateAgo(0))return false;
 const p=PROTOCOLS.find(v=>v.id===id);
 const prior=done(date);
 const had=prior.includes(id);
 if(on&&had){lastNote=`[NO CHANGE] ${p.name} ALREADY COMPLETE ON ${date}.`;lastType='warn';return false;}
 if(!on&&!had){lastNote=`[NO CHANGE] ${p.name} WAS NOT COMPLETE ON ${date}.`;lastType='warn';return false;}
 const next=on?[...prior,id].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b):prior.filter(v=>v!==id);
 const scopeBefore=activeIds(date);
 const eligibleNow=eligible(id,date);
 const wasBonus=!!state.rewardLedger?.[date]?.bonus;
 let xpDelta=0,coinDelta=0;
 const ok=atomicChange(()=>{
  state.days[date]=next;if(id===5&&!on)delete state.mildDays?.[date];
  state.rewardLedger=state.rewardLedger||{};
  const row=state.rewardLedger[date]||{xp:0,coins:0,bonus:false,awards:{}};
  row.awards=row.awards||{};
  if(!on){const v=row.awards[id];if(v){xpDelta-=v.xp;coinDelta-=v.coins;}delete row.awards[id];}
  else if(eligibleNow&&!row.awards[id]){row.awards[id]={xp:p.xp,coins:p.coins};xpDelta+=p.xp;coinDelta+=p.coins;}
  const perfect=full(date);
  if(perfect&&!wasBonus){
   if(!Array.isArray(row.bonusScope)||!row.bonusScope.length)row.bonusScope=[...scopeBefore].sort((a,b)=>a-b);
   row.bonus=true;xpDelta+=50;coinDelta+=20;
  }
  if(!perfect&&wasBonus){row.bonus=false;xpDelta-=50;coinDelta-=20;}
  row.xp+=xpDelta;row.coins+=coinDelta;
  if(row.xp<0||row.coins<0)throw Error('Negative ledger');
  state.rewardLedger[date]=row;
 });
 if(!ok){lastNote='HISTORY CORRECTION NOT SAVED';lastType='bad';return false;}
 reminderRequestSync();
 const noReward=on&&!eligibleNow;
 if(noReward)lastNote=`[HISTORY UPDATED] ${p.name} RECORDED FOR ${date}. SESSION SAVED // +0 XP / +0 GC (OFF-SCHEDULE OR ALREADY PAID).`;
 else lastNote=`[HISTORY UPDATED] ${p.name} ${on?'RECORDED':'REMOVED'} FOR ${date}. ${xpDelta>=0?'+':''}${xpDelta} XP / ${coinDelta>=0?'+':''}${coinDelta} GC`;
 lastType=noReward?'info':on?'good':'warn';
 showToast(on?'EXECUTION LOGGED':'EXECUTION REMOVED');
 return true;
}
function setDayProtocolFromIntel(date,id,on){if(setProtocolOnDate(id,date,on,{source:'intel'})){section='intel';intelInspectDate=date;intelCalendarYear=Number(date.slice(0,4));}}
function setDayProtocolFromDetail(id,date,on){if(setProtocolOnDate(id,date,on,{source:'detail'})){section='detail';selected=id;protocolInspectDate=date;protocolCalendarYear=Number(date.slice(0,4));}}

function popupConcept(n){if(!Number.isInteger(n)||n<1||n>10)return false;const file=CONCEPTS[n-1];popup(`<h2>REFERENCE ${pad(n)} // ${esc(file)}</h2><img src="${CONCEPT_DATA[n-1]}" alt="Original archived GHOSTED reference image ${esc(file)}"/>`);return true;}
function doComplete(id,undo=false){
 const p=PROTOCOLS.find(x=>x.id===id);if(!p||!activeProtocol(p,dateAgo(0))){lastNote='PROTOCOL NOT ACTIVE';lastType='warn';return;}
 const day=dateAgo(0),had=done(day).includes(id),wasBonus=!!state.rewardLedger?.[day]?.bonus;
 if(section!=='protocols')section='detail';selected=id;
 if(undo&&!had){lastNote='ALREADY UNCHECKED';lastType='warn';return;}
 if(!undo&&had){lastNote='ALREADY RECORDED TODAY';lastType='warn';return;}
 const eligibleNow=eligible(id,day),scopeBefore=activeIds(day);
 let xpDelta=0,coinDelta=0;
 const ok=atomicChange(()=>{
  state.days[day]=undo?done(day).filter(x=>x!==id):[...done(day),id];
  state.rewardLedger=state.rewardLedger||{};
  const row=state.rewardLedger[day]||{xp:0,coins:0,bonus:false,awards:{}};
  row.awards=row.awards||{};
  if(undo){if(id===5)delete state.mildDays?.[day];const v=row.awards[id];if(v){xpDelta-=v.xp;coinDelta-=v.coins;}delete row.awards[id];}
  else if(eligibleNow){row.awards[id]={xp:p.xp,coins:p.coins};xpDelta+=p.xp;coinDelta+=p.coins;}
  // Perfect Day is calculated against due tasks only, never optional extras.
  const perfect=full(day);
  if(perfect&&!wasBonus){
   if(!Array.isArray(row.bonusScope)||!row.bonusScope.length)row.bonusScope=[...scopeBefore].sort((a,b)=>a-b);
   row.bonus=true;xpDelta+=50;coinDelta+=20;
  }
  if(!perfect&&wasBonus){row.bonus=false;xpDelta-=50;coinDelta-=20;}
  row.xp+=xpDelta;row.coins+=coinDelta;
  if(row.xp<0||row.coins<0)throw Error('Negative ledger');
  state.rewardLedger[day]=row;
 });
 if(!ok){lastNote='SAVE FAILED. YOUR PREVIOUS RECORDS ARE UNCHANGED.';lastType='bad';return;}
 reminderRequestSync();
 const extra=!undo&&!eligibleNow;
 lastNote=extra?`[OPTIONAL SESSION RECORDED] ${prProtocolName(id)} // +0 XP / +0 GC (TARGET MET OR OFF-DAY)`:`[${undo?'UNDONE':'COMPLETED'}] ${prProtocolName(id)} // ${xpDelta>=0?'+':''}${xpDelta} XP / ${coinDelta>=0?'+':''}${coinDelta} GC`;
 lastType='good';showToast(extra?'BONUS SESSION LOGGED — NO REWARD':undo?'COMPLETION UNDONE':'COMPLETION SAVED');if(extra)hardwareEffect('switch');
}
function run(value,opts={}){let raw=String(value||'').trim();if(!raw)return;
 const parts=raw.toLowerCase().split(/\s+/),verb=parts[0],arg=parts[1];
 if(verb==='back'){if($('#overlay').classList.contains('hidden'))window.history.back();else closePopup();return;}
 const beforeRoute=v63RouteSnapshot();v63CaptureHistory();
 const previousSection=section,previousScroll=viewport.scrollTop,previousCalScroll=document.querySelector('.pr-calendar-viewport')?.scrollLeft||0;
 lastEcho=raw;lastNote='';lastType='info';
 if(!opts.silent){history.push(raw);histCursor=history.length;}
 switch(verb){
 case '0':case 'system':case 'home':case 'back':case 'exit':section='system';break;
 case 'help':case '?':section='help';break;
 case 'status':section='status';break;
 case 'dbstatus':{
  section='settings';
  const d=window.GHOSTED_NATIVE_DB?.status?.()||{platform:'browser',state:'bridge-unavailable',writes:0,lastError:null};
  setTimeout(()=>popup(`<h2>DATABASE // STATUS</h2><div class="term-line">PLATFORM: ${esc(String(d.platform))}</div><div class="term-line">STATE: ${esc(String(d.state))}</div><div class="term-line">SUCCESSFUL MIRROR WRITES: ${Number(d.writes)||0}</div><div class="term-line">LAST ERROR: ${esc(String(d.lastError||'NONE'))}</div><div class="muted">Reopening confirms persistence, not native SQLite. Run the separate write/read test.</div>`),0);
  break;
 }
 case 'dbtest':{
  section='settings';
  setTimeout(async()=>{
    const d=window.GHOSTED_NATIVE_DB;
    let result;
    try{result=d?.selfTest?await d.selfTest():{ok:false,reason:'Diagnostic bridge unavailable'};}
    catch(error){result={ok:false,error:String(error)};}
    popup(`<h2>SQLITE // DISPOSABLE PROBE</h2><div class="term-line ${result.ok?'good':'bad'}">${result.ok?'[OK] NATIVE SQLITE VERIFIED':'[FAILED] SQLITE NOT VERIFIED'}</div><div class="term-line">DETAIL: ${esc(String(result.result||result.reason||'UNKNOWN'))}</div><div class="term-line">STATE: ${esc(String(result.state||'UNKNOWN'))}</div><div class="term-line">ERROR: ${esc(String(result.error||result.lastError||'NONE'))}</div><div class="muted">Only a disposable diagnostic record was created and removed. XP, Coins, protocols and Vault were not modified.</div>`);
  },0);
  break;
 }

 case 'pnew':section='protocols';setTimeout(()=>popup(prNewForm()),0);break;
 case 'parchive':prArchive(Number(arg),false);break;
 case 'prestore':prArchive(Number(arg),true);break;
 case 'helpmode':state.settings.helpMode=!state.settings.helpMode;save();section='settings';showToast(state.settings.helpMode?'HELP MODE ON':'HELP MODE OFF');break;
 case '1':case 'protocols':section='protocols';break;
 case '2':case 'operations':case 'missions':section='operations';opsView='home';break;
 case '3':case 'career':section='career';break;
 case '4':case 'intel':{if(verb==='intel'){const days=Number(arg);if([7,14,30].includes(days))intelGraphDays=days;const metric=parts.slice(1).find(x=>x==='xp'||x==='completion');if(metric)intelGraphMetric=metric;}section='intel';break;}
 case 'ical':{const year=Number(arg);if(Number.isInteger(year)&&year>=1900&&year<=2200){intelCalendarYear=year;intelInspectDate='';section='intel';}else{lastNote='YEAR MUST BE BETWEEN 1900 AND 2200';lastType='warn'}break;}
 case 'iday':{const date=String(arg||'');if(date==='close'){intelInspectDate='';section='intel';}else if(validDate(date)){intelInspectDate=date;intelCalendarYear=Number(date.slice(0,4));section='intel';}else{lastNote='INVALID DATE';lastType='warn'}break;}
 case 'hset':{const date=String(arg||''),id=Number(parts[2]),mode=String(parts[3]||'on');setDayProtocolFromIntel(date,id,mode!=='off');if(previousSection==='day'&&date===selectedDate){section='day';selectedDate=date;}break;}
 case 'phset':{const id=Number(arg),date=String(parts[2]||''),mode=String(parts[3]||'on');setDayProtocolFromDetail(id,date,mode!=='off');break;}
 case '5':case 'shop':case 'market':section='shop';break;
 case '6':case 'inventory':section='inventory';break;
 case 'vault':section='vault';break;
 case '7':section='settings';break;
 case '8':case 'settings':section='settings';break;
 case 'ranks':section='ranks';rankPage=arg?Number(arg):1;if(!Number.isInteger(rankPage)||rankPage<1||rankPage>11){section='error';lastNote='RANKS PAGE MUST BE 1 TO 11'}break;
 case 'divisions':section='career';break;
 case 'pscore':case 'phistory':{const id=Number(arg),v=parts[2];if(PROTOCOLS.some(p=>p.id===id)&&['day','week','month','quarter','year'].includes(v)){selected=id;section='detail';if(verb==='pscore')protocolScoreMode=v;else protocolHistoryMode=v;}else{lastNote='INVALID PERIOD. USE DAY/WEEK/MONTH/QUARTER/YEAR';lastType='warn'}break;}
 case 'pcal':{const id=Number(arg),year=Number(parts[2]);if(PROTOCOLS.some(p=>p.id===id)&&Number.isInteger(year)&&year>=1900&&year<=2200){selected=id;section='detail';protocolCalendarYear=year;protocolInspectDate='';}else{lastNote='YEAR MUST BE BETWEEN 1900 AND 2200';lastType='warn'}break;}
 case 'pday':{const id=Number(arg),date=String(parts[2]||'');if(PROTOCOLS.some(p=>p.id===id)&&(date==='close'||validDate(date))){selected=id;section='detail';protocolInspectDate=date==='close'?'':date;}else{lastNote='INVALID DATE';lastType='warn'}break;}
 case 'pedit':{const id=Number(arg);if(PROTOCOLS.some(p=>p.id===id)){selected=id;section='detail';setTimeout(()=>prOpenEditor(id),0);}else{lastNote='USE PEDIT 1..5';lastType='warn'}break;}
 case 'open':selected=Number(arg);section=PROTOCOLS.some(x=>x.id===selected)?'detail':'error';if(section==='detail'){protocolCalendarYear=new Date().getFullYear();protocolInspectDate='';}if(section==='error')lastNote='USE OPEN 1..5';break;
 case 'complete':case 'execute':doComplete(Number(arg));break;
 case 'undo':doComplete(Number(arg),true);break;
 case 'matrix':{const n=Number(arg);if([28,56,90].includes(n)){matrixRange=n;matrixOffset=0;}section='matrix';break;}
 case 'matrixback':matrixOffset=Math.min(120,matrixOffset+1);section='matrix';break;
 case 'matrixnext':matrixOffset=Math.max(0,matrixOffset-1);section='matrix';break;
 case 'day':selectedDate=String(arg||'');section='day';break;
 case 'inspect':{const id=Number(arg);selectedShop=STORE.some(x=>x.id===id)?id:STORE[0].id;section='shop';break;}
 case 'item':{const id=Number(arg);selectedItem=marketItem(id)?id:selectedItem;section='inventory';break;}
 case 'operator':{const total=window.GHOSTED_V68_IMAGES.all.length;operatorIndex=arg==='next'?(operatorIndex+1)%total:arg==='prev'?(operatorIndex+total-1)%total:Number(arg||0);if(!Number.isInteger(operatorIndex)||operatorIndex<0||operatorIndex>=total){operatorIndex=0;lastNote='USE operator 0..14, operator next, OR operator prev.';lastType='warn';}section='system';break;}
 case 'boot':section='system';hardwareEffect('boot');setTimeout(()=>startBoot(true),20);break;
 case 'buy':{
  const id=Number(arg),item=STORE.find(x=>x.id===id);section='shop';
  if(!item){lastNote='UNKNOWN REQUISITION';lastType='bad';break;}
  const permit=marketEligibility(id,'purchase');
  if(!permit.ok){lastNote=`[DENIED] REQUISITION LIMIT REACHED: ${permit.label}. NEXT ${permit.next}`;lastType='bad';break;}
  if(availableCount(id)>0){lastNote='UNUSED REWARD IN INVENTORY — REDEEM BEFORE BUYING ANOTHER';lastType='warn';break;}
  if(service().coinsBalance<item.price){lastNote='INSUFFICIENT GHOST COINS';lastType='bad';break;}
  if(!atomicChange(()=>{state.purchased.push(id);state.purchaseRecords.push({id,price:item.price,at:new Date().toISOString(),policyVersion:1});})){
   lastNote='PURCHASE NOT SAVED — STORAGE ERROR';lastType='bad';break;
  }
  selectedItem=id;lastNote=`[AUTHORIZED] ${item.name} -${item.price} GC. PURCHASE & SHARED LIMITS RECORDED.`;lastType='good';showToast('PURCHASE CONFIRMED');playTone('success');fxTransactionStamp('AUTHORIZED',item.name,'PURCHASE // -'+item.price+' GC');break;
 }
 case 'redeem':{
  const id=Number(arg),item=marketItem(id);section='inventory';selectedItem=id;
  if(!item||!availableCount(id)){lastNote='NO UNUSED REWARD OWNED';lastType='warn';break;}
  const permit=marketEligibility(id,'redeem');
  if(!permit.ok){lastNote=`[DENIED] REDEMPTION LIMIT REACHED: ${permit.label}. NEXT ${permit.next}`;lastType='bad';break;}
  const food=[7,8,9].includes(id);
  state.pendingRedemption=id;const m=rewardMeta(id);
  popup(`<div class="iv-redeem-dialog"><h2>REDEEM // ${esc(item.name)}</h2><p>${esc(m.desc)}</p>
  <div class="warn">SINGLE-USE TOKEN. REDEMPTION LIMITS ARE CHECKED SEPARATELY FROM PURCHASE LIMITS. NO SECOND XP / GC PAYOUT.</div>
  ${food?`<div class="mk-convert-note" id="mk-convert-note">[INFO] A PREVIOUS STRICT COMPLETION WILL BE CONVERTED TO MILD ONLY WHEN YOU CONFIRM USE.</div><label class="mk-food-date">NO JUNK UPF // MILD DATE <input type="date" id="mk-mild-date" min="${dateAgo(0).slice(0,7)}-01" max="${dateAgo(0)}" value="${dateAgo(0)}" /></label><p class="info">Choose the day you use this food pass. If No Junk UPF is STRICT on that day, confirming changes its label to MILD without changing the earned XP or streak. If incomplete, today may earn the ordinary completion once; past dates earn no backdated XP. A previously MILD day cannot be used again.</p>`:''}
  <div class="mk-error bad" role="alert"></div><div class="iv-actions"><button type="button" class="terminal-action iv-use" data-market-confirm="${id}">[ CONFIRM USE ]</button>${action('[ CANCEL ]','canceluse')}</div></div>`);
  break;
 }
 case 'use':{lastNote='USE THE CONFIRM BUTTON IN THE REDEMPTION DIALOG.';lastType='warn';section='inventory';break;}
 case 'canceluse':state.pendingRedemption=null;closePopup();section='inventory';break;

 case 'goal':{section='operations';const id=Number(parts[2]);
   if(arg==='home'){opsView='home';opsSelected=null;}
   else if(arg==='list'){opsView='list';opsCategory=parts[2]==='long'?'long':'short';opsSelected=null;opsShowArchived=false;}
   else if(arg==='create'){opsCategory=parts[2]==='long'?'long':'short';setTimeout(()=>opsEditor(0,opsCategory),0);}
   else if(arg==='open'){const g=state.goals.find(x=>x.id===id);if(g){opsView='detail';opsCategory=g.category;opsSelected=g.id;}}
   else if(arg==='edit'){const g=state.goals.find(x=>x.id===id);if(g&&g.status!=='archived')setTimeout(()=>opsEditor(id,g.category),0);}
   else if(arg==='toggle'){opsToggle(id,Number(parts[3]));}
   else if(arg==='archive'){opsArchive(id);}
   else if(arg==='restore'){opsArchive(id,true);}
   else if(arg==='delete'){opsDelete(id);}
   else if(arg==='archived'){opsShowArchived=!opsShowArchived;}
   break;}
 case 'mission':section='operations';opsView='home';break;
 case 'reward':section='shop';break;
 case 'marketnew':section='shop';setTimeout(()=>marketEditor(),0);break;
 case 'marketedit':section='shop';setTimeout(()=>marketEditor(Number(arg)),0);break;
 case 'marketarchive':section='shop';archiveMarketItem(Number(arg));break;
 case 'marketrestore':section='shop';archiveMarketItem(Number(arg),true);break;
 case 'marketcancel':closePopup();section='shop';break;
 case 'historymerge':{
  if(!confirm('Merge only missing confirmed historical completions? Existing rewards, XP, goals, purchases, and Vault data will remain unchanged.'))break;
  const imported=window.GHOSTED_V68_HISTORY_DAYS||{};
  let count=0;
  const ok=atomicChange(()=>{for(const [day,ids] of Object.entries(imported)){const arr=Array.isArray(state.days[day])?state.days[day]:[];for(const id of ids)if(!arr.includes(id)){arr.push(id);count++;}state.days[day]=arr;}state.historyImport={source:'GHOSTED_HABIT_HISTORY_IMPORT_BUNDLE',method:'screenshot-confirmed-only',events:562,retroactiveRewards:false,mergedOn:new Date().toISOString()};});
  lastNote=ok?('[OK] CONFIRMED HISTORY MERGED // '+count+' NEW EVENTS // NO XP PAID'):'[FAILED] LOCAL STORAGE UNAVAILABLE';section='settings';break;
 }
 case 'backup':section='settings';if(arg==='export'){downloadJSON(backupPackage(),'GHOSTED_PUBLIC_BACKUP_'+dateAgo(0)+'.json');lastNote='[EXPORTED] PUBLIC DATA ONLY — PRIVATE VAULT EXCLUDED';}
 else if(arg==='import'){$('#backup-file').click();lastNote='SELECT PUBLIC BACKUP JSON';}
 else if(arg==='raw'&&legacyBackupRaw){downloadJSON({raw:legacyBackupRaw},'GHOSTED_RAW_RECOVERY.json');lastNote='RAW CORRUPTED DATA EXPORTED FOR RECOVERY';}break;
 case 'demo':section='settings';lastNote='[DISABLED] REAL HISTORY PROFILE ACTIVE';break;
 case 'rmpermission':{section='settings';const bridge=window.GHOSTED_NATIVE_REMINDERS;if(!bridge||typeof bridge.requestPermission!=='function'){lastNote='ANDROID APP ADAPTER NOT CONNECTED';lastType='warn';break;}Promise.resolve(bridge.requestPermission()).then(()=>{rmLastSignature='';reminderRequestSync();showToast('NOTIFICATION PERMISSION REQUESTED');}).catch(()=>showToast('NOTIFICATION PERMISSION NOT GRANTED'));break;}
  case 'feedbacksound':state.settings.feedback.sound=!state.settings.feedback.sound;save();section='settings';showToast('HARDWARE SOUNDS '+(state.settings.feedback.sound?'ENABLED':'DISABLED'));break;
 case 'feedbackhaptics':state.settings.feedback.haptics=!state.settings.feedback.haptics;save();section='settings';showToast('TACTILE RESPONSE '+(state.settings.feedback.haptics?'ENABLED':'DISABLED'));break;
 case 'feedbackmotion':state.settings.feedback.animations=!state.settings.feedback.animations;save();section='settings';showToast('TACTICAL ANIMATIONS '+(state.settings.feedback.animations?'ENABLED':'DISABLED'));break;
 case 'feedbacktest':{
   section='settings';const current=service();
   if(arg==='xp')fxXpFlow({xp:current.xp,level:current.level},{xp:current.xp+85,level:levelAt(current.xp+85)},true);
   else if(arg==='coins')fxCoinTransfer(20,true);
   else if(arg==='purchase')fxTransactionStamp('AUTHORIZED','PREVIEW REQUISITION','TEST ONLY // NO COINS SPENT',true);
   else if(arg==='redemption')fxTransactionStamp('REDEEMED','PREVIEW TOKEN','TEST ONLY // INVENTORY UNCHANGED',true);
   else if(arg==='vault'){hardwareSound('vaultUnlock',true);fxVaultDoors(true);}
   else if(arg==='level'){hardwareSound('success',true);hardwareAnimation('level',{level:current.level+1});}
   else if(arg==='promotion'){hardwareSound('promotion',true);hardwareAnimation('rank',{title:'PREVIEW // RANK PROMOTION',image:current.current.image});}
   else if(arg==='division'){hardwareSound('promotion',true);hardwareAnimation('division',{title:'PREVIEW // DIVISION PROMOTION',image:current.current.image});}
   else if(arg==='sovereign'){hardwareSound('sovereign',true);hardwareAnimation('sovereign',{level:1000,title:'GHOST SOVEREIGN'});}
   else hardwareEffect(arg==='success'?'success':'switch',true);
   break;
  }
 case 'sounds':state.settings.sounds=!state.settings.sounds;save();section='settings';break;
 case 'beep':playTone('success',true);section='settings';break;
 case 'vaultdemo':vaultModeSwitch('demo');section='vault';break;
 case 'vaultpersonal':vaultModeSwitch('personal');section='vault';break;
 case 'vaultlock':vaultLock();section='vault';break;
 case 'vaultexport':{section='vault';const raw=vaultStored();if(raw){downloadJSON({format:'GHOSTED-ENCRYPTED-VAULT',version:1,payload:JSON.parse(raw)},(vaultMode==='demo'?'GHOSTED_DEMO_VAULT_':'GHOSTED_ENCRYPTED_VAULT_')+dateAgo(0)+'.json');lastNote='ENCRYPTED VAULT BACKUP EXPORTED. KEEP THE PASSWORD SAFE.';}break;}
 case 'vaultimport':section='vault';$('#vault-file').click();lastNote='SELECT A SEPARATE ENCRYPTED VAULT BACKUP';break;
 case 'vaultdone':if(vaultSession){const day=dateAgo(0),was=!!vaultSession.data.done[day];vaultSession.data.done[day]=!was;vaultSave().then(ok=>{if(!ok){vaultSession.data.done[day]=was;vaultError='SAVE FAILED';}render();});section='vault';}break;
 case 'scanlines':state.settings.scanlines=!state.settings.scanlines;save();document.body.classList.toggle('no-scanlines',!state.settings.scanlines);section='settings';lastNote=state.settings.scanlines?'SCANLINES ENABLED':'SCANLINES DISABLED';break;
 case 'concepts':section='concepts';break;
 case 'concept':section='concepts';if(!popupConcept(Number(arg))){lastNote='USE CONCEPT 1..10';lastType='bad'}break;
 case 'about':section='about';break;
 case 'history':section='history';break;
 case 'clear':section='system';lastEcho='';break;
 case 'reset':section='settings';if(true){if(!confirm('Reset to the REAL HISTORY baseline (562 confirmed events)? This deletes any new public purchases, custom protocols and goals. Back up first. Vault remains separate.'))break;storageCorrupt=false;state=upgradeState(initial());refreshMarketRegistry();refreshCustomRegistry();refreshProtocolRewards();save();section='system';lastNote='[RESET] REAL HISTORY RESTORED // 562 EVENTS';rmLastSignature='';reminderRequestSync();lastType='warn';showToast('PUBLIC PROFILE RESET');}break;
 default:section='error';lastNote=`UNKNOWN COMMAND: ${raw}. ENTER HELP FOR AVAILABLE COMMANDS.`;break;
 }
  if(previousSection==='vault'&&section!=='vault'&&vaultSession)vaultLock();
  if(previousSection!==section&&!opts.silent)hardwareEffect('module');
  if(lastType==='bad')hardwareEffect('denied');
  render();v63CommitNavigation(beforeRoute);
  if(verb==='inspect'&&section==='shop'){requestAnimationFrame(()=>{const el=document.getElementById('market-selected-data');if(el){const y=el.getBoundingClientRect().top-viewport.getBoundingClientRect().top+viewport.scrollTop-12;viewport.scrollTo({top:Math.max(0,y),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});}
  const calNow=document.querySelector('.pr-calendar-viewport');if(calNow){const preserve=previousSection===section&&['detail','intel'].includes(section)&&!['pcal','ical'].includes(verb);const desired=preserve?previousCalScroll:-1;requestAnimationFrame(()=>{if(calNow.isConnected){calNow.scrollLeft=desired>=0?desired:calNow.scrollWidth-calNow.clientWidth;}});}if((previousSection==='detail'&&section==='detail'&&['pscore','phistory','pcal','pday','phset','complete','undo'].includes(verb))||(previousSection==='intel'&&section==='intel'&&['iday','hset','ical'].includes(verb))||(previousSection==='protocols'&&section==='protocols'&&['complete','undo'].includes(verb))||(previousSection==='day'&&section==='day'&&verb==='hset'))viewport.scrollTop=previousScroll;command.value='';command.focus({preventScroll:true});
}
function refreshOperator(){const x=window.GHOSTED_V68_IMAGES;const variant=x.all[operatorIndex]||x.all[0];const art=$('#operator-art');if(art){art.src=x[variant.key];art.alt=variant.label+' // DOT-MATRIX OPERATOR';}const counter=$('#operator-counter');if(counter)counter.textContent=variant.label+' // '+pad(operatorIndex+1)+' OF '+pad(x.all.length);}
refreshOperator();document.body.classList.toggle('no-scanlines',!state.settings.scanlines);
$('#run-command').addEventListener('click',()=>run(command.value));
command.addEventListener('keydown',e=>{
 if(e.key==='Enter'){e.preventDefault();run(command.value)}
 else if(e.key==='ArrowUp'){e.preventDefault();if(histCursor>0)command.value=history[--histCursor]||'';}
 else if(e.key==='ArrowDown'){e.preventDefault();if(histCursor<history.length)histCursor++;command.value=history[histCursor]||'';}
 else if(e.key==='Tab'){const v=command.value.trim().toLowerCase();const matches=cmds.filter(x=>x.startsWith(v));if(v&&matches.length===1){e.preventDefault();command.value=matches[0]+' ';}}
 else if(e.key==='Escape'){e.preventDefault();run('system');}
 else if(e.ctrlKey&&e.key.toLowerCase()==='l'){e.preventDefault();run('clear');}
});
// V6.9 — original programmatically synthesized dry hardware sound cues.
// No sampled game audio, no external requests or continuous playback.
let v69Audio=null,v69LastTap=0,v69FxTimeout=0;
function hardwareFeedbackPrefs(){return state.settings?.feedback||{sound:true,haptics:true,animations:true,volume:100};}
function hardwareMotionAllowed(){return !!hardwareFeedbackPrefs().animations&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function hardwareTone(ctx,freq,start,duration,type='triangle',gain=.4){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.78),start+duration);
 const volume=.19*(Number(hardwareFeedbackPrefs().volume)||0)/100*gain;
 g.gain.setValueAtTime(.00001,start);g.gain.exponentialRampToValueAtTime(Math.max(.00002,volume),start+.007);g.gain.exponentialRampToValueAtTime(.00001,start+duration);
 o.connect(g).connect(ctx.destination);o.start(start);o.stop(start+duration+.012);
}
function hardwareSound(kind='switch',force=false){
 const prefs=hardwareFeedbackPrefs();if(!force&&!prefs.sound)return;if(!Number(prefs.volume))return;
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;v69Audio=v69Audio||new C();
 if(v69Audio.state==='suspended')v69Audio.resume().catch(()=>{});
 const t=v69Audio.currentTime+.005;
 // Short transients with restrained harmonic structure, designed for a small speaker.
 const play=(f,offset,duration,type,gain)=>hardwareTone(v69Audio,f,t+offset,duration,type,gain);
 switch(kind){
  case 'switch':play(380,0,.028,'square',.22);play(840,.034,.032,'triangle',.08);break;
  case 'module':play(185,0,.075,'square',.18);play(770,.077,.08,'triangle',.26);break;
  case 'success':play(440,0,.035,'square',.18);play(820,.048,.122,'sine',.52);break;
  case 'coins':play(580,0,.035,'triangle',.28);play(930,.068,.09,'sine',.28);break;
  case 'purchase':play(385,0,.05,'square',.25);play(620,.074,.105,'triangle',.46);break;
  case 'denied':case 'warning':play(320,0,.09,'sawtooth',.17);play(230,.115,.12,'triangle',.24);break;
  case 'undo':play(290,0,.05,'triangle',.18);break;
  case 'promotion':play(150,0,.11,'square',.17);play(430,.16,.16,'triangle',.32);play(830,.36,.23,'sine',.58);break;
  case 'sovereign':play(115,0,.18,'square',.2);play(295,.2,.23,'triangle',.4);play(615,.46,.25,'triangle',.4);play(880,.72,.34,'sine',.5);break;
  case 'vaultUnlock':play(160,0,.10,'square',.35);play(335,.14,.12,'triangle',.24);play(775,.31,.14,'sine',.3);break;
  case 'vaultLock':play(240,0,.08,'square',.3);play(140,.105,.11,'triangle',.28);break;
  case 'relapse':play(300,0,.12,'sawtooth',.25);play(155,.2,.23,'triangle',.25);break;
  case 'boot':play(118,0,.15,'triangle',.15);play(470,.2,.12,'sine',.2);break;
  default:play(550,0,.07,'sine',.2);
 }
 }catch{}
}
function hardwareHaptic(kind='tap'){
 if(!hardwareFeedbackPrefs().haptics)return;
 const long=['promotion','sovereign','relapse'].includes(kind);
 try{const native=window.Capacitor?.Plugins?.Haptics;
 if(native?.impact){native.impact({style:long?'HEAVY':'LIGHT'}).catch(()=>{});return;}
 if(native?.notification){native.notification({type:kind==='denied'?'ERROR':'SUCCESS'}).catch(()=>{});return;}
 if(navigator.vibrate)navigator.vibrate(long?[35,55,35]:kind==='denied'?[18,45,18]:[9]);
 }catch{}
}
function hardwareEffect(kind='switch',force=false){hardwareSound(kind,force);if(!force)hardwareHaptic(kind==='switch'?'tap':kind);}
 // V6.9.1 — all effects are presentation-only and are invoked only after committed transactions.
 let v691FxSequence=0,v691PromoDelay=null,v691LastPointer={x:innerWidth/2,y:innerHeight*.65};
 function v691Coordinates(el){
   if(!el)return null;const r=el.getBoundingClientRect();
   if(r.width<1||r.height<1||r.bottom<0||r.top>innerHeight)return null;
   return {x:Math.max(12,Math.min(innerWidth-12,r.left+r.width/2)),y:Math.max(12,Math.min(innerHeight-12,r.top+r.height/2))};
 }
 function fxXpFlow(before,after,preview=false){
   if(!hardwareMotionAllowed()||after.xp<=before.xp)return;
   const hud=document.querySelector('#v691-xp-hud');if(!hud)return;
   const runId=++v691FxSequence;
   const fill=hud.querySelector('.v691-xp-fill'),caption=hud.querySelector('.v691-xp-count'),sub=hud.querySelector('.v691-xp-level');
   fill.getAnimations().forEach(a=>a.cancel());hud.hidden=false;hud.classList.remove('v691-fx-show');void hud.offsetWidth;hud.classList.add('v691-fx-show');
   caption.textContent='+'+(after.xp-before.xp).toLocaleString('en-IN')+' XP'+(preview?' // PREVIEW':'');
   const segments=[];let xp=before.xp,level=before.level,limit=0;
   while(xp<after.xp&&limit++<5){const threshold=xpAt(level+1),base=xpAt(level),denom=threshold-base;const dest=Math.min(after.xp,threshold);
     segments.push({from:Math.max(0,Math.min(1,(xp-base)/denom)),to:Math.max(0,Math.min(1,(dest-base)/denom)),level,reset:dest===threshold&&dest<after.xp});
     xp=dest;if(xp===threshold)level++;else break;
   }
   if(xp<after.xp){segments.push({from:0,to:1,level:after.level,reset:false});}
   const duration=Math.min(1650,Math.max(750,520*segments.length));const each=duration/segments.length;
   async function show(){for(const seg of segments){if(runId!==v691FxSequence)return;
      sub.textContent='LEVEL '+String(seg.level).padStart(3,'0')+(seg.reset?' // THRESHOLD APPROACHING':' // REWARD CONFIRMED');
      const a=fill.animate([{transform:'scaleX('+seg.from+')'},{transform:'scaleX('+seg.to+')'}],{duration:each,easing:'cubic-bezier(.16,.8,.25,1)',fill:'forwards'});
      try{await a.finished;}catch{return;}if(runId!==v691FxSequence)return;
      if(seg.reset){fill.style.transform='scaleX(0)';a.cancel();hud.classList.remove('v691-threshold');void hud.offsetWidth;hud.classList.add('v691-threshold');}
   }
   if(runId===v691FxSequence){sub.textContent='LEVEL '+String(after.level).padStart(3,'0')+' // TOTAL '+after.xp.toLocaleString('en-IN')+' XP';setTimeout(()=>{if(runId===v691FxSequence){hud.classList.remove('v691-fx-show','v691-threshold');hud.hidden=true;fill.getAnimations().forEach(a=>a.cancel());}},550);}}
   show();
 }
 function fxCoinTransfer(amount,preview=false){
   if(!hardwareMotionAllowed()||amount<=0)return;
   const layer=document.getElementById('v691-particles');if(!layer)return;
   let dst=v691Coordinates(document.querySelector('#stat-coins'));
   if(!dst)dst=v691Coordinates(document.querySelector('.mk-wallet b'));
   if(!dst)dst={x:Math.max(24,innerWidth-80),y:85};
   const src={x:Math.max(35,Math.min(innerWidth-35,v691LastPointer.x||innerWidth/2)),y:Math.max(35,Math.min(innerHeight-35,v691LastPointer.y||innerHeight*.65))};
   for(let i=0;i<6;i++){const particle=document.createElement('span');particle.className='v691-coin-particle';particle.textContent='◎';particle.setAttribute('aria-hidden','true');
     particle.style.left=src.x+'px';particle.style.top=src.y+'px';layer.append(particle);
     const sway=(i-2.5)*24;particle.animate([{transform:'translate(0,0) scale(.85)',opacity:0},{transform:`translate(${sway*.5}px,-40px) scale(1.1)`,opacity:1,offset:.25},{transform:`translate(${dst.x-src.x}px,${dst.y-src.y}px) scale(.35)`,opacity:0}],{duration:650+i*65,delay:i*38,fill:'forwards',easing:'cubic-bezier(.2,.55,.2,1)'}).finished.then(()=>particle.remove()).catch(()=>particle.remove());
   }
   const target=document.querySelector('#stat-coins');if(target){target.classList.remove('v691-coin-pulse');void target.offsetWidth;target.classList.add('v691-coin-pulse');setTimeout(()=>target.classList.remove('v691-coin-pulse'),1100);}
   const delta=document.createElement('span');delta.className='v691-coin-earned';delta.textContent='+'+amount+' GC'+(preview?' // PREVIEW':'');delta.style.left=Math.max(10,Math.min(innerWidth-160,src.x))+'px';delta.style.top=Math.max(36,src.y-36)+'px';layer.append(delta);
   setTimeout(()=>delta.remove(),1350);
 }
 let v691StampTimer=0;
 function fxTransactionStamp(status,name,detail,preview=false){
   if(!hardwareMotionAllowed())return;
   const el=document.getElementById('v691-stamp');if(!el)return;
   clearTimeout(v691StampTimer);el.querySelector('.v691-stamp-main').textContent=status;
   el.querySelector('.v691-stamp-name').textContent=name;
   el.querySelector('.v691-stamp-detail').textContent=detail+(preview?' // PREVIEW ONLY':'');
   el.dataset.status=status;el.hidden=false;el.classList.remove('v691-stamp-on');void el.offsetWidth;el.classList.add('v691-stamp-on');
   v691StampTimer=setTimeout(()=>{el.classList.remove('v691-stamp-on');el.hidden=true;},1850);
 }
 let v691VaultTimer=0;
 function fxVaultDoors(preview=false){
   if(!hardwareMotionAllowed())return;
   const overlay=document.getElementById('v691-vault-doors');if(!overlay)return;
   clearTimeout(v691VaultTimer);
   overlay.querySelector('.v691-vault-subtitle').textContent=preview?'PREVIEW // NO AUTHENTICATION':'ENCRYPTED SESSION AUTHENTICATED';
   overlay.hidden=false;overlay.classList.remove('v691-vault-open');void overlay.offsetWidth;requestAnimationFrame(()=>overlay.classList.add('v691-vault-open'));
   v691VaultTimer=setTimeout(()=>{overlay.classList.remove('v691-vault-open');overlay.hidden=true;},1650);
 }
 function fxDismiss(){clearTimeout(v69FxTimeout);clearTimeout(v691PromoDelay);clearTimeout(v691StampTimer);clearTimeout(v691VaultTimer);
   for(const id of ['v69-promotion','v691-vault-doors','v691-stamp']){const el=document.getElementById(id);if(el){el.hidden=true;el.classList.remove('v69-active','v691-vault-open','v691-stamp-on');}}
 }
 function hardwareAnimation(kind,{level,rank,title,image}={}){
   if(!hardwareMotionAllowed())return;
   const panel=document.querySelector('#v69-promotion');if(!panel)return;
   clearTimeout(v69FxTimeout);const icon=panel.querySelector('.v69-promote-image');const tier=panel.querySelector('.v69-promote-tier');
   const txt=panel.querySelector('.v69-promote-title');
   panel.className='v69-promotion '+(kind==='level'?'v69-level':kind==='sovereign'?'v69-sovereign':kind==='division'?'v69-division':'v69-rank');
   icon.hidden=kind==='level'||kind==='sovereign';if(!icon.hidden)icon.src=image||'';
   tier.textContent=kind==='level'?'CAREER // LEVEL VERIFIED':kind==='sovereign'?'FINAL AUTHORIZATION // LEVEL 1000':kind==='division'?'DIVISION PROMOTION // CLEARANCE GRANTED':'OPERATOR // RANK AUTHORIZED';
   txt.textContent=kind==='level'?'LEVEL '+level:kind==='sovereign'?'GHOST SOVEREIGN':title||'RANK AUTHORIZED';
   panel.hidden=false;requestAnimationFrame(()=>panel.classList.add('v69-active'));
   const time=kind==='level'?1450:kind==='sovereign'?4100:kind==='division'?3300:2700;
   v69FxTimeout=setTimeout(()=>{panel.classList.remove('v69-active');panel.hidden=true;},time);
 }
 function hardwareAchievement(before,after){
   const gained=after.xp-before.xp;
   if(gained>0)fxXpFlow(before,after);
   if(after.coinsBalance>before.coinsBalance){hardwareSound('coins');fxCoinTransfer(after.coinsBalance-before.coinsBalance);}
   if(after.level<=before.level){hardwareEffect('success');return;}
   const kind=after.current.order>before.current.order?(after.level>=1000?'sovereign':after.current.division!==before.current.division?'division':'rank'):'level';
   hardwareEffect(kind==='level'?'success':kind==='sovereign'?'sovereign':'promotion');
   clearTimeout(v691PromoDelay);v691PromoDelay=setTimeout(()=>hardwareAnimation(kind,{level:after.level,title:after.current.title,image:after.current.image}),1150);
 }
// Surface accessible no-motion feedback even when system animations are disabled.
function hardwareTap(e){const target=e.target.closest('button,[data-command],[role="button"],a[href]');if(!target||target.disabled)return;
 const now=Date.now();if(now-v69LastTap<70)return;v69LastTap=now;v691LastPointer={x:e.clientX||innerWidth/2,y:e.clientY||innerHeight*.65};
 target.classList.add('v69-pressed');setTimeout(()=>target.classList.remove('v69-pressed'),155);
 if(!target.closest('.v69-feedback-settings'))hardwareEffect('switch');
}
document.addEventListener('pointerdown',hardwareTap,{passive:true});document.addEventListener('click',e=>{if(e.target.closest('[data-v691-skip]')){e.preventDefault();fxDismiss();}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){fxDismiss();}});
document.addEventListener('click',e=>{
  const mk=e.target.closest('[data-market-confirm]');
  if(mk){e.preventDefault();marketConfirmUse(Number(mk.dataset.marketConfirm));return;}
  if(e.target.closest('#ops-add-objective')){e.preventDefault();opsAddObjective();return;}
 const remove=e.target.closest('[data-ops-remove]');if(remove){e.preventDefault();const rows=document.querySelector('#ops-editor-rows');if(rows?.children.length>1){remove.closest('.ops-editor-row').remove();rows.querySelectorAll('.ops-editor-row').forEach((r,i)=>r.querySelector('span').textContent=pad(i+1));$('#overlay').dataset.dirty='1';}else showToast('KEEP AT LEAST ONE OBJECTIVE');return;}
 const target=e.target.closest('[data-command]');if(target){e.preventDefault();run(target.dataset.command)}
});
document.addEventListener('submit',e=>{if(e.target.matches('#vault-baseline'))vaultSetBaseline(e);

 if(e.target.matches('#pr-editor-form'))prSaveEditor(e);
  if(e.target.matches('#reminder-settings'))rmSaveSettings(e);
 if(e.target.matches('#pr-new-form'))prSaveNew(e);
 if(e.target.matches('#ops-editor'))opsSaveGoal(e);
 if(e.target.matches('#mk-custom-form'))saveMarketEditor(e);
 // V6.7.2 personal item editor is independent of the immutable official catalog.
 if(e.target.matches('#vault-auth'))vaultSubmit(e);
 if(e.target.matches('#vault-note'))vaultRecord(e);
});

document.addEventListener('pointerdown',e=>{const btn=e.target.closest('#vault-relapse-hold');if(btn&&e.isPrimary){e.preventDefault();vaultHoldStart(btn);}});
document.addEventListener('pointerup',vaultHoldCancel);
document.addEventListener('pointercancel',vaultHoldCancel);
document.addEventListener('pointerleave',e=>{if(e.target?.id==='vault-relapse-hold')vaultHoldCancel();},true);
document.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&e.target?.id==='vault-relapse-hold'){e.preventDefault();vaultHoldStart(e.target);}});
document.addEventListener('keyup',e=>{if((e.key===' '||e.key==='Enter')&&e.target?.id==='vault-relapse-hold'){e.preventDefault();vaultHoldCancel();}});
$('#vault-file').addEventListener('change',async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{
 if(f.size>2*1024*1024)throw Error('Vault archive too large');const obj=JSON.parse(await f.text());
 if(obj.format!=='GHOSTED-ENCRYPTED-VAULT'||obj.version!==1||!obj.payload||obj.payload.version!==1)throw Error('Not a Vault archive');
 for(const k of ['salt','iv','cipher']){if(typeof obj.payload[k]!=='string'||obj.payload[k].length>2*1024*1024||!obj.payload[k])throw Error('Invalid encrypted payload');unbase64(obj.payload[k]);}
 if(unbase64(obj.payload.salt).length!==16||unbase64(obj.payload.iv).length!==12)throw Error('Invalid encrypted header');
 if(!confirm(`Replace the ${vaultMode==='demo'?'DEMO':'PERSONAL'} encrypted Vault with this archive? This replaces ONLY the selected Vault, not the other one. Have its backup and password ready.`))return;
 localStorage.setItem(vaultActiveKey(),JSON.stringify(obj.payload));window.GHOSTED_NATIVE_DB?.mirror(vaultActiveKey(),JSON.stringify(obj.payload));vaultLock();section='vault';render();showToast('ENCRYPTED VAULT IMPORTED — UNLOCK WITH ORIGINAL PASSWORD');
 }catch{vaultError='IMPORT FAILED; EXISTING VAULT UNCHANGED';section='vault';render();}});
$('#backup-file').addEventListener('change',async e=>{
 const f=e.target.files?.[0];e.target.value='';if(!f)return;
 try{if(f.size>4*1024*1024)throw Error('Backup is too large');const candidate=restorePackage(await f.text());
 if(!confirm('Restore this GHOSTED public backup? This will replace local public data. Encrypted Vault remains separate.'))return;
 if(!saveRestored(candidate))throw Error('Browser storage error');lastNote='[RESTORED] PUBLIC PROFILE LOADED';section='system';rmLastSignature='';reminderRequestSync();render();showToast('BACKUP RESTORED');}
 catch{lastNote='[RESTORE BLOCKED] INVALID OR UNSUPPORTED BACKUP. CURRENT DATA UNCHANGED';lastType='bad';render();}
});
function playTone(kind,force=false){hardwareEffect(kind==='success'?'success':'warning',force);}
// Web preview: foreground delivery only. Native wrapper uses GHOSTED_NATIVE_REMINDERS.sync().
setInterval(()=>rmCheck(new Date()),30000);
window.addEventListener('focus',()=>{rmCheck(new Date());reminderRequestSync();});
window.addEventListener('pageshow',()=>reminderRequestSync());
reminderRequestSync();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&vaultSession)vaultLock();});
document.addEventListener('input',e=>{if(e.target.id==='v69-volume'){const out=document.querySelector('#v69-volume-out');if(out)out.textContent=e.target.value+'%';}});
 document.addEventListener('change',e=>{if(e.target.id==='v69-volume'){state.settings.feedback.volume=Math.max(0,Math.min(100,Number(e.target.value)||0));save();hardwareEffect('switch',true);}});
 document.addEventListener('change',e=>{if(e.target.matches('#pr-editor-form select[name="frequency"]')){const f=e.target.form,mode=e.target.value;const set=(sel,on)=>{const el=f.querySelector(sel);if(el)el.hidden=!on;};set('.pr-mode-days',mode==='everyNDays');set('.pr-mode-week',mode==='timesPerWeek');set('.pr-mode-month',mode==='timesPerMonth');set('.pr-mode-range',mode==='timesInDays');set('.pr-weekdays-mode',mode==='selectedDays');}});
document.addEventListener('click',e=>{
 const add=e.target.closest('[data-component-add]'),remove=e.target.closest('[data-component-remove]');
 if(!add&&!remove)return;
 e.preventDefault();
 const container=document.querySelector('#pr-editor-form [data-component-fields]');
 if(!container)return;
 if(remove)remove.closest('.pr-component-edit-row')?.remove();
 else if(container.children.length<24){
  const row=document.createElement('div');row.className='pr-component-edit-row';
  const num=document.createElement('span');num.className='pr-component-index';
  const field=document.createElement('input');field.type='text';field.name='componentText';field.maxLength=160;field.placeholder='Describe a component';
  const del=document.createElement('button');del.type='button';del.className='pr-comp-remove';del.dataset.componentRemove='';del.textContent='×';del.setAttribute('aria-label','Remove component');
  row.append(num,field,del);container.append(row);field.focus();
 }
 [...container.children].forEach((row,i)=>{const n=row.querySelector('.pr-component-index');if(n)n.textContent=String(i+1).padStart(2,'0');});
});
document.addEventListener('input',e=>{if(e.target.closest('#overlay form'))$('#overlay').dataset.dirty='1';});
document.addEventListener('change',e=>{if(e.target.closest('#overlay form'))$('#overlay').dataset.dirty='1';});
document.addEventListener('click',e=>{if(e.target.closest('[data-editor-cancel]')){e.preventDefault();closePopup();}});
$('#close-overlay').addEventListener('click',closePopup);
$('#overlay').addEventListener('click',e=>{if(e.target.id==='overlay')closePopup()});
document.addEventListener('keydown',e=>{
 const o=$('#overlay');if(o.classList.contains('hidden'))return;
 if(e.key==='Escape'){e.preventDefault();closePopup();return;}
 if(e.key==='Tab'){const nodes=[...o.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(x=>x.offsetParent!==null);if(!nodes.length)return;
 const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
function tick(){clock.textContent=new Date().toLocaleString('en-GB',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).toUpperCase()+' // LOCAL';}
tick();setInterval(tick,30000);
save();render();
let bootHandles=[];
function finishBoot(){bootHandles.forEach(clearTimeout);bootHandles=[];const el=$('#boot-screen');if(!el)return;el.classList.add('boot-hidden');setTimeout(()=>{el.style.display='none'},500);}
function startBoot(force=false){const el=$('#boot-screen');if(!el)return;bootHandles.forEach(clearTimeout);bootHandles=[];
 if(!force&&(new URLSearchParams(location.search).has('skipboot')||window.matchMedia('(prefers-reduced-motion: reduce)').matches)){el.style.display='none';return;}
 el.style.display='flex';el.classList.remove('boot-hidden');$('#boot-log').innerHTML='';$('#boot-progress').style.width='0%';$('#boot-percent').textContent='BOOTLOADER // 00%';
 const mobileBoot=window.matchMedia('(max-width:600px)').matches;
 const logs=mobileBoot?[
 ['SECURE MODULE VERIFIED','ok'],
 ['OPERATOR PROFILE READY','ok'],
 ['TACTICAL INTERFACE ACTIVE','ok'],
 ['GHOSTED // ONLINE','ok']]:[
 ['SIGNAL ACQUIRED','ok'],
 ['INITIALIZING TACTICAL NAVIGATION CORE','ok'],
 ['VERIFYING APPROVED OPERATOR ART','ok'],
 ['MOUNTING 100 ORIGINAL INSIGNIAS + LEGENDARY DESIGNATION','ok'],
 ['LOADING DOT-MATRIX OPERATOR ASSETS','ok'],
 [persisted?'BROWSER STORAGE READY':'BROWSER STORAGE UNAVAILABLE',persisted?'ok':'warn'],
 ['ANDROID DATA CONNECTION: NOT CONFIGURED','warn'],
 ['GHOSTED // SYSTEM READY','ok']];
 logs.forEach(([msg,type],i)=>{bootHandles.push(setTimeout(()=>{const line=document.createElement('div');line.className=type==='warn'?'warn':'info';const prefix=document.createElement('span');prefix.className=type==='warn'?'warn':'good';prefix.textContent=type==='warn'?'[ -- ] ':'[ OK ] ';line.append(prefix,document.createTextNode(msg));$('#boot-log').append(line);$('#boot-progress').style.width=Math.round((i+1)/logs.length*100)+'%';$('#boot-percent').textContent='BOOTLOADER // '+pad(Math.round((i+1)/logs.length*100))+'%';},(mobileBoot?170:230)+i*(mobileBoot?260:230)));});
 bootHandles.push(setTimeout(finishBoot,mobileBoot?1650:2450));
}
$('#skip-boot').addEventListener('click',finishBoot);
startBoot();
setTimeout(()=>{if(window.matchMedia('(pointer:fine)').matches)command.focus({preventScroll:true})},100);
window.GHOSTED_DEBUG={run,service,done,xpAt,levelAt,eligible,full,validDate,backupPackage,restorePackage,hardwareEffect,hardwareAnimation,getState:()=>JSON.parse(JSON.stringify(state)),reset:()=>{storageCorrupt=false;state=upgradeState(initial());STORE=defaultCatalog.map(x=>({...x}));save();resetUI();}};
})();
