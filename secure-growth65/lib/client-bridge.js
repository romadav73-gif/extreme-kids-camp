// Inside the existing 6.5 closure, before event handlers are registered.
// This replaces the legacy transport, bootstrap and identity model, not the UI.
const S65=window.EK65Model;
let s65Actor=null,s65Csrf='',s65Base=null,s65Promise=null,s65Flight=null,s65Conflict=null,s65Polling=null,s65CacheKey=null,s65CacheSave=Promise.resolve();
const s65LocalKey=()=>s65Actor?`EK65_SECURE:${s65Actor.workspaceId}:${s65Actor.id}`:null;
function s65Bytes(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
function s65B64(bytes){let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out)}
async function s65ReadCache(raw){if(!raw)return null;const item=JSON.parse(raw);if(item.alg!=='A256GCM'||typeof item.iv!=='string'||typeof item.data!=='string')throw Error('Локальный черновик имеет другой формат. Не очищайте данные: сначала сохраните копию.');const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:s65Bytes(item.iv)},s65CacheKey,s65Bytes(item.data));return JSON.parse(new TextDecoder().decode(plain))}
function s65LocalSave(){const k=s65LocalKey();if(!k||!state||!s65CacheKey)return Promise.resolve(false);const text=JSON.stringify({state:S65.clean(state),base:s65Base,flight:s65Flight,ui:state.ui,month:state.settings.currentMonth}),key=s65CacheKey;
 s65CacheSave=s65CacheSave.catch(()=>false).then(async()=>{const iv=crypto.getRandomValues(new Uint8Array(12)),data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text)));localStorage.setItem(k,JSON.stringify({alg:'A256GCM',iv:s65B64(iv),data:s65B64(data)}));return true}).catch(e=>{setSyncStatus('off','Не удалось сохранить на устройстве. Не закрывайте вкладку; экспортируйте черновик.');return false});return s65CacheSave;
}
function s65ApplyActor(actor){s65Actor=Object.freeze({...actor,scopes:Object.freeze([...(actor.scopes||[])])});credentials={workspace:actor.workspaceId,role:actor.role,personId:actor.personId,mentorId:actor.personId,adminId:actor.personId,token:''};currentRole=actor.role;if(ROLES[currentRole])ROLES[currentRole]={...ROLES[currentRole],name:actor.displayName||actor.username};}
function s65Normalize(raw){const month=raw?.settings?.currentMonth||today().slice(0,7),empty=S65.emptyState(month);return{...empty,...S65.clone(raw),meta:{...empty.meta,...raw?.meta},settings:{...empty.settings,...raw?.settings},ui:{...empty.ui,...raw?.ui},sales:{...emptySales(),...raw?.sales}}}
ensureState=s65Normalize;seedState=()=>s65Normalize({});loadLocal=()=>{throw Error('Legacy bootstrap is disabled')};
persistLocal=s65LocalSave;
function s65CanRoot(k){if(!s65Actor)return false;if(s65Actor.role==='owner')return!['version','meta','ui','activity','sync65'].includes(k);if(s65Actor.role==='team')return false;const management=['tasks','groups','events','recommendations','attendanceChildren','attendanceMemberships','attendanceSessions','attendanceWeekArchives','staffDocuments','staffDuties','meetingAgenda','meetingTimer'];if(s65Actor.role==='manager')return management.concat(['operationsDays','managementPlans','managementMeetings','managementMeetingDraft','sales','salesByMonth','adminOperationsByMonth']).includes(k);if(s65Actor.role==='stas'||s65Actor.scopes.includes('management'))return management.concat(['goals']).includes(k);if(s65Actor.role==='mentor')return['tasks','groups','recommendations','attendanceSessions'].includes(k);if(s65Actor.role==='admin')return['tasks','groups','recommendations','attendanceChildren','attendanceMemberships','attendanceSessions'].includes(k);return false}
function s65Changes(base=s65Base,local=state){return S65.diff(base,S65.clean(local)).filter(c=>s65CanRoot(c.path[0]))}
async function s65Fetch(url,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
 try{
  const res=await fetch(url,{cache:'no-store',credentials:'same-origin',...options,signal:controller.signal,headers:{...(options.body?{'Content-Type':'application/json','X-CSRF-Token':s65Csrf}:{}),...options.headers}});
  let data;try{data=await res.json()}catch{throw Error('Некорректный ответ сервера. Повторите позже.')}
  if(!res.ok){if(res.status===401&&s65Actor){clearInterval(s65Polling);await s65CacheSave;state=null;location.replace('/login')}throw Object.assign(Error(data.message||'Ошибка обмена.'),{status:res.status,code:data.error})}
  return data;
 }catch(e){if(e.name==='AbortError')throw Error('Сервер не ответил вовремя. Не закрывайте вкладку. Повторная отправка использует тот же идентификатор.');throw e}
 finally{clearTimeout(timer)}
}
function s65RenderAfterSync(){if(!state)return;if(document.activeElement?.closest('#modal form,#pages form')){document.body.dataset.syncRefreshPending='true';return}renderShell();renderCurrentView()}
function s65MergeIntent(remote,changes,force=false){const next=S65.clone(remote),conflicts=[];for(const c of changes){const found=S65.lookup(next,c.path);if(c.op==='set'&&found.exists&&S65.equal(found.value,c.value))continue;if(!S65.equal(found,c.previous)&&!force){conflicts.push(c.path);continue}try{S65.change(next,c)}catch{conflicts.push(c.path)}}return{next,conflicts}}
function s65Adopt(remote,ui,month){state=s65Normalize(remote);state.ui={...state.ui,...ui};if(month&&state.months[month])state.settings.currentMonth=month;s65Base=S65.clean(remote);}
function s65StatusPending(){setSyncStatus('busy','Есть изменения на этом устройстве');}
function s65Schedule(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>syncNow({quiet:true}),650)}
touch=function(reason='Изменение данных'){if(!state)return;state.meta.updatedAt=nowIso();try{s65LocalSave();s65StatusPending();s65Schedule()}catch(e){toast('Не удалось сохранить на устройстве','Не закрывайте вкладку. Экспортируйте изменения.','error')}if(!suppressRender)renderCurrentView()};
sofa65V4SilentTouch=function(){const previous=suppressRender;suppressRender=true;try{touch('Изменение контроля')}finally{suppressRender=previous}};
// Follow-up tasks are derived atomically by the server when attendance changes.
attendanceReconcileTasks=()=>0;
syncNow=function({quiet=false}={}){
 if(s65Promise)return s65Promise;
 s65Promise=(async()=>{
  if(!s65Actor||!state)return false;syncing=true;
  try{
   if(s65Conflict){if(!quiet)s65ShowConflict();return false}
   const changes=s65Changes();if(!s65Flight&&changes.length)s65Flight={requestId:crypto.randomUUID(),changes,after:S65.clean(state)};
   setSyncStatus('busy','Сохраняем в защищённую базу');const sentLocal=s65Flight?(s65Flight.after||s65MergeIntent(s65Base,s65Flight.changes,true).next):S65.clean(state),ui=S65.clone(state.ui),month=state.settings.currentMonth;await s65LocalSave();
   const result=s65Flight?await s65Fetch('/api/state',{method:'PATCH',body:JSON.stringify({requestId:s65Flight.requestId,changes:s65Flight.changes})}):await s65Fetch('/api/state');
   // A user can keep typing while the request is in flight. Only changes made
   // after the sent snapshot are carried forward; the acknowledged packet is not.
   const later=s65Changes(sentLocal,state),merge=s65MergeIntent(S65.clean(result.state),later);s65Flight=null;s65Adopt(result.state,ui,month);state=s65Normalize({...merge.next,ui:state.ui,settings:{...merge.next.settings,currentMonth:state.settings.currentMonth}});s65Base=S65.clean(result.state);
   if(merge.conflicts.length)s65Conflict={changes:later,remote:S65.clean(result.state),paths:merge.conflicts};
   await s65LocalSave();lastRemotePush=Date.now();const pending=s65Changes().length>0;setSyncStatus(s65Conflict?'off':pending?'busy':'ok',s65Conflict?'Есть конфликт изменений':pending?'Есть новые изменения: сохраняем':'Сервер подтвердил сохранение · версия '+result.revision);s65RenderAfterSync();if(s65Changes().length&&!s65Conflict)s65Schedule();if(!quiet&&!s65Conflict)toast('Сохранено','Изменения подтверждены сервером.');return!s65Conflict;
  }catch(e){
   if(e.status===409){try{const remote=await s65Fetch('/api/state');const desired=s65Changes(),merged=s65MergeIntent(S65.clean(remote.state),desired);s65Conflict={changes:desired,remote:S65.clean(remote.state),paths:merged.conflicts};setSyncStatus('off','Конфликт: сохраните выбор вручную');s65RenderAfterSync();if(!quiet)s65ShowConflict()}catch(readError){setSyncStatus('off','Не удалось получить новую редакцию. Локальный черновик сохранён.');if(!quiet)toast('Связь прервалась',readError.message,'error')}}
   else{if(e.status>=400&&e.status<500){s65Flight=null;await s65LocalSave()}setSyncStatus('off',e.status===403?'Изменение отклонено правами доступа':e.message||'Пока сохранено только на устройстве');if(!quiet)toast('Не синхронизировано',e.message,'error')}
   return false;
  }finally{syncing=false}
 })().finally(()=>{s65Promise=null});return s65Promise;
};
fetchRemote=()=>{throw Error('Use the authenticated state API')};pushRemote=()=>{throw Error('Legacy full-state writes disabled')};encryptState=()=>{throw Error('Legacy client encryption disabled')};
setupAutoSync=function(){clearInterval(s65Polling);s65Polling=setInterval(()=>syncNow({quiet:true}),25000)};
function s65Download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function s65ShowConflict(){openModal({title:'Одно поле изменили одновременно',subtitle:'Ничего не затирается автоматически. Сначала выберите, какую версию оставить.',body:`<p>Сервер сохранил другую редакцию. Ваша редакция остаётся на этом устройстве.</p><div class="hero-actions"><button class="btn btn-primary" data-action="s65KeepMine">Оставить мою редакцию</button><button class="btn btn-ghost" data-action="s65UseServer">Принять редакцию сервера</button><button class="btn btn-ghost" data-action="s65ExportDraft">Экспортировать черновик</button></div>`})}
const s65OldRender=renderCurrentView;
renderCurrentView=function(){if(!state)return;s65OldRender();const head=$('#pages');if(head&&s65Conflict){const bar=document.createElement('div');bar.className='toolbar';bar.innerHTML='<b>Есть несогласованные изменения</b><button class="btn btn-primary" data-action="s65Conflict">Разобрать конфликт</button>';head.prepend(bar)}if(head)for(const button of head.querySelectorAll('[data-action=attendanceCreateTasks]'))button.remove();if(head&&currentRole!=='owner')for(const b of head.querySelectorAll('[data-action="editAdminRules"],[data-action="editAdminRates"],[data-action="addAdminSale"],[data-action="addAdminAdjustment"],[data-action="addAdminShift"]')){if(currentRole!=='manager')b.remove()}};
const s65OldSettings=renderSettings;
renderSettings=function(){return pageHead('GROWTH OS 6.5','Доступ и сохранность','Права проверяются сервером. Старые ссылки с ролями больше не используются.')+`<div class="grid-main"><section class="card pad"><h3>Сотрудники и доступы</h3><p>Отключение учётной записи отзывает все её сеансы.</p><button class="btn btn-primary" data-action="s65Users">Управлять доступами</button></section><section class="card pad"><h3>Резервная копия</h3><p>Экспорт содержит данные клуба. Храните его вне общих чатов.</p><button class="btn btn-primary" data-action="s65Backup">Скачать резервную копию</button></section><section class="card pad"><h3>История изменений</h3><button class="btn btn-primary" data-action="s65Audit">Открыть журнал сервера</button></section></div>`};
async function s65Users(){const users=await s65Fetch('/api/users');openModal({title:'Доступы сотрудников',body:`<div class="compact-list">${users.map(u=>`<div class="compact-item"><div class="item-main"><b>${esc(u.displayName)} · ${esc(u.role)}</b><small>${esc(u.username)} · ${u.active?'активен':'отключён'}</small></div>${u.active&&u.id!==s65Actor.id&&u.role!=='owner'?`<button class="btn btn-ghost" data-action="s65Revoke" data-id="${esc(u.id)}">Отключить</button>`:''}</div>`).join('')}</div><h3>Новый доступ</h3><form id="s65InviteForm" class="form-grid"><div class="field"><label>Сотрудник</label><select class="select" name="personId">${state.people.filter(p=>p.id!==s65Actor.personId&&!users.some(u=>u.personId===p.id&&u.active)).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Логин (латиницей)</label><input class="input" name="username" required pattern="[a-z0-9][a-z0-9_.-]{2,63}"></div><div class="field"><label>Роль</label><select class="select" name="role"><option value="mentor">Наставник</option><option value="admin">Администратор</option><option value="manager">Софа · управляющая</option><option value="stas">Руководитель направления</option><option value="team">Командный экран</option></select></div><div class="field"><label><input type="checkbox" name="management"> Полномочия старшего наставника</label></div>${formActions('Создать приглашение')}</form>`})}
const s65OldClick=handleClick;
handleClick=function(e){const el=e.target.closest('[data-action]'),a=el?.dataset.action;if(a?.startsWith('s65')){e.preventDefault();(async()=>{
 if(a==='s65Conflict')return s65ShowConflict();
 if(a==='s65ExportDraft')return s65Download('ek65-my-unsynced-draft.json',{format:'ek65-draft',changes:s65Changes()});
 if(a==='s65KeepMine'&&s65Conflict){const ui=state.ui,month=state.settings.currentMonth,remote=s65Conflict.remote;const intent=s65MergeIntent(remote,s65Conflict.changes,true);if(intent.conflicts.length){toast('Запись удалена или недоступна','Экспортируйте черновик. Автовосстановление запрещено.','error');return}s65Base=remote;state=s65Normalize({...intent.next,ui,settings:{...intent.next.settings,currentMonth:month}});s65Flight=null;s65Conflict=null;closeModal();await syncNow();return}
 if(a==='s65UseServer'&&s65Conflict){if(!confirm('Принять версию сервера? Несохранённая локальная редакция будет заменена.'))return;const ui=state.ui,month=state.settings.currentMonth;s65Adopt(s65Conflict.remote,ui,month);s65Flight=null;s65Conflict=null;s65LocalSave();closeModal();s65RenderAfterSync();return}
 if(a==='s65Backup')return s65Download('ek65-backup-'+today()+'.json',await s65Fetch('/api/backup'));
 if(a==='s65Users')return s65Users();
 if(a==='s65Revoke'){if(!confirm('Отозвать все сеансы этого сотрудника?'))return;await s65Fetch('/api/revoke',{method:'POST',body:JSON.stringify({userId:el.dataset.id})});return s65Users()}
 if(a==='s65Audit'){const log=await s65Fetch('/api/audit');return openModal({title:'Журнал сервера',body:`<div class="compact-list">${log.slice().reverse().map(x=>`<div class="compact-item"><div><b>${esc(x.action)}</b><small>${esc(x.at)} · ${esc(x.actorId||'—')}</small></div></div>`).join('')}</div>`})}
 if(a==='s65Logout'){if(s65Changes().length&&!confirm('Есть несохранённые изменения. Выйти и удалить локальный черновик?'))return;await s65Fetch('/api/logout',{method:'POST',body:'{}'});await s65CacheSave;localStorage.removeItem(s65LocalKey());state=null;location.replace('/login');return}
 })().catch(err=>toast('Действие не выполнено',err.message,'error'));return}return s65OldClick(e)};
const s65OldSubmit=handleSubmit;
handleSubmit=function(e){if(e.target.id==='s65InviteForm'){e.preventDefault();const v=formValues(e.target);s65Fetch('/api/invite',{method:'POST',body:JSON.stringify({...v,management:e.target.elements.management.checked})}).then(r=>{const link=location.origin+'/login#invite='+r.token;openModal({title:'Приглашение создано',subtitle:'Передайте лично сотруднику. Действует 24 часа, используется один раз.',body:`<input class="input" readonly value="${esc(link)}"><p>При переходе сотрудник сам задаст пароль. Не публикуйте ссылку в общем чате.</p>`})}).catch(err=>toast('Не удалось создать доступ',err.message,'error'));return}return s65OldSubmit(e)};
function s65OwnIdentity(){return s65Actor?.personId||''}
mentorViewerId=function(){return['owner','manager','stas'].includes(currentRole)?state.ui.selectedMentor||s65OwnIdentity():s65OwnIdentity()};
adminViewerId=function(){return['owner','manager'].includes(currentRole)?state.ui.selectedAdmin||'anya':s65OwnIdentity()};
isIvanSeniorMentor=()=>s65Actor?.scopes.includes('management')===true;
canSeeAllGroups=()=>['owner','manager','stas'].includes(s65Actor?.role)||isIvanSeniorMentor();canSeeAllTasks=canSeeAllGroups;
switchRole=function(){toast('Используется персональная учётная запись','Откройте нужный кабинет через меню. Роль в ссылке ничего не меняет.')};
renderRoleMenu=function(){$('#rolePopover').innerHTML='<button data-action="s65Logout">Выйти из кабинета</button>'};
roleLink=()=>location.origin+'/login';personalRoleLink=roleLink;resetState=()=>toast('Сброс отключён','Восстановление выполняется отдельно с резервной копией.','error');importFile=()=>toast('Прямой импорт отключён','Нельзя заменить базу файлом из браузера.','error');
boot=async function(){try{
 const sess=await s65Fetch('/api/session');s65ApplyActor(sess.actor);s65Csrf=sess.csrf;s65CacheKey=await crypto.subtle.importKey('raw',s65Bytes(sess.cacheKey),{name:'AES-GCM'},false,['encrypt','decrypt']);
 const result=await s65Fetch('/api/state');const k=s65LocalKey();const cache=await s65ReadCache(localStorage.getItem(k));
 s65Adopt(result.state,cache?.ui,cache?.month);
 const stored=cache?.base&&cache?.state?s65Changes(cache.base,cache.state):[];
 if(cache?.flight){s65Flight=cache.flight;state=s65Normalize({...cache.state,ui:state.ui,settings:{...cache.state.settings,currentMonth:state.settings.currentMonth}});s65Base=cache.base}
 else if(stored.length){const merge=s65MergeIntent(s65Base,stored);if(merge.conflicts.length){s65Conflict={changes:stored,remote:s65Base,paths:merge.conflicts};state=s65Normalize({...cache.state,ui:state.ui})}else state=s65Normalize({...merge.next,ui:state.ui})}
 const views=new Set(sess.views);for(const section of NAV)for(const item of section.items)if(!views.has(item.id))item.roles=item.roles.filter(r=>r!==currentRole);
 a65Fresh=false;a65Ready=true;
 currentView=ROLES[currentRole]?.start||'team';state.ui.selectedMentor=state.ui.selectedMentor||state.people.find(p=>p.role==='mentor')?.id||s65Actor.personId;state.ui.selectedAdmin=state.ui.selectedAdmin||state.people.find(p=>p.role==='admin')?.id||s65Actor.personId;
 renderShell();renderCurrentView();applyUiScale();$('#appShell').classList.remove('hidden');$('#mobileNav').classList.remove('hidden');$('#boot').classList.add('hidden');
 const btn=document.createElement('button');btn.className='btn btn-ghost';btn.dataset.action='s65Logout';btn.textContent='Выйти';document.querySelector('.top-actions')?.appendChild(btn);
 history.replaceState(null,'',location.pathname);setupAutoSync();setSyncStatus('ok','Защищённая база · версия '+result.revision);await s65LocalSave();if(s65Flight||stored.length)setTimeout(()=>syncNow({quiet:true}),300);
 // A legacy service worker must never serve the previous unauthenticated bundle.
 if('serviceWorker' in navigator)for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();
 }catch(e){if(e.status===401){location.replace('/login');return}$('#bootText').textContent=e.message;$('#bootRetry').classList.remove('hidden');$('#bootRetry').onclick=()=>location.reload()}};
// Public diagnostics expose only this authenticated user's already-projected data.
window.EK65SecureStatus={version:'6.5-security.1',get pending(){return !!s65Flight||!!s65Conflict||!!state&&!!s65Base&&s65Changes().length>0}};
