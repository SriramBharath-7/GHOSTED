// Offline-only backup format shared by Android SAF export and reinstall recovery.
// Public profile remains readable JSON. Vault items are AES-GCM ciphertext only.
export const PROFILE_KEY='ghosted:web-os:personal:history:v68';
export const VAULT_KEYS=[
  'ghosted:web-os:private:personal:v68:encrypted:v1',
  'ghosted:web-os:private:demo:v68:encrypted:v1',
];
export const LOCAL_AUTO_KEY='ghosted:local:external-backup:enabled:v1';
export const RESTORE_SAFETY_KEY='ghosted:local:pre-import:v1';
export const FORMAT='GHOSTED_OFFLINE_BACKUP_V1';
const MAX_BYTES=6*1024*1024;
function validProfile(profile){
  if(!profile||typeof profile!=='object'||Array.isArray(profile)||profile.schemaVersion!==4
    ||!profile.days||typeof profile.days!=='object'||Array.isArray(profile.days)
    ||!Array.isArray(profile.purchased)||profile.isSample===true)throw Error('Backup has an invalid public profile');
  for(const [date,completed] of Object.entries(profile.days)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(completed)
      ||completed.some(id=>!Number.isInteger(id)||id<1||id>999))throw Error('Backup has invalid daily history');
  }
  if(profile.rewardLedger&&Object.values(profile.rewardLedger).some(row=>
    !row||!Number.isSafeInteger(row.xp)||row.xp<0||!Number.isSafeInteger(row.coins)||row.coins<0))
    throw Error('Backup has invalid reward records');
  return profile;
}
function validVault(raw){
  if(raw==null)return null;
  if(typeof raw!=='string')throw Error('Vault must stay encrypted');
  const item=JSON.parse(raw);
  if(item?.version!==1||!['salt','iv','cipher'].every(k=>typeof item[k]==='string'&&item[k].length>0))
    throw Error('Invalid encrypted Vault backup');
  return raw;
}
export function makeOfflineBackup(storage,now=new Date().toISOString()){
  const publicRaw=storage.getItem(PROFILE_KEY);
  if(!publicRaw)throw Error('No public profile has been saved');
  const profile=validProfile(JSON.parse(publicRaw));
  const vault={};
  for(const key of VAULT_KEYS)vault[key]=validVault(storage.getItem(key));
  const result=JSON.stringify({format:FORMAT,writtenAt:now,profile,vault});
  if(new TextEncoder().encode(result).length>MAX_BYTES)throw Error('Backup exceeds 6 MB');
  return result;
}
export function parseOfflineBackup(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Invalid backup size');
  const value=JSON.parse(raw);
  if(value?.format!==FORMAT||!Number.isFinite(Date.parse(value.writtenAt)))throw Error('Unsupported backup format');
  validProfile(value.profile);
  if(!value.vault||typeof value.vault!=='object')throw Error('Missing encrypted Vault data');
  for(const key of VAULT_KEYS)validVault(value.vault[key]);
  return value;
}
export function newestBackup(slots){
  const valid=[];
  for(const [slot,raw] of Object.entries(slots||{})){
    if(typeof raw!=='string')continue;
    try{valid.push({slot,backup:parseOfflineBackup(raw)});}catch{/* Other slot may be healthy */}
  }
  valid.sort((a,b)=>Date.parse(b.backup.writtenAt)-Date.parse(a.backup.writtenAt));
  return valid[0]||null;
}
export function restoreOfflineBackup(storage,backup){
  const profile=validProfile(backup.profile);
  for(const key of VAULT_KEYS)validVault(backup.vault?.[key]);
  const keys=[PROFILE_KEY,...VAULT_KEYS];
  const original=Object.fromEntries(keys.map(key=>[key,storage.getItem(key)]));
  // Avoid destroying existing local progress if replacement fails midway.
  const safety=JSON.stringify({format:'GHOSTED_PRE_OFFLINE_RESTORE_V1',at:new Date().toISOString(),original});
  storage.setItem(RESTORE_SAFETY_KEY,safety);
  if(storage.getItem(RESTORE_SAFETY_KEY)!==safety)throw Error('Cannot verify pre-restore recovery copy');
  try{
    const updated={[PROFILE_KEY]:JSON.stringify(profile)};
    for(const key of VAULT_KEYS)updated[key]=backup.vault[key]??null;
    for(const key of keys){
      if(updated[key]===null)storage.removeItem(key);
      else storage.setItem(key,updated[key]);
      if(storage.getItem(key)!==updated[key])throw Error('Restore readback failed');
    }
    return updated;
  }catch(error){
    for(const key of keys){
      try{if(original[key]===null)storage.removeItem(key);else storage.setItem(key,original[key]);}
      catch{/* Safety copy remains for manual recovery */}
    }
    throw error;
  }
}
