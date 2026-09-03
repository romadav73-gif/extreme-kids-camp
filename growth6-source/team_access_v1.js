// TEAM_CABINETS_ACCESS_V1_START
const TEAM_ACCESS_BUILD='2026.09.03-role-cabinets';

function teamAccessEnsure(s){
  if(!s||typeof s!=='object')return s;
  s.people=Array.isArray(s.people)?s.people:[];
  s.people=s.people.map(p=>{
    const out={...p};
    if(out.id==='ivan'){
      out.title='Старший наставник';
      out.taskAccess='all';
      out.active=out.active!==false;
    }
    return out;
  });
  s.ui={...(s.ui||{}),staffTab:s.ui?.staffTab||'active'};
  s.meta=s.meta||{};
  s.meta.teamAccessBuild=TEAM_ACCESS_BUILD;
  return s;
}

const __seedStateTeamAccessBase=seedState;
seedState=function(){return teamAccessEnsure(__seedStateTeamAccessBase())};
const __ensureStateTeamAccessBase=ensureState;
ensureState=function(raw){return teamAccessEnsure(__ensureStateTeamAccessBase(raw))};

function isIvanSeniorMentor(){return currentRole==='mentor'&&mentorViewerId()==='ivan'}
function canSeeAllTasks(){return currentRole==='owner'||currentRole==='manager'||currentRole==='stas'||isIvanSeniorMentor()}
function personalTaskOwnerId(){
  if(currentRole==='mentor')return mentorViewerId();
  if(currentRole==='admin')return adminViewerId();
  return'';
}
function taskScopeList(key=state.settings.currentMonth){
  const list=tasksForMonth(key);
  if(canSeeAllTasks())return list;
  const ownerId=personalTaskOwnerId();
  return ownerId?list.filter(t=>t.ownerId===ownerId):[];
}
function taskVisibleToCurrentUser(task){return Boolean(task)&&(canSeeAllTasks()||task.ownerId===personalTaskOwnerId())}
function activeTaskPeople(){return(state.people||[]).filter(p=>p.active!==false&&!p.archivedAt&&!p.deletedAt&&['owner','manager','stas','mentor','admin'].includes(p.role))}
function taskAccessDescription(){
  if(currentRole==='owner')return'Роман видит задачи всей команды.';
  if(currentRole==='manager')return'Софа видит задачи всей команды.';
  if(currentRole==='stas')return'Стас видит задачи всей команды как руководитель роллер-школы.';
  if(isIvanSeniorMentor())return'Ваня видит задачи всей команды как старший наставник.';
  const ownerId=personalTaskOwnerId();return ownerId?`В этом кабинете доступны только задачи сотрудника «${person(ownerId).name}».`:'Задачи других сотрудников скрыты.';
}

const cabinetSection=NAV.find(section=>section.section==='Кабинеты');
if(cabinetSection&&!cabinetSection.items.some(x=>x.id==='staff'))cabinetSection.items.unshift({id:'staff',label:'Команда и кабинеты',icon:'team',roles:['owner','manager']});

function staffPersonMeta(p,type){
  const t=taskStats(tasksForMonth(state.settings.currentMonth).filter(x=>x.ownerId===p.id));
  const groups=type==='mentor'?activeGroups().filter(g=>g.mentorId===p.id):[];
  const groupStats=type==='mentor'?loadStats(groups):null;
  if(type==='mentor')return[
    ['Групп',groups.length],
    ['Детей',groupStats.students],
    ['Задачи',`${t.done}/${t.total}`],
  ];
  const salary=typeof adminMonthStats==='function'?adminMonthStats(p.id):null;
  return[
    ['Задачи',`${t.done}/${t.total}`],
    ['Смены',salary?.shifts||0],
    ['Продажи',salary?.salesCount||0],
  ];
}
function staffPersonCard(p,type){
  const meta=staffPersonMeta(p,type),isOwner=currentRole==='owner',isProtected=p.id==='stas';
  const special=p.id==='ivan'?'<span class="pill">Старший наставник</span>':type==='admin'?'<span class="pill muted">Администратор</span>':'<span class="pill muted">Наставник</span>';
  const openAction=type==='admin'?'openAdminCabinet':'openMentorCabinet';
  const role=type==='admin'?'admin':'mentor';
  return`<article class="staff-person-card"><span class="staff-avatar ${type==='admin'?'admin':''}">${esc(p.avatar||String(p.name||'?')[0])}</span><div class="staff-person-main"><div class="staff-person-head"><div><h4>${esc(p.name)}</h4><p>${esc(p.title|| (type==='admin'?'Администратор':'Наставник'))}${p.area?` · ${esc(p.area)}`:''}</p></div>${special}</div><div class="staff-person-meta">${meta.map(([label,value])=>`<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div><div class="staff-person-actions"><button class="btn btn-small btn-primary" data-action="${openAction}" data-id="${p.id}">Открыть кабинет</button><button class="btn btn-small btn-ghost" data-action="copyPersonLink" data-role="${role}" data-id="${p.id}">${ICONS.copy} Ссылка</button>${isOwner?`<button class="btn btn-small btn-ghost" data-action="${type==='admin'?'editAdminPerson':'editMentorPerson'}" data-id="${p.id}">${ICONS.edit} Изменить</button>${!isProtected?`<button class="task-delete" data-action="${type==='admin'?'archiveAdmin':'archiveMentor'}" data-id="${p.id}" title="Удалить сотрудника">${ICONS.trash}</button>`:''}`:''}</div></div></article>`;
}
function archivedStaffRows(type){
  const list=(state.people||[]).filter(p=>{
    const isType=type==='admin'?p.role==='admin':(p.role==='mentor'||p.id==='stas');
    return isType&&(p.active===false||p.archivedAt)&&!p.deletedAt;
  });
  if(!list.length)return'';
  return`<div class="staff-archive"><h4>Удалённые ${type==='admin'?'администраторы':'наставники'}</h4>${list.map(p=>`<div class="staff-archive-row"><span class="avatar small">${esc(p.avatar||String(p.name||'?')[0])}</span><div class="item-main"><b>${esc(p.name)}</b><small>${esc(p.title||'Сотрудник')}</small></div><button class="btn btn-small btn-ghost" data-action="${type==='admin'?'restoreAdmin':'restoreMentor'}" data-id="${p.id}">Восстановить</button></div>`).join('')}</div>`;
}
function renderStaffManagement(){
  const mentors=activeMentors(),admins=activeAdmins(),month=state.settings.currentMonth;
  const allOpen=taskStats(tasksForMonth(month)).open;
  const ownerActions=currentRole==='owner'?`<button class="btn btn-ghost" data-action="addAdmin">+ Администратор</button><button class="btn btn-primary" data-action="addMentor">+ Наставник</button>`:'';
  return`<div class="page readable-page">${pageHead('КОМАНДА И ДОСТУПЫ','Команда и личные кабинеты','Роман управляет составом команды, а каждый сотрудник получает отдельный персональный кабинет',ownerActions)}<section class="staff-hero"><div><div class="eyebrow">ПЕРСОНАЛЬНЫЕ КАБИНЕТЫ</div><h3>${mentors.length} наставников · ${admins.length} администраторов</h3><p>Наставники и администраторы заходят по своим персональным ссылкам. В обычном кабинете сотрудник видит только свои задачи. Все задачи команды доступны Роману, Софе, Ване и Стасу.</p></div><div class="staff-hero-actions"><button class="btn btn-ghost" data-view="tasks">Задачи команды · ${allOpen}</button>${currentRole==='owner'?'<button class="btn btn-primary" data-action="syncNow">Синхронизировать</button>':''}</div></section><div class="grid-4">${metricCard('Наставники',String(mentors.length),'Активные личные кабинеты','mentor')}${metricCard('Администраторы',String(admins.length),'Активные личные кабинеты','admin')}${metricCard('Открытые задачи',String(allOpen),'Вся команда за выбранный месяц','tasks')}${metricCard('Персональные ссылки',String(mentors.length+admins.length),'Каждому сотруднику — своя','team')}</div><section class="card staff-section"><div class="card-head"><div><h3>Наставники</h3><p>Открытие кабинета, персональная ссылка, редактирование и удаление</p></div>${currentRole==='owner'?'<button class="btn btn-small btn-primary" data-action="addMentor">+ Наставник</button>':''}</div>${mentors.length?`<div class="staff-grid">${mentors.map(p=>staffPersonCard(p,'mentor')).join('')}</div>`:'<div class="staff-empty"><b>Наставников пока нет</b>Добавьте первого наставника.</div>'}${currentRole==='owner'?archivedStaffRows('mentor'):''}</section><section class="card staff-section"><div class="card-head"><div><h3>Администраторы</h3><p>У каждого свой кабинет с задачами, сменами, продажами и расчётом зарплаты</p></div>${currentRole==='owner'?'<button class="btn btn-small btn-primary" data-action="addAdmin">+ Администратор</button>':''}</div>${admins.length?`<div class="staff-grid">${admins.map(p=>staffPersonCard(p,'admin')).join('')}</div>`:'<div class="staff-empty"><b>Администраторов пока нет</b>Добавьте администратора.</div>'}${currentRole==='owner'?archivedStaffRows('admin'):''}</section></div>`;
}

renderTasks=function(){
  const mode=state.ui.taskMonthMode||'selected',monthKey=mode==='all'?'all':state.settings.currentMonth,allAccess=canSeeAllTasks();
  const forcedOwner=personalTaskOwnerId();
  let owner=allAccess?(state.ui.taskOwner||'all'):forcedOwner;
  let list=taskScopeList(monthKey);
  if(allAccess&&owner!=='all')list=list.filter(t=>t.ownerId===owner);
  const people=activeTaskPeople(),stats=taskStats(list);
  const ownerControl=allAccess?`<select class="select" style="width:auto" data-filter="taskOwner"><option value="all">Все ответственные</option>${people.map(p=>`<option value="${p.id}" ${owner===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`:`<span class="task-scope-owner">${esc(person(forcedOwner).name)} · только мои</span>`;
  const addButton=allAccess?'<button class="btn btn-primary" data-action="addTask">+ Задача</button>':`<button class="btn btn-primary" data-action="addTask" data-owner="${esc(forcedOwner)}">+ Задача себе</button>`;
  return`<div class="page">${pageHead('ИСПОЛНЕНИЕ','Задачи',`${mode==='all'?'Все месяцы':currentMonth().label}: ${allAccess?'команда':'личный кабинет'}`,addButton)}<div class="task-access-note"><i></i><div><b>${esc(allAccess?'Расширенный доступ к задачам':'Персональный доступ')}</b><small>${esc(taskAccessDescription())}</small></div></div><div class="toolbar"><div class="filters"><select class="select" style="width:auto" data-filter="taskMonthMode"><option value="selected" ${mode==='selected'?'selected':''}>${esc(currentMonth().label)}</option><option value="all" ${mode==='all'?'selected':''}>Все месяцы</option></select>${ownerControl}</div><div style="display:flex;gap:8px;align-items:center"><span class="pill">Всего: ${stats.total}</span><span class="pill ${stats.over?'red':''}">Просрочено: ${stats.over}</span></div></div><div class="kanban">${TASK_COLUMNS.map(([status,label])=>{const items=list.filter(t=>t.status===status);return`<section class="kanban-col"><div class="kanban-head"><b>${esc(label)}</b><span>${items.length}</span></div>${items.map(t=>`<article class="task-card" data-action="editTask" data-id="${t.id}"><div class="task-top"><h4>${esc(t.title)}</h4><div class="task-actions-inline"><i class="priority-mark ${t.priority}"></i>${canDeleteTask()?`<button class="task-delete" data-action="deleteTask" data-id="${t.id}" title="Удалить задачу">${ICONS.trash}</button>`:''}</div></div>${t.description?`<p>${esc(t.description)}</p>`:''}<div class="task-footer"><span>${esc(person(t.ownerId).name)}${t.createdBy?` · поставил ${esc(t.createdBy==='manager'?'Софа':t.createdBy==='owner'?'Роман':person(t.createdBy).name||t.createdBy)}`:''}</span><span class="${isOverdue(t)?'pill red':''}">${formatDateShort(t.deadline)}</span></div></article>`).join('')||'<div class="empty">Пусто</div>'}</section>`}).join('')}</div></div>`;
};

const __taskModalTeamAccessBase=taskModal;
taskModal=function(item=null,owner=''){
  const forcedOwner=!canSeeAllTasks()?personalTaskOwnerId():owner;
  __taskModalTeamAccessBase(item,forcedOwner);
  if(canSeeAllTasks())return;
  const form=$('#taskForm');if(!form)return;
  const select=form.querySelector('[name="ownerId"]');if(!select)return;
  const field=select.closest('.field');if(!field)return;
  const ownerId=personalTaskOwnerId(),p=person(ownerId);
  field.innerHTML=`<label>Ответственный</label><div class="task-fixed-owner"><span class="avatar small">${esc(p.avatar||String(p.name||'?')[0])}</span><b>${esc(p.name)}</b></div><input type="hidden" name="ownerId" value="${esc(ownerId)}">`;
};

function adminPersonModal(item=null){
  const p=item||{id:'',name:'',title:'Администратор',area:'Продажи и сервис',avatar:'А'};
  openModal({title:item?'Редактировать администратора':'Добавить администратора',subtitle:'После сохранения появится отдельный личный кабинет и персональная ссылка',body:`<form id="adminPersonForm" data-id="${esc(p.id||'')}" class="form-grid"><div class="field span-2"><label>Имя</label><input class="input" name="name" value="${esc(p.name||'')}" required></div><div class="field"><label>Должность</label><input class="input" name="title" value="${esc(p.title||'Администратор')}"></div><div class="field"><label>Направление</label><input class="input" name="area" value="${esc(p.area||'Продажи и сервис')}"></div><div class="field"><label>Буква на аватаре</label><input class="input" name="avatar" maxlength="3" value="${esc(p.avatar||'')}"></div>${formActions(item?'Сохранить':'Добавить администратора')}</form>`});
}

const __handleSubmitTeamAccessBase=handleSubmit;
handleSubmit=function(e){
  const f=e.target;
  if(f instanceof HTMLFormElement&&f.id==='adminPersonForm'){
    e.preventDefault();if(currentRole!=='owner')return;
    const v=formValues(f),stamp=nowIso(),old=state.people.find(x=>x.id===f.dataset.id);
    const item={...(old||{}),id:old?.id||`admin_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,name:v.name,role:'admin',title:v.title||'Администратор',area:v.area||'Продажи и сервис',avatar:(v.avatar||v.name||'А').trim().slice(0,3),active:true,archivedAt:null,updatedAt:stamp,createdAt:old?.createdAt||stamp};
    upsert(state.people,item);state.ui.selectedAdmin=item.id;closeModal();touch(`Администратор: ${item.name}`);setView('staff');return;
  }
  if(f instanceof HTMLFormElement&&f.id==='taskForm'&&!canSeeAllTasks()){
    const owner=f.querySelector('[name="ownerId"]');if(owner)owner.value=personalTaskOwnerId();
  }
  return __handleSubmitTeamAccessBase(e);
};

const __handleClickTeamAccessBase=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');
  if(el){
    const a=el.dataset.action;
    if(a==='addTask'&&!canSeeAllTasks()){
      const ownerId=personalTaskOwnerId();if(!ownerId){toast('Нет доступа к созданию задач','','error');return}taskModal(null,ownerId);return;
    }
    if((a==='editTask'||a==='deleteTask')&&!canSeeAllTasks()){
      const task=state.tasks.find(t=>t.id===el.dataset.id);if(!taskVisibleToCurrentUser(task)){toast('Эта задача недоступна','В личном кабинете видны только собственные задачи.','error');return}
    }
    if(a==='addAdmin'){if(currentRole==='owner')adminPersonModal();return}
    if(a==='editAdminPerson'){if(currentRole==='owner')adminPersonModal(state.people.find(p=>p.id===el.dataset.id));return}
    if(a==='editMentorPerson'){if(currentRole==='owner')mentorPersonModal(state.people.find(p=>p.id===el.dataset.id));return}
    if(a==='archiveAdmin'){
      if(currentRole!=='owner')return;const p=state.people.find(x=>x.id===el.dataset.id);if(p&&confirm(`Удалить администратора «${p.name}»? История и начисления сохранятся.`)){p.active=false;p.archivedAt=nowIso();p.updatedAt=nowIso();touch(`Администратор удалён: ${p.name}`);setView('staff')}return;
    }
    if(a==='restoreAdmin'){
      if(currentRole!=='owner')return;const p=state.people.find(x=>x.id===el.dataset.id);if(p){p.active=true;p.archivedAt=null;p.updatedAt=nowIso();touch(`Администратор восстановлен: ${p.name}`);setView('staff')}return;
    }
  }
  return __handleClickTeamAccessBase(e);
};

const __navBadgeTeamAccessBase=navBadge;
navBadge=function(view){
  if(view==='tasks'){
    const mode=state?.ui?.taskMonthMode||'selected',key=mode==='all'?'all':state.settings.currentMonth;
    return taskStats(taskScopeList(key)).open||'';
  }
  return __navBadgeTeamAccessBase(view);
};

const __renderTeamTeamAccessBase=renderTeam;
renderTeam=function(){
  const m=currentMonth(),events=activeEvents().filter(e=>e.date>=today()).sort(sortByDate),goals=goalsDerived(activeGoals().filter(g=>g.status==='active')).sort((a,b)=>b.progress-a.progress);
  const scoped=taskScopeList(state.settings.currentMonth),done=scoped.filter(t=>statusDone(t.status));
  const canShowTasks=canSeeAllTasks()||Boolean(personalTaskOwnerId());
  return`<div class="page">${pageHead('ОБЩИЙ ЭКРАН','Команда EXTREME KIDS','Общие цели и события без раскрытия чужих персональных задач')}<section class="card hero"><div class="hero-top"><div><div class="eyebrow">ФОКУС МЕСЯЦА</div><h3 class="hero-title">${esc(m.focus)}</h3><div class="hero-sub">Каждый сотрудник видит только тот уровень задач, который разрешён его кабинету.</div></div><div class="hero-value" style="font-size:38px">${pct(avg(goals.map(g=>g.progress)))}</div></div></section><div class="grid-3"><section class="card pad"><div class="card-head"><div><h3>Цели команды</h3><p>Автоматический прогресс</p></div></div><div class="compact-list">${goals.slice(0,5).map(g=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(g.title)}</b><small>${pct(g.progress)} · ответственный ${esc(person(g.ownerId).name)}</small><div class="progress"><i style="width:${clamp(g.progress,0,100)}%"></i></div></div></div>`).join('')}</div></section><section class="card pad"><div class="card-head"><div><h3>Ближайшие события</h3><p>Где нужна команда</p></div></div><div class="event-list">${events.slice(0,6).map(e=>`<div class="event-item"><i class="item-dot"></i><div class="item-main"><b>${esc(e.title)}</b><small>${formatDate(e.date)} · ${esc(e.venue||'')}</small></div></div>`).join('')||'<div class="empty">Событий нет</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>${canSeeAllTasks()?'Выполненные задачи команды':canShowTasks?'Мои выполненные задачи':'Командный результат'}</h3><p>${canSeeAllTasks()?'Доступ разрешён руководящей роли':canShowTasks?'Чужие задачи скрыты':'Персональные задачи здесь не отображаются'}</p></div></div>${canShowTasks?`<div class="compact-list">${done.slice(0,6).map(t=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)}</small></div></div>`).join('')||'<div class="empty">Пока нет закрытых задач</div>'}</div>`:'<div class="empty"><b>Задачи сотрудников защищены</b>На общем экране остаются цели и события.</div>'}</section></div></div>`;
};

const __renderAdminTeamAccessBase=renderAdmin;
renderAdmin=function(){
  const base=__renderAdminTeamAccessBase(),adminId=adminViewerId(),tasks=tasksForMonth(state.settings.currentMonth).filter(t=>t.ownerId===adminId&&!statusDone(t.status)).sort(sortByDate),p=person(adminId);
  const extra=`<section class="card pad admin-focus-card"><div class="card-head"><div><h3>Фокус личного кабинета</h3><p>Только задачи ${esc(p.name)} — без задач других сотрудников</p></div>${currentRole==='admin'?'<span class="admin-personal-badge">Личный кабинет</span>':''}</div><div class="admin-focus-list">${tasks.slice(0,5).map(t=>`<div class="admin-focus-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${formatDateShort(t.deadline)} · ${esc(statusLabel(t.status))}</small></div></div>`).join('')||'<div class="empty"><b>Открытых задач нет</b>Можно сосредоточиться на смене, продажах и сервисе.</div>'}</div></section>`;
  return appendBeforePageClose(base,extra);
};

const __renderMentorTeamAccessBase=renderMentor;
renderMentor=function(){
  const html=__renderMentorTeamAccessBase(),mentorId=mentorViewerId();
  if(mentorId!=='ivan')return html;
  const extra=`<section class="card pad"><div class="card-head"><div><h3>Старший наставник</h3><p>Ване открыт раздел задач всей команды, при этом личный блок наставника остаётся только про его собственные группы и задачи.</p></div><button class="btn btn-primary" data-view="tasks">Открыть все задачи</button></div></section>`;
  return appendBeforePageClose(html,extra);
};

const __renderCurrentViewTeamAccessBase=renderCurrentView;
renderCurrentView=function(){
  if(currentView==='staff'){
    if(!allowedView('staff'))currentView=roleInfo().start;
    else{$('#pageTitle').textContent='Команда и кабинеты';$('#pages').innerHTML=renderStaffManagement();renderNav();animateNumbers();return}
  }
  return __renderCurrentViewTeamAccessBase();
};

const __bootTeamAccessBase=boot;
boot=async function(){
  const result=await __bootTeamAccessBase();
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,teamAccessBuild:TEAM_ACCESS_BUILD,canSeeAllTasks:()=>canSeeAllTasks(),visibleTasks:key=>taskScopeList(key||state.settings.currentMonth)};
  return result;
};
// TEAM_CABINETS_ACCESS_V1_END
