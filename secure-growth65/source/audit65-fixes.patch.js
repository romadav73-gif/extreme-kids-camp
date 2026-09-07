// GROWTH65_AUDIT_FIXES_START
// Reliability patch for Growth OS 6.5. This does NOT turn shared browser keys
// into server-side authorization. A server-auth migration remains mandatory.
const GROWTH65_AUDIT_BUILD='2026.09.07-audit-r1';
const a65Clone=x=>x===undefined?undefined:structuredClone(x);
const a65Equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const a65Obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const a65Escape=x=>String(x).replace(/~/g,'~0').replace(/\//g,'~1');
const a65Ignored=(p,k)=>k==='_fieldUpdatedAt'||k==='updatedAt'||(p===''&&['meta','ui','activity','sync65'].includes(k))||(p==='/settings'&&['currentMonth','autoSync','syncInterval'].includes(k));
const a65Key=x=>x&&typeof x==='object'?(x.id!=null?'id:'+x.id:x.date!=null?'date:'+x.date:null):null;
const a65Keyed=x=>Array.isArray(x)&&x.length>0&&x.every(v=>a65Key(v)!==null)&&new Set(x.map(a65Key)).size===x.length;
let a65Baseline=null,a65Fresh=false,a65Dirty=false,a65Ready=false,a65Promise=null,a65Logical=0;
const a65Merged=new WeakSet();
function a65Stamp(){a65Logical=Math.max(Date.now(),a65Logical+1);return new Date(a65Logical).toISOString()}
function a65Each(node,path,stamp,fn){
 if(a65Obj(node)){const t=String(node.updatedAt||stamp||'');for(const k of Object.keys(node))if(!a65Ignored(path,k))a65Each(node[k],path+'/'+a65Escape(k),t,fn)}
 else if(a65Keyed(node)){for(const x of node)a65Each(x,path+'/@'+a65Escape(a65Key(x)),String(x.updatedAt||stamp||''),fn)}
 else fn(path,node,String(stamp||''));
}
function a65Prepare(s){
 if(!s||!a65Obj(s))throw Error('Некорректная структура базы');
 s.sync65={...(s.sync65||{}),clocks:{...(s.sync65?.clocks||{})},deletes:{...(s.sync65?.deletes||{})}};
 a65Each(s,'',s.meta?.updatedAt||'',(p,v,t)=>{if(!s.sync65.clocks[p])s.sync65.clocks[p]=t});
 return s;
}
function a65Diff(before,after,p,stamp,meta){
 if(a65Equal(before,after))return;
 if(after===undefined){meta.deletes[p]=stamp;meta.clocks[p]=stamp;return}
 if(before===undefined){delete meta.deletes[p];meta.clocks[p]=stamp;a65Each(after,p,stamp,(q)=>{meta.clocks[q]=stamp;delete meta.deletes[q]});return}
 if(a65Obj(before)&&a65Obj(after)){
  for(const k of new Set([...Object.keys(before),...Object.keys(after)]))if(!a65Ignored(p,k))a65Diff(before[k],after[k],p+'/'+a65Escape(k),stamp,meta);return;
 }
 if((a65Keyed(before)||a65Keyed(after))&&Array.isArray(before)&&Array.isArray(after)&&(before.length===0||a65Keyed(before))&&(after.length===0||a65Keyed(after))){
  const a=new Map(before.map(x=>[a65Key(x),x])),b=new Map(after.map(x=>[a65Key(x),x]));
  for(const k of new Set([...a.keys(),...b.keys()]))a65Diff(a.get(k),b.get(k),p+'/@'+a65Escape(k),stamp,meta);return;
 }
 meta.clocks[p]=stamp;delete meta.deletes[p];
}
function a65Capture(){
 if(!state)return;
 a65Prepare(state);
 if(a65Merged.has(state)){a65Merged.delete(state);a65Baseline=a65Clone(state);return}
 if(a65Baseline){const before=JSON.stringify(state.sync65);a65Diff(a65Baseline,state,'',a65Stamp(),state.sync65);if(JSON.stringify(state.sync65)!==before)a65Dirty=true}
 a65Baseline=a65Clone(state);
}
function a65Time(meta,p,fallback=''){
 let q=p,t=String(meta.clocks?.[q]||'');
 while(q.includes('/')){q=q.slice(0,q.lastIndexOf('/'));if(meta.clocks?.[q]&&meta.clocks[q]>t)t=meta.clocks[q]}
 return t||String(fallback||'');
}
function a65MergeNode(a,b,p,ma,mb,fa='',fb=''){
 if(a===undefined&&b===undefined)return undefined;
 const ta=a65Time(ma,p,fa),tb=a65Time(mb,p,fb),da=ma.deletes?.[p]||'',db=mb.deletes?.[p]||'';
 if(a===undefined){if(da&&da>=tb)return undefined;return a65Clone(b)}
 if(b===undefined){if(db&&db>=ta)return undefined;return a65Clone(a)}
 if(a65Obj(a)&&a65Obj(b)){
  const out={};for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
   if(a65Ignored(p,k)){if(k==='updatedAt')out[k]=[a[k],b[k]].filter(Boolean).sort().pop();else if(p===''&&k==='meta')out[k]={...b[k],...a[k],updatedAt:[a[k]?.updatedAt,b[k]?.updatedAt].filter(Boolean).sort().pop(),revision:Math.max(Number(a[k]?.revision)||0,Number(b[k]?.revision)||0)};else if(k!=='sync65')out[k]=a65Clone(a[k]===undefined?b[k]:a[k]);continue}
   const v=a65MergeNode(a[k],b[k],p+'/'+a65Escape(k),ma,mb,ta,tb);if(v!==undefined)out[k]=v;
  }return out;
 }
 if(Array.isArray(a)&&Array.isArray(b)&&(a65Keyed(a)||a65Keyed(b))&&(a.length===0||a65Keyed(a))&&(b.length===0||a65Keyed(b))){
  const x=new Map(a.map(v=>[a65Key(v),v])),y=new Map(b.map(v=>[a65Key(v),v])),out=[];
  for(const k of [...new Set([...x.keys(),...y.keys()])].sort()){const v=a65MergeNode(x.get(k),y.get(k),p+'/@'+a65Escape(k),ma,mb,ta,tb);if(v!==undefined)out.push(v)}return out;
 }
 if(ta!==tb)return a65Clone(ta>tb?a:b);
 return a65Clone(JSON.stringify(a)>=JSON.stringify(b)?a:b);
}
function a65MergeMaps(a,b){const out={...a};for(const [p,t] of Object.entries(b||{}))if(!out[p]||t>out[p])out[p]=t;return out}
const a65OldSeed=seedState;
function a65Hash(v){let a=2166136261,b=0x9e3779b9;for(const c of String(v)){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),2246822519)}return(a>>>0).toString(36)+(b>>>0).toString(36)}
seedState=function(){
 const s=a65OldSeed();
 for(const kind of ['groups','tasks','goals','events'])for(const [i,x] of (s[kind]||[]).entries())if(x.id!=='watermelon')x.id='seed65-'+kind+'-'+a65Hash(JSON.stringify([i,x.name||x.title,x.mentorId,x.day,x.time]));
 return s;
};
const a65OldLoad=loadLocal;
loadLocal=function(){a65Fresh=!localStorage.getItem(storageKey());const s=a65Prepare(a65OldLoad());a65Baseline=a65Clone(s);a65Dirty=false;return s};
persistLocal=function(){
 if(!state)return;a65Capture();
 try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(e){setSyncStatus('off','Не удалось сохранить на устройстве. Сделайте резервную копию.');throw e}
};
mergeStates=function(local,remote){
 if(!remote)return local;
 const a=a65Prepare(a65Clone(local)),b=a65Prepare(a65Clone(remote));
 let out;
 if(a65Fresh&&local===state)out={...b,ui:a65Clone(a.ui),settings:{...b.settings,currentMonth:a.settings.currentMonth,autoSync:a.settings.autoSync,syncInterval:a.settings.syncInterval}};
 else{
  out=a65MergeNode(a,b,'',a.sync65,b.sync65,a.meta?.updatedAt,b.meta?.updatedAt);
  out.sync65={clocks:a65MergeMaps(a.sync65.clocks,b.sync65.clocks),deletes:a65MergeMaps(a.sync65.deletes,b.sync65.deletes)};
 }
 out=ensureState(out);a65Prepare(out);a65Merged.add(out);return out;
};
// AES-GCM remains the envelope algorithm. Older clients fail closed on gzip
// plaintext instead of silently interpreting a new envelope as an empty database.
encryptState=async function(value){
 const iv=crypto.getRandomValues(new Uint8Array(12)),key=await cryptoKey();let bytes=new TextEncoder().encode(JSON.stringify(value)),zip;
 if(bytes.length>12000&&typeof CompressionStream==='function'){
  const compressed=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  if(compressed.length<bytes.length*.9){bytes=compressed;zip='gzip'}
 }
 const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes));
 return JSON.stringify({v:6,alg:'A256GCM',iv:bytesToB64(iv),data:bytesToB64(data),...(zip?{zip}:{}),updatedAt:value.meta?.updatedAt||nowIso()});
};
function a65Validate(s){
 if(!a65Obj(s)||s.version!==6||!a65Obj(s.months)||!a65Obj(s.settings)||!Array.isArray(s.groups)||!Array.isArray(s.tasks))throw Error('База повреждена или имеет неизвестный формат. Перезапись заблокирована.');
 return ensureState(s);
}
decryptPayload=async function(payload){
 let p=payload;
 for(let depth=0;depth<6;depth++){
  if(p===null||p===undefined)return null;
  if(typeof p==='string'){try{p=JSON.parse(p)}catch{throw Error('Не удалось разобрать ответ базы. Перезапись заблокирована.')}continue}
  if(!a65Obj(p))throw Error('Некорректный ответ базы');
  if(p.alg){
   if(p.alg!=='A256GCM'||!p.iv||!p.data||p.zip&&p.zip!=='gzip')throw Error('Неподдерживаемый формат шифрования');
   const iv=b64ToBytes(p.iv);if(iv.length!==12)throw Error('Некорректный ключ/шифротекст');
   let bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv},await cryptoKey(),b64ToBytes(p.data)));
   if(p.zip==='gzip'){
    if(typeof DecompressionStream!=='function')throw Error('Обновите браузер для чтения базы');
    const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];let n=0;
    while(true){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>16000000){await reader.cancel();throw Error('База превышает безопасный размер')}parts.push(r.value)}
    bytes=new Uint8Array(n);let off=0;for(const x of parts){bytes.set(x,off);off+=x.length}
   }
   return a65Validate(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  }
  if(p.version!==undefined)return a65Validate(p);
  if(p.data!==undefined){p=p.data;continue}if(p.state!==undefined){p=p.state;continue}
  throw Error('В ответе нет рабочей базы. Автоматическая перезапись заблокирована.');
 }
 throw Error('Слишком много уровней упаковки данных');
};
const a65OldPush=pushRemote;
pushRemote=async function(s){const result=await a65OldPush(s);return result};
function a65Meaning(s){
 function canon(x,p=''){
  if(Array.isArray(x)){const list=a65Keyed(x)?[...x].sort((a,b)=>String(a65Key(a)).localeCompare(String(a65Key(b)))):x;return list.map(v=>canon(v,p+'/@'))}
  if(!a65Obj(x))return x;
  const out={};for(const k of Object.keys(x).sort()){
   if(k==='updatedAt'||k==='_fieldUpdatedAt'||p===''&&['meta','ui','activity'].includes(k)||p==='/settings'&&['currentMonth','autoSync','syncInterval'].includes(k))continue;
   out[k]=canon(x[k],p+'/'+k);
  }return out;
 }
 return JSON.stringify(canon(s));
}
function a65FormBusy(){return!!document.activeElement?.closest('#pages form,#modal form')}
syncNow=function({quiet=false,push=true}={}){
 if(a65Promise)return a65Promise;
 a65Promise=(async()=>{
  syncing=true;setSyncStatus('busy','Проверяем общую базу');
  try{
   a65Capture();const remote=await fetchRemote();let next=mergeStates(state,remote);state=next;a65Fresh=false;a65Ready=true;persistLocal();
   if(push||!remote||a65Meaning(state)!==a65Meaning(remote)){
    let confirmed=false;
    for(let attempt=0;attempt<3;attempt++){
     a65Capture();const sent=a65Clone(state);await pushRemote(sent);
     const readback=await fetchRemote();if(!readback)throw Error('Сервер не подтвердил сохранение');
     a65Capture();next=mergeStates(state,readback);state=next;persistLocal();
     if(a65Meaning(state)===a65Meaning(readback)){confirmed=true;break}
    }
    if(!confirmed)throw Error('Параллельные изменения: данные сохранены локально, повторяем обмен');
   }
   a65Dirty=false;setSyncStatus('ok','Сохранение проверено чтением с сервера');
   if(!a65FormBusy()){renderShell();renderCurrentView()}else document.body.dataset.syncRefreshPending='true';
   if(!quiet)toast('Синхронизация завершена','Изменения подтверждены общей базой.');return true;
  }catch(e){
   console.warn('SYNC_FAILED',e);
   const text=/413/.test(String(e))?'База слишком велика для сервера. Данные остаются на устройстве.':String(e?.message||e);
   setSyncStatus('off',text);if(!quiet)toast('Изменения пока только на устройстве',text,'error');return false;
  }finally{syncing=false;a65Promise=null}
 })();return a65Promise;
};
// UI checks prevent accidental writes, but do not replace server authorization.
const a65Managers=()=>['owner','manager'].includes(currentRole);
const a65EventManagers=()=>['owner','manager','stas'].includes(currentRole);
function a65Access(form){
 const kind=form.id,idv=form.dataset.id||'';
 if(currentRole==='team')return false;
 if(['monthForm','revenueForm','goalForm','closeMonthForm','settingsForm','mentorPaymentForm','mentorPersonForm','adminPersonForm','adminRulesForm','adminRatesForm'].includes(kind))return currentRole==='owner';
 if(kind==='eventForm')return a65EventManagers();
 if(kind==='taskForm')return canSeeAllTasks()||!idv||taskVisibleToCurrentUser(state.tasks.find(x=>x.id===idv));
 if(kind==='groupForm')return canSeeAllGroups()||currentRole==='mentor'&&(!idv||groupVisibleToCurrentUser(state.groups.find(x=>x.id===idv)));
 if(['sofa65NumbersForm','sofa3MeetingForm','sofa3MetricsForm','sofa3PrioritiesForm','sofa3WeekForm'].includes(kind))return a65Managers();
 if(['adminAdjustmentForm','adminShiftForm'].includes(kind))return a65Managers();
 if(kind==='adminSaleForm')return a65Managers()||currentRole==='admin';
 return true;
}
function a65FormMessage(f){
 for(const el of f.querySelectorAll('input[type=number]')){
  if(el.value!==''&&!Number.isFinite(Number(el.value)))return'Введите корректное число.';
  if(el.value!==''&&Number(el.value)<0&&!['adminAdjustmentForm','mentorPaymentForm'].includes(f.id))return'Отрицательные значения здесь недопустимы.';
 }
 const v=formValues(f),numeric=x=>Number(x)||0;
 if(f.id==='groupForm'){
  if(numeric(v.students)>numeric(v.capacity))return'Число детей не может превышать вместимость группы.';
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time||''))return'Время должно быть в формате ЧЧ:ММ, например 16:30.';
 }
 if(f.id==='revenueForm'&&v.date?.slice(0,7)!==state.settings.currentMonth)return'Дата поступления должна быть в выбранном месяце. Сначала переключите месяц.';
 if(f.id==='monthForm'&&(numeric(v.minimum)>numeric(v.target)||numeric(v.target)>numeric(v.stretch)))return'Проверьте порядок: минимум ≤ план ≤ сильный результат.';
 if(f.id==='sofa65NumbersForm'){
  if(numeric(v.sold)>numeric(v.attended))return'Покупок после пробного не может быть больше проведённых пробных.';
  if(numeric(v.renewDone)>numeric(v.renewDue))return'Продлений не может быть больше абонементов в работе.';
 }
 if(f.id==='closeMonthForm'&&(numeric(v.load)>100||numeric(v.tasksProgress)>100))return'Процент должен быть от 0 до 100.';
 return'';
}
const a65FormSnapshots=new WeakMap();
function a65FormRecord(f){
 const m={taskForm:'tasks',groupForm:'groups',goalForm:'goals',eventForm:'events',recommendationForm:'recommendations'};
 if(m[f.id])return state[m[f.id]]?.find(x=>x.id===f.dataset.id);
 if(f.id==='monthForm')return currentMonth();
 if(f.id==='sofa65NumbersForm')return sofa3EnsureDay().metrics;
 if(f.id==='sofa3WeekForm')return sofa3EnsureWeek();
 return null;
}
function a65RememberForms(){
 for(const f of document.querySelectorAll('form'))if(!a65FormSnapshots.has(f)){
  const record=a65FormRecord(f);if(record)a65FormSnapshots.set(f,{record:a65Clone(record),values:formValues(f)});
 }
}
function a65RebaseForm(f){
 const snap=a65FormSnapshots.get(f),now=a65FormRecord(f);if(!snap)return '';
 if(!now||now.deletedAt)return'Запись удалена на другом устройстве. Обновите раздел.';
 const values=formValues(f),changes=[];
 for(const [name,before] of Object.entries(snap.values)){
  if(!(name in snap.record)||!(name in now)||a65Equal(snap.record[name],now[name]))continue;
  const el=f.elements.namedItem(name);if(!el||typeof el.value==='undefined')continue;
  if(String(values[name])!==String(before)&&String(values[name])!==String(now[name]))return'Это же поле изменили на другом устройстве. Скопируйте свой текст и откройте запись заново: '+name;
  if(String(values[name])===String(before))changes.push([el,now[name]]);
 }
 for(const [el,value] of changes){if(el.type==='checkbox')el.checked=Boolean(value);else el.value=value??''}
 return '';
}
const a65OldOpenModal=openModal;
openModal=function(options){const r=a65OldOpenModal(options);a65RememberForms();return r};
const a65OldSubmit=handleSubmit;
handleSubmit=function(e){
 const f=e.target;if(!(f instanceof HTMLFormElement))return a65OldSubmit(e);
 if(!a65Access(f)){e.preventDefault();toast('Нет прав на это изменение','Обратитесь к Роману или Софе.','error');return}
 if(a65Fresh&&!a65Ready){e.preventDefault();toast('Сначала дождитесь подключения базы','Новая ссылка ещё не получила общие данные.','error');return}
 const conflict=a65RebaseForm(f);if(conflict){e.preventDefault();toast('Конфликт изменений',conflict,'error');return}
 const problem=a65FormMessage(f);if(problem){e.preventDefault();toast('Проверьте данные',problem,'error');return}
 return a65OldSubmit(e);
};
const a65OldClick=handleClick;
function a65ActionAllowed(el){
 const a=el.dataset.action;
 if(['addEvent','editEvent','deleteEvent'].includes(a))return a65EventManagers();
 if(['editMonth','addRevenue','deleteRevenue','addGoal','editGoal','deleteGoal','closeMonth','exportData','importData','resetState','copyOwnerLink','copyRoleLink','copyPersonalLink'].includes(a))return currentRole==='owner';
 if(['addGroup','editGroup','deleteGroup'].includes(a))return canSeeAllGroups()||currentRole==='mentor'&&(!el.dataset.id||groupVisibleToCurrentUser(state.groups.find(x=>x.id===el.dataset.id)));
 if(['addTask','editTask'].includes(a))return currentRole!=='team'&&(!el.dataset.id||taskVisibleToCurrentUser(state.tasks.find(x=>x.id===el.dataset.id)));
 return true;
}
handleClick=function(e){const el=e.target.closest('[data-action]');if(el&&!a65ActionAllowed(el)){e.preventDefault();toast('Действие недоступно для этой роли','','error');return}return a65OldClick(e)};
function a65CleanActions(){for(const el of document.querySelectorAll('[data-action]'))if(!a65ActionAllowed(el)){el.removeAttribute('data-action');if(el.tagName==='BUTTON')el.hidden=true;else el.style.cursor='default'}}
const a65OldRender=renderCurrentView;
renderCurrentView=function(){const r=a65OldRender();a65CleanActions();a65RememberForms();return r};
const a65OldCalendar=renderCalendar;
renderCalendar=function(){const all=activeTasks;activeTasks=()=>all().filter(taskVisibleToCurrentUser);try{return a65OldCalendar()}finally{activeTasks=all}};
const a65Style=document.createElement('style');a65Style.textContent=`
 .operations-datebar,.operations-date-nav,.operations-date-actions,.operations-date-copy,.sofa-v4-status,.sofa65-numbers,.operations-grid,.sofa65-grid{min-width:0;max-width:100%;box-sizing:border-box}
 .operations-date-copy{flex:1;overflow-wrap:anywhere}.operations-date-actions{flex-wrap:wrap}.operations-date-actions .input{min-width:0;max-width:100%}
 @media(max-width:560px){.operations-datebar{display:grid;grid-template-columns:minmax(0,1fr)}.operations-date-nav{width:100%}.operations-date-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;width:100%}.top-title{min-width:0;flex:1}.top-title h1{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:none}.top-actions{flex-shrink:0}.card,.field,.form-grid,.page,.content{min-width:0}.form-grid input,.form-grid textarea,.form-grid select{max-width:100%}}
`;document.head.appendChild(a65Style);
const a65OldSettings=renderSettings;
renderSettings=function(){
 return appendBeforePageClose(a65OldSettings(),'<section class="card pad"><h3>Защита доступа: требуется настройка</h3><p>Текущие персональные ссылки используют общий ключ базы. Ограничения интерфейса не являются серверной авторизацией. Не пересылайте ссылки посторонним. До перехода на серверные учётные записи нельзя считать зарплаты и другие данные изолированными между сотрудниками.</p></section>');
};
// GROWTH65_AUDIT_FIXES_END
