// MANAGEMENT_UP_V1_START
const MANAGEMENT_UP_BUILD='2026.09.03-up-docs-meeting';

const MANAGEMENT_BOARD_META={
  roman:{title:'Собственник',area:'Стратегия · развитие · финальный управленческий контроль',roleLabel:'Собственник'},
  sofia:{title:'Управляющая',area:'Операционное управление клубом',roleLabel:'Управляющая'},
  stas:{title:'Руководитель роллер-школы · технический',area:'Соревнования · сборы · практическое обучение наставников и детей',roleLabel:'Технический руководитель роллер-школы'},
  ivan:{title:'Руководитель роллер-школы · теоретический',area:'Обучение сотрудников · метрики · теория · методичка · курсы',roleLabel:'Теоретический руководитель роллер-школы'}
};

if(ROLES.owner){ROLES.owner.title='Собственник'}
if(ROLES.manager){ROLES.manager.title='Управляющая'}
if(ROLES.stas){ROLES.stas.title='Руководитель роллер-школы · технический'}

function managementViewerPersonId(){
  if(currentRole==='owner')return'roman';
  if(currentRole==='manager')return'sofia';
  if(currentRole==='stas')return'stas';
  if(currentRole==='mentor')return mentorViewerId();
  if(currentRole==='admin')return adminViewerId();
  return'';
}
function isManagementBoard(){
  const pid=managementViewerPersonId();
  return currentRole==='owner'||currentRole==='manager'||currentRole==='stas'||pid==='ivan';
}
function managementActorName(){
  const pid=managementViewerPersonId();
  return person(pid).name||roleInfo().name||'УП';
}
function managementEnsure(s){
  if(!s||typeof s!=='object')return s;
  s.people=Array.isArray(s.people)?s.people:[];
  s.people=s.people.map(p=>{
    const meta=MANAGEMENT_BOARD_META[p.id];
    return meta?{...p,...meta,managementBoard:true,groupAccess:'all',taskAccess:'all'}:{...p,managementBoard:false};
  });
  s.staffDocuments=Array.isArray(s.staffDocuments)?s.staffDocuments:[];
  s.staffDuties=Array.isArray(s.staffDuties)?s.staffDuties:[];
  s.meetingAgenda=Array.isArray(s.meetingAgenda)?s.meetingAgenda:[];
  s.meetingTimer={running:false,startedAt:null,elapsedSec:0,updatedAt:'',...(s.meetingTimer||{})};
  s.ui={...(s.ui||{}),staffKnowledgePerson:s.ui?.staffKnowledgePerson||'ivan'};
  s.meta=s.meta||{};
  s.meta.managementUpBuild=MANAGEMENT_UP_BUILD;

  const seeded=[
    ['up-duty-roman','roman','Собственник','Стратегия, развитие клуба и финальный управленческий контроль.'],
    ['up-duty-sofia','sofia','Управляющая','Операционное управление клубом и контроль исполнения.'],
    ['up-duty-stas-competitions','stas','Соревнования и сборы','Техническая подготовка соревнований и сборов роллер-школы.'],
    ['up-duty-stas-practice','stas','Практическое обучение','Практическое обучение наставников и детей.'],
    ['up-duty-ivan-training','ivan','Обучение сотрудников','Теоретическое обучение сотрудников и наставников.'],
    ['up-duty-ivan-metrics','ivan','Метрики роллер-школы','Контроль заполненности групп и связанных учебных метрик.'],
    ['up-duty-ivan-method','ivan','Методическая система','Методичка, курсы и единая теоретическая база роллер-школы.']
  ];
  const existing=new Set(s.staffDuties.map(x=>x.id));
  for(const [dutyId,personId,title,description] of seeded){
    if(existing.has(dutyId))continue;
    s.staffDuties.push({id:dutyId,personId,title,description,seeded:true,createdBy:'system',createdAt:'2026-09-03T00:00:00.000Z',updatedAt:'2026-09-03T00:00:00.000Z'});
  }
  return s;
}

const __seedStateManagementUPBase=seedState;
seedState=function(){return managementEnsure(__seedStateManagementUPBase())};
const __ensureStateManagementUPBase=ensureState;
ensureState=function(raw){return managementEnsure(__ensureStateManagementUPBase(raw))};
const __mergeStatesManagementUPBase=mergeStates;
mergeStates=function(local,remote){
  const out=__mergeStatesManagementUPBase(local,remote);
  if(local&&remote){
    out.staffDocuments=mergeLists(local.staffDocuments||[],remote.staffDocuments||[]);
    out.staffDuties=mergeLists(local.staffDuties||[],remote.staffDuties||[]);
    out.meetingAgenda=mergeLists(local.meetingAgenda||[],remote.meetingAgenda||[]);
    out.meetingTimer=newer(local.meetingTimer||{},remote.meetingTimer||{});
  }
  return managementEnsure(out);
};

if(typeof taskAccessDescription==='function'){
  taskAccessDescription=function(){
    if(currentRole==='owner')return'Роман видит задачи всей команды как собственник.';
    if(currentRole==='manager')return'Софа видит задачи всей команды как управляющая.';
    if(currentRole==='stas')return'Станислав видит задачи всей команды как технический руководитель роллер-школы.';
    if(managementViewerPersonId()==='ivan')return'Иван видит задачи всей команды как теоретический руководитель роллер-школы.';
    const ownerId=personalTaskOwnerId();return ownerId?`В этом кабинете доступны только задачи сотрудника «${person(ownerId).name}».`:'Задачи других сотрудников скрыты.';
  };
}
if(typeof groupAccessDescription==='function'){
  groupAccessDescription=function(){
    if(currentRole==='owner')return'Роман видит все активные группы клуба для собственнического контроля.';
    if(currentRole==='manager')return'Софа видит все активные группы клуба для операционного контроля.';
    if(currentRole==='stas')return'Станислав видит все активные группы клуба как технический руководитель роллер-школы.';
    if(managementViewerPersonId()==='ivan')return'Иван видит все активные группы клуба как теоретический руководитель роллер-школы.';
    const mentorId=personalGroupMentorId();return mentorId?`В кабинете ${person(mentorId).name} отображаются только его группы.`:'Группы других наставников недоступны.';
  };
}

const upCabinetSection=NAV.find(section=>section.section==='Кабинеты');
if(upCabinetSection&&!upCabinetSection.items.some(x=>x.id==='documents'))upCabinetSection.items.splice(Math.max(0,upCabinetSection.items.length-1),0,{id:'documents',label:'Документы и обязанности',icon:'archive',roles:['owner','manager','stas','mentor','admin']});
if(upCabinetSection&&!upCabinetSection.items.some(x=>x.id==='meeting'))upCabinetSection.items.splice(Math.max(0,upCabinetSection.items.length-1),0,{id:'meeting',label:'Собрание УП',icon:'team',roles:['owner','manager','stas','mentor']});

const __allowedViewManagementUPBase=allowedView;
allowedView=function(id){
  if(id==='meeting')return isManagementBoard();
  if(id==='documents')return['owner','manager','stas','mentor','admin'].includes(currentRole);
  return __allowedViewManagementUPBase(id);
};
const __renderNavManagementUPBase=renderNav;
renderNav=function(){
  const meetingItem=NAV.flatMap(s=>s.items).find(x=>x.id==='meeting');
  const originalRoles=meetingItem?[...meetingItem.roles]:null;
  if(meetingItem&&currentRole==='mentor'&&!isManagementBoard())meetingItem.roles=meetingItem.roles.filter(r=>r!=='mentor');
  try{return __renderNavManagementUPBase()}
  finally{if(meetingItem&&originalRoles)meetingItem.roles=originalRoles}
};

function knowledgePeople(){return(state.people||[]).filter(p=>p.active!==false&&!p.archivedAt&&!p.deletedAt&&['owner','manager','stas','mentor','admin'].includes(p.role))}
function knowledgeTargetId(){
  const own=managementViewerPersonId();
  if(!isManagementBoard())return own;
  const ids=new Set(knowledgePeople().map(p=>p.id));
  return ids.has(state.ui.staffKnowledgePerson)?state.ui.staffKnowledgePerson:(ids.has(own)?own:(knowledgePeople()[0]?.id||own));
}
function knowledgeDocs(personId){return(state.staffDocuments||[]).filter(x=>x.personId===personId&&!x.deletedAt).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))}
function knowledgeDuties(personId){return(state.staffDuties||[]).filter(x=>x.personId===personId&&!x.deletedAt).sort((a,b)=>Number(Boolean(a.seeded))-Number(Boolean(b.seeded))||String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')))}
function safeExternalUrl(url){try{const u=new URL(String(url||''));return /^https?:$/.test(u.protocol)?u.href:''}catch{return''}}
function managementBadge(p){return p?.managementBoard?'<span class="pill">УП</span>':''}
function renderKnowledgeRow(item,kind,canManage){
  const url=kind==='document'?safeExternalUrl(item.url):'';
  const meta=kind==='document'?(item.type||'Документ'):(item.seeded?'Закреплённая обязанность':'Обязанность');
  return`<article class="knowledge-row"><div class="knowledge-row-icon">${kind==='document'?ICONS.archive:ICONS.tasks}</div><div class="knowledge-row-main"><div class="knowledge-row-head"><div><b>${esc(item.title)}</b><small>${esc(meta)}</small></div>${item.seeded?'<span class="pill muted">Базовая</span>':''}</div>${item.description||item.notes?`<p>${esc(item.description||item.notes)}</p>`:''}<div class="knowledge-actions">${url?`<a class="btn btn-small btn-ghost" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Открыть документ</a>`:''}${canManage&&!item.seeded?`<button class="task-delete" data-action="${kind==='document'?'deleteStaffDocument':'deleteStaffDuty'}" data-id="${esc(item.id)}" title="Удалить">${ICONS.trash}</button>`:''}</div></div></article>`;
}
function renderDocumentsAndDuties(){
  const targetId=knowledgeTargetId(),p=person(targetId),canManage=isManagementBoard(),docs=knowledgeDocs(targetId),duties=knowledgeDuties(targetId),people=knowledgePeople();
  const personControl=canManage?`<select class="select" data-filter="staffKnowledgePerson" style="width:auto">${people.map(x=>`<option value="${esc(x.id)}" ${x.id===targetId?'selected':''}>${esc(x.name)} · ${esc(x.title||'Сотрудник')}</option>`).join('')}</select>`:`<span class="task-scope-owner">${esc(p.name)} · только просмотр</span>`;
  const actions=canManage?`<button class="btn btn-ghost" data-action="addStaffDuty" data-person="${esc(targetId)}">+ Обязанность</button><button class="btn btn-primary" data-action="addStaffDocument" data-person="${esc(targetId)}">+ Документ</button>`:'';
  return`<div class="page readable-page">${pageHead('БАЗА СОТРУДНИКА','Документы и обязанности',canManage?'УП управляет материалами и обязанностями всей команды':'В личном кабинете материалы доступны только для просмотра',actions)}<section class="knowledge-person card"><div class="knowledge-person-main"><span class="staff-avatar">${esc(p.avatar||String(p.name||'?')[0])}</span><div><div class="eyebrow">${canManage?'УПРАВЛЕНИЕ ДОСТУПАМИ':'ЛИЧНАЯ БАЗА'}</div><h3>${esc(p.name)}</h3><p>${esc(p.title||'Сотрудник')}${p.area?` · ${esc(p.area)}`:''}</p></div>${managementBadge(p)}</div><div>${personControl}</div></section><div class="knowledge-access-note ${canManage?'manage':'readonly'}"><i></i><div><b>${canManage?'Управляющий режим':'Режим только для чтения'}</b><small>${canManage?'Роман, Софа, Станислав и Иван могут добавлять и удалять документы и обязанности сотрудников.':'Сотрудник не может изменять или удалять материалы. Изменения вносит только управляющий состав.'}</small></div></div><div class="knowledge-grid"><section class="card knowledge-card"><div class="card-head"><div><h3>Документы</h3><p>Регламенты, методички, курсы, инструкции и рабочие материалы</p></div>${canManage?`<button class="btn btn-small btn-primary" data-action="addStaffDocument" data-person="${esc(targetId)}">+ Документ</button>`:''}</div><div class="knowledge-list">${docs.length?docs.map(x=>renderKnowledgeRow(x,'document',canManage)).join(''):'<div class="staff-empty"><b>Документов пока нет</b>УП может добавить первый материал.</div>'}</div></section><section class="card knowledge-card"><div class="card-head"><div><h3>Обязанности</h3><p>За что сотрудник отвечает и какой результат должен обеспечивать</p></div>${canManage?`<button class="btn btn-small btn-ghost" data-action="addStaffDuty" data-person="${esc(targetId)}">+ Обязанность</button>`:''}</div><div class="knowledge-list">${duties.length?duties.map(x=>renderKnowledgeRow(x,'duty',canManage)).join(''):'<div class="staff-empty"><b>Обязанности пока не добавлены</b>УП может сформировать список ответственности.</div>'}</div></section></div></div>`;
}
function staffDocumentModal(personId){
  if(!isManagementBoard())return;
  const p=person(personId||knowledgeTargetId());
  openModal({title:`Документ · ${p.name}`,subtitle:'Сотрудник увидит материал в своём личном кабинете, но не сможет его изменить',body:`<form id="staffDocumentForm" class="form-grid"><input type="hidden" name="personId" value="${esc(p.id)}"><div class="field span-2"><label>Название документа</label><input class="input" name="title" required placeholder="Например: Методичка Base+"></div><div class="field"><label>Тип</label><select class="select" name="type"><option>Должностная инструкция</option><option>Регламент</option><option>Методичка</option><option>Курс</option><option>Чек-лист</option><option>Другой документ</option></select></div><div class="field"><label>Ссылка</label><input class="input" type="url" name="url" placeholder="https://..."></div><div class="field span-2"><label>Комментарий</label><textarea class="textarea" name="notes" rows="4" placeholder="Что сотруднику важно знать по этому материалу"></textarea></div><div class="form-actions span-2"><button type="button" class="btn btn-ghost" data-action="closeModal">Отмена</button><button class="btn btn-primary" type="submit">Добавить документ</button></div></form>`});
}
function staffDutyModal(personId){
  if(!isManagementBoard())return;
  const p=person(personId||knowledgeTargetId());
  openModal({title:`Обязанность · ${p.name}`,subtitle:'Обязанность появится в личной базе сотрудника',body:`<form id="staffDutyForm" class="form-grid"><input type="hidden" name="personId" value="${esc(p.id)}"><div class="field span-2"><label>Обязанность</label><input class="input" name="title" required placeholder="Например: Еженедельный контроль заполненности групп"></div><div class="field span-2"><label>Что входит</label><textarea class="textarea" name="description" rows="5" placeholder="Критерий результата, периодичность, зона ответственности"></textarea></div><div class="form-actions span-2"><button type="button" class="btn btn-ghost" data-action="closeModal">Отмена</button><button class="btn btn-primary" type="submit">Добавить обязанность</button></div></form>`});
}

function meetingElapsedSec(){
  const t=state.meetingTimer||{};let total=Math.max(0,Number(t.elapsedSec)||0);
  if(t.running&&t.startedAt){const started=new Date(t.startedAt).getTime();if(Number.isFinite(started))total+=Math.max(0,Math.floor((Date.now()-started)/1000));}
  return total;
}
function meetingTimerText(sec=meetingElapsedSec()){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return[h,m,s].map(x=>String(x).padStart(2,'0')).join(':')}
function meetingAgendaActive(){return(state.meetingAgenda||[]).filter(x=>!x.deletedAt).sort((a,b)=>Number(Boolean(a.done))-Number(Boolean(b.done))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')))}
function renderMeetingAgendaItem(x){return`<article class="meeting-agenda-item ${x.done?'done':''}"><button class="meeting-check" data-action="toggleMeetingAgenda" data-id="${esc(x.id)}" title="${x.done?'Вернуть в обсуждение':'Отметить обсуждённым'}">${x.done?'✓':'○'}</button><div class="meeting-agenda-main"><b>${esc(x.title)}</b>${x.notes?`<p>${esc(x.notes)}</p>`:''}<small>${esc(x.createdBy||'УП')} · ${new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(x.createdAt||Date.now()))}</small></div><button class="task-delete" data-action="deleteMeetingAgenda" data-id="${esc(x.id)}" title="Удалить вопрос">${ICONS.trash}</button></article>`}
function renderMeeting(){
  const agenda=meetingAgendaActive(),open=agenda.filter(x=>!x.done).length,t=state.meetingTimer||{};
  const board=[['Роман','Собственник','Стратегия и финальный контроль'],['Софа','Управляющая','Операционное управление'],['Станислав','Технический руководитель','Соревнования, сборы, практика'],['Иван','Теоретический руководитель','Обучение, метрики, методичка, курсы']];
  return`<div class="page readable-page">${pageHead('УПРАВЛЯЮЩИЙ СОСТАВ','Собрание УП','Общий рабочий стол Романа, Софы, Станислава и Ивана',`<button class="btn btn-primary" data-action="addMeetingAgenda">+ Вопрос на обсуждение</button>`)}<section class="meeting-hero"><div><div class="eyebrow">СОБРАНИЕ УП</div><h3>Единая повестка руководителей</h3><p>Записывайте сюда вопросы и задачи, которые нужно разобрать вместе. Список и таймер синхронизируются через общую базу клуба.</p></div><span class="pill">Открыто: ${open}</span></section><div class="up-board-grid">${board.map(([name,role,focus])=>`<article class="up-board-card"><b>${esc(name)}</b><span>${esc(role)}</span><small>${esc(focus)}</small></article>`).join('')}</div><section class="card meeting-timer-card"><div class="meeting-timer-copy"><div class="eyebrow">ТАЙМЕР СОБРАНИЯ</div><div class="meeting-timer-value" id="meetingTimerValue">${meetingTimerText()}</div><p>${t.running?'Собрание идёт':'Таймер остановлен'}</p></div><div class="meeting-timer-actions">${t.running?'<button class="btn btn-primary" data-action="pauseMeetingTimer">Пауза</button>':'<button class="btn btn-primary" data-action="startMeetingTimer">Старт</button>'}<button class="btn btn-ghost" data-action="resetMeetingTimer">Сбросить</button></div></section><section class="card meeting-agenda-card"><div class="card-head"><div><h3>Что обсудить</h3><p>Новые задачи, проблемы, решения и вопросы на ближайшее собрание</p></div><button class="btn btn-small btn-primary" data-action="addMeetingAgenda">+ Добавить</button></div><div class="meeting-agenda-list">${agenda.length?agenda.map(renderMeetingAgendaItem).join(''):'<div class="staff-empty"><b>Повестка пустая</b>Добавьте первый вопрос на обсуждение.</div>'}</div></section></div>`;
}
function meetingAgendaModal(){
  if(!isManagementBoard())return;
  openModal({title:'Вопрос на собрание УП',subtitle:'Он сразу появится в общей повестке управляющего состава',body:`<form id="meetingAgendaForm" class="form-grid"><div class="field span-2"><label>Что нужно обсудить</label><input class="input" name="title" required placeholder="Например: Что делаем с группами ниже 60% заполненности"></div><div class="field span-2"><label>Контекст</label><textarea class="textarea" name="notes" rows="5" placeholder="Цифры, факты, варианты решения"></textarea></div><div class="form-actions span-2"><button type="button" class="btn btn-ghost" data-action="closeModal">Отмена</button><button class="btn btn-primary" type="submit">Добавить в повестку</button></div></form>`});
}

if(typeof staffPersonCard==='function'){
  const __staffPersonCardManagementUPBase=staffPersonCard;
  staffPersonCard=function(p,type){
    let html=__staffPersonCardManagementUPBase(p,type);
    if(p.id==='ivan')html=html.replace('Старший наставник','Руководитель · теория');
    return html;
  };
}
if(typeof renderStaffManagement==='function'){
  const __renderStaffManagementUPBase=renderStaffManagement;
  renderStaffManagement=function(){
    let html=__renderStaffManagementUPBase();
    html=html.replace('Все задачи команды доступны Роману, Софе, Ване и Стасу.','Управляющий состав — Роман, Софа, Станислав и Иван — видит все задачи и все группы клуба для контроля.');
    const up=`<section class="card staff-section"><div class="card-head"><div><h3>Управляющий состав</h3><p>Единый контроль групп, задач, документов и собраний</p></div><button class="btn btn-small btn-primary" data-view="meeting">Собрание УП</button></div><div class="up-board-grid"><article class="up-board-card"><b>Роман</b><span>Собственник</span><small>Стратегия и финальный контроль</small></article><article class="up-board-card"><b>Софа</b><span>Управляющая</span><small>Операционное управление</small></article><article class="up-board-card"><b>Станислав</b><span>Технический руководитель</span><small>Соревнования, сборы, практика</small></article><article class="up-board-card"><b>Иван</b><span>Теоретический руководитель</span><small>Обучение, метрики, методичка, курсы</small></article></div></section>`;
    return appendBeforePageClose(html,up);
  };
}
if(typeof renderMentor==='function'){
  const __renderMentorManagementUPBase=renderMentor;
  renderMentor=function(){
    let html=__renderMentorManagementUPBase(),mentorId=mentorViewerId(),p=person(mentorId);
    if(mentorId==='ivan')html=html.replace('<h3>Старший наставник</h3><p>Ване открыт раздел задач всей команды, при этом личный блок наставника остаётся только про его собственные группы и задачи.</p>','<h3>Руководитель роллер-школы · теория</h3><p>Иван входит в УП: видит все группы и задачи клуба. Его зона — обучение сотрудников, метрики заполненности, теория наставников, методичка и курсы.</p>');
    const extra=`<section class="card pad knowledge-cabinet-entry"><div><div class="eyebrow">БАЗА СОТРУДНИКА</div><h3>Документы и обязанности</h3><p>${isManagementBoard()?'Управляющий режим: можно работать с материалами всей команды.':`Материалы ${esc(p.name)} доступны только для просмотра.`}</p></div><button class="btn btn-primary" data-action="openPersonKnowledge" data-id="${esc(mentorId)}">Открыть</button></section>`;
    return appendBeforePageClose(html,extra);
  };
}
if(typeof renderAdmin==='function'){
  const __renderAdminManagementUPBase=renderAdmin;
  renderAdmin=function(){
    const html=__renderAdminManagementUPBase(),adminId=adminViewerId(),p=person(adminId);
    const extra=`<section class="card pad knowledge-cabinet-entry"><div><div class="eyebrow">БАЗА СОТРУДНИКА</div><h3>Документы и обязанности</h3><p>Материалы ${esc(p.name)} доступны в режиме только для просмотра.</p></div><button class="btn btn-primary" data-action="openPersonKnowledge" data-id="${esc(adminId)}">Открыть</button></section>`;
    return appendBeforePageClose(html,extra);
  };
}

const __handleChangeManagementUPBase=handleChange;
handleChange=function(e){
  const el=e.target;
  if(el.dataset.filter==='staffKnowledgePerson'&&isManagementBoard()){
    state.ui.staffKnowledgePerson=el.value;persistLocal();renderCurrentView();return;
  }
  return __handleChangeManagementUPBase(e);
};

const __handleSubmitManagementUPBase=handleSubmit;
handleSubmit=function(e){
  const f=e.target;
  if(f instanceof HTMLFormElement&&f.id==='staffDocumentForm'){
    e.preventDefault();if(!isManagementBoard())return;
    const v=Object.fromEntries(new FormData(f).entries()),stamp=nowIso();
    state.staffDocuments.push({id:id('staffDoc'),personId:v.personId,title:String(v.title||'').trim(),type:String(v.type||'Документ'),url:String(v.url||'').trim(),notes:String(v.notes||'').trim(),createdBy:managementActorName(),createdAt:stamp,updatedAt:stamp});
    closeModal();touch(`Добавлен документ для ${person(v.personId).name}`);return;
  }
  if(f instanceof HTMLFormElement&&f.id==='staffDutyForm'){
    e.preventDefault();if(!isManagementBoard())return;
    const v=Object.fromEntries(new FormData(f).entries()),stamp=nowIso();
    state.staffDuties.push({id:id('staffDuty'),personId:v.personId,title:String(v.title||'').trim(),description:String(v.description||'').trim(),createdBy:managementActorName(),createdAt:stamp,updatedAt:stamp});
    closeModal();touch(`Добавлена обязанность для ${person(v.personId).name}`);return;
  }
  if(f instanceof HTMLFormElement&&f.id==='meetingAgendaForm'){
    e.preventDefault();if(!isManagementBoard())return;
    const v=Object.fromEntries(new FormData(f).entries()),stamp=nowIso();
    state.meetingAgenda.push({id:id('meeting'),title:String(v.title||'').trim(),notes:String(v.notes||'').trim(),createdBy:managementActorName(),createdAt:stamp,updatedAt:stamp,done:false});
    closeModal();touch('Добавлен вопрос в повестку УП');return;
  }
  return __handleSubmitManagementUPBase(e);
};

const __handleClickManagementUPBase=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');
  if(el){const a=el.dataset.action;
    if(a==='openPersonKnowledge'){
      const target=el.dataset.id||managementViewerPersonId();
      if(isManagementBoard()||target===managementViewerPersonId()){state.ui.staffKnowledgePerson=target;persistLocal();setView('documents')}return;
    }
    if(a==='addStaffDocument'){if(isManagementBoard())staffDocumentModal(el.dataset.person||knowledgeTargetId());return}
    if(a==='addStaffDuty'){if(isManagementBoard())staffDutyModal(el.dataset.person||knowledgeTargetId());return}
    if(a==='deleteStaffDocument'){if(!isManagementBoard())return;const x=state.staffDocuments.find(d=>d.id===el.dataset.id);if(x&&confirm(`Удалить документ «${x.title}»?`)){x.deletedAt=nowIso();x.updatedAt=nowIso();touch('Документ сотрудника удалён')}return}
    if(a==='deleteStaffDuty'){if(!isManagementBoard())return;const x=state.staffDuties.find(d=>d.id===el.dataset.id);if(x&&confirm(`Удалить обязанность «${x.title}»?`)){x.deletedAt=nowIso();x.updatedAt=nowIso();touch('Обязанность сотрудника удалена')}return}
    if(a==='addMeetingAgenda'){if(isManagementBoard())meetingAgendaModal();return}
    if(a==='deleteMeetingAgenda'){if(!isManagementBoard())return;const x=state.meetingAgenda.find(d=>d.id===el.dataset.id);if(x&&confirm(`Удалить из повестки «${x.title}»?`)){x.deletedAt=nowIso();x.updatedAt=nowIso();touch('Вопрос удалён из повестки УП')}return}
    if(a==='toggleMeetingAgenda'){if(!isManagementBoard())return;const x=state.meetingAgenda.find(d=>d.id===el.dataset.id);if(x){x.done=!x.done;x.updatedAt=nowIso();touch(x.done?'Вопрос отмечен обсуждённым':'Вопрос возвращён в повестку')}return}
    if(a==='startMeetingTimer'){if(!isManagementBoard())return;const t=state.meetingTimer;t.running=true;t.startedAt=nowIso();t.updatedAt=nowIso();touch('Запущен таймер собрания УП');return}
    if(a==='pauseMeetingTimer'){if(!isManagementBoard())return;const t=state.meetingTimer;t.elapsedSec=meetingElapsedSec();t.running=false;t.startedAt=null;t.updatedAt=nowIso();touch('Таймер собрания поставлен на паузу');return}
    if(a==='resetMeetingTimer'){if(!isManagementBoard())return;if(confirm('Сбросить таймер собрания?')){const t=state.meetingTimer;t.running=false;t.startedAt=null;t.elapsedSec=0;t.updatedAt=nowIso();touch('Таймер собрания сброшен')}return}
  }
  return __handleClickManagementUPBase(e);
};

let managementMeetingInterval=null;
function managementMeetingTicker(){
  clearInterval(managementMeetingInterval);managementMeetingInterval=null;
  if(currentView!=='meeting')return;
  managementMeetingInterval=setInterval(()=>{const el=$('#meetingTimerValue');if(el)el.textContent=meetingTimerText();else{clearInterval(managementMeetingInterval);managementMeetingInterval=null}},1000);
}
const __renderCurrentViewManagementUPBase=renderCurrentView;
renderCurrentView=function(){
  clearInterval(managementMeetingInterval);managementMeetingInterval=null;
  if(currentView==='documents'){
    if(!allowedView('documents')){currentView=roleInfo().start;return __renderCurrentViewManagementUPBase()}
    $('#pageTitle').textContent='Документы и обязанности';$('#pages').innerHTML=renderDocumentsAndDuties();renderNav();animateNumbers();return;
  }
  if(currentView==='meeting'){
    if(!isManagementBoard()){currentView=roleInfo().start;return __renderCurrentViewManagementUPBase()}
    $('#pageTitle').textContent='Собрание УП';$('#pages').innerHTML=renderMeeting();renderNav();animateNumbers();managementMeetingTicker();return;
  }
  return __renderCurrentViewManagementUPBase();
};

const __bootManagementUPBase=boot;
boot=async function(){
  const result=await __bootManagementUPBase();
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,managementUpBuild:MANAGEMENT_UP_BUILD,isManagementBoard:()=>isManagementBoard(),knowledgeTarget:()=>knowledgeTargetId(),meetingElapsed:()=>meetingElapsedSec()};
  return result;
};
// MANAGEMENT_UP_V1_END
