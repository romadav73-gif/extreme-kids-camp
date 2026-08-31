(()=>{
'use strict';
const VERSION='6.1.0';
const SCHEMA=61;
const DB_SUFFIX='growth61';
const LOCAL_PREFIX='ek-growth61-state-';
const ACCESS_KEY='ek-growth61-access';
const UI_KEY='ek-growth61-ui-';
const MONTH_NAMES=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const SHORT_MONTHS=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const ROLE_NAMES={owner:'Владелец',manager:'Управляющая',head:'Руководитель направления',mentor:'Наставник',admin:'Администратор',team:'Командный экран'};
const ROLE_HOME={owner:'dashboard',manager:'manager',head:'stas',mentor:'mentor',admin:'admin',team:'team'};
const STATUS_ORDER=['todo','progress','review','done'];
const TASK_STATUS={todo:'Новые',progress:'В работе',review:'На проверке',done:'Готово'};
const PRIORITY={low:'Низкий',normal:'Обычный',high:'Высокий',critical:'Критический'};
const USER_SEED=[
 {id:'roman',name:'Роман',short:'Р',role:'owner',title:'Владелец клуба',direction:'all',active:true},
 {id:'sofa',name:'Софа',short:'С',role:'manager',title:'Управляющая клубом',direction:'all',active:true},
 {id:'stas',name:'Станислав',short:'СТ',role:'head',title:'Руководитель роллер-направления',direction:'rollers',active:true},
 {id:'ivan',name:'Иван',short:'И',role:'mentor',title:'Наставник по роликам',direction:'rollers',active:true},
 {id:'karina',name:'Карина',short:'К',role:'mentor',title:'Наставник по роликам',direction:'rollers',active:true},
 {id:'tasya',name:'Тася',short:'Т',role:'mentor',title:'Наставник по роликам',direction:'rollers',active:true},
 {id:'artem',name:'Артём',short:'АР',role:'mentor',title:'Наставник ВЕЛО / BMX',direction:'bike',active:true},
 {id:'denis',name:'Денис',short:'Д',role:'mentor',title:'Наставник ВЕЛО / BMX',direction:'bike',active:true},
 {id:'evgeny',name:'Евгений',short:'Е',role:'mentor',title:'Наставник по скейту',direction:'skate',active:true},
 {id:'dominik',name:'Доминик',short:'ДО',role:'mentor',title:'Наставник по скейту',direction:'skate',active:true},
 {id:'anya',name:'Аня',short:'А',role:'admin',title:'Администратор',direction:'sales',active:true},
 {id:'adel',name:'Адель',short:'АД',role:'admin',title:'Администратор',direction:'sales',active:true}
];
const YEAR_PLAN={
 '2026-09':{min:2500000,target:3800000,stretch:4200000,focus:'Сильный набор и заполнение расписания'},
 '2026-10':{min:2500000,target:3200000,stretch:3800000,focus:'Закрепление детей и продления'},
 '2026-11':{min:2500000,target:3000000,stretch:3500000,focus:'Рост среднего чека и вторые занятия'},
 '2026-12':{min:2500000,target:3500000,stretch:4200000,focus:'Новый год, события и длинные абонементы'},
 '2027-01':{min:2500000,target:2700000,stretch:3200000,focus:'Возврат после каникул'},
 '2027-02':{min:2500000,target:2900000,stretch:3400000,focus:'Удержание и семейные мероприятия'},
 '2027-03':{min:2500000,target:3300000,stretch:3900000,focus:'Весенний рост и соревнования'},
 '2027-04':{min:2500000,target:3100000,stretch:3700000,focus:'Продления и подготовка к лету'},
 '2027-05':{min:2500000,target:3300000,stretch:3900000,focus:'Лагерь, сборы, летние продукты'},
 '2027-06':{min:2500000,target:2900000,stretch:3500000,focus:'Летний лагерь и интенсивы'},
 '2027-07':{min:2500000,target:2700000,stretch:3200000,focus:'Летние смены и персональные занятия'},
 '2027-08':{min:2500000,target:3000000,stretch:3700000,focus:'Предпродажа нового учебного года'}
};
const GROUP_SEED=[
 ['g-stas-1','stas','rollers','БАЗА','Понедельник','16:00',8],['g-stas-2','stas','rollers','БАЗА+','Понедельник','17:00',8],['g-stas-3','stas','rollers','СПОРТ','Понедельник','18:00–20:00',10],
 ['g-stas-4','stas','rollers','БАЗА','Вторник','17:00',8],['g-stas-5','stas','rollers','БАЗА+','Вторник','16:00',8],['g-stas-6','stas','rollers','СПОРТ','Вторник','18:00–20:00',10],
 ['g-stas-7','stas','rollers','СПОРТ · скейт-парк Чертаново','Среда','18:00–20:00',10],['g-stas-8','stas','rollers','БАЗА','Суббота','10:00',8],['g-stas-9','stas','rollers','БАЗА+','Суббота','11:00',8],['g-stas-10','stas','rollers','СПОРТ','Суббота','18:00–20:00',10],
 ['g-stas-11','stas','rollers','БАЗА','Воскресенье','11:00',8],['g-stas-12','stas','rollers','БАЗА+','Воскресенье','12:00',8],['g-stas-13','stas','rollers','СПОРТ','Воскресенье','15:00–17:00',10],
 ['g-ivan-1','ivan','rollers','БАЗА','Среда','16:00',8],['g-ivan-2','ivan','rollers','БАЗА+ до 7 лет','Среда','17:00',8],['g-ivan-3','ivan','rollers','БАЗА+ 7+','Среда','18:00',8],['g-ivan-4','ivan','rollers','СПОРТ','Среда','19:00',10],
 ['g-ivan-5','ivan','rollers','БАЗА','Пятница','16:00',8],['g-ivan-6','ivan','rollers','БАЗА+ до 7 лет','Пятница','17:00',8],['g-ivan-7','ivan','rollers','БАЗА+ 7+','Пятница','18:00',8],['g-ivan-8','ivan','rollers','СПОРТ','Пятница','19:00',10],
 ['g-ivan-9','ivan','rollers','БАЗА','Суббота','12:00',8],['g-ivan-10','ivan','rollers','БАЗА+ до 7 лет','Суббота','13:00',8],['g-ivan-11','ivan','rollers','БАЗА+ 7+','Суббота','15:00',8],['g-ivan-12','ivan','rollers','СПОРТ','Суббота','16:00',10],
 ['g-ivan-13','ivan','rollers','БАЗА','Воскресенье','15:00',8],['g-ivan-14','ivan','rollers','БАЗА+ общий возраст','Воскресенье','16:00',8],['g-ivan-15','ivan','rollers','СПОРТ','Воскресенье','17:00–19:00',10],
 ['g-tasya-1','tasya','rollers','БАЗА','Понедельник','18:00',8],['g-tasya-2','tasya','rollers','БАЗА+','Понедельник','17:00',8],['g-tasya-3','tasya','rollers','ФИГУРНОЕ КАТАНИЕ НА РОЛИКАХ','Понедельник','19:00–21:00',10],
 ['g-tasya-4','tasya','rollers','БАЗА','Вторник','14:00',8],['g-tasya-5','tasya','rollers','БАЗА+','Вторник','16:00',8],['g-tasya-6','tasya','rollers','БАЗА+','Вторник','19:00',8],
 ['g-tasya-7','tasya','rollers','БАЗА','Среда','18:00',8],['g-tasya-8','tasya','rollers','БАЗА+','Среда','17:00',8],
 ['g-tasya-9','tasya','rollers','БАЗА','Четверг','14:00',8],['g-tasya-10','tasya','rollers','БАЗА','Четверг','18:00',8],['g-tasya-11','tasya','rollers','БАЗА+','Четверг','17:00',8],['g-tasya-12','tasya','rollers','ФИГУРНОЕ КАТАНИЕ НА РОЛИКАХ','Четверг','19:00–21:00',10],
 ['g-tasya-13','tasya','rollers','БАЗА','Пятница','15:00',8],['g-tasya-14','tasya','rollers','БАЗА','Пятница','17:00',8],['g-tasya-15','tasya','rollers','БАЗА+','Пятница','19:00',8],
 ['g-artem-1','artem','bike','БЕГОВЕЛ БАЗА','Понедельник','17:00',8],['g-artem-2','artem','bike','ВЕЛО БАЗА','Понедельник','18:00',8],['g-artem-3','artem','bike','BMX БАЗА','Понедельник','19:00',8],
 ['g-artem-4','artem','bike','БЕГОВЕЛ БАЗА','Пятница','17:00',8],['g-artem-5','artem','bike','ВЕЛО БАЗА','Пятница','18:00',8],['g-artem-6','artem','bike','BMX БАЗА','Пятница','19:00',8],
 ['g-artem-7','artem','bike','БЕГОВЕЛ БАЗА','Суббота','10:00',8],['g-artem-8','artem','bike','ВЕЛО БАЗА','Суббота','13:00',8],['g-artem-9','artem','bike','BMX БАЗА','Суббота','17:00',8],
 ['g-artem-10','artem','bike','БЕГОВЕЛ БАЗА','Воскресенье','11:00',8],['g-artem-11','artem','bike','ВЕЛО БАЗА','Воскресенье','12:00',8],['g-artem-12','artem','bike','ВЕЛО БАЗА','Воскресенье','16:00',8],['g-artem-13','artem','bike','БЕГОВЕЛ БАЗА+','Воскресенье','17:00',8],['g-artem-14','artem','bike','СПОРТ BMX','Воскресенье','18:00–20:00',10],
 ['g-denis-1','denis','bike','БЕГОВЕЛ БАЗА','Среда','16:00',8],['g-denis-2','denis','bike','ВЕЛО БАЗА','Среда','17:00',8],['g-denis-3','denis','bike','BMX БАЗА','Среда','18:00',8],
 ['g-denis-4','denis','bike','БЕГОВЕЛ БАЗА','Пятница','16:00',8],['g-denis-5','denis','bike','ВЕЛО БАЗА','Пятница','18:00',8],['g-denis-6','denis','bike','BMX БАЗА','Пятница','17:00',8],
 ['g-denis-7','denis','bike','БЕГОВЕЛ БАЗА','Суббота','10:00',8],['g-denis-8','denis','bike','ВЕЛО БАЗА','Суббота','11:00',8],['g-denis-9','denis','bike','ВЕЛО БАЗА','Суббота','17:00',8],['g-denis-10','denis','bike','BMX БАЗА','Суббота','12:00',8],['g-denis-11','denis','bike','BMX БАЗА','Суббота','18:00',8],
 ['g-evgeny-1','evgeny','skate','БАЗА','Суббота','14:00',8],['g-evgeny-2','evgeny','skate','БАЗА+','Суббота','15:00',8],
 ['g-dominik-1','dominik','skate','БАЗА','Воскресенье','14:00',8],['g-dominik-2','dominik','skate','БАЗА+','Воскресенье','15:00',8]
];
let state=null,access=null,renderer=()=>{},syncTimer=null,syncPromise=null,broadcast=null,lastRemoteHash='',legacyStatus='not-needed';
const listeners=new Set();
const now=()=>new Date().toISOString();
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const uid=(prefix='id')=>`${prefix}-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' ₽';
const percent=n=>`${Math.round(Number(n)||0)}%`;
const monthKey=value=>{const d=value?new Date(value):new Date();return Number.isNaN(d.getTime())?String(value||'').slice(0,7):`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
const monthLabel=key=>{const [y,m]=String(key).split('-').map(Number);return m?`${MONTH_NAMES[m-1]} ${y}`:key};
const dayInMonth=key=>{const [y,m]=key.split('-').map(Number);return new Date(y,m,0).getDate()};
const safeId=s=>String(s||'').trim().toLowerCase().replace(/[^a-zа-я0-9_-]+/gi,'-').replace(/^-|-$/g,'')||uid('id');
const visible=arr=>(Array.isArray(arr)?arr:[]).filter(x=>x&&!x.deletedAt);
const updatedTime=x=>new Date(x?.updatedAt||x?.createdAt||0).getTime()||0;
const hashText=async text=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('')};
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(String(s||'')),c=>c.charCodeAt(0));
function parseAccess(){
 const params=new URLSearchParams(location.hash.replace(/^#/,''));
 let saved={};try{saved=JSON.parse(localStorage.getItem(ACCESS_KEY)||'{}')}catch{}
 let workspace=params.get('w')||saved.workspace;
 let key=params.get('k')||saved.key;
 let role=params.get('r')||saved.role||'owner';
 let userId=params.get('u')||saved.userId||({owner:'roman',manager:'sofa',head:'stas',mentor:'ivan',admin:'anya',team:'team'}[role]||'roman');
 if(!workspace)workspace=`ek-troparevo-${crypto.getRandomValues(new Uint32Array(2)).join('').slice(0,14)}`;
 if(!key)key=[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(!ROLE_NAMES[role])role='owner';
 const result={workspace,key,role,userId,token:params.get('t')||saved.token||uid('access'),deviceId:saved.deviceId||uid('device')};
 localStorage.setItem(ACCESS_KEY,JSON.stringify(result));
 if(!params.get('w')||!params.get('k')){
  params.set('w',workspace);params.set('k',key);params.set('r',role);params.set('u',userId);params.set('t',result.token);
  history.replaceState(null,'',`${location.pathname}${location.search}#${params.toString()}`);
 }
 return result;
}
function userSeed(){return USER_SEED.map(u=>({...u,createdAt:now(),updatedAt:now()}))}
function groupSeed(){return GROUP_SEED.map(([id,mentorId,direction,name,day,time,capacity])=>({id,mentorId,direction,name,day,time,capacity,students:0,trialStudents:0,month:'all',createdAt:now(),updatedAt:now()}))}
function defaultState(){
 const created=now();
 return {
  schema:SCHEMA,version:VERSION,revision:1,createdAt:created,updatedAt:created,
  meta:{club:'EXTREME KIDS Тропарёво',academicYear:'2026/27',migratedFrom:null,legacyStatus:null},
  users:userSeed(),groups:groupSeed(),tasks:[],goals:[
   {id:'goal-revenue',title:'Выручка месяца',metric:'revenue',targetType:'monthTarget',month:'all',ownerId:'roman',createdAt:created,updatedAt:created},
   {id:'goal-load',title:'Средняя загрузка групп',metric:'occupancy',target:75,unit:'%',month:'all',ownerId:'stas',createdAt:created,updatedAt:created},
   {id:'goal-conversion',title:'Конверсия пробных в оплату',metric:'conversion',target:45,unit:'%',month:'all',ownerId:'sofa',createdAt:created,updatedAt:created},
   {id:'goal-renewal',title:'Продления абонементов',metric:'renewal',target:70,unit:'%',month:'all',ownerId:'sofa',createdAt:created,updatedAt:created},
   {id:'goal-tasks',title:'Выполнение задач в срок',metric:'taskCompletion',target:90,unit:'%',month:'all',ownerId:'sofa',createdAt:created,updatedAt:created}
  ],
  events:[{id:'event-watermelon-2026',title:'Арбузные зарубы',type:'competition',date:'2026-09-12',time:'16:00',location:'Одинцово / Ново-Переделкино',planParticipants:30,factParticipants:0,planRevenue:0,factRevenue:0,ownerId:'stas',createdAt:created,updatedAt:created}],
  sales:[],leads:[],recommendations:[],attendance:[],months:Object.fromEntries(Object.entries(YEAR_PLAN).map(([key,value])=>[key,{...value,factManual:null,updatedAt:created}])),archives:[],audit:[],settings:{pollSeconds:30,autoSync:true,showFinanceToManager:true},legacySnapshot:null
 };
}
function extractArray(source,names){for(const name of names){if(Array.isArray(source?.[name]))return source[name];if(Array.isArray(source?.data?.[name]))return source.data[name]}return null}
function normalizeTask(item,index=0){
 const created=item.createdAt||item.created||now();const deadline=item.deadline||item.dueDate||item.date||'';
 return {...item,id:String(item.id||uid('task')),title:String(item.title||item.name||`Задача ${index+1}`),description:String(item.description||item.note||''),ownerId:item.ownerId||item.assigneeId||item.responsibleId||'roman',createdBy:item.createdBy||item.authorId||'roman',status:STATUS_ORDER.includes(item.status)?item.status:(item.done?'done':'todo'),priority:PRIORITY[item.priority]?item.priority:'normal',deadline,month:item.month||String(deadline).slice(0,7)||monthKey(created),createdAt:created,updatedAt:item.updatedAt||created,deletedAt:item.deletedAt||null,deletedBy:item.deletedBy||null};
}
function normalizeGroup(item,index=0){return {...item,id:String(item.id||uid('group')),mentorId:item.mentorId||item.coachId||item.ownerId||'stas',direction:item.direction||item.sport||'rollers',name:item.name||item.groupName||`Группа ${index+1}`,day:item.day||item.weekday||'',time:item.time||'',capacity:Number(item.capacity??item.limit??8)||8,students:Number(item.students??item.current??item.count??0)||0,trialStudents:Number(item.trialStudents??0)||0,createdAt:item.createdAt||now(),updatedAt:item.updatedAt||item.createdAt||now(),deletedAt:item.deletedAt||null};}
function normalizeLegacy(old){
 const base=defaultState();if(!old||typeof old!=='object')return base;
 const merged={...base,...clone(old),schema:SCHEMA,version:VERSION,meta:{...base.meta,...clone(old.meta||{}),migratedFrom:old.version||old.build||'legacy'},settings:{...base.settings,...clone(old.settings||{})}};
 const tasks=extractArray(old,['tasks','taskList','boardTasks']);if(tasks)merged.tasks=tasks.map(normalizeTask);
 const groups=extractArray(old,['groups','groupRows','scheduleGroups','loads']);if(groups)merged.groups=groups.map(normalizeGroup);
 const goals=extractArray(old,['goals','developmentGoals']);if(goals)merged.goals=goals.map((x,i)=>({...x,id:String(x.id||uid('goal')),title:x.title||x.name||`Цель ${i+1}`,metric:x.metric||'custom',target:Number(x.target??x.plan??0),manualFact:Number(x.manualFact??x.fact??0),month:x.month||'all',createdAt:x.createdAt||now(),updatedAt:x.updatedAt||x.createdAt||now()}));
 const events=extractArray(old,['events','calendarEvents']);if(events)merged.events=events.map((x,i)=>({...x,id:String(x.id||uid('event')),title:x.title||x.name||`Мероприятие ${i+1}`,date:x.date||x.startDate||'',type:x.type||'other',createdAt:x.createdAt||now(),updatedAt:x.updatedAt||x.createdAt||now()}));
 const sales=extractArray(old,['sales','payments']);if(sales)merged.sales=sales;
 const leads=extractArray(old,['leads','clients']);if(leads)merged.leads=leads;
 const recommendations=extractArray(old,['recommendations','mentorRecommendations']);if(recommendations)merged.recommendations=recommendations;
 merged.users=mergeById(base.users,extractArray(old,['users','team'])||[]);
 merged.months={...base.months,...clone(old.months||{})};
 merged.archives=extractArray(old,['archives','monthArchives'])||base.archives;
 merged.audit=extractArray(old,['audit','history'])||[];
 merged.createdAt=old.createdAt||base.createdAt;merged.updatedAt=now();merged.revision=Number(old.revision||1)+1;
 return merged;
}
function ensureState(input){
 const base=defaultState();const src=input&&typeof input==='object'?input:{};const out={...base,...src,meta:{...base.meta,...src.meta},settings:{...base.settings,...src.settings},months:{...base.months,...src.months}};
 out.users=mergeById(base.users,Array.isArray(src.users)?src.users:[]);
 out.groups=(Array.isArray(src.groups)?src.groups:base.groups).map(normalizeGroup);
 out.tasks=(Array.isArray(src.tasks)?src.tasks:[]).map(normalizeTask);
 for(const key of ['goals','events','sales','leads','recommendations','attendance','archives','audit'])out[key]=Array.isArray(src[key])?src[key]:base[key];
 out.schema=SCHEMA;out.version=VERSION;out.revision=Number(out.revision)||1;out.updatedAt=out.updatedAt||now();return out;
}
function mergeById(a,b){
 const map=new Map();for(const item of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){if(!item)continue;const id=String(item.id||uid('item'));const old=map.get(id);if(!old||updatedTime(item)>=updatedTime(old))map.set(id,{...old,...clone(item),id})}return [...map.values()];
}
function mergeState(local,remote){
 if(!remote)return ensureState(local);if(!local)return ensureState(remote);
 const newer=updatedTime(remote)>=updatedTime(local)?remote:local;const older=newer===remote?local:remote;
 const merged={...clone(older),...clone(newer),meta:{...clone(older.meta||{}),...clone(newer.meta||{})},settings:{...clone(older.settings||{}),...clone(newer.settings||{})},months:{...clone(older.months||{}),...clone(newer.months||{})}};
 for(const key of ['users','groups','tasks','goals','events','sales','leads','recommendations','attendance','archives','audit'])merged[key]=mergeById(local[key],remote[key]);
 merged.revision=Math.max(Number(local.revision)||0,Number(remote.revision)||0);merged.updatedAt=new Date(Math.max(updatedTime(local),updatedTime(remote))).toISOString();return ensureState(merged);
}
function currentUser(){return visible(state?.users).find(u=>u.id===access.userId)||visible(state?.users).find(u=>u.role===access.role)||USER_SEED[0]}
function effectiveRole(){return access?.role||currentUser()?.role||'owner'}
function can(action,subject){
 const role=effectiveRole(),user=currentUser();
 if(role==='owner')return true;
 const rules={
  'task.create':['manager','head','mentor','admin'],
  'task.edit':['manager','head','mentor','admin'],
  'task.delete':['manager'],
  'task.restore':['manager'],
  'group.edit':['manager','head','mentor'],
  'goal.edit':['manager'],
  'event.edit':['manager','head'],
  'sale.edit':['manager','admin'],
  'archive.create':['manager'],
  'user.manage':[],
  'view.finance':['manager'],
  'view.allOperations':['manager']
 };
 if(!(rules[action]||[]).includes(role))return false;
 if(action==='task.edit'&&role==='mentor')return !subject||subject.ownerId===user.id||subject.createdBy===user.id;
 if(action==='task.edit'&&role==='admin')return !subject||subject.ownerId===user.id||subject.createdBy===user.id;
 if(action==='group.edit'&&role==='mentor')return !subject||subject.mentorId===user.id;
 if(action==='group.edit'&&role==='head')return !subject||subject.direction===user.direction;
 return true;
}
function scopedUsers(){
 const role=effectiveRole(),user=currentUser(),users=visible(state.users);
 if(role==='owner'||role==='manager')return users;
 if(role==='head')return users.filter(u=>u.id===user.id||u.direction===user.direction||u.role==='admin');
 return users.filter(u=>u.id===user.id);
}
function taskMonth(task){return task.month&&task.month!=='all'?task.month:String(task.deadline||task.createdAt||'').slice(0,7)||monthKey()}
function scopedGroups(){const role=effectiveRole(),user=currentUser(),all=visible(state.groups);if(role==='owner'||role==='manager'||role==='team')return all;if(role==='head')return all.filter(g=>g.direction===user.direction);if(role==='mentor')return all.filter(g=>g.mentorId===user.id);return []}
function scopedTasks(month,mode='month'){
 const role=effectiveRole(),user=currentUser();let all=visible(state.tasks);
 if(role==='head')all=all.filter(t=>t.ownerId===user.id||visible(state.users).find(u=>u.id===t.ownerId)?.direction===user.direction);
 if(role==='mentor'||role==='admin')all=all.filter(t=>t.ownerId===user.id||t.createdBy===user.id);
 if(role==='team')all=[];
 if(mode==='all')return all;
 if(mode==='overdue')return all.filter(t=>t.status!=='done'&&t.deadline&&t.deadline<`${month}-01`);
 return all.filter(t=>taskMonth(t)===month);
}
function monthSales(month){return visible(state.sales).filter(x=>String(x.date||x.createdAt||'').slice(0,7)===month)}
function monthLeads(month){return visible(state.leads).filter(x=>String(x.date||x.createdAt||'').slice(0,7)===month)}
function monthEvents(month){return visible(state.events).filter(x=>String(x.date||'').slice(0,7)===month)}
function derive(month=monthKey()){
 const allGroups=scopedGroups(),allTasks=scopedTasks(month,'month'),overdue=scopedTasks(month,'overdue'),sales=monthSales(month),leads=monthLeads(month),events=monthEvents(month),plan=state.months?.[month]||YEAR_PLAN[month]||{min:2500000,target:3000000,stretch:3800000};
 const revenue=sales.reduce((s,x)=>s+Number(x.amount||0),0)+(Number(plan.factManual)||0);
 const capacity=allGroups.reduce((s,g)=>s+Number(g.capacity||0),0),students=allGroups.reduce((s,g)=>s+Number(g.students||0),0),occupancy=capacity?students/capacity*100:0;
 const doneTasks=allTasks.filter(t=>t.status==='done').length,taskCompletion=allTasks.length?doneTasks/allTasks.length*100:0;
 const trials=sales.filter(x=>['trial','probny','пробная'].includes(String(x.type||'').toLowerCase())).length+leads.filter(x=>x.stage==='trial').length;
 const paid=sales.filter(x=>!['trial','refund'].includes(String(x.type||'').toLowerCase())).length;
 const conversion=trials?Math.min(100,paid/trials*100):0;
 const renewals=sales.filter(x=>['renewal','продление'].includes(String(x.type||'').toLowerCase())).length;
 const renewalBase=leads.filter(x=>x.stage==='renewal'||x.stage==='expiring').length;
 const renewal=renewalBase?Math.min(100,renewals/renewalBase*100):(paid?renewals/paid*100:0);
 const [year,mon]=month.split('-').map(Number),today=new Date(),elapsed=(today.getFullYear()===year&&today.getMonth()+1===mon)?today.getDate():dayInMonth(month),days=dayInMonth(month);
 const pace=elapsed?revenue/elapsed:0,forecast=Math.round(pace*days),forecastProgress=plan.target?forecast/plan.target*100:0;
 const mentorStats=visible(state.users).filter(u=>u.role==='mentor'||u.role==='head').map(u=>{
  const groups=visible(state.groups).filter(g=>g.mentorId===u.id),cap=groups.reduce((s,g)=>s+Number(g.capacity||0),0),stu=groups.reduce((s,g)=>s+Number(g.students||0),0),tasks=visible(state.tasks).filter(t=>t.ownerId===u.id&&taskMonth(t)===month),recs=visible(state.recommendations).filter(r=>r.mentorId===u.id&&String(r.date||r.createdAt||'').slice(0,7)===month);
  return {user:u,groups,capacity:cap,students:stu,occupancy:cap?stu/cap*100:0,free:Math.max(0,cap-stu),tasks,done:tasks.filter(t=>t.status==='done').length,recommendations:recs.length};
 });
 const adminStats=visible(state.users).filter(u=>u.role==='admin').map(u=>{const own=sales.filter(s=>s.adminId===u.id),ownLeads=leads.filter(l=>l.adminId===u.id);return {user:u,revenue:own.reduce((a,b)=>a+Number(b.amount||0),0),sales:own.length,leads:ownLeads.length,renewals:own.filter(s=>['renewal','продление'].includes(String(s.type||'').toLowerCase())).length,tasks:allTasks.filter(t=>t.ownerId===u.id)} });
 const directionStats=['rollers','bike','skate'].map(direction=>{const groups=visible(state.groups).filter(g=>g.direction===direction),cap=groups.reduce((s,g)=>s+Number(g.capacity||0),0),stu=groups.reduce((s,g)=>s+Number(g.students||0),0);return {direction,groups:groups.length,capacity:cap,students:stu,occupancy:cap?stu/cap*100:0,free:Math.max(0,cap-stu)}});
 const metrics={month,plan,revenue,capacity,students,occupancy,free:Math.max(0,capacity-students),tasks:allTasks,overdue,doneTasks,taskCompletion,sales,leads,events,trials,paid,conversion,renewals,renewal,forecast,forecastProgress,pace,mentorStats,adminStats,directionStats};
 metrics.goals=visible(state.goals).filter(g=>g.month==='all'||g.month===month).map(goal=>{const target=goal.targetType==='monthTarget'?Number(plan.target||0):Number(goal.target||0);let fact=0;switch(goal.metric){case'revenue':fact=revenue;break;case'occupancy':fact=occupancy;break;case'conversion':fact=conversion;break;case'renewal':fact=renewal;break;case'taskCompletion':fact=taskCompletion;break;case'events':fact=events.length;break;case'students':fact=students;break;default:fact=Number(goal.manualFact||0)}return {...goal,target,fact,progress:target?fact/target*100:0}});
 return metrics;
}
function stateHash(value){try{return JSON.stringify(value)}catch{return String(Date.now())}}
async function cryptoKey(){
 let bytes;if(/^[0-9a-f]{64}$/i.test(access.key))bytes=Uint8Array.from(access.key.match(/../g),x=>parseInt(x,16));else bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(access.key)));
 return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function encrypt(value){const iv=crypto.getRandomValues(new Uint8Array(12)),key=await cryptoKey(),plain=new TextEncoder().encode(JSON.stringify(value)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain));return {v:2,alg:'A256GCM',iv:b64(iv),cipher:b64(cipher),updatedAt:value.updatedAt,revision:value.revision}}
async function decryptEnvelope(input){
 if(input==null)return null;let value=input;
 if(typeof value==='object'&&'data'in value)value=value.data;
 if(typeof value==='string'){try{value=JSON.parse(value)}catch{try{return JSON.parse(new TextDecoder().decode(unb64(value)))}catch{return null}}}
 if(value&&typeof value==='object'&&value.iv&&(value.cipher||value.ciphertext||value.data)){
  const key=await cryptoKey(),iv=unb64(value.iv),cipher=unb64(value.cipher||value.ciphertext||value.data),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);return JSON.parse(new TextDecoder().decode(plain));
 }
 return value&&typeof value==='object'?value:null;
}
function namespace(){return `${String(access.workspace).replace(/[^a-zA-Z0-9_-]/g,'-')}-${DB_SUFFIX}`}
function endpoint(){return `https://mantledb.sh/v2/${namespace()}/state`}
function localKey(){return LOCAL_PREFIX+namespace()}
function saveLocal(){localStorage.setItem(localKey(),JSON.stringify(state));localStorage.setItem(ACCESS_KEY,JSON.stringify(access))}
function loadLocal(){try{return JSON.parse(localStorage.getItem(localKey())||'null')}catch{return null}}
async function fetchRemote(){
 try{const r=await fetch(endpoint(),{cache:'no-store',headers:{Accept:'application/json'}});if(r.status===404)return null;if(!r.ok)throw new Error(`GET ${r.status}`);return await decryptEnvelope(await r.json())}catch(error){throw new Error(`Общая база недоступна: ${error.message}`)}
}
async function postRemote(value){const payload=await encrypt(value),r=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:JSON.stringify(payload)})});if(!r.ok)throw new Error(`POST ${r.status}`);return true}
function notify(){for(const fn of listeners)try{fn(state)}catch{};try{renderer()}catch(error){console.error('RENDER_FAILED',error)}}
function setSyncStatus(status,message){document.dispatchEvent(new CustomEvent('ek61:sync',{detail:{status,message}}))}
function audit(action,details={}){state.audit=state.audit||[];state.audit.unshift({id:uid('audit'),action,details,actorId:currentUser()?.id||access.userId,role:effectiveRole(),createdAt:now(),updatedAt:now()});if(state.audit.length>500)state.audit.length=500}
function commit(mutator,action='Изменение данных',details={}){
 if(typeof mutator==='function')mutator(state);state.revision=(Number(state.revision)||0)+1;state.updatedAt=now();audit(action,details);saveLocal();notify();try{broadcast?.postMessage({type:'state',state:clone(state),source:access.deviceId})}catch{};scheduleSync();return state;
}
function scheduleSync(){if(!state.settings?.autoSync)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow().catch(()=>{}),850)}
async function syncNow(){
 if(syncPromise)return syncPromise;
 syncPromise=(async()=>{setSyncStatus('busy','Синхронизация…');try{
  const remote=await fetchRemote().catch(error=>{console.warn(error);return null}),merged=mergeState(state,remote);
  const changed=stateHash(merged)!==stateHash(state);state=merged;if(changed){saveLocal();notify()}
  state.revision=Math.max(Number(state.revision)||0,Number(remote?.revision)||0)+1;state.updatedAt=now();await postRemote(state);saveLocal();lastRemoteHash=await hashText(stateHash(state));setSyncStatus('ok',`Синхронизировано ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}`);return state;
 }catch(error){setSyncStatus('off',error.message);throw error}finally{syncPromise=null}})();return syncPromise;
}
function scanLegacyLocal(){
 const candidates=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||key.startsWith(LOCAL_PREFIX)||key===ACCESS_KEY)continue;const raw=localStorage.getItem(key);if(!raw||raw.length<20)continue;try{const obj=JSON.parse(raw);const score=['tasks','groups','goals','events','yearPlan'].reduce((s,k)=>s+(Array.isArray(obj?.[k])||obj?.[k]?1:0),0);if(score)candidates.push({score,obj,key})}catch{}}
 candidates.sort((a,b)=>b.score-a.score);return candidates[0]||null;
}
async function migrateFromLegacyIframe(){
 if(new URLSearchParams(location.search).get('nomigrate')==='1')return null;
 legacyStatus='loading';return new Promise(resolve=>{
  const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px';frame.setAttribute('aria-hidden','true');
  const timer=setTimeout(()=>finish(null,'timeout'),12000);let done=false;
  function finish(value,status){if(done)return;done=true;clearTimeout(timer);legacyStatus=status;try{frame.remove()}catch{};resolve(value)}
  frame.onload=()=>{let tries=0;const poll=setInterval(()=>{tries++;try{const api=frame.contentWindow?.EKGrowthOS;if(api?.getState){clearInterval(poll);finish(clone(api.getState()),'imported')}}catch{}if(tries>100){clearInterval(poll);finish(null,'unavailable')}},80)};
  frame.onerror=()=>finish(null,'error');frame.src=`/legacy/index.html${location.search}${location.hash}`;document.body.appendChild(frame);
 });
}
async function initialState(){
 const local=loadLocal();if(local)return ensureState(local);
 let remote=null;try{remote=await fetchRemote()}catch(error){console.warn(error)}if(remote)return ensureState(remote);
 const localLegacy=scanLegacyLocal();if(localLegacy){localStorage.setItem(`ek-growth61-legacy-backup-${namespace()}`,JSON.stringify(localLegacy.obj));const migrated=normalizeLegacy(localLegacy.obj);migrated.meta.legacyStatus=`local:${localLegacy.key}`;legacyStatus='imported-local';return migrated}
 const legacy=await migrateFromLegacyIframe();if(legacy){localStorage.setItem(`ek-growth61-legacy-backup-${namespace()}`,JSON.stringify(legacy));const migrated=normalizeLegacy(legacy);migrated.meta.legacyStatus='iframe';return migrated}
 legacyStatus=legacyStatus==='loading'?'empty':legacyStatus;return defaultState();
}
function shareLink(role,userId){const params=new URLSearchParams();params.set('w',access.workspace);params.set('k',access.key);params.set('r',role);params.set('u',userId);params.set('t',uid('access'));return `${location.origin}${location.pathname}#${params.toString()}`}
function exportState(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`EXTREME-KIDS-Growth-OS-${monthKey()}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importState(file){const text=await file.text(),parsed=JSON.parse(text);state=mergeState(state,ensureState(parsed));commit(()=>{},'Импорт резервной копии',{file:file.name});return state}
function archiveMonth(month){if(!can('archive.create'))throw new Error('Недостаточно прав');const metrics=derive(month),existing=visible(state.archives).find(a=>a.month===month);const snapshot={id:existing?.id||uid('archive'),month,createdBy:currentUser().id,createdAt:existing?.createdAt||now(),updatedAt:now(),revenue:metrics.revenue,plan:metrics.plan,forecast:metrics.forecast,students:metrics.students,capacity:metrics.capacity,occupancy:metrics.occupancy,tasks:metrics.tasks.length,doneTasks:metrics.doneTasks,events:metrics.events.length,mentorStats:metrics.mentorStats.map(x=>({userId:x.user.id,students:x.students,capacity:x.capacity,occupancy:x.occupancy,tasks:x.tasks.length,done:x.done}))};commit(s=>{s.archives=mergeById(s.archives,[snapshot])},'Закрыт месяц',{month});return snapshot}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
function uiStorage(){return UI_KEY+namespace()}
function loadUI(){try{return JSON.parse(localStorage.getItem(uiStorage())||'{}')}catch{return{}}}
function saveUI(value){localStorage.setItem(uiStorage(),JSON.stringify(value))}
async function init(){
 access=parseAccess();setSyncStatus('busy','Подключаем базу…');state=await initialState();state=ensureState(state);state.meta.legacyStatus=state.meta.legacyStatus||legacyStatus;saveLocal();
 try{broadcast=new BroadcastChannel(`ek-growth61-${namespace()}`);broadcast.onmessage=event=>{if(event.data?.type==='state'&&event.data.source!==access.deviceId){state=mergeState(state,event.data.state);saveLocal();notify()}}}catch{}
 addEventListener('storage',event=>{if(event.key===localKey()&&event.newValue){try{state=mergeState(state,JSON.parse(event.newValue));notify()}catch{}}});
 if(state.settings?.autoSync)syncNow().catch(()=>{});setInterval(()=>{if(state.settings?.autoSync&&!document.hidden)syncNow().catch(()=>{})},Math.max(15,Number(state.settings?.pollSeconds)||30)*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.settings?.autoSync)syncNow().catch(()=>{})});
 return state;
}
function setRenderer(fn){renderer=typeof fn==='function'?fn:()=>{}}
function getState(){return state}
function getAccess(){return access}
function findUser(id){return visible(state?.users).find(u=>u.id===id)}
function setIdentity(role,userId){if(!ROLE_NAMES[role])return;access.role=role;access.userId=userId||({owner:'roman',manager:'sofa',head:'stas',mentor:'ivan',admin:'anya',team:'team'}[role]);localStorage.setItem(ACCESS_KEY,JSON.stringify(access));notify()}
window.EK61={VERSION,SCHEMA,MONTH_NAMES,SHORT_MONTHS,ROLE_NAMES,ROLE_HOME,TASK_STATUS,STATUS_ORDER,PRIORITY,init,getState,getAccess,currentUser,effectiveRole,findUser,visible,monthKey,monthLabel,dayInMonth,money,percent,uid,clone,clamp,can,scopedUsers,scopedGroups,scopedTasks,taskMonth,derive,commit,syncNow,subscribe,setRenderer,shareLink,exportState,importState,archiveMonth,loadUI,saveUI,setIdentity,mergeState,normalizeLegacy,getLegacyStatus:()=>legacyStatus};
window.EKGrowthOS={version:VERSION,getState,sync:syncNow,commit,derive,access:()=>access};
})();
