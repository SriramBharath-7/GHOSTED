// GHOSTED // Android-exclusive offline entry. The website uses src/main.js.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

import { PROFILE_KEY, VAULT_KEYS, LOCAL_AUTO_KEY,
  makeOfflineBackup, newestBackup, restoreOfflineBackup } from './mobile-backup.js';

window.GHOSTED_OFFLINE_NATIVE = true;
const Backup = registerPlugin('GhostedLocalBackup');
const DB='ghosted_profile';
const KEYS=[PROFILE_KEY,...VAULT_KEYS];

const localStatus={
  platform:Capacitor.getPlatform(),sqlite:'initializing',backup:'not-selected',
  lastBackup:null,lastError:null,writes:0
};
let nativeReady=false;
let pending=Promise.resolve();
let backupQueue=Promise.resolve();
let backupTimer=null;
let backupEnabled=localStorage.getItem(LOCAL_AUTO_KEY)==='1';
let backupFolderConfigured=false;
let restoring=false;





function notify(message){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=message;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2500);
}
function saveNative(key,value){
  if(!nativeReady||!KEYS.includes(key)||typeof value!=='string')return;
  pending=pending.catch(()=>{}).then(async()=>{
    await CapacitorSQLite.run({
      database:DB,
      statement:'INSERT INTO snapshots (storage_key,payload,updated_at) VALUES (?,?,?) ON CONFLICT(storage_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',
      values:[key,value,new Date().toISOString()],transaction:true
    });
    localStatus.writes++;
    scheduleBackup();
  }).catch(error=>{localStatus.sqlite='write-error';localStatus.lastError=String(error);});
}
window.GHOSTED_NATIVE_DB={
  mirror:saveNative,status:()=>({...localStatus}),flush:()=>pending,
};
async function prepareNativeStorage(){
  if(!Capacitor.isNativePlatform()){
    localStatus.sqlite='browser-preview';return;
  }
  try{
    await CapacitorSQLite.createConnection({
      database:DB,encrypted:false,mode:'no-encryption',version:1,readonly:false
    });
    await CapacitorSQLite.open({database:DB,readonly:false});
    await CapacitorSQLite.execute({
      database:DB,
      statements:'CREATE TABLE IF NOT EXISTS snapshots (storage_key TEXT PRIMARY KEY NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL);',
      transaction:true
    });
    // Existing private SQLite/WebView history remains authoritative during updates.
    // Restore from SQLite only if a WebView key does not exist.
    for(const key of KEYS){
      const rows=await CapacitorSQLite.query({
        database:DB,statement:'SELECT payload FROM snapshots WHERE storage_key=? LIMIT 1',
        values:[key]
      });
      const stored=rows.values?.[0]?.payload;
      const raw=localStorage.getItem(key);
      if(raw===null&&typeof stored==='string')localStorage.setItem(key,stored);
      else if(raw!==null&&raw!==stored){
        await CapacitorSQLite.run({
          database:DB,
          statement:'INSERT INTO snapshots (storage_key,payload,updated_at) VALUES (?,?,?) ON CONFLICT(storage_key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',
          values:[key,raw,new Date().toISOString()],transaction:true
        });
      }
    }
    nativeReady=true;localStatus.sqlite='ready';
  }catch(error){
    localStatus.sqlite='unavailable';localStatus.lastError=String(error);
    console.error('[GHOSTED local SQLite] Storage error:',error);
  }
}
async function readExternal(){
  const data=await Backup.readBackups();
  return newestBackup({A:data.slot0,B:data.slot1});
}
async function writeNow(){
  if(!backupFolderConfigured)throw Error('Choose an external backup folder first');
  await pending;
  const raw=makeOfflineBackup(localStorage);
  const response=await Backup.writeBackup({payload:raw});
  if(!response.ok)throw Error('External backup readback failed');
  localStatus.lastBackup=new Date().toISOString();
  localStatus.backup='verified-external';
  updateBackupStatus();
  return response;
}
function enqueueBackup(){
  backupQueue=backupQueue.catch(()=>{}).then(writeNow).catch(error=>{
    localStatus.backup='error';localStatus.lastError=String(error);
    updateBackupStatus();console.error('[GHOSTED external backup]',error);
  });
  return backupQueue;
}
function scheduleBackup(){
  if(!backupEnabled||!backupFolderConfigured||restoring)return;
  clearTimeout(backupTimer);
  backupTimer=setTimeout(()=>{void enqueueBackup();},450);
}
async function enableAutoBackup(){
  if(!backupFolderConfigured)throw Error('Select a folder first');
  const existing=await readExternal();
  if(existing&&!window.confirm(
    'This folder contains GHOSTED progress. Starting new backups will eventually replace its older copies. '+
    'Restore the previous progress first if you need it. Replace existing backups?'
  ))return;
  backupEnabled=true;
  localStorage.setItem(LOCAL_AUTO_KEY,'1');
  try{
    await enqueueBackup();
    notify('LOCAL BACKUP // VERIFIED');
  }catch(error){
    backupEnabled=false;localStorage.removeItem(LOCAL_AUTO_KEY);throw error;
  }
}
async function chooseFolder(){
  const result=await Backup.chooseFolder();
  if(!result.configured)return;
  backupFolderConfigured=true;
  localStatus.backup='folder-selected';
  updateBackupStatus();
  const saved=await readExternal();
  if(saved){
    backupEnabled=false;localStorage.removeItem(LOCAL_AUTO_KEY);
    notify('PREVIOUS BACKUP FOUND // RESTORE AVAILABLE');
    if(window.confirm('Previous GHOSTED local backup found in this folder. Restore it now?')){
      await restoreFromExternal(saved);
    }
  }else{
    await enableAutoBackup();
  }
}
async function restoreFromExternal(selected=null){
  const saved=selected||await readExternal();
  if(!saved)throw Error('No valid GHOSTED backup found in this folder');
  const date=new Date(saved.backup.writtenAt).toLocaleString();
  if(!window.confirm('Restore GHOSTED local profile and encrypted Vault from '+date+'? '+
    'This replaces the active data on this phone. A local pre-restore safety copy will be retained.'))return;
  restoring=true;
  try{
    // Restore may replace the profile and encrypted Vault; never copy plaintext secrets.
    const records=restoreOfflineBackup(localStorage,saved.backup);
    backupEnabled=false;
    localStorage.removeItem(LOCAL_AUTO_KEY);
    // Do not mirror old data over the imported profile during the first restart.
    // The next startup reconciles existing WebView data into native SQLite.
    for(const [key,value] of Object.entries(records)){
      if(value!==null)window.GHOSTED_NATIVE_DB?.mirror(key,value);
    }
    await pending;
    window.alert('LOCAL RESTORE COMPLETE. GHOSTED will restart to load your restored progress. Enable backups again from Settings.');
    location.reload();
  }finally{restoring=false;}
}
async function guardedAction(fn){
  try{await fn();}
  catch(error){localStatus.lastError=String(error);notify('LOCAL BACKUP // '+String(error.message||error));updateBackupStatus();}
}
function updateBackupStatus(){
  const target=document.getElementById('ghosted-local-backup-status');
  if(target){
    target.textContent='STORAGE '+localStatus.sqlite.toUpperCase()+
      ' // FOLDER '+(backupFolderConfigured?'CONNECTED':'NOT SELECTED')+
      ' // AUTO '+(backupEnabled?'ON':'OFF')+
      ' // '+String(localStatus.backup).toUpperCase();
  }
}
function mountLocalSettings(){
  const screen=document.getElementById('terminal-content');
  if(!screen||document.body.dataset.section!=='settings'||document.getElementById('ghosted-local-backup-panel'))return;
  const panel=document.createElement('section');
  panel.id='ghosted-local-backup-panel';
  panel.style.cssText='border:1px solid #356e58;padding:12px;margin:16px 0;color:#9cffe0';
  panel.innerHTML=`
    <div style="font-weight:bold;margin-bottom:8px">[ ANDROID LOCAL STORAGE // NO CLOUD ]</div>
    <p id="ghosted-local-backup-status" style="font-size:12px"></p>
    <p style="font-size:12px">Uninstall removes private Android data. To keep a copy, choose a folder in Documents. Two alternating backup files remain there after uninstall. Select that folder again to restore after reinstall.</p>
    <p style="font-size:12px">Public profile is readable JSON; Vault is included only as encrypted data. Protect your backup folder.</p>
    <button type="button" class="terminal-action" data-mobile-local="folder">[ CHOOSE BACKUP FOLDER ]</button>
    <button type="button" class="terminal-action" data-mobile-local="recover">[ RESTORE FROM FOLDER ]</button>
    <button type="button" class="terminal-action" data-mobile-local="enable">[ ENABLE AUTOMATIC BACKUPS ]</button>
    <button type="button" class="terminal-action" data-mobile-local="backup">[ BACKUP NOW ]</button>`;
  screen.append(panel);updateBackupStatus();
}
function installSettingsControls(){
  const screen=document.getElementById('terminal-content');
  if(!screen)return;
  new MutationObserver(mountLocalSettings).observe(screen,{childList:true});
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-mobile-local]');
    if(!control)return;
    event.preventDefault();const cmd=control.dataset.mobileLocal;
    void guardedAction(async()=>{
      if(cmd==='folder')await chooseFolder();
      else if(cmd==='recover')await restoreFromExternal();
      else if(cmd==='enable')await enableAutoBackup();
      else if(cmd==='backup')await enqueueBackup();
      updateBackupStatus();
    });
  });
  mountLocalSettings();
}
function injectClassic(url){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=url;script.async=false;
    script.onload=resolve;script.onerror=()=>reject(Error('Missing bundled asset '+url));
    document.body.append(script);
  });
}
async function bootLocal(){
  await prepareNativeStorage();

  for(let i=1;i<=5;i++)await injectClassic('/js/ghosted-0'+i+'.js');
  installSettingsControls();
  if(Capacitor.isNativePlatform()){
    try{
      const result=await Backup.status();
      backupFolderConfigured=!!result.configured;
      localStatus.backup=backupFolderConfigured?'folder-selected':'choose-folder-in-settings';
    }catch(error){localStatus.backup='native-plugin-unavailable';localStatus.lastError=String(error);}
    // Installed app updates keep this flag. A reinstall clears it, preventing
    // fresh seeded history from silently overwriting old external backups.
    if(backupFolderConfigured&&backupEnabled)scheduleBackup();
  }
  updateBackupStatus();
}
window.GHOSTED_LOCAL_BACKUP=Object.freeze({
  status:()=>({...localStatus,auto:backupEnabled,folder:backupFolderConfigured}),
  chooseFolder:()=>guardedAction(chooseFolder),
  restore:()=>guardedAction(()=>restoreFromExternal()),
  start:()=>guardedAction(enableAutoBackup),
  backupNow:()=>guardedAction(()=>enqueueBackup()),
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&backupEnabled&&backupFolderConfigured) {
    clearTimeout(backupTimer);void enqueueBackup();
  }
});
void bootLocal().catch(error=>{
  localStatus.lastError=String(error);localStatus.sqlite='startup-error';
  console.error('[GHOSTED offline Android] Startup failed:',error);
  notify('LOCAL STARTUP FAILED');
});
