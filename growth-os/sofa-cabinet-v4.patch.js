// SOFA65_CLEANUP_V4_START
const SOFA65_CLEANUP_BUILD='2026.09.04-sofa-cabinet-cleanup-v4';

(function sofa65V4CleanNavigation(){
  const sofaSection=NAV.find(s=>s.section==='Софа · управляющая');
  if(sofaSection){
    const order=['manager','operations','sofa_numbers','sofa_meetings','sofa_motivation','sofa_system'];
    sofaSection.items=sofaSection.items
      .filter(x=>order.includes(x.id))
      .sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  }
  const hideManager=(sectionName,ids)=>{
    const section=NAV.find(s=>s.section===sectionName);if(!section)return;
    for(const item of section.items)if(ids.includes(item.id))item.roles=(item.roles||[]).filter(r=>r!=='manager');
  };
  // У Софы остаются только общие разделы, которые нужны в ежедневной работе.
  hideManager('Стратегия',['year','goals']);
  hideManager('Работа',['analytics','archive','payroll']);
  // У Софы уже есть собственный раздел собраний — второй пункт «Собрание УП» не нужен.
  hideManager('Кабинеты',['meeting']);
})();

const __setViewSofa65V4=setView;
setView=function(view){
  if(currentRole==='manager'){
    if(view==='meeting')view='sofa_meetings';
    else if(view==='payroll')view='sofa_motivation';
    else if(['analytics','archive','year','goals'].includes(view))view='manager';
  }
  return __setViewSofa65V4(view);
};

(function sofa65V4Style(){
  const style=document.createElement('style');
  style.id='sofa65-v4-style';
  style.textContent=`
    .sofa-v4-status{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .sofa-v4-status>div{padding:14px 15px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.025)}
    .sofa-v4-status span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}
    .sofa-v4-status b{display:block;margin-top:4px;font-size:17px}
    .sofa-v4-results{display:grid;gap:9px}
    .sofa-v4-result{display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.02)}
    .sofa-v4-result>span{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:rgba(240,199,47,.12);color:var(--yellow);font-weight:900}
    .sofa-v4-result b{font-size:14px}.sofa-v4-result small{display:block;margin-top:2px;color:var(--muted)}
    .sofa-v4-scenarios{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:14px}
    .sofa-v4-scenario-list{display:grid;gap:7px;align-content:start}
    .sofa-v4-scenario-btn{border:1px solid var(--line);background:rgba(255,255,255,.025);color:var(--text);border-radius:13px;padding:12px 13px;text-align:left;font-weight:750}
    .sofa-v4-scenario-btn.active{border-color:rgba(240,199,47,.45);background:rgba(240,199,47,.09);color:var(--yellow)}
    .sofa-v4-scenario-detail{border:1px solid var(--line);border-radius:18px;padding:18px;background:rgba(255,255,255,.02)}
    .sofa-v4-scenario-detail h4{font-size:20px;margin:4px 0 12px}.sofa-v4-scenario-detail ol{margin:0;padding-left:22px;display:grid;gap:8px;color:#d8d2c4}
    .sofa-v4-escalation{margin-top:14px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}.sofa-v4-escalation b{color:var(--text)}
    .sofa-v4-sync-ok{display:inline-flex;align-items:center;gap:7px}.sofa-v4-sync-ok:before{content:'';width:8px;height:8px;border-radius:50%;background:#73d492;box-shadow:0 0 12px #73d49266}
    @media(max-width:900px){.sofa-v4-status{grid-template-columns:1fr 1fr}.sofa-v4-scenarios{grid-template-columns:1fr}}
    @media(max-width:560px){.sofa-v4-status{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
})();

// Требуемый темп считаем включая выбранную дату: остаток можно закрывать и сегодня.
const __sofa65RecomputeStatsV4=sofa65RecomputeStats;
sofa65RecomputeStats=function(dateValue=sofa3SelectedDate()){
  const s=__sofa65RecomputeStatsV4(dateValue),d=s.date;
  const y=Number(d.slice(0,4)),m=Number(d.slice(5,7)),day=Number(d.slice(8,10));
  const daysInMonth=new Date(y,m,0).getDate();
  s.need=s.remaining/Math.max(1,daysInMonth-day+1);
  return s;
};
sofa3Stats=sofa65RecomputeStats;

// ---------- Field-safe synchronization for Sofia data ----------
function sofa65V4FieldMap(obj){return obj&&typeof obj._fieldUpdatedAt==='object'?obj._fieldUpdatedAt:{}}
function sofa65V4FieldTime(obj,path){return String(sofa65V4FieldMap(obj)[path]||obj?.updatedAt||'')}
function sofa65V4Stamp(obj,path,stamp=nowIso()){
  if(!obj)return stamp;
  obj._fieldUpdatedAt={...sofa65V4FieldMap(obj),[path]:stamp};obj.updatedAt=stamp;return stamp;
}
function sofa65V4MergeStampMaps(a,b){
  const out={};for(const k of new Set([...Object.keys(sofa65V4FieldMap(a)),...Object.keys(sofa65V4FieldMap(b))])){
    const av=sofa65V4FieldMap(a)[k]||'',bv=sofa65V4FieldMap(b)[k]||'';out[k]=String(av)>=String(bv)?av:bv;
  }return out;
}
function sofa65V4Pick(a,b,path,av,bv){
  if(av===undefined)return clone(bv);if(bv===undefined)return clone(av);
  return sofa65V4FieldTime(a,path)>=sofa65V4FieldTime(b,path)?clone(av):clone(bv);
}
function sofa65V4NormalizeObject(obj,paths){
  if(!obj||typeof obj!=='object')return obj;const fallback=String(obj.updatedAt||nowIso()),map={...sofa65V4FieldMap(obj)};
  for(const path of paths)if(!map[path])map[path]=fallback;obj._fieldUpdatedAt=map;return obj;
}
function sofa65V4NormalizeDay(d){
  if(!d||typeof d!=='object')return d;const paths=[];
  (d.priorities||[]).forEach((_,i)=>paths.push(`priorities.${i}`));
  Object.keys(d.checks||{}).forEach(k=>paths.push(`checks.${k}`));
  Object.keys(d.rhythm||{}).forEach(k=>paths.push(`rhythm.${k}`));
  Object.keys(d.metrics||{}).forEach(k=>paths.push(`metrics.${k}`));
  Object.keys(d.notes||{}).forEach(k=>paths.push(`notes.${k}`));
  return sofa65V4NormalizeObject(d,paths);
}
function sofa65V4NormalizeWeek(w){
  if(!w||typeof w!=='object')return w;const paths=['revenueTarget','risk','team','parents','improvement','decision','closedAt','snapshot'];
  (w.results||[]).forEach((_,i)=>paths.push(`results.${i}`));(w.resultStatus||[]).forEach((_,i)=>paths.push(`resultStatus.${i}`));
  return sofa65V4NormalizeObject(w,paths);
}
function sofa65V4NormalizeMotivation(m){
  if(!m||typeof m!=='object')return m;const paths=['closedAt','snapshot'];Object.keys(m.checks||{}).forEach(k=>paths.push(`checks.${k}`));return sofa65V4NormalizeObject(m,paths);
}
function sofa65V4NormalizeDraft(d){
  if(!d||typeof d!=='object')return d;const paths=['type','date','participants','duration','notes','decision','tasks'];
  (d.agenda||[]).forEach((_,i)=>{paths.push(`agenda.${i}.done`,`agenda.${i}.text`)});return sofa65V4NormalizeObject(d,paths);
}
function sofa65V4NormalizeState(s){
  if(!s||typeof s!=='object')return s;
  for(const d of Object.values(s.operationsDays||{}))sofa65V4NormalizeDay(d);
  for(const w of Object.values(s.managementPlans?.weeks||{}))sofa65V4NormalizeWeek(w);
  for(const m of Object.values(s.sofiaMotivationByMonth||{}))sofa65V4NormalizeMotivation(m);
  sofa65V4NormalizeDraft(s.managementMeetingDraft);s.meta=s.meta||{};s.meta.sofa65CleanupBuild=SOFA65_CLEANUP_BUILD;return s;
}
function sofa65V4MergeObjectBase(a,b){
  if(!a)return clone(b);if(!b)return clone(a);const preferred=String(a.updatedAt||'')>=String(b.updatedAt||'')?a:b;return clone(preferred);
}
function sofa65V4MergeDay(a,b){
  if(!a)return sofa65V4NormalizeDay(clone(b));if(!b)return sofa65V4NormalizeDay(clone(a));
  a=sofa65V4NormalizeDay(a);b=sofa65V4NormalizeDay(b);const out=sofa65V4MergeObjectBase(a,b);
  const priorityLen=Math.max(a.priorities?.length||0,b.priorities?.length||0,3);out.priorities=Array.from({length:priorityLen},(_,i)=>sofa65V4Pick(a,b,`priorities.${i}`,a.priorities?.[i],b.priorities?.[i]));
  for(const field of ['checks','rhythm','metrics','notes']){out[field]={};for(const k of new Set([...Object.keys(a[field]||{}),...Object.keys(b[field]||{})]))out[field][k]=sofa65V4Pick(a,b,`${field}.${k}`,a[field]?.[k],b[field]?.[k]);}
  out.report=sofa65V4MergeObjectBase(a.report||{},b.report||{});out._fieldUpdatedAt=sofa65V4MergeStampMaps(a,b);out.updatedAt=[a.updatedAt,b.updatedAt].filter(Boolean).sort().pop()||nowIso();return out;
}
function sofa65V4MergeWeek(a,b){
  if(!a)return sofa65V4NormalizeWeek(clone(b));if(!b)return sofa65V4NormalizeWeek(clone(a));a=sofa65V4NormalizeWeek(a);b=sofa65V4NormalizeWeek(b);const out=sofa65V4MergeObjectBase(a,b);
  for(const k of ['revenueTarget','risk','team','parents','improvement','decision','closedAt','snapshot'])out[k]=sofa65V4Pick(a,b,k,a[k],b[k]);
  const len=Math.max(a.results?.length||0,b.results?.length||0,3);out.results=Array.from({length:len},(_,i)=>sofa65V4Pick(a,b,`results.${i}`,a.results?.[i],b.results?.[i]));out.resultStatus=Array.from({length:len},(_,i)=>sofa65V4Pick(a,b,`resultStatus.${i}`,a.resultStatus?.[i],b.resultStatus?.[i]));
  out._fieldUpdatedAt=sofa65V4MergeStampMaps(a,b);out.updatedAt=[a.updatedAt,b.updatedAt].filter(Boolean).sort().pop()||nowIso();return out;
}
function sofa65V4MergeMotivation(a,b){
  if(!a)return sofa65V4NormalizeMotivation(clone(b));if(!b)return sofa65V4NormalizeMotivation(clone(a));a=sofa65V4NormalizeMotivation(a);b=sofa65V4NormalizeMotivation(b);const out=sofa65V4MergeObjectBase(a,b);out.checks={};
  for(const k of new Set([...Object.keys(a.checks||{}),...Object.keys(b.checks||{})]))out.checks[k]=sofa65V4Pick(a,b,`checks.${k}`,a.checks?.[k],b.checks?.[k]);
  out.closedAt=sofa65V4Pick(a,b,'closedAt',a.closedAt,b.closedAt);out.snapshot=sofa65V4Pick(a,b,'snapshot',a.snapshot,b.snapshot);out._fieldUpdatedAt=sofa65V4MergeStampMaps(a,b);out.updatedAt=[a.updatedAt,b.updatedAt].filter(Boolean).sort().pop()||nowIso();return out;
}
function sofa65V4MergeDraft(a,b){
  if(!a)return sofa65V4NormalizeDraft(clone(b));if(!b)return sofa65V4NormalizeDraft(clone(a));a=sofa65V4NormalizeDraft(a);b=sofa65V4NormalizeDraft(b);
  if(a.type!==b.type){const pick=sofa65V4FieldTime(a,'type')>=sofa65V4FieldTime(b,'type')?a:b;return sofa65V4NormalizeDraft(clone(pick))}
  const out=sofa65V4MergeObjectBase(a,b);
  for(const k of ['type','date','participants','duration','notes','decision','tasks'])out[k]=sofa65V4Pick(a,b,k,a[k],b[k]);
  const len=Math.max(a.agenda?.length||0,b.agenda?.length||0);out.agenda=Array.from({length:len},(_,i)=>{const ai=a.agenda?.[i]||{},bi=b.agenda?.[i]||{};return{...ai,...bi,text:sofa65V4Pick(a,b,`agenda.${i}.text`,ai.text,bi.text),done:sofa65V4Pick(a,b,`agenda.${i}.done`,ai.done,bi.done)}});
  out._fieldUpdatedAt=sofa65V4MergeStampMaps(a,b);out.updatedAt=[a.updatedAt,b.updatedAt].filter(Boolean).sort().pop()||nowIso();return out;
}
function sofa65V4MergeKeyed(a={},b={},mergeFn){const out={};for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))out[k]=mergeFn(a?.[k],b?.[k]);return out}

const __seedStateSofa65V4=seedState;seedState=function(){return sofa65V4NormalizeState(__seedStateSofa65V4())};
const __ensureStateSofa65V4=ensureState;ensureState=function(raw){return sofa65V4NormalizeState(__ensureStateSofa65V4(raw))};
const __mergeStatesSofa65V4=mergeStates;
mergeStates=function(local,remote){
  const out=sofa65V4NormalizeState(__mergeStatesSofa65V4(local,remote));if(!remote)return out;
  out.operationsDays=sofa65V4MergeKeyed(local?.operationsDays||{},remote?.operationsDays||{},sofa65V4MergeDay);
  out.managementPlans={...(out.managementPlans||{}),weeks:sofa65V4MergeKeyed(local?.managementPlans?.weeks||{},remote?.managementPlans?.weeks||{},sofa65V4MergeWeek)};
  out.sofiaMotivationByMonth=sofa65V4MergeKeyed(local?.sofiaMotivationByMonth||{},remote?.sofiaMotivationByMonth||{},sofa65V4MergeMotivation);
  out.managementMeetingDraft=sofa65V4MergeDraft(local?.managementMeetingDraft,remote?.managementMeetingDraft);
  return sofa65V4NormalizeState(out);
};

function sofa65V4SilentTouch(stamp=nowIso()){
  state.meta=state.meta||{};state.meta.updatedAt=stamp;state.meta.revision=(Number(state.meta.revision)||0)+1;state.meta.build=BUILD;persistLocal();
  if(channel)try{channel.postMessage({type:'state',state,at:stamp})}catch{}
  clearTimeout(window.__sofa65V4SyncTimer);window.__sofa65V4SyncTimer=setTimeout(()=>{if(state.settings.autoSync)syncNow({quiet:true,push:true})},700);
}

const __handleSubmitSofa65V4=handleSubmit;
handleSubmit=function(e){
  const f=e.target;if(f instanceof HTMLFormElement){const stamp=nowIso();
    if(f.id==='sofa65NumbersForm'){const d=sofa3EnsureDay();for(const k of ['unanswered','attended','sold','renewDue','renewDone','expected','unpaidClients','unpaidAmount'])sofa65V4Stamp(d,`metrics.${k}`,stamp)}
    if(f.id==='sofa3PrioritiesForm'){const d=sofa3EnsureDay();for(let i=0;i<3;i++)sofa65V4Stamp(d,`priorities.${i}`,stamp)}
    if(f.id==='sofa3WeekForm'){const w=sofa3EnsureWeek();for(const k of ['revenueTarget','risk','team','parents','improvement','decision'])sofa65V4Stamp(w,k,stamp);for(let i=0;i<3;i++)sofa65V4Stamp(w,`results.${i}`,stamp)}
  }
  return __handleSubmitSofa65V4(e);
};

const __handleClickSofa65V4=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');if(el){const a=el.dataset.action,stamp=nowIso();
    if(currentRole==='manager'&&['sofa3ToggleKpi','sofa3LockSalary','sofa3CopyReport','sofa3MarkReport'].includes(a))return;
    if(a==='sofa3ToggleCheck')sofa65V4Stamp(sofa3EnsureDay(),`checks.${el.dataset.key}`,stamp);
    if(a==='sofa3ToggleRhythm')sofa65V4Stamp(sofa3EnsureDay(),`rhythm.${Number(el.dataset.index)}`,stamp);
    if(a==='sofa3CycleWeekResult')sofa65V4Stamp(sofa3EnsureWeek(),`resultStatus.${Number(el.dataset.index)}`,stamp);
    if(a==='sofa3CloseWeek'){const w=sofa3EnsureWeek();for(const k of ['revenueTarget','risk','team','parents','improvement','decision','closedAt','snapshot'])sofa65V4Stamp(w,k,stamp);for(let i=0;i<3;i++)sofa65V4Stamp(w,`results.${i}`,stamp)}
    if(a==='sofa3ToggleKpi'&&currentRole==='owner')sofa65V4Stamp(sofa3EnsureMotivation(),`checks.${el.dataset.key}`,stamp);
    if(a==='sofa3LockSalary'&&currentRole==='owner'){const m=sofa3EnsureMotivation();sofa65V4Stamp(m,'closedAt',stamp);sofa65V4Stamp(m,'snapshot',stamp)}
    if(a==='sofa3MeetingTemplate'&&isManagementBoard()){
      const type=el.dataset.type;state.managementMeetingDraft=sofa3MeetingDraft(type);const d=state.managementMeetingDraft;d.updatedAt=stamp;sofa65V4NormalizeDraft(d);for(const k of Object.keys(d._fieldUpdatedAt||{}))d._fieldUpdatedAt[k]=stamp;touch(`Выбран шаблон встречи: ${SOFA3_MEETING_TEMPLATES[type]?.title||type}`);return;
    }
    if(a==='sofa3ToggleMeetingDraftAgenda'&&isManagementBoard()){
      const d=sofa3MeetingDraftEnsure(),i=Number(el.dataset.index);if(d.agenda[i]){d.agenda[i].done=!d.agenda[i].done;sofa65V4Stamp(d,`agenda.${i}.done`,stamp);touch('Обновлена повестка встречи')}return;
    }
    if(a==='sofa3OpenDay'&&currentRole==='manager'){state.ui.operationsDate=el.dataset.date||today();state.ui.operationsTab='today';persistLocal();setView('operations');return}
  }
  return __handleClickSofa65V4(e);
};

function sofa65V4MeetingFieldInput(el){
  const d=sofa3MeetingDraftEnsure(),key=el.dataset.sofaMeetingField,stamp=nowIso();d[key]=key==='duration'?num(el.value):el.value;sofa65V4Stamp(d,key,stamp);sofa65V4SilentTouch(stamp);
}
const __handleInputSofa65V4=handleInput;
handleInput=function(e){const el=e.target;if(el?.dataset?.sofaMeetingField){sofa65V4MeetingFieldInput(el);return}return __handleInputSofa65V4(e)};
const __handleChangeSofa65V4=handleChange;
handleChange=function(e){const el=e.target;if(el?.dataset?.sofaMeetingField){sofa65V4MeetingFieldInput(el);return}return __handleChangeSofa65V4(e)};

// ---------- Cleaner daily center ----------
sofa3Tabs=function(){
  const active=['today','control','week'].includes(state.ui.operationsTab)?state.ui.operationsTab:'today';
  const tabs=[['today','Сегодня'],['control','Контроль дня'],['week','Неделя']];
  return`<div class="operations-tabs">${tabs.map(([idv,label])=>`<button class="${active===idv?'active':''}" data-action="sofa3OpsTab" data-tab="${idv}">${label}</button>`).join('')}</div>`;
};
const __renderOperationsSofa65V4=renderOperations;
renderOperations=function(){if(!['today','control','week'].includes(state.ui.operationsTab))state.ui.operationsTab='today';return __renderOperationsSofa65V4()};

sofa3TodayView=function(){
  const s=sofa3Stats(),week=sofa3WeekScore(s.date),next=sofa3NextRhythm(s.day,s.date),myTasks=currentMonthTasks().filter(t=>t.ownerId==='sofia'&&!statusDone(t.status)),over=myTasks.filter(isOverdue).length,events=activeEvents().filter(x=>x.date===s.date&&!x.deletedAt&&x.status!=='cancelled');
  return`${sofa3Hero(s)}
    <div class="grid-4">${metricCard('Выручка месяца',compactMoney(s.fact),`${pct(s.progress)} от плана`,'revenue',s.progress)}${metricCard('Нужно в день',compactMoney(s.need),`осталось ${compactMoney(s.remaining)}`,'analytics')}${metricCard('Пробная → продажа',pct(s.conversion),`${Number(s.metrics.sold)||0} из ${Number(s.metrics.attended)||0} сегодня`,'users',s.conversion)}${metricCard('Продления',pct(s.renew),`${Number(s.metrics.renewDone)||0} из ${Number(s.metrics.renewDue)||0}`,'tasks',s.renew)}</div>
    <div class="grid-2"><section class="card pad"><div class="card-head"><div><h3>Три результата дня</h3><p>То, что должно реально измениться к концу дня.</p></div><button class="btn btn-small btn-ghost" data-view="tasks">Все задачи</button></div><form id="sofa3PrioritiesForm"><div class="operations-priorities">${s.day.priorities.map((v,i)=>`<label class="operations-priority"><span>${i+1}</span><textarea name="p${i}" placeholder="${['Главный результат дня','Второй результат','Третий результат'][i]}">${esc(v)}</textarea></label>`).join('')}</div><div class="operations-savebar"><button class="btn btn-primary" type="submit">Сохранить результаты</button></div></form></section>
    <section class="card pad"><div class="card-head"><div><h3>Что дальше</h3><p>Короткая рабочая картина без дублирования остальных разделов.</p></div></div><div class="sofa-v4-status"><div><span>Следующий контроль</span><b>${esc(next?`${next[0]} · ${next[1]}`:'Основные точки пройдены')}</b></div><div><span>Мои задачи</span><b>${myTasks.length} открыто</b></div><div><span>Просрочено</span><b>${over}</b></div><div><span>События сегодня</span><b>${events.length}</b></div></div><div style="margin-top:14px" class="operations-savebar"><button class="btn btn-ghost" data-action="sofa3OpsTab" data-tab="control">Открыть чек-лист</button><button class="btn btn-ghost" data-action="sofa3OpsTab" data-tab="week">Неделя · ${Math.round(week.score)}%</button></div></section></div>`;
};

// ---------- Action-first Sofia home ----------
sofa65ManagerHome=function(){
  const s=sofa3Stats(today()),week=sofa3WeekScore(today()),salary=sofa3Salary(),tasks=currentMonthTasks().filter(t=>t.ownerId==='sofia'&&!statusDone(t.status)).sort(sortByDate),over=tasks.filter(isOverdue).length,next=sofa3NextRhythm(s.day,s.date),events=activeEvents().filter(e=>e.date===s.date&&!e.deletedAt&&e.status!=='cancelled');
  const alerts=[];
  if(Number(s.metrics.unanswered)>0)alerts.push([`${Number(s.metrics.unanswered)} лидов без ответа`,'Раздать администраторам и проверить следующий шаг.']);
  if(Number(s.metrics.unpaidClients)>0)alerts.push([`${Number(s.metrics.unpaidClients)} клиентов с неоплатой · ${compactMoney(s.metrics.unpaidAmount||0)}`,'У каждого должна быть дата следующего контакта.']);
  if(over)alerts.push([`${over} просроченных задач Софы`,'Перенести с реальным сроком или закрыть с причиной.']);
  if(Number(s.metrics.occupancy)<75)alerts.push([`Загрузка групп ${pct(s.metrics.occupancy)}`,'Свободные места — резерв выручки без расширения.']);
  const priorityRows=(s.day.priorities||[]).map((v,i)=>`<div class="sofa-v4-result"><span>${i+1}</span><div><b>${esc(v||['Определить главный результат дня','Определить второй результат','Определить третий результат'][i])}</b><small>${v?'Зафиксировано на сегодня':'Пока не заполнено'}</small></div></div>`).join('');
  const updated=state.meta?.updatedAt?new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date(state.meta.updatedAt)):'—';
  return`<div class="page readable-page sofa65-home-v4">${pageHead('СОФА · УПРАВЛЯЮЩАЯ','Главная Софы','Сегодня: приоритеты, отклонения и следующий контроль. Всё остальное — в профильных разделах.')}
    <section class="card hero"><div class="hero-top"><div><div class="eyebrow">${esc(currentMonth().label.toUpperCase())} · ПЛАН / ФАКТ</div><h3 class="hero-title">Факт ${compactMoney(s.fact)} <span style="color:var(--muted)">из ${compactMoney(s.plan)}</span></h3><div class="hero-sub">Прогноз ${compactMoney(s.forecast)} · до плана ${compactMoney(s.remaining)} · нужно ${compactMoney(s.need)} в день · <span class="sofa-v4-sync-ok">общая база, обновлено ${updated}</span></div></div><div class="hero-value" style="font-size:38px"><small style="display:block;font-size:11px;color:var(--muted);font-weight:700">ГОТОВНОСТЬ ДНЯ</small>${s.readiness}%</div></div><div class="hero-progress"><i style="width:${clamp(s.progress,0,100)}%"></i></div></section>
    <div class="sofa-v4-status"><div><span>Следующий контроль</span><b>${esc(next?`${next[0]} · ${next[1]}`:'Основные точки пройдены')}</b></div><div><span>Мои задачи</span><b>${tasks.length} открыто</b></div><div><span>Просрочено</span><b>${over}</b></div><div><span>События сегодня</span><b>${events.length}</b></div></div>
    <section class="sofa65-quick-links"><button class="quick-card" data-view="operations"><span class="quick-icon">${ICONS.tasks}</span><span><b>Контроль дня</b><small>${s.checkDone}/${s.checkTotal} чеков · ${s.rhythmDone}/${s.rhythmTotal} точек</small></span></button><button class="quick-card" data-view="sofa_numbers"><span class="quick-icon">${ICONS.analytics}</span><span><b>Цифры клуба</b><small>План, темп, воронка и оплаты</small></span></button><button class="quick-card" data-view="sofa_meetings"><span class="quick-icon">${ICONS.team}</span><span><b>Собрания</b><small>Повестка → решения → задачи</small></span></button><button class="quick-card" data-view="sofa_motivation"><span class="quick-icon">${ICONS.revenue}</span><span><b>Моя мотивация</b><small>${salaryMoney(salary.display)} · KPI ${salary.kpiCount}/4</small></span></button><button class="quick-card" data-view="tasks"><span class="quick-icon">${ICONS.tasks}</span><span><b>Задачи</b><small>${tasks.length} моих открытых</small></span></button><button class="quick-card" data-view="sofa_system"><span class="quick-icon">${ICONS.goals}</span><span><b>Система управляющей</b><small>Полномочия, стандарты и решения</small></span></button></section>
    <div class="grid-2"><section class="card pad"><div class="card-head"><div><h3>Что требует внимания</h3><p>Только реальные отклонения из общей базы.</p></div></div><div class="compact-list">${alerts.length?alerts.map(([title,text])=>`<div class="compact-item"><i class="item-dot red"></i><div class="item-main"><b>${esc(title)}</b><small>${esc(text)}</small></div></div>`).join(''):'<div class="empty"><b>Критичных отклонений нет</b>Переходите к трём результатам дня и улучшению процесса.</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Три результата сегодня</h3><p>Не отдельные задачи, а управленческий результат дня.</p></div><button class="btn btn-small btn-ghost" data-view="operations">Изменить</button></div><div class="sofa-v4-results">${priorityRows}</div></section></div>
    <section class="card pad"><div class="card-head"><div><h3>Неделя управляющей</h3><p>Выручка + три результата недели + задачи Софы.</p></div><button class="btn btn-small btn-ghost" data-view="operations" data-action="sofa65OpenWeek">Открыть неделю</button></div><div class="sofa-v4-status"><div><span>Итог недели</span><b>${Math.round(week.score)}%</b></div><div><span>Выручка недели</span><b>${compactMoney(week.revenue)}</b></div><div><span>План недели</span><b>${week.target?compactMoney(week.target):'не задан'}</b></div><div><span>Задачи Софы</span><b>${week.tasks.filter(t=>statusDone(t.status)).length}/${week.tasks.length}</b></div></div></section></div>`;
};

const __handleClickSofa65V4Week=handleClick;
handleClick=function(e){const el=e.target.closest('[data-action]');if(el?.dataset.action==='sofa65OpenWeek'){state.ui.operationsTab='week';persistLocal();setView('operations');return}return __handleClickSofa65V4Week(e)};

// ---------- Compact decision playbooks inside System ----------
const SOFA65_V4_SCENARIOS={
  injury:{title:'Травма / угроза безопасности',level:'Сразу',steps:['Остановить риск и обеспечить безопасность ребёнка.','Связаться с родителем; при необходимости вызвать 112.','Не ставить диагноз и не давать лекарства без согласования.','Зафиксировать происшествие, сохранить камеры и объяснения.'],escalation:'Романа подключить немедленно при серьёзной травме или существенном риске.'},
  complaint:{title:'Сложная жалоба родителя',level:'Высокий приоритет',steps:['Быстро признать обращение и спокойно собрать факты.','Не спорить с эмоцией родителя.','Предложить решение в пределах полномочий и срок.','Зафиксировать итог и сделать повторный контакт.'],escalation:'Роман нужен при крупной компенсации, юридическом или публичном репутационном риске.'},
  lead:{title:'Лид остался без ответа',level:'Деньги сегодня',steps:['Назначить конкретного администратора.','Связаться с клиентом и уточнить возраст, цель и удобное время.','Записать следующий шаг в CRM.','Проверить, что клиент не остался без продолжения.'],escalation:'Обычная операционная ситуация — Софа решает через администратора.'},
  trial:{title:'Пробная была, покупки нет',level:'Деньги сегодня',steps:['Получить короткую обратную связь наставника.','Связаться с родителем в тот же день.','Уточнить впечатления и причину паузы.','Предложить персональный следующий шаг и зафиксировать дату контакта.'],escalation:'Софа контролирует, администратор ведёт клиента.'},
  renewal:{title:'Абонемент заканчивается',level:'Деньги сегодня',steps:['Начать работу заранее, ориентир — за 7 дней.','Получить рекомендацию наставника по развитию.','Предложить подходящий формат и сохранить место.','Зафиксировать ответ, сумму и следующую дату контакта.'],escalation:'Новые цены и нестандартные скидки — только после согласования с Романом.'},
  discipline:{title:'Сотрудник сорвал задачу / смену',level:'Команда',steps:['Сначала закрыть риск для клиентов и смены.','Зафиксировать факт и получить объяснение.','Назначить новый реальный срок или замену.','Разобрать причину; повторение превращать в обучение или кадровое решение.'],escalation:'Найм, увольнение, изменение зарплаты и серьёзные меры — согласовать с Романом.'},
  cash:{title:'Расхождение кассы / денег',level:'Сразу',steps:['Остановить неподтверждённые операции.','Сверить кассу, эквайринг, CRM, чеки и сменный отчёт.','Зафиксировать сумму и время обнаружения.','Собрать факты и объяснение ответственного.'],escalation:'Существенное расхождение денег — Романа подключить немедленно.'},
  shift:{title:'Не вышел сотрудник / сбой расписания',level:'Операционный риск',steps:['Понять, какие занятия и клиенты затронуты.','Найти замену или безопасно перестроить расписание.','Предупредить родителей до их приезда.','После смены убрать причину повторения.'],escalation:'Роман нужен только если есть риск остановки работы клуба.'}
};
function sofa65V4ScenarioDetail(key){const s=SOFA65_V4_SCENARIOS[key]||SOFA65_V4_SCENARIOS.injury;return`<div class="eyebrow">${esc(s.level)}</div><h4>${esc(s.title)}</h4><ol>${s.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="sofa-v4-escalation"><b>Эскалация:</b> ${esc(s.escalation)}</div>`}
sofa65SystemPage=function(){
  const scenario=SOFA65_V4_SCENARIOS[state.ui.sofa65Scenario]?state.ui.sofa65Scenario:'injury';
  const priority=[['1','Безопасность','Травма, ребёнок, опасный инвентарь или зона.'],['2','Серьёзный вопрос родителя','Жалоба, конфликт, возврат или риск ухода.'],['3','Деньги сегодня','Лиды, пробные, продления, неоплаты и обещанные платежи.'],['4','Текущая смена','Люди, расписание, пробные, зал и касса.'],['5','Просрочки и дисциплина','Ответственный, причина и новый срок.'],['6','Улучшение','Когда срочное закрыто — улучшить один процесс.']];
  return`<div class="page readable-page sofa65-system-v4">${pageHead('РОЛЬ И ПРАВИЛА','Система управляющей','Короткий рабочий справочник: роль, приоритеты, полномочия, сервис и действия в сложной ситуации.')}
    <section class="grid-3"><article class="card pad"><div class="eyebrow">01 · РОЛЬ</div><h3>Не делать всё самой</h3><p class="readable-note">Цикл Софы: задача → ответственный → срок → критерий готовности → контроль → разбор отклонения → закрепление правила.</p></article><article class="card pad"><div class="eyebrow">02 · ЦИФРЫ</div><h3>Видеть только то, чем можно управлять</h3><p class="readable-note">План/факт, темп, пробные, продления, ожидаемые оплаты, неоплаты, загрузка и задачи. Не создавать вторую бухгалтерию.</p></article><article class="card pad"><div class="eyebrow">03 · КЛУБ</div><h3>Управляющая присутствует в реальной работе</h3><p class="readable-note">Видит тренировки, родителей, смены, качество, безопасность и проблемы до того, как они становятся кризисом.</p></article></section>
    <div class="grid-2"><section class="card pad"><div class="card-head"><div><h3>Порядок приоритетов</h3><p>Когда одновременно всё важно.</p></div></div><div class="compact-list">${priority.map(([n,t,x])=>`<div class="compact-item"><span class="item-index">${n}</span><div class="item-main"><b>${esc(t)}</b><small>${esc(x)}</small></div></div>`).join('')}</div></section><section class="card pad"><div class="card-head"><div><h3>Полномочия</h3><p>Чтобы обычная операционка не возвращалась к Роману.</p></div></div><div class="compact-list"><div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Софа решает сама</b><small>Ежедневные задачи, CRM, лиды, пробные, продления, оплаты, стандартные вопросы родителей, чистота, качество, обучение и организация смен.</small></div></div><div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Сначала согласовать</b><small>Новые цены, нестандартные скидки, крупные компенсации, зарплаты, найм/увольнение и новые постоянные расходы.</small></div></div><div class="compact-item"><i class="item-dot red"></i><div class="item-main"><b>Подключить Романа сразу</b><small>Серьёзная травма, юридическая претензия, существенная недостача, ТЦ/УК, риск остановки клуба или публичный кризис.</small></div></div></div></section></div>
    <section class="card pad"><div class="card-head"><div><h3>Стандарты сервиса</h3><p>Ориентиры, которые команда должна держать без постоянных напоминаний.</p></div></div><div class="sofa65-standard-grid"><div><b>≈ 10 минут</b><small>ориентир ответа на входящее в рабочее время</small></div><div><b>За день + ≈2 часа</b><small>подтверждение пробной</small></div><div><b>В тот же день</b><small>обратная связь после пробной</small></div><div><b>До 30 минут</b><small>признать жалобу; решение желательно до 24 часов</small></div><div><b>Сразу</b><small>родителю при значимом инциденте</small></div><div><b>Регулярно</b><small>обратная связь по прогрессу ребёнка</small></div></div></section>
    <section class="card pad"><div class="card-head"><div><h3>Что делать, если…</h3><p>Короткие сценарии действий без отдельной лишней вкладки.</p></div></div><div class="sofa-v4-scenarios"><div class="sofa-v4-scenario-list">${Object.entries(SOFA65_V4_SCENARIOS).map(([key,s])=>`<button class="sofa-v4-scenario-btn ${scenario===key?'active':''}" data-action="sofa65Scenario" data-key="${key}">${esc(s.title)}</button>`).join('')}</div><div class="sofa-v4-scenario-detail">${sofa65V4ScenarioDetail(scenario)}</div></div></section></div>`;
};
const __handleClickSofa65V4Scenario=handleClick;
handleClick=function(e){const el=e.target.closest('[data-action]');if(el?.dataset.action==='sofa65Scenario'){state.ui.sofa65Scenario=el.dataset.key;persistLocal();renderCurrentView();return}return __handleClickSofa65V4Scenario(e)};

// ---------- Sync diagnostics ----------
function sofa65V4MergeSelfTest(){
  const a={updatedAt:'2026-09-04T10:00:00.000Z',checks:{open_clean:true},metrics:{unanswered:1},priorities:['A','',''],rhythm:{0:false},notes:{},_fieldUpdatedAt:{'checks.open_clean':'2026-09-04T10:02:00.000Z','metrics.unanswered':'2026-09-04T10:00:00.000Z'}};
  const b={updatedAt:'2026-09-04T10:03:00.000Z',checks:{open_clean:false},metrics:{unanswered:7},priorities:['A','',''],rhythm:{0:false},notes:{},_fieldUpdatedAt:{'checks.open_clean':'2026-09-04T09:59:00.000Z','metrics.unanswered':'2026-09-04T10:03:00.000Z'}};
  const m=sofa65V4MergeDay(a,b);return m.checks.open_clean===true&&Number(m.metrics.unanswered)===7;
}
async function sofa65V4CloudRoundtrip(){
  const token=`sofa65-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,probe=clone(state);probe.meta={...(probe.meta||{}),sofa65SyncProbe:token,updatedAt:nowIso(),revision:(Number(probe.meta?.revision)||0)+1};
  await pushRemote(probe);for(let i=0;i<4;i++){if(i)await new Promise(r=>setTimeout(r,450));const back=await fetchRemote();if(back?.meta?.sofa65SyncProbe===token)return true}return false;
}
const __bootSofa65V4=boot;
boot=async function(){
  const result=await __bootSofa65V4(),mergeOk=sofa65V4MergeSelfTest();document.documentElement.dataset.sofaSyncSelftest=mergeOk?'ok':'fail';
  const hp=new URLSearchParams(location.hash.replace(/^#/,''));if(hp.get('qaSync')==='1'){let cloudOk=false;try{cloudOk=await sofa65V4CloudRoundtrip()}catch(e){console.warn('SOFA65_CLOUD_SELFTEST_FAILED',e)}document.documentElement.dataset.sofaCloudSelftest=cloudOk?'ok':'fail'}
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,sofa65CleanupBuild:SOFA65_CLEANUP_BUILD,sofaSyncMergeSelfTest:sofa65V4MergeSelfTest,sofaSyncCloudRoundtrip:sofa65V4CloudRoundtrip};return result;
};

// SOFA65_CLEANUP_V4_END
