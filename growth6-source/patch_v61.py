from __future__ import annotations

import base64
import gzip
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "current.html"
OUTPUT = ROOT / "v6.1.html"
PARTS = Path("growth61-production-src")

text = SOURCE.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one exact match, found {count}")
    text = text.replace(old, new, 1)


def sub_once(pattern: str, replacement: str, label: str, flags: int = re.S) -> None:
    global text
    text2, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    text = text2


# Version and build.
replace_once("const VERSION='6.0.3';", "const VERSION='6.1.0';", "version")
replace_once("const BUILD='2026.08.30-black-yellow-final';", "const BUILD='2026.08.31-manager-month-sync';", "build")

# Role-aware navigation.
nav_replacements = {
    "{id:'year',label:'Учебный год',icon:'year',roles:['owner','stas']}": "{id:'year',label:'Учебный год',icon:'year',roles:['owner','manager','stas']}",
    "{id:'groups',label:'Группы и загрузка',icon:'groups',roles:['owner','stas','mentor']}": "{id:'groups',label:'Группы и загрузка',icon:'groups',roles:['owner','manager','stas','mentor']}",
    "{id:'goals',label:'План развития',icon:'goals',roles:['owner','stas']}": "{id:'goals',label:'План развития',icon:'goals',roles:['owner','manager','stas']}",
    "{id:'tasks',label:'Задачи',icon:'tasks',roles:['owner','stas','mentor','admin']}": "{id:'tasks',label:'Задачи',icon:'tasks',roles:['owner','manager','stas','mentor','admin']}",
    "{id:'calendar',label:'Календарь',icon:'calendar',roles:['owner','stas','mentor','admin','team']}": "{id:'calendar',label:'Календарь',icon:'calendar',roles:['owner','manager','stas','mentor','admin','team']}",
    "{id:'analytics',label:'Аналитика и прогноз',icon:'analytics',roles:['owner','stas']}": "{id:'analytics',label:'Аналитика и прогноз',icon:'analytics',roles:['owner','manager','stas']}",
    "{id:'archive',label:'Архив',icon:'archive',roles:['owner']}": "{id:'archive',label:'Архив',icon:'archive',roles:['owner','manager']}",
    "{id:'stas',label:'Стас · роллер-школа',icon:'stas',roles:['owner','stas']}": "{id:'stas',label:'Стас · роллер-школа',icon:'stas',roles:['owner','manager','stas']}",
    "{id:'mentor',label:'Наставник',icon:'mentor',roles:['owner','stas','mentor']}": "{id:'mentor',label:'Наставник',icon:'mentor',roles:['owner','manager','stas','mentor']}",
    "{id:'admin',label:'Администратор',icon:'admin',roles:['owner','admin']}": "{id:'admin',label:'Администратор',icon:'admin',roles:['owner','manager','admin']}",
    "{id:'team',label:'Командный экран',icon:'team',roles:['owner','stas','mentor','admin','team']}": "{id:'team',label:'Командный экран',icon:'team',roles:['owner','manager','stas','mentor','admin','team']}",
}
for old, new in nav_replacements.items():
    replace_once(old, new, f"nav {old[:30]}")
replace_once(
    " {section:'Кабинеты',items:[\n  {id:'stas',label:'Стас · роллер-школа',icon:'stas',roles:['owner','manager','stas']},",
    " {section:'Кабинеты',items:[\n  {id:'manager',label:'Софа · управляющая',icon:'admin',roles:['owner','manager']},\n  {id:'stas',label:'Стас · роллер-школа',icon:'stas',roles:['owner','manager','stas']},",
    "manager nav item",
)

replace_once(
    "const ROLES={\n owner:{name:'Роман',title:'Владелец клуба',avatar:'Р',start:'dashboard'},",
    "const ROLES={\n owner:{name:'Роман',title:'Владелец клуба',avatar:'Р',start:'dashboard'},\n manager:{name:'Софа',title:'Операционная управляющая',avatar:'С',start:'manager'},",
    "manager role",
)
replace_once(
    " {id:'roman',name:'Роман',role:'owner',title:'Владелец клуба',area:'Управление и развитие',avatar:'Р'},",
    " {id:'roman',name:'Роман',role:'owner',title:'Владелец клуба',area:'Управление и развитие',avatar:'Р'},\n {id:'sofia',name:'Софа',role:'manager',title:'Операционная управляющая',area:'Клуб / администраторы / сервис / продажи',avatar:'С'},",
    "Sofia person",
)

# Add monthly sales storage and month-scoped UI.
replace_once(
    "  sales:{trialsPlanned:0,trialsVisited:0,purchases:0,renewalsDue:0,renewalsContacted:0,renewalsPaid:0,adminPlans:{anya:0,adel:0},adminFacts:{anya:0,adel:0},updatedAt:stamp},\n  archive:[],",
    "  sales:{trialsPlanned:0,trialsVisited:0,purchases:0,renewalsDue:0,renewalsContacted:0,renewalsPaid:0,adminPlans:{anya:0,adel:0},adminFacts:{anya:0,adel:0},updatedAt:stamp},\n  salesByMonth:{},\n  archive:[],",
    "salesByMonth seed",
)
replace_once(
    "  ui:{selectedMentor:'stas',groupSearch:'',groupMentor:'all',groupDiscipline:'all',taskOwner:'all',eventType:'all'}",
    "  ui:{selectedMentor:'stas',groupSearch:'',groupMentor:'all',groupDiscipline:'all',taskOwner:'all',taskMonthMode:'selected',eventType:'all'}",
    "task month UI seed",
)
replace_once(
    "settings:{clubName:'EXTREME KIDS Тропарёво',currentMonth:'2026-09',minimumRevenue:2500000,normalRevenue:3000000,strongRevenue:3500000,stretchRevenue:4200000,defaultMonthlyRevenuePerChild:0,autoSync:true,syncInterval:25000}",
    "settings:{clubName:'EXTREME KIDS Тропарёво',currentMonth:'2026-09',minimumRevenue:2500000,normalRevenue:3000000,strongRevenue:3500000,stretchRevenue:4200000,defaultMonthlyRevenuePerChild:0,autoSync:true,syncInterval:25000,managerSite:'https://extreme-kids-troparevo-control.vercel.app/'}",
    "manager site setting",
)

# Shared derived helpers. These are recalculated from the source data after every render/sync.
helper_anchor = "function activeGoals(){return state.goals.filter(x=>!x.deletedAt)}\n"
helpers = r'''
function monthKeyFromDate(value){const s=String(value||'');return /^\d{4}-\d{2}/.test(s)?s.slice(0,7):''}
function taskMonthKey(task){return task?.monthKey||monthKeyFromDate(task?.deadline)||((task?.linkType==='month'&&/^\d{4}-\d{2}$/.test(task?.linkId||''))?task.linkId:'')||monthKeyFromDate(task?.createdAt)||state?.settings?.currentMonth||'2026-09'}
function tasksForMonth(key=state.settings.currentMonth){const list=activeTasks();return key==='all'?list:list.filter(t=>taskMonthKey(t)===key)}
function currentMonthTasks(){return tasksForMonth(state.settings.currentMonth)}
function canDeleteTask(){return currentRole==='owner'||currentRole==='manager'}
function emptySales(){return{trialsPlanned:0,trialsVisited:0,purchases:0,renewalsDue:0,renewalsContacted:0,renewalsPaid:0,adminPlans:{anya:0,adel:0},adminFacts:{anya:0,adel:0},updatedAt:nowIso()}}
function salesForMonth(key=state.settings.currentMonth){state.salesByMonth=state.salesByMonth||{};if(!state.salesByMonth[key])state.salesByMonth[key]={...emptySales()};const s=state.salesByMonth[key];s.adminPlans={anya:0,adel:0,...(s.adminPlans||{})};s.adminFacts={anya:0,adel:0,...(s.adminFacts||{})};return s}
function currentSales(){return salesForMonth(state.settings.currentMonth)}
function goalDerived(goal){
 const g={...goal},metric=String(g.metric||g.title||'').toLowerCase(),m=currentMonth(),s=currentSales(),ls=loadStats(),events=activeEvents().filter(e=>String(e.date||'').startsWith(m.key)&&e.status!=='cancelled');let current=Number(g.current)||0,target=Number(g.target)||0,progress=Number(g.progress)||0,source='manual';
 if(/выруч/.test(metric)){current=monthFact(m);target=target||m.minimum||state.settings.minimumRevenue;progress=target?current/target*100:0;source='revenue'}
 else if(/загруз/.test(metric)){current=ls.load;target=target||85;progress=target?current/target*100:0;source='groups'}
 else if(/продлен/.test(metric)){current=s.renewalsDue?s.renewalsPaid/s.renewalsDue*100:0;target=target>20?target:85;progress=target?current/target*100:0;source='sales'}
 else if(/активност|мероприят/.test(metric)){current=events.filter(e=>e.status==='completed').length;target=target||2;progress=target?current/target*100:0;source='events'}
 return{...g,current,target,progress:clamp(progress,0,100),derivedSource:source}
}
function goalsDerived(list=activeGoals()){return list.map(goalDerived)}
function mentorSnapshot(mentorId){const groups=activeGroups().filter(g=>g.mentorId===mentorId),load=loadStats(groups),tasks=currentMonthTasks().filter(t=>t.ownerId===mentorId),stats=taskStats(tasks),recommendations=state.recommendations.filter(r=>!r.deletedAt&&r.mentorId===mentorId);return{mentorId,person:person(mentorId),groups,load,tasks,taskStats:stats,recommendations}}
function allMentorSnapshots(){return state.people.filter(p=>p.role==='mentor'||p.id==='stas').map(p=>mentorSnapshot(p.id))}
function derivedSnapshot(){const groups=loadStats(),tasks=taskStats(currentMonthTasks()),sales=currentSales(),conversion=sales.trialsVisited?sales.purchases/sales.trialsVisited*100:0,renewals=sales.renewalsDue?sales.renewalsPaid/sales.renewalsDue*100:0;return{monthKey:state.settings.currentMonth,groups,tasks,sales,conversion,renewals,goals:goalsDerived(),mentors:allMentorSnapshots(),updatedAt:nowIso()}}
'''.strip("\n") + "\n"
replace_once(helper_anchor, helper_anchor + helpers, "derived helpers")

# Task stats must follow the selected month by default.
replace_once(
    "function taskStats(list=activeTasks()){",
    "function taskStats(list=currentMonthTasks()){",
    "monthly task stats",
)

# Migration and normalized monthly state.
ensure_state = r'''function ensureState(raw){
 const base=seedState();
 if(!raw||typeof raw!=='object')return base;
 let src=raw;
 if(raw.growthOS)src={...raw.growthOS,tasks:raw.tasks||raw.growthOS.tasks,groups:raw.groups||raw.growthOS.groups,events:raw.events||raw.growthOS.events};
 const out={...base,...src};
 out.meta={...base.meta,...(src.meta||{}),build:BUILD};
 out.settings={...base.settings,...(src.settings||{})};
 const peopleMap=new Map(base.people.map(p=>[p.id,p]));for(const p of Array.isArray(src.people)?src.people:[])peopleMap.set(p.id,{...(peopleMap.get(p.id)||{}),...p});out.people=[...peopleMap.values()];
 out.months={...base.months,...(src.months||{})};
 out.groups=Array.isArray(src.groups)?src.groups:base.groups;
 out.tasks=(Array.isArray(src.tasks)?src.tasks:base.tasks).map(t=>({...t,monthKey:t.monthKey||monthKeyFromDate(t.deadline)||((t.linkType==='month'&&/^\d{4}-\d{2}$/.test(t.linkId||''))?t.linkId:'')||out.settings.currentMonth,createdBy:t.createdBy||'legacy'}));
 out.goals=Array.isArray(src.goals)?src.goals:base.goals;
 out.events=Array.isArray(src.events)?src.events:base.events;
 out.recommendations=Array.isArray(src.recommendations)?src.recommendations:[];
 out.archive=Array.isArray(src.archive)?src.archive:[];
 out.activity=Array.isArray(src.activity)?src.activity:[];
 out.sales={...base.sales,...(src.sales||{})};
 out.salesByMonth={...(src.salesByMonth||{})};
 if(!Object.keys(out.salesByMonth).length&&src.sales)out.salesByMonth[out.settings.currentMonth]={...base.sales,...src.sales,updatedAt:src.sales.updatedAt||out.meta.updatedAt||nowIso()};
 out.ui={...base.ui,...(src.ui||{}),taskMonthMode:src.ui?.taskMonthMode||'selected'};
 out.version=6;
 return out;
}'''
sub_once(r"function ensureState\(raw\)\{.*?\n\}\nfunction loadLocal", ensure_state + "\nfunction loadLocal", "ensureState")

merge_state = r'''function mergeStates(local,remote){
 if(!remote)return local;if(!local)return remote;
 const base=newer(local,remote)===local?clone(local):clone(remote);
 base.groups=mergeLists(local.groups,remote.groups);base.tasks=mergeLists(local.tasks,remote.tasks);base.goals=mergeLists(local.goals,remote.goals);base.events=mergeLists(local.events,remote.events);base.recommendations=mergeLists(local.recommendations,remote.recommendations);base.archive=mergeLists(local.archive,remote.archive);base.people=mergeLists(local.people,remote.people);
 base.months={...local.months,...remote.months};for(const k of new Set([...Object.keys(local.months||{}),...Object.keys(remote.months||{})]))base.months[k]=newer(local.months?.[k],remote.months?.[k]);
 base.salesByMonth={};for(const k of new Set([...Object.keys(local.salesByMonth||{}),...Object.keys(remote.salesByMonth||{})]))base.salesByMonth[k]=newer(local.salesByMonth?.[k],remote.salesByMonth?.[k]);
 base.sales=newer(local.sales,remote.sales);base.settings={...local.settings,...remote.settings,...(newer(local,remote)===local?local.settings:remote.settings)};base.ui={...(local.ui||{})};
 base.activity=[...(local.activity||[]),...(remote.activity||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at))).filter((x,i,a)=>i===a.findIndex(y=>y.id===x.id)).slice(0,120);
 base.meta={...base.meta,updatedAt:[local.meta?.updatedAt,remote.meta?.updatedAt].sort().pop(),revision:Math.max(Number(local.meta?.revision)||0,Number(remote.meta?.revision)||0),build:BUILD};base.version=6;return ensureState(base);
}'''
sub_once(r"function mergeStates\(local,remote\)\{.*?\n\}\nasync function fetchRemote", merge_state + "\nasync function fetchRemote", "mergeStates")

# Render map and current-month dashboard priorities.
replace_once(
    "const renderers={dashboard:renderDashboard,year:renderYear,groups:renderGroups,goals:renderGoals,tasks:renderTasks,calendar:renderCalendar,analytics:renderAnalytics,archive:renderArchive,stas:renderStas,mentor:renderMentor,admin:renderAdmin,team:renderTeam,settings:renderSettings};",
    "const renderers={dashboard:renderDashboard,year:renderYear,groups:renderGroups,goals:renderGoals,tasks:renderTasks,calendar:renderCalendar,analytics:renderAnalytics,archive:renderArchive,manager:renderManager,stas:renderStas,mentor:renderMentor,admin:renderAdmin,team:renderTeam,settings:renderSettings};",
    "renderer map",
)
replace_once(
    "const priorities=activeTasks().filter(x=>!statusDone(x.status))",
    "const priorities=currentMonthTasks().filter(x=>!statusDone(x.status))",
    "dashboard monthly priorities",
)

# Automatically derived goals.
render_goals = r'''function renderGoals(){const list=goalsDerived(),avgProgress=avg(list.map(x=>x.progress));return`<div class="page">${pageHead('ЦЕЛИ И ДЕДЛАЙНЫ','План развития','Загрузка, выручка, продления и мероприятия пересчитываются автоматически из общей базы',`<button class="btn btn-primary" data-action="addGoal">+ Цель</button>`)}<div class="grid-4">${metricCard('Целей в работе',String(list.filter(x=>x.status==='active').length),'Учебный год 2026/27','goals')}${metricCard('Среднее выполнение',pct(avgProgress),`${list.filter(x=>x.progress>=100).length} закрыто`,'analytics',avgProgress)}${metricCard('Высокий приоритет',String(list.filter(x=>x.priority==='high'&&!statusDone(x.status)).length),'Контроль Романа и Софы','tasks')}${metricCard('Авторасчёт',String(list.filter(x=>x.derivedSource!=='manual').length),'Целей связаны с живыми данными','analytics')}</div><section class="card pad"><div class="card-head"><div><h3>Дорожная карта</h3><p>Факт подтягивается из денег, групп, продаж, задач и мероприятий</p></div></div><div class="goal-list">${list.map(g=>`<div class="goal-row"><div class="goal-title"><b>${esc(g.title)}</b><small>${esc(g.category)} · ${esc(g.metric||'Показатель не задан')}${g.derivedSource!=='manual'?' · авто':''}</small></div><div class="goal-progress"><b>${pct(g.progress)}</b><div class="progress"><i style="width:${clamp(g.progress,0,100)}%"></i></div><small>${g.target?`${Math.round(g.current)} / ${Math.round(g.target)}`:'ручной показатель'}</small></div><div class="goal-owner">${esc(person(g.ownerId).name)}</div><div class="goal-deadline">до ${formatDateShort(g.deadline)}</div><div class="table-actions"><button data-action="editGoal" data-id="${g.id}">${ICONS.edit}</button><button data-action="deleteGoal" data-id="${g.id}">${ICONS.trash}</button></div></div>`).join('')||'<div class="empty"><b>Целей пока нет</b>Добавьте первую цель учебного года.</div>'}</div></section></div>`}'''
sub_once(r"function renderGoals\(\)\{.*?\}\n\nconst TASK_COLUMNS", render_goals + "\n\nconst TASK_COLUMNS", "renderGoals")

# Month-scoped task board and protected delete action.
render_tasks = r'''function renderTasks(){
 const owner=state.ui.taskOwner||'all',mode=state.ui.taskMonthMode||'selected',monthKey=mode==='all'?'all':state.settings.currentMonth;
 const list=tasksForMonth(monthKey).filter(t=>owner==='all'||t.ownerId===owner),people=state.people.filter(p=>['owner','manager','stas','mentor','admin'].includes(p.role)),stats=taskStats(list);
 return`<div class="page">${pageHead('ИСПОЛНЕНИЕ','Задачи',`${mode==='all'?'Все месяцы':currentMonth().label}: ответственный, дедлайн, приоритет и связь со стратегией`, `<button class="btn btn-primary" data-action="addTask">+ Задача</button>`)}
 <div class="toolbar"><div class="filters"><select class="select" style="width:auto" data-filter="taskMonthMode"><option value="selected" ${mode==='selected'?'selected':''}>${esc(currentMonth().label)}</option><option value="all" ${mode==='all'?'selected':''}>Все месяцы</option></select><select class="select" style="width:auto" data-filter="taskOwner"><option value="all">Все ответственные</option>${people.map(p=>`<option value="${p.id}" ${owner===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div style="display:flex;gap:8px;align-items:center"><span class="pill">Всего: ${stats.total}</span><span class="pill ${stats.over?'red':''}">Просрочено: ${stats.over}</span></div></div>
 <div class="kanban">${TASK_COLUMNS.map(([status,label])=>{const items=list.filter(t=>t.status===status);return`<section class="kanban-col"><div class="kanban-head"><b>${esc(label)}</b><span>${items.length}</span></div>${items.map(t=>`<article class="task-card" data-action="editTask" data-id="${t.id}"><div class="task-top"><h4>${esc(t.title)}</h4><div class="task-actions-inline"><i class="priority-mark ${t.priority}"></i>${canDeleteTask()?`<button class="task-delete" data-action="deleteTask" data-id="${t.id}" title="Удалить задачу">${ICONS.trash}</button>`:''}</div></div>${t.description?`<p>${esc(t.description)}</p>`:''}<div class="task-footer"><span>${esc(person(t.ownerId).name)}${t.createdBy?` · поставил ${esc(t.createdBy==='manager'?'Софа':t.createdBy==='owner'?'Роман':person(t.createdBy).name||t.createdBy)}`:''}</span><span class="${isOverdue(t)?'pill red':''}">${formatDateShort(t.deadline)}</span></div></article>`).join('')||'<div class="empty">Пусто</div>'}</section>`}).join('')}</div></div>`
}'''
sub_once(r"function renderTasks\(\)\{.*?\}\n\nfunction calendarData", render_tasks + "\n\nfunction calendarData", "renderTasks")

# Manager dashboard and role dashboards based on the same shared state.
manager_renderer = r'''function renderManager(){
 const m=currentMonth(),d=derivedSnapshot(),s=d.sales,ls=d.groups,ts=d.tasks,recs=state.recommendations.filter(r=>!r.deletedAt&&r.status!=='done'),adminTasks=currentMonthTasks().filter(t=>['anya','adel'].includes(t.ownerId)&&!statusDone(t.status)),mentors=d.mentors,conversion=d.conversion,renew=d.renewals,score=avg([Math.min(100,ls.load),ts.progress,conversion,renew]);
 const signals=[];if(ts.over)signals.push(`${ts.over} просроченных задач`);if(ls.load<75)signals.push(`загрузка ${pct(ls.load)} — свободно ${ls.free} мест`);if(recs.length)signals.push(`${recs.length} рекомендаций наставников ждут обработки`);if(s.renewalsDue>s.renewalsContacted)signals.push(`${s.renewalsDue-s.renewalsContacted} продлений без контакта`);
 return`<div class="page">${pageHead('ОПЕРАЦИОННОЕ УПРАВЛЕНИЕ','Софа · управляющая',`${m.label}: администраторы, наставники, задачи, продажи и качество клуба`, `<a class="btn btn-ghost" href="${esc(state.settings.managerSite||'https://extreme-kids-troparevo-control.vercel.app/')}" target="_blank" rel="noopener">Рабочий сайт Софы</a><button class="btn btn-primary" data-action="addTask" data-owner="anya">+ Задача админу</button>`)}
 <div class="role-hero"><section class="card pad"><div class="role-score"><div class="score-ring" style="--p:${clamp(score,0,100)}"><b>${pct(score)}</b></div><div class="score-copy"><div class="eyebrow">ОПЕРАЦИОННЫЙ ИНДЕКС</div><h3>${ls.students} детей · ${ls.free} свободных мест</h3><p>Индекс собирается автоматически из загрузки, задач, пробных и продлений.</p></div></div></section><section class="card pad"><div class="card-head"><div><h3>Что требует внимания</h3><p>Сигналы из общей базы клуба</p></div></div><div class="compact-list">${signals.length?signals.map(x=>`<div class="compact-item"><i class="item-dot red"></i><div class="item-main"><b>${esc(x)}</b><small>Обновляется после каждого изменения</small></div></div>`).join(''):'<div class="empty"><b>Критичных сигналов нет</b>Продолжайте контроль по плану.</div>'}</div></section></div>
 <div class="grid-4">${metricCard('Загрузка клуба',pct(ls.load),`${ls.students}/${ls.capacity} · свободно ${ls.free}`,'users',ls.load)}${metricCard('Задачи месяца',pct(ts.progress),`${ts.done}/${ts.total} выполнено · ${ts.over} просрочено`,'tasks',ts.progress)}${metricCard('Пробная → покупка',pct(conversion),`${s.purchases||0} покупок`,'revenue',conversion)}${metricCard('Продления',pct(renew),`${s.renewalsPaid||0}/${s.renewalsDue||0} оплачено`,'analytics',renew)}</div>
 <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Задачи администраторов</h3><p>Софа ставит, контролирует и при необходимости удаляет задачи</p></div><div style="display:flex;gap:8px"><button class="btn btn-small btn-ghost" data-action="addTask" data-owner="anya">+ Ане</button><button class="btn btn-small btn-ghost" data-action="addTask" data-owner="adel">+ Адель</button></div></div><div class="compact-list">${adminTasks.sort(sortByDate).slice(0,8).map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)} · до ${formatDateShort(t.deadline)}</small></div>${canDeleteTask()?`<button class="task-delete" data-action="deleteTask" data-id="${t.id}">${ICONS.trash}</button>`:''}</div>`).join('')||'<div class="empty">У администраторов нет открытых задач этого месяца</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Рекомендации наставников</h3><p>Должны превратиться в персональное предложение родителю</p></div></div><div class="compact-list">${recs.slice(0,8).map(r=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(r.childName)}</b><small>${esc(person(r.mentorId).name)} · ${esc(r.recommendation)}</small></div><span class="pill">${esc(statusLabel(r.status))}</span></div>`).join('')||'<div class="empty">Новых рекомендаций нет</div>'}</div></section></div>
 <section class="card pad"><div class="card-head"><div><h3>Наставники и направления</h3><p>Группы, дети, свободные места и исполнение задач подтягиваются автоматически</p></div><button class="btn btn-small btn-ghost" data-view="mentor">Открыть наставника</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Наставник</th><th>Направление</th><th>Групп</th><th>Детей</th><th>Загрузка</th><th>Свободно</th><th>Задачи</th></tr></thead><tbody>${mentors.map(x=>`<tr><td><b>${esc(x.person.name)}</b></td><td>${esc(x.person.area||'')}</td><td>${x.groups.length}</td><td>${x.load.students}</td><td>${loadPill(x.load.load)}</td><td>${x.load.free}</td><td>${x.taskStats.done}/${x.taskStats.total}</td></tr>`).join('')}</tbody></table></div></section></div>`
}'''
replace_once("function renderStas(){", manager_renderer + "\n\nfunction renderStas(){", "manager renderer")

# Existing role pages must use current-month task/sales data.
replace_once("function roleTasks(ids){return activeTasks().filter(t=>ids.includes(t.ownerId)&&!statusDone(t.status))}", "function roleTasks(ids){return currentMonthTasks().filter(t=>ids.includes(t.ownerId)&&!statusDone(t.status))}", "role tasks month")
replace_once("tasks=activeTasks().filter(t=>t.ownerId===mentorId&&!statusDone(t.status))", "tasks=currentMonthTasks().filter(t=>t.ownerId===mentorId&&!statusDone(t.status))", "mentor tasks month")

render_admin = r'''function renderAdmin(){const s=currentSales(),conversion=s.trialsVisited?s.purchases/s.trialsVisited*100:0,renew=s.renewalsDue?s.renewalsPaid/s.renewalsDue*100:0,tasks=currentMonthTasks().filter(t=>['anya','adel'].includes(t.ownerId)&&!statusDone(t.status)),recs=state.recommendations.filter(r=>!r.deletedAt&&r.status!=='done');return`<div class="page">${pageHead('ПРОДАЖИ И СЕРВИС','Администратор',`${currentMonth().label}: лиды, пробные, продления и рекомендации наставников`, `<button class="btn btn-ghost" data-action="editSales">Внести показатели</button><button class="btn btn-primary" data-action="addTask">+ Задача</button>`)}<div class="grid-4">${metricCard('Пробные назначено',String(s.trialsPlanned||0),`пришло ${s.trialsVisited||0}`,'calendar',s.trialsPlanned?s.trialsVisited/s.trialsPlanned*100:null)}${metricCard('Пробная → покупка',pct(conversion),`${s.purchases||0} покупок`,'revenue',conversion)}${metricCard('Продления',pct(renew),`${s.renewalsPaid||0}/${s.renewalsDue||0} оплачено`,'tasks',renew)}${metricCard('Рекомендации наставников',String(recs.length),'Требуют контакта с родителем','goals')}</div><div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Что нужно сделать</h3><p>Задачи выбранного месяца</p></div></div><div class="compact-list">${tasks.sort(sortByDate).slice(0,8).map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)} · до ${formatDateShort(t.deadline)}</small></div></div>`).join('')||'<div class="empty">Задач нет</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>План продаж администраторов</h3><p>Личный план и факт выбранного месяца</p></div></div><div class="compact-list">${['anya','adel'].map(id=>{const p=person(id),plan=s.adminPlans?.[id]||0,fact=s.adminFacts?.[id]||0,pr=plan?fact/plan*100:0;return`<div class="compact-item"><span class="avatar small">${esc(p.avatar)}</span><div class="item-main"><b>${esc(p.name)} · ${compactMoney(fact)}</b><small>план ${compactMoney(plan)}</small><div class="progress"><i style="width:${clamp(pr,0,100)}%"></i></div></div></div>`}).join('')}</div></section></div><section class="card pad"><div class="card-head"><div><h3>Рекомендации наставников</h3><p>Следующий продукт должен быть предложен персонально</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Ребёнок</th><th>Наставник</th><th>Рекомендация</th><th>Статус</th><th></th></tr></thead><tbody>${recs.map(r=>`<tr><td>${esc(r.childName)}</td><td>${esc(person(r.mentorId).name)}</td><td>${esc(r.recommendation)}</td><td>${esc(statusLabel(r.status))}</td><td><div class="table-actions"><button data-action="editRecommendation" data-id="${r.id}">${ICONS.edit}</button></div></td></tr>`).join('')}</tbody></table></div></section></div>`}'''
sub_once(r"function renderAdmin\(\)\{.*?\n\nfunction renderTeam", render_admin + "\n\nfunction renderTeam", "renderAdmin")

render_team = r'''function renderTeam(){const m=currentMonth(),events=activeEvents().filter(e=>e.date>=today()).sort(sortByDate),goals=goalsDerived(activeGoals().filter(g=>g.status==='active')).sort((a,b)=>b.progress-a.progress),done=currentMonthTasks().filter(t=>statusDone(t.status));return`<div class="page">${pageHead('ОБЩИЙ ЭКРАН','Команда EXTREME KIDS','Общие цели, события, победы и приоритеты — всё из одной базы')}<section class="card hero"><div class="hero-top"><div><div class="eyebrow">ФОКУС МЕСЯЦА</div><h3 class="hero-title">${esc(m.focus)}</h3><div class="hero-sub">Каждый сотрудник видит актуальный месяц и свою роль в результате.</div></div><div class="hero-value" style="font-size:38px">${pct(avg(goals.map(g=>g.progress)))}</div></div></section><div class="grid-3"><section class="card pad"><div class="card-head"><div><h3>Цели команды</h3><p>Автоматический прогресс</p></div></div><div class="compact-list">${goals.slice(0,5).map(g=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(g.title)}</b><small>${pct(g.progress)} · ответственный ${esc(person(g.ownerId).name)}</small><div class="progress"><i style="width:${clamp(g.progress,0,100)}%"></i></div></div></div>`).join('')}</div></section><section class="card pad"><div class="card-head"><div><h3>Ближайшие события</h3><p>Где нужна команда</p></div></div><div class="event-list">${events.slice(0,6).map(e=>`<div class="event-item"><i class="item-dot"></i><div class="item-main"><b>${esc(e.title)}</b><small>${formatDate(e.date)} · ${esc(e.venue||'')}</small></div></div>`).join('')||'<div class="empty">Событий нет</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Сделано в этом месяце</h3><p>Победы и закрытые задачи</p></div></div><div class="compact-list">${done.slice(0,6).map(t=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)}</small></div></div>`).join('')||'<div class="empty">Пока нет закрытых задач</div>'}</div></section></div></div>`}'''
sub_once(r"function renderTeam\(\)\{.*?\n\nfunction renderSettings", render_team + "\n\nfunction renderSettings", "renderTeam")

# Task and sales forms.
task_modal = r'''function taskModal(item=null,owner=''){const monthKey=item?.monthKey||taskMonthKey(item)||state.settings.currentMonth,defaultDeadline=item?.deadline||((today().startsWith(monthKey))?today():monthKey+'-01'),t=item||{id:'',title:'',description:'',ownerId:owner||'roman',deadline:defaultDeadline,monthKey,priority:'medium',status:'todo',linkType:'',linkId:''};openModal({title:item?'Редактировать задачу':'Новая задача',subtitle:`${monthLabel(monthKey)} · ответственный, дедлайн и приоритет`,body:`<form id="taskForm" data-id="${esc(t.id)}" class="form-grid"><div class="field span-2"><label>Название</label><input class="input" name="title" value="${esc(t.title)}" required></div><div class="field span-2"><label>Описание</label><textarea class="textarea" name="description">${esc(t.description||'')}</textarea></div><div class="field"><label>Месяц</label><select class="select" name="monthKey">${Object.keys(state.months).sort().map(k=>`<option value="${k}" ${monthKey===k?'selected':''}>${esc(state.months[k].label||monthLabel(k))}</option>`).join('')}</select></div><div class="field"><label>Ответственный</label><select class="select" name="ownerId">${peopleOptions(t.ownerId,['owner','manager','stas','mentor','admin'])}</select></div><div class="field"><label>Дедлайн</label><input class="input" type="date" name="deadline" value="${esc(t.deadline||defaultDeadline)}"></div><div class="field"><label>Приоритет</label><select class="select" name="priority"><option value="high" ${t.priority==='high'?'selected':''}>Высокий</option><option value="medium" ${t.priority==='medium'?'selected':''}>Средний</option><option value="low" ${t.priority==='low'?'selected':''}>Низкий</option></select></div><div class="field"><label>Статус</label><select class="select" name="status">${TASK_COLUMNS.map(([v,l])=>`<option value="${v}" ${t.status===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="form-actions span-2">${item&&canDeleteTask()?`<button type="button" class="btn btn-danger" data-action="deleteTask" data-id="${t.id}">Удалить</button>`:''}<span style="flex:1"></span><button type="button" class="btn btn-ghost" data-action="closeModal">Отмена</button><button type="submit" class="btn btn-primary">Сохранить</button></div></form>`})}'''
sub_once(r"function taskModal\(item=null,owner=''\)\{.*?\nfunction groupModal", task_modal + "\nfunction groupModal", "taskModal")

sales_modal = r'''function salesModal(){const s=currentSales();openModal({title:'Показатели продаж',subtitle:currentMonth().label,body:`<form id="salesForm" class="form-grid"><div class="field"><label>Пробные назначено</label><input class="input" type="number" min="0" name="trialsPlanned" value="${s.trialsPlanned||0}"></div><div class="field"><label>Пробные пришли</label><input class="input" type="number" min="0" name="trialsVisited" value="${s.trialsVisited||0}"></div><div class="field"><label>Покупки после пробной</label><input class="input" type="number" min="0" name="purchases" value="${s.purchases||0}"></div><div class="field"><label>Продления к оплате</label><input class="input" type="number" min="0" name="renewalsDue" value="${s.renewalsDue||0}"></div><div class="field"><label>Связались по продлениям</label><input class="input" type="number" min="0" name="renewalsContacted" value="${s.renewalsContacted||0}"></div><div class="field"><label>Продления оплачены</label><input class="input" type="number" min="0" name="renewalsPaid" value="${s.renewalsPaid||0}"></div><div class="field"><label>План Ани</label><input class="input" type="number" min="0" name="anyaPlan" value="${s.adminPlans?.anya||0}"></div><div class="field"><label>Факт Ани</label><input class="input" type="number" min="0" name="anyaFact" value="${s.adminFacts?.anya||0}"></div><div class="field"><label>План Адель</label><input class="input" type="number" min="0" name="adelPlan" value="${s.adminPlans?.adel||0}"></div><div class="field"><label>Факт Адель</label><input class="input" type="number" min="0" name="adelFact" value="${s.adminFacts?.adel||0}"></div>${formActions()}</form>`})}'''
sub_once(r"function salesModal\(\)\{.*?\nfunction closeMonthModal", sales_modal + "\nfunction closeMonthModal", "salesModal")

replace_once(
    "if(f.id==='taskForm'){const old=state.tasks.find(x=>x.id===f.dataset.id);const item={...(old||{}),id:old?.id||id('task'),title:v.title,description:v.description,ownerId:v.ownerId,deadline:v.deadline,priority:v.priority,status:v.status,updatedAt:stamp};upsert(state.tasks,item);closeModal();touch(`Задача: ${item.title}`)}",
    "if(f.id==='taskForm'){const old=state.tasks.find(x=>x.id===f.dataset.id);const item={...(old||{}),id:old?.id||id('task'),title:v.title,description:v.description,ownerId:v.ownerId,monthKey:v.monthKey||monthKeyFromDate(v.deadline)||state.settings.currentMonth,deadline:v.deadline,priority:v.priority,status:v.status,createdBy:old?.createdBy||(currentRole==='manager'?'manager':currentRole==='owner'?'owner':credentials.role),updatedAt:stamp};upsert(state.tasks,item);closeModal();touch(`Задача: ${item.title}`)}",
    "task submit month/creator",
)
replace_once(
    "if(f.id==='salesForm'){state.sales={...state.sales,trialsPlanned:num(v.trialsPlanned),trialsVisited:num(v.trialsVisited),purchases:num(v.purchases),renewalsDue:num(v.renewalsDue),renewalsContacted:num(v.renewalsContacted),renewalsPaid:num(v.renewalsPaid),adminPlans:{anya:num(v.anyaPlan),adel:num(v.adelPlan)},adminFacts:{anya:num(v.anyaFact),adel:num(v.adelFact)},updatedAt:stamp};closeModal();touch('Обновлены показатели продаж')}",
    "if(f.id==='salesForm'){const key=state.settings.currentMonth;state.salesByMonth=state.salesByMonth||{};state.salesByMonth[key]={...currentSales(),trialsPlanned:num(v.trialsPlanned),trialsVisited:num(v.trialsVisited),purchases:num(v.purchases),renewalsDue:num(v.renewalsDue),renewalsContacted:num(v.renewalsContacted),renewalsPaid:num(v.renewalsPaid),adminPlans:{anya:num(v.anyaPlan),adel:num(v.adelPlan)},adminFacts:{anya:num(v.anyaFact),adel:num(v.adelFact)},updatedAt:stamp};state.sales=state.salesByMonth[key];closeModal();touch(`Обновлены показатели продаж · ${currentMonth().label}`)}",
    "monthly sales submit",
)

# Protected delete and filters.
replace_once(
    "if(a==='addTask'){taskModal(null,el.dataset.owner||'');return}if(a==='editTask'){taskModal(state.tasks.find(x=>x.id===el.dataset.id));return}if(a==='deleteTask'){deleteRecord(state.tasks,el.dataset.id);return}",
    "if(a==='addTask'){taskModal(null,el.dataset.owner||'');return}if(a==='editTask'){taskModal(state.tasks.find(x=>x.id===el.dataset.id));return}if(a==='deleteTask'){if(!canDeleteTask()){toast('Удаление недоступно','Удалять задачи могут только Роман и Софа.','error');return}const x=state.tasks.find(t=>t.id===el.dataset.id);closeModal();deleteRecord(state.tasks,el.dataset.id,x?.title);return}",
    "protected task delete",
)
replace_once(
    "if(a==='selectMonth'){state.settings.currentMonth=el.dataset.key;state.meta.updatedAt=nowIso();persistLocal();renderShell();renderCurrentView();return}",
    "if(a==='selectMonth'){state.settings.currentMonth=el.dataset.key;state.ui.taskMonthMode='selected';state.meta.updatedAt=nowIso();persistLocal();renderShell();renderCurrentView();return}",
    "select month task reset",
)
replace_once(
    "function handleChange(e){const el=e.target;if(el.id==='monthSelect'){state.settings.currentMonth=el.value;state.meta.updatedAt=nowIso();persistLocal();renderCurrentView();return}if(el.dataset.filter==='groupMentor'){state.ui.groupMentor=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='groupDiscipline'){state.ui.groupDiscipline=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='taskOwner'){state.ui.taskOwner=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='selectedMentor'){state.ui.selectedMentor=el.value;persistLocal();renderCurrentView()}}",
    "function handleChange(e){const el=e.target;if(el.id==='monthSelect'){state.settings.currentMonth=el.value;state.ui.taskMonthMode='selected';state.meta.updatedAt=nowIso();persistLocal();renderShell();renderCurrentView();return}if(el.dataset.filter==='groupMentor'){state.ui.groupMentor=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='groupDiscipline'){state.ui.groupDiscipline=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='taskOwner'){state.ui.taskOwner=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='taskMonthMode'){state.ui.taskMonthMode=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='selectedMentor'){state.ui.selectedMentor=el.value;persistLocal();renderCurrentView()}}",
    "task month handler",
)

# Expose derived calculations for tests and integrations.
replace_once(
    "window.EKGrowthOS={version:VERSION,build:BUILD,getState:()=>state,setView,sync:()=>syncNow({quiet:true,push:true}),credentials:()=>({...credentials}),reset:resetState};",
    "window.EKGrowthOS={version:VERSION,build:BUILD,getState:()=>state,setView,sync:()=>syncNow({quiet:true,push:true}),credentials:()=>({...credentials}),derived:()=>derivedSnapshot(),canDeleteTask:()=>canDeleteTask(),reset:resetState};",
    "public API",
)

# Small UI additions.
css_patch = r'''
.task-actions-inline{display:flex;align-items:center;gap:8px;margin-left:auto}.task-delete{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;border:1px solid #4b2d26;background:#251512;color:#db8b7d;opacity:.78;transition:.18s}.task-delete:hover{opacity:1;transform:translateY(-1px);border-color:#805046;background:#321b17}.task-delete svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8}.task-card .task-top{align-items:flex-start}.goal-progress small{display:block;margin-top:5px;color:var(--muted);font-size:11px}.role-hero a.btn{text-decoration:none}
'''.strip()
replace_once("</style>\n</head>", css_patch + "\n</style>\n</head>", "CSS patch")

# Ensure the Sofia role and automatic data model are present.
markers = [
    "const VERSION='6.1.0'",
    "manager:{name:'Софа'",
    "function renderManager()",
    "function taskMonthKey(task)",
    "function goalDerived(goal)",
    "function currentSales()",
    "Удалять задачи могут только Роман и Софа",
    "taskMonthMode",
    "window.EKGrowthOS={version:VERSION",
]
for marker in markers:
    if marker not in text:
        raise RuntimeError(f"missing output marker: {marker}")

OUTPUT.write_text(text, encoding="utf-8")

# Build small immutable source parts for the Vercel loader.
PARTS.mkdir(exist_ok=True)
for old in PARTS.glob("p*"):
    old.unlink()
raw = text.encode("utf-8")
compressed = gzip.compress(raw, compresslevel=9, mtime=0)
encoded = base64.b64encode(compressed).decode("ascii")
chunk_size = 4000
names = []
for i in range(0, len(encoded), chunk_size):
    name = f"p{i // chunk_size:03d}"
    (PARTS / name).write_text(encoded[i:i + chunk_size], encoding="ascii")
    names.append(name)
metadata = {
    "version": "6.1.0",
    "build": "2026.08.31-manager-month-sync",
    "bytes": len(raw),
    "compressedBytes": len(compressed),
    "base64Chars": len(encoded),
    "sha256": hashlib.sha256(raw).hexdigest(),
    "parts": names,
    "partSize": chunk_size,
}
(PARTS / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(metadata, ensure_ascii=False, indent=2))
