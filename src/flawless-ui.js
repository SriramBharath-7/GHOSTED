// GHOSTED V8 // mobile-first synchronization control.
// UI only; never mutates reward data or storage directly.
export function openFlawlessPanel(api) {
 document.getElementById('ghosted-sync-control')?.remove();
 const mask=document.createElement('div');mask.id='ghosted-sync-control';
 mask.style.cssText='position:fixed;inset:0;z-index:11000;background:#000d;display:flex;align-items:center;justify-content:center;padding:12px;font:12px/1.5 monospace';
 const panel=document.createElement('section');
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-label','GHOSTED Sync Control Center');
 panel.style.cssText='box-sizing:border-box;width:min(420px,100%);max-height:85vh;overflow:auto;background:#07150f;color:#bce2c9;border:1px solid #39865a;border-radius:8px;padding:14px;box-shadow:0 12px 45px #000';
 const title=document.createElement('div');
 title.style.cssText='color:#8df4b2;font-weight:bold;font-size:14px;margin-bottom:8px';
 title.textContent='GHOSTED // SYNC CONTROL';
 const status=document.createElement('pre');
 status.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;color:#d5e7da;font:11px/1.5 monospace;margin:0 0 12px';
 const message=document.createElement('pre');
 message.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;color:#e5c37a;font:11px/1.5 monospace;min-height:18px';
 const actions=document.createElement('div');
 actions.style.cssText='display:flex;flex-wrap:wrap;gap:7px';
 const refresh=()=>{
  const s=api.status();
  status.textContent=[
   'ENGINE: '+String(s.mode||'OFF').toUpperCase(),
   'NETWORK: '+(s.online?'ONLINE':'OFFLINE'),
   'PENDING: '+String(s.pending??'UNKNOWN'),
   'CLOUD REV: '+String(s.revision||'NOT LINKED'),
   'SERVER: '+String(s.serverMode||'LEGACY CAS'),
   'LAST SYNC: '+String(s.lastSuccess||'NOT VERIFIED'),
   'CONFLICT: '+(s.conflict?'DECISION REQUIRED':'NONE'),
   ...(s.lastError?['ISSUE: '+String(s.lastError).slice(0,120)]:[])
  ].join('\n');
 };
 function button(label,handler) {
  const el=document.createElement('button');el.type='button';el.textContent=label;
  el.style.cssText='background:#10291c;color:#93f0b5;border:1px solid #37754e;border-radius:4px;padding:6px 9px;font:11px monospace;cursor:pointer';
  el.addEventListener('click',async()=>{
   el.disabled=true;message.textContent='CHECKING // DO NOT RESTART APP';
   try {
    const result=await handler();
    message.textContent=result?.note||result?.reason||(result?.needsDecision?'REVIEW CONFLICT BELOW':'OPERATION FINISHED');
   } catch(error){message.textContent='NOT APPLIED // '+String(error?.message||error);}
   finally {el.disabled=false;refresh();}
  });
  actions.append(el);
 }
 button('[ RESTART SYNC ]',api.restart);
 button('[ RECONNECT ACCOUNT ]',api.reconnect);
 button('[ DIAGNOSTICS ]',async()=>({note:JSON.stringify(await api.diagnostics(),null,2)}));
 button('[ EXPORT PROFILE ]',api.exportProfile);
 button('[ EXPORT JOURNAL ]',api.exportJournal);
 if(api.status().conflict){
  button('[ SAVE BOTH COPIES ]',api.exportConflict);
  const approval=document.createElement('label');
  approval.style.cssText='display:block;margin:10px 0;color:#e7c77a';
  const box=document.createElement('input');box.type='checkbox';
  box.addEventListener('change',()=>api.setBackupVerified(box.checked));
  approval.append(box,document.createTextNode(' I verified the downloaded recovery file'));
  panel.append(title,status,actions,approval);
  button('[ KEEP THIS DEVICE ]',()=>api.resolve('device'));
  button('[ KEEP CLOUD ]',()=>api.resolve('cloud'));
  button('[ TRY SAFE MERGE ]',()=>api.resolve('combine'));
 }else{panel.append(title,status,actions);}
 const close=document.createElement('button');close.type='button';close.textContent='[ CLOSE ]';
 close.style.cssText='margin-top:12px;background:transparent;color:#b8dabf;border:0;padding:5px;font:11px monospace';
 close.addEventListener('click',()=>mask.remove());
 mask.addEventListener('click',e=>{if(e.target===mask)mask.remove();});
 panel.append(message,close);mask.append(panel);document.body.append(mask);
 refresh();close.focus({preventScroll:true});
 return {open:true};
}
