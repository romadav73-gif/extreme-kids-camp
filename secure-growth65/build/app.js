
(()=>{
'use strict';

const VERSION='6.1.0';
const BUILD='2026.08.31-payroll-team-readability';
const SYNC_BASE='/api/disabled-legacy/';
const DEFAULT_ROLE='owner';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const nowIso=()=>new Date().toISOString();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Math.round(Number(n)||0))+' ₽';
const compactMoney=n=>{const v=Number(n)||0;return Math.abs(v)>=1e6?(v/1e6).toFixed(v%1e6?1:0)+' млн ₽':Math.abs(v)>=1e3?(v/1e3).toFixed(0)+' тыс. ₽':money(v)};
const pct=n=>Math.round(Number(n)||0)+'%';
const formatDate=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(+d)?v:new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(d)};
const formatDateShort=v=>{if(!v)return'—';const d=new Date(v+'T12:00:00');return Number.isNaN(+d)?v:new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short'}).format(d)};
const monthLabel=key=>{const [y,m]=key.split('-').map(Number);return new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(new Date(y,m-1,1)).replace(/^./,x=>x.toUpperCase())};
const id=(p='id')=>`${p}_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
const clone=o=>structuredClone?structuredClone(o):JSON.parse(JSON.stringify(o));
const sum=(arr,fn=x=>x)=>arr.reduce((a,x)=>a+(Number(fn(x))||0),0);
const avg=arr=>arr.length?sum(arr)/arr.length:0;
const sortByDate=(a,b)=>String(a.deadline||a.date||'9999').localeCompare(String(b.deadline||b.date||'9999'));
const statusDone=v=>['done','closed','completed','выполнено','готово'].includes(String(v||'').toLowerCase());
const isOverdue=item=>!statusDone(item.status)&&item.deadline&&new Date(item.deadline+'T23:59:59')<new Date();

const ICONS={
 dashboard:'<svg viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>',
 year:'<svg viewBox="0 0 24 24"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="M8 13h3v3H8z"/></svg>',
 groups:'<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
 goals:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7"/></svg>',
 tasks:'<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
 calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
 analytics:'<svg viewBox="0 0 24 24"><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></svg>',
 archive:'<svg viewBox="0 0 24 24"><path d="M4 7h16v14H4zM3 3h18v4H3zM9 11h6"/></svg>',
 stas:'<svg viewBox="0 0 24 24"><path d="M5 21v-2a5 5 0 0 1 10 0v2"/><circle cx="10" cy="8" r="4"/><path d="m17 11 2 2 4-5"/></svg>',
 mentor:'<svg viewBox="0 0 24 24"><path d="m3 10 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 10v6"/></svg>',
 admin:'<svg viewBox="0 0 24 24"><path d="M4 20h16M6 20V8l6-4 6 4v12M9 12h6M9 16h6"/></svg>',
 team:'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-4-4m-1-12a4 4 0 0 1 0 8"/></svg>',
 settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-2.91 1.21v.09h-3v-.09A1.7 1.7 0 0 0 8.8 19l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 5.47 14H5.3v-3h.17a1.7 1.7 0 0 0 1.21-2.91l-.06-.06 2.12-2.12.06.06A1.7 1.7 0 0 0 11.7 4.76V4.6h3v.16a1.7 1.7 0 0 0 2.91 1.21l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 20.94 11h.16v3h-.16A1.7 1.7 0 0 0 19.4 15Z"/></svg>',
 revenue:'<svg viewBox="0 0 24 24"><path d="M5 20h14M7 16l3-4 3 2 4-6"/><path d="M15 8h2v2"/></svg>',
 users:'<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/></svg>',
 clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 event:'<svg viewBox="0 0 24 24"><path d="M8 3h8l1 4h4l-3 5 1 8H5l1-8-3-5h4l1-4Z"/><path d="M9 12h6"/></svg>',
 search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
 plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
 edit:'<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/></svg>',
 trash:'<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 10v6m4-6v6"/></svg>',
 copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
 download:'<svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 21h16"/></svg>',
 upload:'<svg viewBox="0 0 24 24"><path d="M12 15V3m-5 5 5-5 5 5M4 21h16"/></svg>'
};

const NAV=[
 {section:'Стратегия',items:[
  {id:'dashboard',label:'Главная Романа',icon:'dashboard',roles:['owner']},
  {id:'year',label:'Учебный год',icon:'year',roles:['owner','manager','stas']},
  {id:'groups',label:'Группы и загрузка',icon:'groups',roles:['owner','manager','stas','mentor']},
  {id:'goals',label:'План развития',icon:'goals',roles:['owner','manager','stas']}
 ]},
 {section:'Работа',items:[
  {id:'tasks',label:'Задачи',icon:'tasks',roles:['owner','manager','stas','mentor','admin']},
  {id:'calendar',label:'Календарь',icon:'calendar',roles:['owner','manager','stas','mentor','admin','team']},
  {id:'analytics',label:'Аналитика и прогноз',icon:'analytics',roles:['owner','manager','stas']},
  {id:'archive',label:'Архив',icon:'archive',roles:['owner','manager']}
 ]},
 {section:'Кабинеты',items:[
  {id:'manager',label:'Софа · управляющая',icon:'admin',roles:['owner','manager']},
  {id:'stas',label:'Стас · роллер-школа',icon:'stas',roles:['owner','manager','stas']},
  {id:'mentor',label:'Наставник',icon:'mentor',roles:['owner','manager','stas','mentor']},
  {id:'admin',label:'Администратор',icon:'admin',roles:['owner','manager','admin']},
  {id:'team',label:'Командный экран',icon:'team',roles:['owner','manager','stas','mentor','admin','team']}
 ]},
 {section:'Система',items:[{id:'settings',label:'Настройки',icon:'settings',roles:['owner']}]}
];

const ROLES={
 owner:{name:'Роман',title:'Владелец клуба',avatar:'Р',start:'dashboard'},
 manager:{name:'Софа',title:'Операционная управляющая',avatar:'С',start:'manager'},
 stas:{name:'Станислав',title:'Руководитель роллер-школы',avatar:'С',start:'stas'},
 mentor:{name:'Наставник',title:'Личный кабинет',avatar:'Н',start:'mentor'},
 admin:{name:'Администратор',title:'Продажи и клиенты',avatar:'А',start:'admin'},
 team:{name:'Команда',title:'Общий экран',avatar:'ЕК',start:'team'}
};

const PEOPLE=[
 {id:'roman',name:'Роман',role:'owner',title:'Владелец клуба',area:'Управление и развитие',avatar:'Р'},
 {id:'sofia',name:'Софа',role:'manager',title:'Операционная управляющая',area:'Клуб / администраторы / сервис / продажи',avatar:'С'},
 {id:'stas',name:'Станислав',role:'stas',title:'Руководитель роллер-школы',area:'Ролики',avatar:'С'},
 {id:'ivan',name:'Иван',role:'mentor',title:'Наставник',area:'Ролики',avatar:'И'},
 {id:'tasya',name:'Тася',role:'mentor',title:'Наставник',area:'Ролики / фигурное катание',avatar:'Т'},
 {id:'karina',name:'Карина',role:'mentor',title:'Наставник',area:'Ролики',avatar:'К'},
 {id:'artem',name:'Артём',role:'mentor',title:'Наставник',area:'Беговел / вело / BMX',avatar:'А'},
 {id:'denis',name:'Денис',role:'mentor',title:'Наставник',area:'Беговел / вело / BMX',avatar:'Д'},
 {id:'evgeny',name:'Евгений',role:'mentor',title:'Наставник',area:'Скейт',avatar:'Е'},
 {id:'dominik',name:'Доминик',role:'mentor',title:'Наставник',area:'Скейт',avatar:'Д'},
 {id:'anya',name:'Аня',role:'admin',title:'Администратор',area:'Продажи и сервис',avatar:'А'},
 {id:'adel',name:'Адель',role:'admin',title:'Администратор',area:'Продажи и сервис',avatar:'А'}
];

function group(mentorId,name,discipline,day,time,level='БАЗА',capacity=8){return{id:id('grp'),mentorId,name,discipline,day,time,level,capacity,students:0,monthlyPrice:0,prime:/1[6-9]:|20:|сб|вс/i.test(time+' '+day),status:'active',updatedAt:nowIso()}}
function seedGroups(){return[
 group('stas','Ролики · БАЗА','Ролики','Понедельник','16:00'),group('stas','Ролики · БАЗА+','Ролики','Понедельник','17:00','БАЗА+'),group('stas','Ролики · СПОРТ','Ролики','Понедельник','18:00–20:00','СПОРТ'),
 group('stas','Ролики · БАЗА','Ролики','Вторник','17:00'),group('stas','Ролики · БАЗА+','Ролики','Вторник','16:00','БАЗА+'),group('stas','Ролики · СПОРТ','Ролики','Вторник','18:00–20:00','СПОРТ'),
 group('stas','Ролики · СПОРТ · скейт-парк в Чертаново','Ролики','Среда','18:00–20:00','СПОРТ'),
 group('stas','Ролики · БАЗА','Ролики','Суббота','10:00'),group('stas','Ролики · БАЗА+','Ролики','Суббота','11:00','БАЗА+'),group('stas','Ролики · СПОРТ','Ролики','Суббота','18:00–20:00','СПОРТ'),
 group('stas','Ролики · БАЗА','Ролики','Воскресенье','11:00'),group('stas','Ролики · БАЗА+','Ролики','Воскресенье','12:00','БАЗА+'),group('stas','Ролики · СПОРТ','Ролики','Воскресенье','15:00–17:00','СПОРТ'),
 group('ivan','Ролики · БАЗА','Ролики','Среда','16:00'),group('ivan','Ролики · БАЗА+ до 7 лет','Ролики','Среда','17:00','БАЗА+'),group('ivan','Ролики · БАЗА+ 7+','Ролики','Среда','18:00','БАЗА+'),group('ivan','Ролики · СПОРТ','Ролики','Среда','19:00','СПОРТ'),
 group('ivan','Ролики · БАЗА','Ролики','Пятница','16:00'),group('ivan','Ролики · БАЗА+ до 7 лет','Ролики','Пятница','17:00','БАЗА+'),group('ivan','Ролики · БАЗА+ 7+','Ролики','Пятница','18:00','БАЗА+'),group('ivan','Ролики · СПОРТ','Ролики','Пятница','19:00','СПОРТ'),
 group('ivan','Ролики · БАЗА','Ролики','Суббота','12:00'),group('ivan','Ролики · БАЗА+ до 7 лет','Ролики','Суббота','13:00','БАЗА+'),group('ivan','Ролики · БАЗА+ 7+','Ролики','Суббота','15:00','БАЗА+'),group('ivan','Ролики · СПОРТ','Ролики','Суббота','16:00','СПОРТ'),
 group('ivan','Ролики · БАЗА','Ролики','Воскресенье','15:00'),group('ivan','Ролики · БАЗА+ общий возраст','Ролики','Воскресенье','16:00','БАЗА+'),group('ivan','Ролики · СПОРТ','Ролики','Воскресенье','17:00–19:00','СПОРТ'),
 group('tasya','Ролики · БАЗА','Ролики','Понедельник','18:00'),group('tasya','Ролики · БАЗА+','Ролики','Понедельник','17:00','БАЗА+'),group('tasya','Фигурное катание на роликах','Фигурное катание','Понедельник','19:00–21:00','ФИГУРНОЕ'),
 group('tasya','Ролики · БАЗА','Ролики','Вторник','14:00'),group('tasya','Ролики · БАЗА+','Ролики','Вторник','16:00','БАЗА+'),group('tasya','Ролики · БАЗА+','Ролики','Вторник','19:00','БАЗА+'),
 group('tasya','Ролики · БАЗА','Ролики','Среда','18:00'),group('tasya','Ролики · БАЗА+','Ролики','Среда','17:00','БАЗА+'),
 group('tasya','Ролики · БАЗА','Ролики','Четверг','14:00'),group('tasya','Ролики · БАЗА','Ролики','Четверг','18:00'),group('tasya','Ролики · БАЗА+','Ролики','Четверг','17:00','БАЗА+'),group('tasya','Фигурное катание на роликах','Фигурное катание','Четверг','19:00–21:00','ФИГУРНОЕ'),
 group('tasya','Ролики · БАЗА','Ролики','Пятница','15:00'),group('tasya','Ролики · БАЗА','Ролики','Пятница','17:00'),group('tasya','Ролики · БАЗА+','Ролики','Пятница','19:00','БАЗА+'),
 group('artem','Беговел · БАЗА','Беговел','Понедельник','17:00'),group('artem','Велосипед · БАЗА','Вело','Понедельник','18:00'),group('artem','BMX · БАЗА','BMX','Понедельник','19:00'),
 group('artem','Беговел · БАЗА','Беговел','Пятница','17:00'),group('artem','Велосипед · БАЗА','Вело','Пятница','18:00'),group('artem','BMX · БАЗА','BMX','Пятница','19:00'),
 group('artem','Беговел · БАЗА','Беговел','Суббота','10:00'),group('artem','Велосипед · БАЗА','Вело','Суббота','13:00'),group('artem','BMX · БАЗА','BMX','Суббота','17:00'),
 group('artem','Беговел · БАЗА','Беговел','Воскресенье','11:00'),group('artem','Велосипед · БАЗА','Вело','Воскресенье','12:00'),group('artem','Велосипед · БАЗА','Вело','Воскресенье','16:00'),group('artem','Беговел · БАЗА+','Беговел','Воскресенье','17:00','БАЗА+'),group('artem','BMX · СПОРТ','BMX','Воскресенье','18:00–20:00','СПОРТ'),
 group('denis','Беговел · БАЗА','Беговел','Среда','16:00'),group('denis','Велосипед · БАЗА','Вело','Среда','17:00'),group('denis','BMX · БАЗА','BMX','Среда','18:00'),
 group('denis','Беговел · БАЗА','Беговел','Пятница','16:00'),group('denis','BMX · БАЗА','BMX','Пятница','17:00'),group('denis','Велосипед · БАЗА','Вело','Пятница','18:00'),
 group('denis','Беговел · БАЗА','Беговел','Суббота','10:00'),group('denis','Велосипед · БАЗА','Вело','Суббота','11:00'),group('denis','BMX · БАЗА','BMX','Суббота','12:00'),group('denis','Велосипед · БАЗА','Вело','Суббота','17:00'),group('denis','BMX · БАЗА','BMX','Суббота','18:00')
]}

function seedMonths(){
 const list=[
  ['2026-09',2500000,3800000,4200000,'Набор, возврат старой базы и занятие мест в расписании'],
  ['2026-10',2500000,3200000,3700000,'Дозагрузка слабых групп и первые продления'],
  ['2026-11',2500000,3000000,3500000,'Удержание, длинные абонементы и спорт-группы'],
  ['2026-12',2500000,3500000,4500000,'Новый год, подарки и клубные мероприятия'],
  ['2027-01',2500000,2800000,3300000,'Каникулы, интенсивы и возврат после праздников'],
  ['2027-02',2500000,3000000,3500000,'Развитие спортивных групп и соревнования'],
  ['2027-03',2500000,3200000,3700000,'Весенние продажи и каникулярные продукты'],
  ['2027-04',2500000,3200000,3700000,'Удержание, семейные мероприятия и соревнования'],
  ['2027-05',2500000,3000000,3500000,'Предпродажи лета и сохранение базы'],
  ['2027-06',2500000,3400000,4200000,'Лагерь, сборы и летние интенсивы'],
  ['2027-07',2500000,3000000,3800000,'Летние программы, индивидуалки и сборы'],
  ['2027-08',2500000,3200000,4000000,'Предпродажи нового сезона и возврат базы']
 ];
 return Object.fromEntries(list.map(([key,minimum,target,stretch,focus])=>[key,{key,label:monthLabel(key),minimum,target,stretch,fact:0,daily:[],focus,loadTarget:key==='2026-09'?75:80,updatedAt:nowIso()}]));
}

function seedState(){
 const stamp=nowIso();
 return{
  version:6,
  meta:{createdAt:stamp,updatedAt:stamp,revision:1,build:BUILD},
  settings:{clubName:'EXTREME KIDS Тропарёво',currentMonth:'2026-09',minimumRevenue:2500000,normalRevenue:3000000,strongRevenue:3500000,stretchRevenue:4200000,defaultMonthlyRevenuePerChild:0,autoSync:true,syncInterval:25000,managerSite:'https://extreme-kids-troparevo-control.vercel.app/'},
  people:clone(PEOPLE),
  months:seedMonths(),
  groups:seedGroups(),
  goals:[
   {id:id('goal'),title:'Не допускать месяцев ниже 2,5 млн ₽',category:'Финансы',ownerId:'roman',deadline:'2027-08-31',progress:0,status:'active',priority:'high',metric:'Выручка',target:2500000,current:0,notes:'Минимальный безопасный пол клуба.',updatedAt:stamp},
   {id:id('goal'),title:'Загрузить прайм-тайм до 85%',category:'Загрузка',ownerId:'stas',deadline:'2026-10-31',progress:0,status:'active',priority:'high',metric:'Загрузка',target:85,current:0,notes:'В первую очередь — существующие слоты.',updatedAt:stamp},
   {id:id('goal'),title:'Увеличить продления на 10 п.п.',category:'Продажи',ownerId:'anya',deadline:'2026-12-31',progress:0,status:'active',priority:'medium',metric:'Продления',target:10,current:0,notes:'Персональная работа до окончания абонемента.',updatedAt:stamp},
   {id:id('goal'),title:'Проводить минимум 2 активности в месяц',category:'Мероприятия',ownerId:'stas',deadline:'2027-08-31',progress:0,status:'active',priority:'medium',metric:'Активности',target:2,current:0,notes:'Одно большое мероприятие и одна небольшая активность.',updatedAt:stamp}
  ],
  tasks:[
   {id:id('task'),title:'Заполнить вместимость всех групп',description:'По каждой группе указать фактическую вместимость и текущих детей.',ownerId:'stas',deadline:'2026-08-31',priority:'high',status:'todo',linkType:'groups',linkId:'',updatedAt:stamp},
   {id:id('task'),title:'Зафиксировать финансовый план сентября',description:'Минимум 2,5 млн, цель 3,8 млн, сильный результат 4,2 млн.',ownerId:'roman',deadline:'2026-09-01',priority:'high',status:'inprogress',linkType:'month',linkId:'2026-09',updatedAt:stamp},
   {id:id('task'),title:'Вернуть старую клиентскую базу',description:'Персонально предложить подходящую группу и закрепить место.',ownerId:'anya',deadline:'2026-09-07',priority:'high',status:'todo',linkType:'sales',linkId:'',updatedAt:stamp},
   {id:id('task'),title:'Подготовить «Арбузные зарубы»',description:'Регистрация, категории, родители, наставники и финальный тайминг.',ownerId:'stas',deadline:'2026-09-09',priority:'high',status:'inprogress',linkType:'event',linkId:'watermelon',updatedAt:stamp},
   {id:id('task'),title:'Собрать рекомендации наставников по детям',description:'Повышение уровня, вторая тренировка, спорт-группа, индивидуалки.',ownerId:'stas',deadline:'2026-09-05',priority:'medium',status:'todo',linkType:'recommendations',linkId:'',updatedAt:stamp}
  ],
  events:[
   {id:'watermelon',type:'competition',title:'Арбузные зарубы',date:'2026-09-12',time:'16:00',venue:'Одинцово / Ново-Переделкино',ownerId:'stas',status:'selling',participantsPlan:20,participantsFact:0,pricePlan:0,priceFact:0,revenuePlan:0,revenueFact:0,costPlan:0,costFact:0,gifts:'Медали, подарки младшим категориям, арбузы',plan:'Роллерспорт Кросс, BMX, скейт, самокат, беговел и велогонка.',actual:'',notes:'Регистрация через EXTREME KIDS Тропарёво.',updatedAt:stamp},
   {id:id('event'),type:'club',title:'Открытие нового учебного года',date:'2026-09-05',time:'15:00',venue:'EXTREME KIDS Тропарёво',ownerId:'roman',status:'planning',participantsPlan:30,participantsFact:0,pricePlan:0,priceFact:0,revenuePlan:0,revenueFact:0,costPlan:0,costFact:0,gifts:'',plan:'Открытая тренировка, знакомство с наставниками, подбор групп.',actual:'',notes:'',updatedAt:stamp}
  ],
  recommendations:[],
  sales:{trialsPlanned:0,trialsVisited:0,purchases:0,renewalsDue:0,renewalsContacted:0,renewalsPaid:0,adminPlans:{anya:0,adel:0},adminFacts:{anya:0,adel:0},updatedAt:stamp},
  salesByMonth:{},
  archive:[],
  activity:[],
  ui:{selectedMentor:'stas',groupSearch:'',groupMentor:'all',groupDiscipline:'all',taskOwner:'all',taskMonthMode:'selected',eventType:'all'}
 };
}

let credentials={workspace:'secure',role:'team',token:''};
let state=null;
let currentView='dashboard';
let currentRole=credentials.role||DEFAULT_ROLE;
let syncTimer=null;
let saveTimer=null;
let syncing=false;
let channel=null;
let lastRemotePush=0;
let suppressRender=false;

function parseCredentials(){
 const p=new URLSearchParams(location.hash.replace(/^#/,''));
 let workspace=p.get('w');
 let key=p.get('k');
 let role=p.get('r')||DEFAULT_ROLE;
 let token=p.get('t')||'';
 if(!workspace){workspace='ek-growth-'+crypto.getRandomValues(new Uint32Array(2)).join('').slice(0,13)}
 if(!key){key=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('')}
 if(!ROLES[role])role=DEFAULT_ROLE;
 if(!p.get('w')||!p.get('k')){
  p.set('w',workspace);p.set('k',key);p.set('r',role);if(!token)p.set('t','owner-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36));
  history.replaceState(null,'',location.pathname+location.search+'#'+p.toString());
 }
 return{workspace,key,role,token:p.get('t')||token};
}
function storageKey(){return`EK_GROWTH_OS_6:${credentials.workspace}`}
function roleInfo(){return ROLES[currentRole]||ROLES.owner}
function person(id){return state.people.find(x=>x.id===id)||{id,name:'—',avatar:'?'} }
function currentMonth(){return state.months[state.settings.currentMonth]||Object.values(state.months)[0]}
function activeGroups(){return state.groups.filter(x=>!x.deletedAt&&x.status!=='archived')}
function activeTasks(){return state.tasks.filter(x=>!x.deletedAt)}
function activeEvents(){return state.events.filter(x=>!x.deletedAt)}
function activeGoals(){return state.goals.filter(x=>!x.deletedAt)}
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
function loadStats(list=activeGroups()){
 const capacity=sum(list,g=>g.capacity),students=sum(list,g=>g.students);return{capacity,students,free:Math.max(0,capacity-students),load:capacity?students/capacity*100:0};
}
function taskStats(list=currentMonthTasks()){
 const done=list.filter(x=>statusDone(x.status)).length,over=list.filter(isOverdue).length;return{total:list.length,done,open:list.length-done,over,progress:list.length?done/list.length*100:0};
}
function monthFact(m=currentMonth()){const daily=sum(m.daily||[],x=>x.amount);return daily>0?daily:Number(m.fact)||0}
function dayOfProjection(key){
 const [y,m]=key.split('-').map(Number),now=new Date(),days=new Date(y,m,0).getDate();
 if(now.getFullYear()===y&&now.getMonth()+1===m)return{elapsed:Math.max(1,now.getDate()),days,mode:'current'};
 const target=new Date(y,m-1,1);
 if(target>now)return{elapsed:0,days,mode:'future'};
 return{elapsed:days,days,mode:'past'};
}
function forecast(m=currentMonth()){
 const fact=monthFact(m),{elapsed,days,mode}=dayOfProjection(m.key);
 if(mode==='future'&&fact===0)return{fact,base:0,low:0,high:0,elapsed,days,mode,pace:0,probability:0};
 const daily=(m.daily||[]).map(x=>Number(x.amount)||0).filter(x=>x>=0);
 let base=0;
 if(mode==='past')base=fact;
 else{
  const average=elapsed?fact/elapsed:0;
  const recent=daily.slice(-7);
  const recentAvg=recent.length?avg(recent):average;
  const weighted=recent.length>=3?recentAvg*.62+average*.38:average;
  base=fact+weighted*Math.max(0,days-elapsed);
 }
 const volatility=daily.length>2?Math.sqrt(avg(daily.map(v=>(v-avg(daily))**2))):base*.08;
 const ratio=m.target?base/m.target:0;
 const probability=Math.round(100/(1+Math.exp(-8*(ratio-1))) * (1-Math.min(.24,volatility/Math.max(1,base))));
 return{fact,base,low:base*.88,high:base*1.15,elapsed,days,mode,pace:m.target?base/m.target*100:0,probability:clamp(probability,0,99)};
}
function groupRevenueStats(list=activeGroups()){
 const capacity=sum(list,g=>g.capacity),students=sum(list,g=>g.students),potential=sum(list,g=>(g.capacity||0)*(g.monthlyPrice||state.settings.defaultMonthlyRevenuePerChild||0)),current=sum(list,g=>(g.students||0)*(g.monthlyPrice||state.settings.defaultMonthlyRevenuePerChild||0));
 return{capacity,students,potential,current,lost:Math.max(0,potential-current)};
}

function ensureState(raw){
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
}
function loadLocal(){
 try{const raw=localStorage.getItem(storageKey());return raw?ensureState(JSON.parse(raw)):seedState()}catch(e){console.warn('LOCAL_LOAD_FAILED',e);return seedState()}
}
function persistLocal(){try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch(e){console.warn('LOCAL_SAVE_FAILED',e)}}
function logActivity(type,text){state.activity.unshift({id:id('act'),type,text,at:nowIso()});state.activity=state.activity.slice(0,120)}
function touch(reason='Изменение данных'){
 state.meta.updatedAt=nowIso();state.meta.revision=(Number(state.meta.revision)||0)+1;state.meta.build=BUILD;persistLocal();
 if(reason)logActivity('change',reason);
 if(channel)try{channel.postMessage({type:'state',state,at:state.meta.updatedAt})}catch{}
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(state.settings.autoSync)syncNow({quiet:true,push:true})},850);
 if(!suppressRender)renderCurrentView();
}

function bytesToB64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
function b64ToBytes(v){const s=atob(v),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
async function cryptoKey(){
 let bytes;
 if(/^[0-9a-f]{64}$/i.test(credentials.key))bytes=Uint8Array.from(credentials.key.match(/../g),x=>parseInt(x,16));
 else bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(credentials.key)));
 return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function encryptState(value){
 const iv=crypto.getRandomValues(new Uint8Array(12)),key=await cryptoKey(),data=new TextEncoder().encode(JSON.stringify(value));
 const enc=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data));
 return JSON.stringify({v:6,alg:'A256GCM',iv:bytesToB64(iv),data:bytesToB64(enc),updatedAt:value.meta?.updatedAt||nowIso()});
}
async function decryptPayload(payload){
 if(payload==null)return null;
 if(typeof payload==='object'&&payload.data!==undefined&&Object.keys(payload).length<=5)payload=payload.data;
 if(typeof payload==='object'&&payload.state)payload=payload.state;
 if(typeof payload==='object'&&payload.version)return ensureState(payload);
 if(typeof payload!=='string')return ensureState(payload);
 let parsed;
 try{parsed=JSON.parse(payload)}catch{return null}
 if(parsed&&parsed.alg==='A256GCM'&&parsed.iv&&parsed.data){
  const key=await cryptoKey();
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(parsed.iv)},key,b64ToBytes(parsed.data));
  return ensureState(JSON.parse(new TextDecoder().decode(plain)));
 }
 if(parsed&&parsed.data&&typeof parsed.data==='string')return decryptPayload(parsed.data);
 return ensureState(parsed);
}
function recordMap(list){const m=new Map();(list||[]).forEach(x=>x&&x.id&&m.set(x.id,x));return m}
function newer(a,b){if(a?.deletedAt&&!b?.deletedAt)return a;if(b?.deletedAt&&!a?.deletedAt)return b;return String(a?.deletedAt||a?.updatedAt||a?.meta?.updatedAt||'')>=String(b?.deletedAt||b?.updatedAt||b?.meta?.updatedAt||'')?a:b}
function mergeLists(local,remote){const map=recordMap(local);for(const item of remote||[]){const old=map.get(item.id);map.set(item.id,old?newer(old,item):item)}return[...map.values()]}
function mergeStates(local,remote){
 if(!remote)return local;if(!local)return remote;
 const base=newer(local,remote)===local?clone(local):clone(remote);
 base.groups=mergeLists(local.groups,remote.groups);base.tasks=mergeLists(local.tasks,remote.tasks);base.goals=mergeLists(local.goals,remote.goals);base.events=mergeLists(local.events,remote.events);base.recommendations=mergeLists(local.recommendations,remote.recommendations);base.archive=mergeLists(local.archive,remote.archive);base.people=mergeLists(local.people,remote.people);
 base.months={...local.months,...remote.months};for(const k of new Set([...Object.keys(local.months||{}),...Object.keys(remote.months||{})]))base.months[k]=newer(local.months?.[k],remote.months?.[k]);
 base.salesByMonth={};for(const k of new Set([...Object.keys(local.salesByMonth||{}),...Object.keys(remote.salesByMonth||{})]))base.salesByMonth[k]=newer(local.salesByMonth?.[k],remote.salesByMonth?.[k]);
 base.sales=newer(local.sales,remote.sales);base.settings={...local.settings,...remote.settings,...(newer(local,remote)===local?local.settings:remote.settings)};base.ui={...(local.ui||{})};
 base.activity=[...(local.activity||[]),...(remote.activity||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at))).filter((x,i,a)=>i===a.findIndex(y=>y.id===x.id)).slice(0,120);
 base.meta={...base.meta,updatedAt:[local.meta?.updatedAt,remote.meta?.updatedAt].sort().pop(),revision:Math.max(Number(local.meta?.revision)||0,Number(remote.meta?.revision)||0),build:BUILD};base.version=6;return ensureState(base);
}
async function fetchRemote(){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
 try{
  const res=await fetch(`${SYNC_BASE}${encodeURIComponent(credentials.workspace)}/state`,{cache:'no-store',signal:ctrl.signal,headers:{Accept:'application/json'}});
  if(res.status===404||res.status===204)return null;if(!res.ok)throw new Error(`GET ${res.status}`);
  const text=await res.text();if(!text.trim())return null;let body;try{body=JSON.parse(text)}catch{body=text}return decryptPayload(body);
 }finally{clearTimeout(timer)}
}
async function pushRemote(value){
 const payload=await encryptState(value),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
 try{
  const res=await fetch(`${SYNC_BASE}${encodeURIComponent(credentials.workspace)}/state`,{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({data:payload})});
  if(!res.ok)throw new Error(`POST ${res.status}`);lastRemotePush=Date.now();return true;
 }finally{clearTimeout(timer)}
}
function setSyncStatus(status,sub){
 const dot=$('#workspaceDot'),label=$('#workspaceStatus'),small=$('#workspaceSub'),spin=$('#syncSpinner');if(!dot)return;
 dot.className='workspace-dot'+(status==='busy'?' busy':status==='off'?' off':'');spin.className='sync-spinner'+(status==='busy'?' busy':'');
 label.textContent=status==='busy'?'Синхронизация…':status==='off'?'Локальный режим':'Синхронизировано';small.textContent=sub|| (status==='off'?'Данные сохранены на устройстве':new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date()));
}
async function syncNow({quiet=false,push=true}={}){
 if(syncing)return false;syncing=true;setSyncStatus('busy','Обмен данными между устройствами');
 try{
  const remote=await fetchRemote();const merged=mergeStates(state,remote);const changed=JSON.stringify(merged)!==JSON.stringify(state);state=merged;persistLocal();
  if(push||!remote||String(state.meta.updatedAt)>String(remote.meta?.updatedAt))await pushRemote(state);
  setSyncStatus('ok','Общая база обновлена');if(changed){suppressRender=true;renderShell();renderCurrentView();suppressRender=false}if(!quiet)toast('Данные синхронизированы','Все устройства увидят изменения.');return true;
 }catch(e){console.warn('SYNC_FAILED',e);setSyncStatus('off','Синхронизация повторится автоматически');if(!quiet)toast('Не удалось связаться с общей базой',e.message,'error');return false}
 finally{syncing=false}
}

function toast(title,sub='',type='ok'){
 const el=document.createElement('div');el.className='toast'+(type==='error'?' error':'');el.innerHTML=`<b>${esc(title)}</b>${sub?`<small>${esc(sub)}</small>`:''}`;$('#toastStack').appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(20px)';setTimeout(()=>el.remove(),250)},3400)
}
function openModal({title,kicker='EXTREME KIDS',subtitle='',body}){$('#modalTitle').textContent=title;$('#modalKicker').textContent=kicker;$('#modalSubtitle').textContent=subtitle;$('#modalBody').innerHTML=body;$('#modal').classList.remove('hidden');$('#modal').setAttribute('aria-hidden','false');setTimeout(()=>$('#modal input, #modal select, #modal textarea')?.focus(),80)}
function closeModal(){$('#modal').classList.add('hidden');$('#modal').setAttribute('aria-hidden','true');$('#modalBody').innerHTML=''}

function navBadge(view){if(view==='tasks')return taskStats().open||'';if(view==='calendar')return activeEvents().filter(x=>x.date>=today()).length||'';if(view==='groups')return loadStats().free||'';return''}
function allowedView(id){return NAV.flatMap(s=>s.items).find(x=>x.id===id)?.roles.includes(currentRole)}
function renderNav(){
 const nav=$('#mainNav');nav.innerHTML=NAV.map(section=>{const items=section.items.filter(x=>x.roles.includes(currentRole));if(!items.length)return'';return`<div class="nav-section">${esc(section.section)}</div>${items.map(x=>`<button class="nav-btn ${currentView===x.id?'active':''}" data-view="${x.id}"><span class="nav-icon">${ICONS[x.icon]}</span><span>${esc(x.label)}</span>${navBadge(x.id)?`<span class="nav-badge">${navBadge(x.id)}</span>`:''}</button>`).join('')}`}).join('');
 const mobileIds=currentRole==='owner'?['dashboard','tasks','calendar','analytics','team']:[roleInfo().start,'tasks','calendar','team','groups'].filter((x,i,a)=>allowedView(x)&&a.indexOf(x)===i).slice(0,5);
 $('#mobileNav').innerHTML=mobileIds.map(v=>{const item=NAV.flatMap(s=>s.items).find(x=>x.id===v);return`<button class="${currentView===v?'active':''}" data-view="${v}">${ICONS[item.icon]}<span>${esc(item.label.split(' ')[0])}</span></button>`}).join('');
}
function renderMonthSelect(){const select=$('#monthSelect');select.innerHTML=Object.keys(state.months).sort().map(k=>`<option value="${k}" ${state.settings.currentMonth===k?'selected':''}>${esc(state.months[k].label||monthLabel(k))}</option>`).join('')}
function renderProfile(){const r=roleInfo();$('#sidebarAvatar').textContent=r.avatar;$('#sidebarName').textContent=r.name;$('#sidebarRole').textContent=r.title;$('#topAvatar').textContent=r.avatar;$('#topRoleName').textContent=r.name;$('#topRoleTitle').textContent=r.title}
function renderRoleMenu(){if(currentRole!=='owner'){ $('#rolePopover').classList.add('hidden');return}$('#rolePopover').innerHTML=Object.entries(ROLES).map(([key,r])=>`<button data-action="switchRole" data-role="${key}"><span class="avatar small">${esc(r.avatar)}</span><span><b>${esc(r.name)}</b><small>${esc(r.title)}</small></span></button>`).join('')}
function renderShell(){renderNav();renderMonthSelect();renderProfile();renderRoleMenu()}
function switchRole(role){if(!ROLES[role])return;currentRole=role;credentials.role=role;const p=new URLSearchParams(location.hash.slice(1));p.set('r',role);history.replaceState(null,'',location.pathname+location.search+'#'+p.toString());currentView=ROLES[role].start;renderShell();renderCurrentView();$('#rolePopover').classList.add('hidden')}
function setView(view){if(!allowedView(view))view=roleInfo().start;currentView=view;renderShell();renderCurrentView();$('#sidebar').classList.remove('open');$('#sidebarScrim').classList.add('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function pageTitle(view){return NAV.flatMap(s=>s.items).find(x=>x.id===view)?.label||'Growth OS'}
function renderCurrentView(){if(!allowedView(currentView))currentView=roleInfo().start;$('#pageTitle').textContent=pageTitle(currentView);const renderers={dashboard:renderDashboard,year:renderYear,groups:renderGroups,goals:renderGoals,tasks:renderTasks,calendar:renderCalendar,analytics:renderAnalytics,archive:renderArchive,manager:renderManager,stas:renderStas,mentor:renderMentor,admin:renderAdmin,team:renderTeam,settings:renderSettings};$('#pages').innerHTML=(renderers[currentView]||renderDashboard)();renderNav();animateNumbers()}
function animateNumbers(){requestAnimationFrame(()=>$$('[data-count]').forEach(el=>{const target=Number(el.dataset.count)||0,duration=500,start=performance.now();const prefix=el.dataset.prefix||'',suffix=el.dataset.suffix||'';function frame(t){const p=Math.min(1,(t-start)/duration),v=Math.round(target*(1-Math.pow(1-p,3)));el.textContent=prefix+new Intl.NumberFormat('ru-RU').format(v)+suffix;if(p<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}))}

function metricCard(label,value,sub,icon='revenue',progress=null,trend=''){return`<div class="card metric-card"><div class="metric-top"><span class="metric-label">${esc(label)}</span><span class="metric-icon">${ICONS[icon]}</span></div><div class="metric-value">${value}</div><div class="metric-sub">${esc(sub)}</div>${trend?`<span class="metric-trend">${esc(trend)}</span>`:''}${progress!==null?`<div class="progress"><i style="width:${clamp(progress,0,100)}%"></i></div>`:''}</div>`}
function pageHead(kicker,title,sub,actions=''){return`<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div>${actions?`<div class="page-actions">${actions}</div>`:''}</div>`}
function loadPill(load){const c=load<40?'red':load<75?'muted':'';return`<span class="pill ${c}">${pct(load)}</span>`}
function groupLoad(g){return g.capacity?g.students/g.capacity*100:0}
function disciplineEmoji(d){return/ролик/i.test(d)?'🛼':/фигур/i.test(d)?'✨':/bmx/i.test(d)?'🚴':/вело/i.test(d)?'🚲':/бегов/i.test(d)?'🚲':/скейт/i.test(d)?'🛹':'⚡'}
function typeLabel(t){return({competition:'Соревнования',camp:'Лагерь',gathering:'Сборы',club:'Клубное',marketing:'Маркетинг',meeting:'Собрание',deadline:'Дедлайн'}[t]||'Событие')}
function statusLabel(s){return({todo:'К выполнению',inprogress:'В работе',review:'Проверка',done:'Готово',planning:'Планирование',selling:'Идёт набор',ready:'Готово',completed:'Завершено',active:'В работе',paused:'Пауза'}[s]||s||'—')}
function priorityLabel(p){return({high:'Высокий',medium:'Средний',low:'Низкий'}[p]||p)}

function renderDashboard(){
 const m=currentMonth(),f=forecast(m),ls=loadStats(),ts=taskStats(),events=activeEvents().filter(x=>x.date>=today()).sort(sortByDate),fact=monthFact(m),progress=m.target?fact/m.target*100:0;
 const priorities=currentMonthTasks().filter(x=>!statusDone(x.status)).sort((a,b)=>(a.priority==='high'?-1:1)-(b.priority==='high'?-1:1)||sortByDate(a,b)).slice(0,4);
 const signals=[];if(f.mode==='future')signals.push({red:false,title:'Месяц ещё не начался',sub:'Прогноз появится после первых фактических поступлений.'});else if(f.base<state.settings.minimumRevenue)signals.push({red:true,title:'Риск ниже 2,5 млн ₽',sub:`Базовый прогноз: ${compactMoney(f.base)}.`});else if(f.base<m.target)signals.push({red:false,title:'План пока не обеспечен темпом',sub:`До целевого прогноза не хватает ${compactMoney(m.target-f.base)}.`});else signals.push({red:false,title:'Темп выше плана',sub:'Главная задача — удержать продажи и загрузку.'});if(ls.capacity===0)signals.push({red:true,title:'Не заполнена вместимость групп',sub:'Без неё сайт не сможет считать загрузку и свободные места.'});else if(ls.load<75)signals.push({red:false,title:'Есть резерв в расписании',sub:`Свободно ${ls.free} мест, средняя загрузка ${pct(ls.load)}.`});if(ts.over)signals.push({red:true,title:`Просрочено задач: ${ts.over}`,sub:'Нужно назначить новый срок или закрыть задачу.'});
 const lowGroups=activeGroups().slice().sort((a,b)=>groupLoad(a)-groupLoad(b)).slice(0,7);
 return`<div class="page">
  ${pageHead('Штаб владельца','Главная Романа',`${m.label}: деньги, загрузка, команда и приоритеты`, `<button class="btn btn-ghost" data-action="editMonth">План / факт</button><button class="btn btn-primary" data-action="quickAdd">+ Добавить</button>`)}
  <div class="grid-main">
   <section class="card hero">
    <div class="hero-top"><div><div class="eyebrow">ТЕКУЩИЙ МЕСЯЦ · ${esc(m.key)}</div><h3 class="hero-title">Факт выручки</h3><div class="hero-value">${compactMoney(fact)}</div><div class="hero-sub">План ${compactMoney(m.target)} · сильная цель ${compactMoney(m.stretch)} · прогноз ${f.base?compactMoney(f.base):'после старта'}</div></div><div class="hero-actions"><button class="btn btn-primary" data-action="addRevenue">+ Поступление</button><button class="btn btn-ghost" data-view="analytics">Открыть прогноз</button></div></div>
    <div class="hero-progress"><i style="width:${clamp(progress,0,100)}%"></i></div>
    <div class="zones"><div class="zone ${fact<2500000?'active red':''}"><b>&lt; 2,5 млн</b><small>Красная зона</small></div><div class="zone ${fact>=2500000&&fact<3000000?'active':''}"><b>2,5–3,0</b><small>База</small></div><div class="zone ${fact>=3000000&&fact<3500000?'active':''}"><b>3,0–3,5</b><small>Хороший месяц</small></div><div class="zone ${fact>=3500000?'active':''}"><b>3,5–4,5+</b><small>Сильный месяц</small></div></div>
   </section>
   <section class="card pad"><div class="card-head"><div><h3>Красные сигналы</h3><p>Что требует решения сейчас</p></div><button class="btn btn-small btn-ghost" data-view="analytics">Подробнее</button></div><div class="signal-list">${signals.slice(0,4).map(x=>`<div class="signal-item"><i class="item-dot ${x.red?'red':''}"></i><div class="item-main"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div></div>`).join('')}</div></section>
  </div>
  <div class="grid-4">
   ${metricCard('Загрузка групп',pct(ls.load),`${ls.students}/${ls.capacity} мест · свободно ${ls.free}`,'users',ls.load,ls.load>=75?'Рабочая зона':'Нужны продажи')}
   ${metricCard('Открытые задачи',String(ts.open),`${ts.over} просрочено · выполнено ${ts.done}`,'tasks',ts.progress,ts.over?'Есть просрочки':'Контроль команды')}
   ${metricCard('Мероприятия',String(events.length),events[0]?`Ближайшее: ${events[0].title}`:'Нет ближайших событий','event',null,'Календарь клуба')}
   ${metricCard('Выполнение плана',pct(progress),`Осталось ${compactMoney(Math.max(0,m.target-fact))}`,'revenue',progress,f.probability?`Вероятность цели ${f.probability}%`:'Ожидание данных')}
  </div>
  <div class="grid-main">
   <section class="card pad"><div class="card-head"><div><h3>4 главных приоритета</h3><p>Задачи, которые сильнее всего влияют на результат месяца</p></div><button class="btn btn-small btn-ghost" data-view="tasks">Все задачи</button></div><div class="priority-list">${priorities.length?priorities.map((t,i)=>`<div class="priority-item" data-action="editTask" data-id="${t.id}"><span class="item-index">${i+1}</span><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)} · до ${formatDateShort(t.deadline)} · ${esc(statusLabel(t.status))}</small></div><span class="item-meta">${esc(priorityLabel(t.priority))}</span></div>`).join(''):`<div class="empty"><b>Приоритетов пока нет</b>Добавьте задачи на неделю.</div>`}</div></section>
   <section class="card pad"><div class="card-head"><div><h3>Ближайшие события</h3><p>Мероприятия и контрольные точки</p></div><button class="btn btn-small btn-ghost" data-view="calendar">Календарь</button></div><div class="event-list">${events.slice(0,5).map(e=>`<div class="event-item" data-action="editEvent" data-id="${e.id}"><i class="item-dot"></i><div class="item-main"><b>${esc(e.title)}</b><small>${formatDate(e.date)} · ${esc(e.venue||'Место уточняется')}</small></div><span class="pill">${esc(typeLabel(e.type))}</span></div>`).join('')||'<div class="empty"><b>Событий пока нет</b>Создайте мероприятие или дедлайн.</div>'}</div></section>
  </div>
  <section class="card pad"><div class="card-head"><div><h3>Группы, которым нужны продажи</h3><p>Самая низкая загрузка в действующем расписании</p></div><button class="btn btn-small btn-ghost" data-view="groups">Все группы</button></div>${groupsMiniTable(lowGroups)}</section>
 </div>`
}
function groupsMiniTable(list){return`<div class="table-wrap"><table class="data-table"><thead><tr><th>Группа</th><th>Наставник</th><th>Расписание</th><th>Загрузка</th><th>Свободно</th></tr></thead><tbody>${list.map(g=>{const l=groupLoad(g);return`<tr data-action="editGroup" data-id="${g.id}"><td><div class="table-title"><span class="discipline-icon">${disciplineEmoji(g.discipline)}</span><div><b>${esc(g.name)}</b><small>${esc(g.level)}</small></div></div></td><td>${esc(person(g.mentorId).name)}</td><td>${esc(g.day)} · ${esc(g.time)}</td><td><div class="load-cell"><b>${g.students}/${g.capacity}</b><div class="loadbar"><i class="${l<40?'red':''}" style="width:${clamp(l,0,100)}%"></i></div></div></td><td>${Math.max(0,g.capacity-g.students)}</td></tr>`}).join('')}</tbody></table></div>`}

function renderYear(){const keys=Object.keys(state.months).sort();return`<div class="page">${pageHead('СТРАТЕГИЯ 2026/27','Учебный год','Каждый месяц: минимум, цель, сильная планка, факт и главный фокус',`<button class="btn btn-primary" data-action="editMonth">Изменить месяц</button>`)}<div class="month-grid">${keys.map(k=>{const m=state.months[k],fact=monthFact(m),pr=m.target?fact/m.target*100:0;return`<article class="card month-card ${state.settings.currentMonth===k?'current':''}" data-action="selectMonth" data-key="${k}"><div class="month-top"><div><div class="eyebrow">${esc(k)}</div><div class="month-name">${esc(m.label||monthLabel(k))}</div></div>${state.settings.currentMonth===k?'<span class="pill">Текущий</span>':''}</div><p class="month-focus">${esc(m.focus||'Фокус не задан')}</p><div class="month-values"><div><span>Минимум</span><b>${compactMoney(m.minimum)}</b></div><div><span>Цель</span><b>${compactMoney(m.target)}</b></div><div><span>Сильный</span><b>${compactMoney(m.stretch)}</b></div></div><div class="progress"><i style="width:${clamp(pr,0,100)}%"></i></div><div class="metric-sub">Факт ${compactMoney(fact)} · ${pct(pr)} цели</div></article>`}).join('')}</div></div>`}

function renderGroups(){
 const all=activeGroups(),mentor=state.ui.groupMentor||'all',discipline=state.ui.groupDiscipline||'all',q=(state.ui.groupSearch||'').toLowerCase();let list=all.filter(g=>(mentor==='all'||g.mentorId===mentor)&&(discipline==='all'||g.discipline===discipline)&&(!q||`${g.name} ${g.day} ${g.time} ${person(g.mentorId).name}`.toLowerCase().includes(q)));
 const ls=loadStats(list),rev=groupRevenueStats(list),disc=[...new Set(all.map(g=>g.discipline))].sort(),mentors=[...new Set(all.map(g=>g.mentorId))].map(person).sort((a,b)=>a.name.localeCompare(b.name));
 return`<div class="page">${pageHead('РАСПИСАНИЕ И ДЕНЬГИ','Группы и загрузка','Наставник → группа → вместимость → дети → свободные места → потенциальная выручка',`<button class="btn btn-ghost" data-action="capacityAudit">Аудит вместимости</button><button class="btn btn-primary" data-action="addGroup">+ Группа</button>`)}
 <div class="grid-4">${metricCard('Средняя загрузка',pct(ls.load),`${ls.students}/${ls.capacity} мест`,'users',ls.load)}${metricCard('Свободные места',String(ls.free),'Главный резерв без расширения','groups',null)}${metricCard('Текущая оценка',compactMoney(rev.current),'На основе цены в карточках групп','revenue',rev.potential?rev.current/rev.potential*100:null)}${metricCard('Резерв выручки',compactMoney(rev.lost),'Если заполнить свободные места','analytics',null)}</div>
 <div class="toolbar"><div class="filters"><select class="select" style="width:auto" data-filter="groupMentor"><option value="all">Все наставники</option>${mentors.map(p=>`<option value="${p.id}" ${mentor===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><select class="select" style="width:auto" data-filter="groupDiscipline"><option value="all">Все направления</option>${disc.map(d=>`<option value="${esc(d)}" ${discipline===d?'selected':''}>${esc(d)}</option>`).join('')}</select></div><div class="search">${ICONS.search}<input class="input" data-filter="groupSearch" placeholder="Найти группу" value="${esc(state.ui.groupSearch||'')}"></div></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th>Группа</th><th>Наставник</th><th>День и время</th><th>Вместимость</th><th>Детей</th><th>Загрузка</th><th>Свободно</th><th>Цена / мес.</th><th></th></tr></thead><tbody>${list.map(g=>{const l=groupLoad(g);return`<tr><td><div class="table-title"><span class="discipline-icon">${disciplineEmoji(g.discipline)}</span><div><b>${esc(g.name)}</b><small>${esc(g.discipline)} · ${esc(g.level)}</small></div></div></td><td>${esc(person(g.mentorId).name)}</td><td>${esc(g.day)} · ${esc(g.time)}</td><td>${g.capacity}</td><td>${g.students}</td><td><div class="load-cell"><b>${pct(l)}</b><div class="loadbar"><i class="${l<40?'red':''}" style="width:${clamp(l,0,100)}%"></i></div></div></td><td>${Math.max(0,g.capacity-g.students)}</td><td>${g.monthlyPrice?money(g.monthlyPrice):'не указана'}</td><td><div class="table-actions"><button data-action="editGroup" data-id="${g.id}" title="Редактировать">${ICONS.edit}</button><button data-action="deleteGroup" data-id="${g.id}" title="Удалить">${ICONS.trash}</button></div></td></tr>`}).join('')}</tbody></table></div>${!list.length?'<div class="empty"><b>Группы не найдены</b>Измените фильтры или добавьте новую группу.</div>':''}</div>`
}

function renderGoals(){const list=goalsDerived(),avgProgress=avg(list.map(x=>x.progress));return`<div class="page">${pageHead('ЦЕЛИ И ДЕДЛАЙНЫ','План развития','Загрузка, выручка, продления и мероприятия пересчитываются автоматически из общей базы',`<button class="btn btn-primary" data-action="addGoal">+ Цель</button>`)}<div class="grid-4">${metricCard('Целей в работе',String(list.filter(x=>x.status==='active').length),'Учебный год 2026/27','goals')}${metricCard('Среднее выполнение',pct(avgProgress),`${list.filter(x=>x.progress>=100).length} закрыто`,'analytics',avgProgress)}${metricCard('Высокий приоритет',String(list.filter(x=>x.priority==='high'&&!statusDone(x.status)).length),'Контроль Романа и Софы','tasks')}${metricCard('Авторасчёт',String(list.filter(x=>x.derivedSource!=='manual').length),'Целей связаны с живыми данными','analytics')}</div><section class="card pad"><div class="card-head"><div><h3>Дорожная карта</h3><p>Факт подтягивается из денег, групп, продаж, задач и мероприятий</p></div></div><div class="goal-list">${list.map(g=>`<div class="goal-row"><div class="goal-title"><b>${esc(g.title)}</b><small>${esc(g.category)} · ${esc(g.metric||'Показатель не задан')}${g.derivedSource!=='manual'?' · авто':''}</small></div><div class="goal-progress"><b>${pct(g.progress)}</b><div class="progress"><i style="width:${clamp(g.progress,0,100)}%"></i></div><small>${g.target?`${Math.round(g.current)} / ${Math.round(g.target)}`:'ручной показатель'}</small></div><div class="goal-owner">${esc(person(g.ownerId).name)}</div><div class="goal-deadline">до ${formatDateShort(g.deadline)}</div><div class="table-actions"><button data-action="editGoal" data-id="${g.id}">${ICONS.edit}</button><button data-action="deleteGoal" data-id="${g.id}">${ICONS.trash}</button></div></div>`).join('')||'<div class="empty"><b>Целей пока нет</b>Добавьте первую цель учебного года.</div>'}</div></section></div>`}

const TASK_COLUMNS=[['todo','К выполнению'],['inprogress','В работе'],['review','Проверка'],['done','Готово']];
function renderTasks(){
 const owner=state.ui.taskOwner||'all',mode=state.ui.taskMonthMode||'selected',monthKey=mode==='all'?'all':state.settings.currentMonth;
 const list=tasksForMonth(monthKey).filter(t=>owner==='all'||t.ownerId===owner),people=state.people.filter(p=>['owner','manager','stas','mentor','admin'].includes(p.role)),stats=taskStats(list);
 return`<div class="page">${pageHead('ИСПОЛНЕНИЕ','Задачи',`${mode==='all'?'Все месяцы':currentMonth().label}: ответственный, дедлайн, приоритет и связь со стратегией`, `<button class="btn btn-primary" data-action="addTask">+ Задача</button>`)}
 <div class="toolbar"><div class="filters"><select class="select" style="width:auto" data-filter="taskMonthMode"><option value="selected" ${mode==='selected'?'selected':''}>${esc(currentMonth().label)}</option><option value="all" ${mode==='all'?'selected':''}>Все месяцы</option></select><select class="select" style="width:auto" data-filter="taskOwner"><option value="all">Все ответственные</option>${people.map(p=>`<option value="${p.id}" ${owner===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div style="display:flex;gap:8px;align-items:center"><span class="pill">Всего: ${stats.total}</span><span class="pill ${stats.over?'red':''}">Просрочено: ${stats.over}</span></div></div>
 <div class="kanban">${TASK_COLUMNS.map(([status,label])=>{const items=list.filter(t=>t.status===status);return`<section class="kanban-col"><div class="kanban-head"><b>${esc(label)}</b><span>${items.length}</span></div>${items.map(t=>`<article class="task-card" data-action="editTask" data-id="${t.id}"><div class="task-top"><h4>${esc(t.title)}</h4><div class="task-actions-inline"><i class="priority-mark ${t.priority}"></i>${canDeleteTask()?`<button class="task-delete" data-action="deleteTask" data-id="${t.id}" title="Удалить задачу">${ICONS.trash}</button>`:''}</div></div>${t.description?`<p>${esc(t.description)}</p>`:''}<div class="task-footer"><span>${esc(person(t.ownerId).name)}${t.createdBy?` · поставил ${esc(t.createdBy==='manager'?'Софа':t.createdBy==='owner'?'Роман':person(t.createdBy).name||t.createdBy)}`:''}</span><span class="${isOverdue(t)?'pill red':''}">${formatDateShort(t.deadline)}</span></div></article>`).join('')||'<div class="empty">Пусто</div>'}</section>`}).join('')}</div></div>`
}

function calendarData(monthKey){const [y,m]=monthKey.split('-').map(Number),first=new Date(y,m-1,1),last=new Date(y,m,0),start=(first.getDay()+6)%7,prevDays=new Date(y,m-1,0).getDate(),cells=[];for(let i=0;i<42;i++){let day=i-start+1,cy=y,cm=m,off=false;if(day<1){day=prevDays+day;cm=m-1;if(cm===0){cm=12;cy--}off=true}else if(day>last.getDate()){day-=last.getDate();cm=m+1;if(cm===13){cm=1;cy++}off=true}const date=`${cy}-${String(cm).padStart(2,'0')}-${String(day).padStart(2,'0')}`;cells.push({day,date,off})}return cells}
function renderCalendar(){
 const key=state.settings.currentMonth,filter=state.ui.eventType||'all',events=activeEvents().filter(e=>filter==='all'||e.type===filter),cells=calendarData(key),types=['all','competition','gathering','camp','club','marketing','meeting'];
 return`<div class="page">${pageHead('КАЛЕНДАРЬ РАЗВИТИЯ','Календарь мероприятий','Соревнования, сборы, лагерь, праздники, акции, дедлайны и собрания',`<button class="btn btn-primary" data-action="addEvent">+ Событие</button>`)}<div class="event-tabs">${types.map(t=>`<button class="event-tab ${filter===t?'active':''}" data-action="eventFilter" data-type="${t}">${t==='all'?'Все':typeLabel(t)}</button>`).join('')}</div><section class="card pad calendar-shell"><div class="calendar-week"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div><div class="calendar-grid">${cells.map(c=>{const ev=events.filter(e=>e.date===c.date);const deadlines=activeTasks().filter(t=>!statusDone(t.status)&&t.deadline===c.date).map(t=>({...t,type:'deadline',date:t.deadline,title:t.title}));return`<div class="calendar-day ${c.off?'off':''} ${c.date===today()?'today':''}"><div class="calendar-date"><span>${c.day}</span>${ev.length+deadlines.length?`<small>${ev.length+deadlines.length}</small>`:''}</div><div class="calendar-events">${[...ev,...deadlines].slice(0,4).map(e=>`<button class="calendar-event ${e.type}" data-action="${e.type==='deadline'?'editTask':'editEvent'}" data-id="${e.id}">${esc(e.time?e.time+' · ':'')}${esc(e.title)}</button>`).join('')}</div></div>`}).join('')}</div></section><section class="card pad"><div class="card-head"><div><h3>События месяца</h3><p>План / факт участников, денег, подарков и результата</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Событие</th><th>Дата</th><th>Тип</th><th>Участники</th><th>Выручка</th><th>Статус</th><th></th></tr></thead><tbody>${events.filter(e=>e.date?.startsWith(key)).sort(sortByDate).map(e=>`<tr><td><div class="table-title"><span class="discipline-icon">⚡</span><div><b>${esc(e.title)}</b><small>${esc(e.venue||'Место не указано')}</small></div></div></td><td>${formatDate(e.date)} ${esc(e.time||'')}</td><td><span class="pill">${esc(typeLabel(e.type))}</span></td><td>${e.participantsFact||0} / ${e.participantsPlan||0}</td><td>${compactMoney(e.revenueFact||0)} / ${compactMoney(e.revenuePlan||0)}</td><td>${esc(statusLabel(e.status))}</td><td><div class="table-actions"><button data-action="editEvent" data-id="${e.id}">${ICONS.edit}</button><button data-action="deleteEvent" data-id="${e.id}">${ICONS.trash}</button></div></td></tr>`).join('')}</tbody></table></div></section></div>`
}

function lineChart(values,target=0){const W=760,H=250,P=30,vals=values.length?values:[0],max=Math.max(target,...vals,1)*1.08,xy=vals.map((v,i)=>[P+(W-2*P)*(i/Math.max(1,vals.length-1)),H-P-(H-2*P)*(v/max)]),line=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' '),area=line+` L ${W-P} ${H-P} L ${P} ${H-P} Z`,ty=H-P-(H-2*P)*(target/max);return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdd5a"/><stop offset="1" stop-color="#f0c72f" stop-opacity="0"/></linearGradient></defs>${[.25,.5,.75].map(r=>`<line class="chart-gridline" x1="${P}" y1="${P+(H-2*P)*r}" x2="${W-P}" y2="${P+(H-2*P)*r}"/>`).join('')}<line class="chart-axis" x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}"/>${target?`<line x1="${P}" y1="${ty}" x2="${W-P}" y2="${ty}" stroke="#7a6017" stroke-dasharray="7 6"/>`:''}<path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${xy.map(p=>`<circle class="chart-dot" cx="${p[0]}" cy="${p[1]}" r="4"/>`).join('')}</svg>`}
function barChart(vals,labels){const W=520,H=250,P=34,max=Math.max(...vals,1)*1.12,slot=(W-2*P)/vals.length,bw=slot*.54;return`<svg viewBox="0 0 ${W} ${H}">${vals.map((v,i)=>{const x=P+i*slot+(slot-bw)/2,h=(H-70)*v/max,y=H-40-h;return`<rect class="chart-bar ${i===1?'hot':'soft'}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="7"/><text class="chart-label" x="${x+bw/2}" y="${H-16}" text-anchor="middle">${esc(labels[i])}</text><text class="chart-value" x="${x+bw/2}" y="${Math.max(16,y-8)}" text-anchor="middle">${(v/1e6).toFixed(1)}м</text>`}).join('')}</svg>`}
function donut(value){const r=82,c=2*Math.PI*r,v=clamp(value,0,100);return`<div class="donut-wrap"><svg viewBox="0 0 210 210"><circle class="donut-track" cx="105" cy="105" r="${r}"/><circle class="donut-value" cx="105" cy="105" r="${r}" transform="rotate(-90 105 105)" stroke-dasharray="${c*v/100} ${c}"/></svg><div class="donut-center"><b>${pct(v)}</b><small>загрузка</small></div></div>`}
function cumulativeDaily(m){let s=0;const map=new Map((m.daily||[]).map(x=>[x.date,Number(x.amount)||0])),{days}=dayOfProjection(m.key),arr=[];for(let d=1;d<=days;d++){const date=`${m.key}-${String(d).padStart(2,'0')}`;s+=map.get(date)||0;arr.push(s)}return arr}
function recommendationsForAnalytics(f,ls,ts,m){const r=[];if(f.mode==='future')r.push(['Прогноз включится после первых данных','Добавляйте поступления по дням — система начнёт учитывать реальный темп.']);else if(f.base<state.settings.minimumRevenue)r.push(['Нужно вмешательство в продажи',`Базовый прогноз ${compactMoney(f.base)} ниже безопасного пола.`]);else if(f.base<m.target)r.push(['Ускорить продажи',`Для цели нужно добавить к прогнозу ${compactMoney(m.target-f.base)}.`]);else r.push(['Темп выше цели','Не снижать активность и заранее обеспечить продления.']);if(ls.capacity===0)r.push(['Заполнить вместимость групп','Иначе загрузка и резерв выручки считаются некорректно.']);else if(ls.load<75)r.push(['Дозагрузить существующее расписание',`Свободно ${ls.free} мест. Не открывать новые слоты до заполнения текущих.`]);if(ts.over)r.push(['Разобрать просроченные задачи',`${ts.over} задач уже вышли за дедлайн.`]);if(!state.settings.defaultMonthlyRevenuePerChild&&activeGroups().every(g=>!g.monthlyPrice))r.push(['Указать цену групп','После этого система посчитает деньги, которые теряются на свободных местах.']);return r}
function renderAnalytics(){const m=currentMonth(),f=forecast(m),ls=loadStats(),ts=taskStats(),cum=cumulativeDaily(m),sc=[f.low,f.base,f.high],monthKeys=Object.keys(state.months).sort(),monthVals=monthKeys.map(k=>monthFact(state.months[k])),rec=recommendationsForAnalytics(f,ls,ts,m),targets=[2500000,3000000,3500000,4200000],probs=targets.map(t=>{if(!f.base)return 0;return clamp(Math.round(100/(1+Math.exp(-7*(f.base/t-1)))),0,99)});return`<div class="page">${pageHead('INTELLIGENCE','Аналитика и прогноз','Прогноз строится по факту, дневному темпу, загрузке и дисциплине исполнения',`<button class="btn btn-ghost" data-action="editMonth">План / факт</button><button class="btn btn-primary" data-action="addRevenue">+ Поступление</button>`)}<section class="analytics-hero"><div><div class="eyebrow">${esc(m.label)} · БАЗОВЫЙ СЦЕНАРИЙ</div><h2>${f.mode==='future'?'Месяц ещё не начался':'Прогноз выручки к концу месяца'}</h2><p class="metric-sub">Модель пересчитывается после каждого поступления и учитывает последние 7 дней.</p><div class="scenarios"><div class="scenario"><span>Осторожный</span><b>${f.low?compactMoney(f.low):'—'}</b><small>−12% к темпу</small></div><div class="scenario active"><span>Базовый</span><b>${f.base?compactMoney(f.base):'—'}</b><small>текущий темп</small></div><div class="scenario"><span>Сильный</span><b>${f.high?compactMoney(f.high):'—'}</b><small>+15% к темпу</small></div></div></div><div><div class="forecast-value">${f.base?compactMoney(f.base):'—'}</div><div class="forecast-status">${f.base?`${f.probability}% вероятности выполнить план`:'Добавьте первые фактические данные'}</div></div></section><div class="grid-4">${metricCard('Факт',compactMoney(f.fact),f.elapsed?`на ${f.elapsed}-й день месяца`:'месяц ещё не начался','revenue',m.target?f.fact/m.target*100:null)}${metricCard('План',compactMoney(m.target),`минимум ${compactMoney(m.minimum)}`,'goals')}${metricCard('Загрузка',pct(ls.load),`${ls.free} свободных мест`,'users',ls.load)}${metricCard('Задачи',pct(ts.progress),`${ts.done}/${ts.total} · просрочено ${ts.over}`,'tasks',ts.progress)}</div><div class="chart-grid"><section class="chart-panel"><h3>Динамика выручки</h3><p>Жёлтая линия — накопленный факт, пунктир — план месяца</p><div class="chart">${lineChart(cum,m.target)}</div></section><section class="chart-panel"><h3>Сценарии конца месяца</h3><p>Осторожный, базовый и сильный темп продаж</p><div class="chart">${barChart(sc,['Осторожный','Базовый','Сильный'])}</div></section></div><div class="chart-grid"><section class="chart-panel"><h3>Загрузка расписания</h3><p>Все действующие группы клуба</p>${donut(ls.load)}</section><section class="chart-panel"><h3>Факт по месяцам</h3><p>Учебный год 2026/27</p><div class="chart">${barChart(monthVals,monthKeys.map(k=>state.months[k].label.split(' ')[0].slice(0,3)))}</div></section></div><section class="card pad"><div class="card-head"><div><h3>Вероятность выйти на финансовые уровни</h3><p>Модельная оценка по текущему темпу, а не гарантия результата</p></div></div><div class="probability-grid">${targets.map((t,i)=>`<div class="probability"><span class="metric-label">${compactMoney(t)}</span><b>${pct(probs[i])}</b><small>${['Безопасный пол','Нормальная планка','Сильная планка','Stretch-цель'][i]}</small></div>`).join('')}</div></section><section class="card pad"><div class="card-head"><div><h3>Что делать по текущим показателям</h3><p>Автоматические управленческие рекомендации</p></div></div><div class="recommendations">${rec.map(([a,b])=>`<div class="recommendation"><i></i><div><b>${esc(a)}</b><span>${esc(b)}</span></div></div>`).join('')}</div></section></div>`}

function renderArchive(){const list=state.archive.filter(x=>!x.deletedAt).sort((a,b)=>String(b.monthKey).localeCompare(String(a.monthKey)));return`<div class="page">${pageHead('ИСТОРИЯ РЕЗУЛЬТАТОВ','Архив','Закрытые месяцы: деньги, загрузка, задачи, события и выводы',`<button class="btn btn-primary" data-action="closeMonth">Закрыть текущий месяц</button>`)}${list.length?`<div class="archive-grid">${list.map(a=>`<article class="card archive-card"><div class="eyebrow">${esc(a.monthKey)}</div><h3>${esc(a.label||monthLabel(a.monthKey))}</h3><div class="archive-value">${compactMoney(a.fact)}</div><div class="archive-meta"><div><span>План</span><b>${compactMoney(a.target)}</b></div><div><span>Загрузка</span><b>${pct(a.load)}</b></div><div><span>Задачи</span><b>${pct(a.tasksProgress)}</b></div><div><span>События</span><b>${a.eventsCount||0}</b></div></div>${a.comment?`<p class="metric-sub">${esc(a.comment)}</p>`:''}</article>`).join('')}</div>`:`<div class="empty"><b>Архив пока пуст</b>После закрытия месяца здесь сохранится его полный снимок.</div>`}</div>`}

function roleGroups(ids){return activeGroups().filter(g=>ids.includes(g.mentorId))}
function roleTasks(ids){return currentMonthTasks().filter(t=>ids.includes(t.ownerId)&&!statusDone(t.status))}
function renderManager(){
 const m=currentMonth(),d=derivedSnapshot(),s=d.sales,ls=d.groups,ts=d.tasks,recs=state.recommendations.filter(r=>!r.deletedAt&&r.status!=='done'),adminTasks=currentMonthTasks().filter(t=>['anya','adel'].includes(t.ownerId)&&!statusDone(t.status)),mentors=d.mentors,conversion=d.conversion,renew=d.renewals,score=avg([Math.min(100,ls.load),ts.progress,conversion,renew]);
 const signals=[];if(ts.over)signals.push(`${ts.over} просроченных задач`);if(ls.load<75)signals.push(`загрузка ${pct(ls.load)} — свободно ${ls.free} мест`);if(recs.length)signals.push(`${recs.length} рекомендаций наставников ждут обработки`);if(s.renewalsDue>s.renewalsContacted)signals.push(`${s.renewalsDue-s.renewalsContacted} продлений без контакта`);
 return`<div class="page">${pageHead('ОПЕРАЦИОННОЕ УПРАВЛЕНИЕ','Софа · управляющая',`${m.label}: администраторы, наставники, задачи, продажи и качество клуба`, `<a class="btn btn-ghost" href="${esc(state.settings.managerSite||'https://extreme-kids-troparevo-control.vercel.app/')}" target="_blank" rel="noopener">Рабочий сайт Софы</a><button class="btn btn-primary" data-action="addTask" data-owner="anya">+ Задача админу</button>`)}
 <div class="role-hero"><section class="card pad"><div class="role-score"><div class="score-ring" style="--p:${clamp(score,0,100)}"><b>${pct(score)}</b></div><div class="score-copy"><div class="eyebrow">ОПЕРАЦИОННЫЙ ИНДЕКС</div><h3>${ls.students} детей · ${ls.free} свободных мест</h3><p>Индекс собирается автоматически из загрузки, задач, пробных и продлений.</p></div></div></section><section class="card pad"><div class="card-head"><div><h3>Что требует внимания</h3><p>Сигналы из общей базы клуба</p></div></div><div class="compact-list">${signals.length?signals.map(x=>`<div class="compact-item"><i class="item-dot red"></i><div class="item-main"><b>${esc(x)}</b><small>Обновляется после каждого изменения</small></div></div>`).join(''):'<div class="empty"><b>Критичных сигналов нет</b>Продолжайте контроль по плану.</div>'}</div></section></div>
 <div class="grid-4">${metricCard('Загрузка клуба',pct(ls.load),`${ls.students}/${ls.capacity} · свободно ${ls.free}`,'users',ls.load)}${metricCard('Задачи месяца',pct(ts.progress),`${ts.done}/${ts.total} выполнено · ${ts.over} просрочено`,'tasks',ts.progress)}${metricCard('Пробная → покупка',pct(conversion),`${s.purchases||0} покупок`,'revenue',conversion)}${metricCard('Продления',pct(renew),`${s.renewalsPaid||0}/${s.renewalsDue||0} оплачено`,'analytics',renew)}</div>
 <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Задачи администраторов</h3><p>Софа ставит, контролирует и при необходимости удаляет задачи</p></div><div style="display:flex;gap:8px"><button class="btn btn-small btn-ghost" data-action="addTask" data-owner="anya">+ Ане</button><button class="btn btn-small btn-ghost" data-action="addTask" data-owner="adel">+ Адель</button></div></div><div class="compact-list">${adminTasks.sort(sortByDate).slice(0,8).map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)} · до ${formatDateShort(t.deadline)}</small></div>${canDeleteTask()?`<button class="task-delete" data-action="deleteTask" data-id="${t.id}">${ICONS.trash}</button>`:''}</div>`).join('')||'<div class="empty">У администраторов нет открытых задач этого месяца</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Рекомендации наставников</h3><p>Должны превратиться в персональное предложение родителю</p></div></div><div class="compact-list">${recs.slice(0,8).map(r=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(r.childName)}</b><small>${esc(person(r.mentorId).name)} · ${esc(r.recommendation)}</small></div><span class="pill">${esc(statusLabel(r.status))}</span></div>`).join('')||'<div class="empty">Новых рекомендаций нет</div>'}</div></section></div>
 <section class="card pad"><div class="card-head"><div><h3>Наставники и направления</h3><p>Группы, дети, свободные места и исполнение задач подтягиваются автоматически</p></div><button class="btn btn-small btn-ghost" data-view="mentor">Открыть наставника</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Наставник</th><th>Направление</th><th>Групп</th><th>Детей</th><th>Загрузка</th><th>Свободно</th><th>Задачи</th></tr></thead><tbody>${mentors.map(x=>`<tr><td><b>${esc(x.person.name)}</b></td><td>${esc(x.person.area||'')}</td><td>${x.groups.length}</td><td>${x.load.students}</td><td>${loadPill(x.load.load)}</td><td>${x.load.free}</td><td>${x.taskStats.done}/${x.taskStats.total}</td></tr>`).join('')}</tbody></table></div></section></div>`
}

function renderStas(){const ids=['stas','ivan','tasya','karina'],gs=roleGroups(ids),ls=loadStats(gs),tasks=roleTasks(['stas']),byMentor=ids.map(mid=>({p:person(mid),s:loadStats(gs.filter(g=>g.mentorId===mid))}));return`<div class="page">${pageHead('РУКОВОДИТЕЛЬ НАПРАВЛЕНИЯ','Стас · роллер-школа','Результат всей роллер-школы: загрузка, команда, спортсмены и события',`<button class="btn btn-primary" data-action="addTask" data-owner="stas">+ Задача Стасу</button>`)}<div class="role-hero"><section class="card pad"><div class="role-score"><div class="score-ring" style="--p:${clamp(ls.load,0,100)}"><b>${pct(ls.load)}</b></div><div class="score-copy"><div class="eyebrow">РОЛЛЕР-НАПРАВЛЕНИЕ</div><h3>${ls.students} детей · ${ls.free} свободных мест</h3><p>Стас отвечает не только за собственные тренировки, а за результат всей школы.</p></div></div></section><section class="card pad"><div class="card-head"><div><h3>Приоритет руководителя</h3><p>Что сделать на этой неделе</p></div></div><div class="compact-list">${tasks.slice(0,4).map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>до ${formatDateShort(t.deadline)}</small></div></div>`).join('')||'<div class="empty">Задач нет</div>'}</div></section></div><div class="grid-4">${byMentor.map(x=>metricCard(x.p.name,pct(x.s.load),`${x.s.students}/${x.s.capacity} · свободно ${x.s.free}`,'users',x.s.load)).join('')}</div><section class="card pad"><div class="card-head"><div><h3>Группы роллер-школы</h3><p>Низкая загрузка — прямой приоритет продаж</p></div><button class="btn btn-small btn-ghost" data-view="groups">Все группы</button></div>${groupsMiniTable(gs.slice().sort((a,b)=>groupLoad(a)-groupLoad(b)).slice(0,12))}</section></div>`}

function renderMentor(){const mentorId=state.ui.selectedMentor||'stas',mentors=state.people.filter(p=>p.role==='mentor'||p.id==='stas'),p=person(mentorId),gs=activeGroups().filter(g=>g.mentorId===mentorId),ls=loadStats(gs),tasks=currentMonthTasks().filter(t=>t.ownerId===mentorId&&!statusDone(t.status)),recs=state.recommendations.filter(r=>r.mentorId===mentorId&&!r.deletedAt);return`<div class="page">${pageHead('ЛИЧНЫЙ КАБИНЕТ','Наставник','Свои группы, задачи, рекомендации детям и результат месяца',`<select class="select" style="width:auto" data-filter="selectedMentor">${mentors.map(x=>`<option value="${x.id}" ${mentorId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="btn btn-primary" data-action="addRecommendation" data-mentor="${mentorId}">+ Рекомендация</button>`)}<div class="role-hero"><section class="card pad"><div class="role-score"><span class="avatar" style="width:78px;height:78px;border-radius:22px;font-size:25px">${esc(p.avatar||p.name[0])}</span><div class="score-copy"><div class="eyebrow">${esc(p.area||'НАПРАВЛЕНИЕ')}</div><h3>${esc(p.name)}</h3><p>${gs.length} групп · ${ls.students} детей · загрузка ${pct(ls.load)}</p></div></div></section><section class="card pad"><div class="card-head"><div><h3>Мои задачи</h3><p>Ближайшие дедлайны</p></div></div><div class="compact-list">${tasks.sort(sortByDate).slice(0,4).map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${formatDateShort(t.deadline)} · ${esc(statusLabel(t.status))}</small></div></div>`).join('')||'<div class="empty">Задач нет</div>'}</div></section></div><div class="grid-4">${metricCard('Мои группы',String(gs.length),'Действующее расписание','groups')}${metricCard('Загрузка',pct(ls.load),`${ls.students}/${ls.capacity} мест`,'users',ls.load)}${metricCard('Свободные места',String(ls.free),'Передать администратору','analytics')}${metricCard('Рекомендации',String(recs.length),'Следующий шаг ребёнка','goals')}</div><section class="card pad"><div class="card-head"><div><h3>Мои группы</h3><p>День, время, загрузка и свободные места</p></div></div>${groupsMiniTable(gs)}</section><section class="card pad"><div class="card-head"><div><h3>Рекомендации детям</h3><p>Повышение уровня, вторая тренировка, спорт-группа или индивидуальная</p></div></div><div class="compact-list">${recs.map(r=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(r.childName)}</b><small>${esc(r.recommendation)} · ${esc(statusLabel(r.status))}</small></div><div class="table-actions"><button data-action="editRecommendation" data-id="${r.id}">${ICONS.edit}</button></div></div>`).join('')||'<div class="empty"><b>Рекомендаций пока нет</b>Передавайте администраторам экспертный следующий шаг ребёнка.</div>'}</div></section></div>`}

function renderAdmin(){const s=currentSales(),conversion=s.trialsVisited?s.purchases/s.trialsVisited*100:0,renew=s.renewalsDue?s.renewalsPaid/s.renewalsDue*100:0,tasks=currentMonthTasks().filter(t=>['anya','adel'].includes(t.ownerId)&&!statusDone(t.status)),recs=state.recommendations.filter(r=>!r.deletedAt&&r.status!=='done');return`<div class="page">${pageHead('ПРОДАЖИ И СЕРВИС','Администратор',`${currentMonth().label}: лиды, пробные, продления и рекомендации наставников`, `<button class="btn btn-ghost" data-action="editSales">Внести показатели</button><button class="btn btn-primary" data-action="addTask">+ Задача</button>`)}<div class="grid-4">${metricCard('Пробные назначено',String(s.trialsPlanned||0),`пришло ${s.trialsVisited||0}`,'calendar',s.trialsPlanned?s.trialsVisited/s.trialsPlanned*100:null)}${metricCard('Пробная → покупка',pct(conversion),`${s.purchases||0} покупок`,'revenue',conversion)}${metricCard('Продления',pct(renew),`${s.renewalsPaid||0}/${s.renewalsDue||0} оплачено`,'tasks',renew)}${metricCard('Рекомендации наставников',String(recs.length),'Требуют контакта с родителем','goals')}</div><div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Что нужно сделать</h3><p>Задачи выбранного месяца</p></div></div><div class="compact-list">${tasks.sort(sortByDate).slice(0,8).map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)} · до ${formatDateShort(t.deadline)}</small></div></div>`).join('')||'<div class="empty">Задач нет</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>План продаж администраторов</h3><p>Личный план и факт выбранного месяца</p></div></div><div class="compact-list">${['anya','adel'].map(id=>{const p=person(id),plan=s.adminPlans?.[id]||0,fact=s.adminFacts?.[id]||0,pr=plan?fact/plan*100:0;return`<div class="compact-item"><span class="avatar small">${esc(p.avatar)}</span><div class="item-main"><b>${esc(p.name)} · ${compactMoney(fact)}</b><small>план ${compactMoney(plan)}</small><div class="progress"><i style="width:${clamp(pr,0,100)}%"></i></div></div></div>`}).join('')}</div></section></div><section class="card pad"><div class="card-head"><div><h3>Рекомендации наставников</h3><p>Следующий продукт должен быть предложен персонально</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Ребёнок</th><th>Наставник</th><th>Рекомендация</th><th>Статус</th><th></th></tr></thead><tbody>${recs.map(r=>`<tr><td>${esc(r.childName)}</td><td>${esc(person(r.mentorId).name)}</td><td>${esc(r.recommendation)}</td><td>${esc(statusLabel(r.status))}</td><td><div class="table-actions"><button data-action="editRecommendation" data-id="${r.id}">${ICONS.edit}</button></div></td></tr>`).join('')}</tbody></table></div></section></div>`}

function renderTeam(){const m=currentMonth(),events=activeEvents().filter(e=>e.date>=today()).sort(sortByDate),goals=goalsDerived(activeGoals().filter(g=>g.status==='active')).sort((a,b)=>b.progress-a.progress),done=currentMonthTasks().filter(t=>statusDone(t.status));return`<div class="page">${pageHead('ОБЩИЙ ЭКРАН','Команда EXTREME KIDS','Общие цели, события, победы и приоритеты — всё из одной базы')}<section class="card hero"><div class="hero-top"><div><div class="eyebrow">ФОКУС МЕСЯЦА</div><h3 class="hero-title">${esc(m.focus)}</h3><div class="hero-sub">Каждый сотрудник видит актуальный месяц и свою роль в результате.</div></div><div class="hero-value" style="font-size:38px">${pct(avg(goals.map(g=>g.progress)))}</div></div></section><div class="grid-3"><section class="card pad"><div class="card-head"><div><h3>Цели команды</h3><p>Автоматический прогресс</p></div></div><div class="compact-list">${goals.slice(0,5).map(g=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(g.title)}</b><small>${pct(g.progress)} · ответственный ${esc(person(g.ownerId).name)}</small><div class="progress"><i style="width:${clamp(g.progress,0,100)}%"></i></div></div></div>`).join('')}</div></section><section class="card pad"><div class="card-head"><div><h3>Ближайшие события</h3><p>Где нужна команда</p></div></div><div class="event-list">${events.slice(0,6).map(e=>`<div class="event-item"><i class="item-dot"></i><div class="item-main"><b>${esc(e.title)}</b><small>${formatDate(e.date)} · ${esc(e.venue||'')}</small></div></div>`).join('')||'<div class="empty">Событий нет</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Сделано в этом месяце</h3><p>Победы и закрытые задачи</p></div></div><div class="compact-list">${done.slice(0,6).map(t=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(t.title)}</b><small>${esc(person(t.ownerId).name)}</small></div></div>`).join('')||'<div class="empty">Пока нет закрытых задач</div>'}</div></section></div></div>`}

function renderSettings(){const link=location.href,base=`${location.origin}${location.pathname}#w=${encodeURIComponent(credentials.workspace)}&k=${encodeURIComponent(credentials.key)}`;return`<div class="page">${pageHead('СИСТЕМА','Настройки','Синхронизация, доступы, резервные копии и параметры расчётов')}<div class="settings-grid"><section class="card settings-block"><h3>Общая база</h3><p>Изменения автоматически синхронизируются между устройствами с одинаковой полной ссылкой.</p><div class="field"><label>Рабочее пространство</label><div class="key-box">${esc(credentials.workspace)}</div></div><div class="form-actions" style="justify-content:flex-start"><button class="btn btn-primary" data-action="syncNow">Синхронизировать</button><button class="btn btn-ghost" data-action="copyOwnerLink">Копировать мою ссылку</button></div></section><section class="card settings-block"><h3>Ссылки для сотрудников</h3><p>Каждая роль видит только свои рабочие разделы. Ключ находится в ссылке — не публикуйте её открыто.</p><div class="compact-list">${Object.entries(ROLES).filter(([k])=>k!=='owner').map(([k,r])=>`<div class="compact-item"><span class="avatar small">${esc(r.avatar)}</span><div class="item-main"><b>${esc(r.name)}</b><small>${esc(r.title)}</small></div><button class="btn btn-small btn-ghost" data-action="copyRoleLink" data-role="${k}">Копировать</button></div>`).join('')}</div></section><section class="card settings-block"><h3>Параметры аналитики</h3><p>Используются для расчёта резерва денег в пустых местах.</p><form id="settingsForm" class="form-grid"><div class="field"><label>Средняя выручка с ребёнка / месяц</label><input class="input" type="number" min="0" name="defaultMonthlyRevenuePerChild" value="${state.settings.defaultMonthlyRevenuePerChild||0}"></div><div class="field"><label>Интервал синхронизации, секунд</label><input class="input" type="number" min="10" max="300" name="syncInterval" value="${Math.round((state.settings.syncInterval||25000)/1000)}"></div><label class="check span-2"><input type="checkbox" name="autoSync" ${state.settings.autoSync?'checked':''}> Автоматически синхронизировать изменения</label><div class="form-actions span-2"><button class="btn btn-primary" type="submit">Сохранить настройки</button></div></form></section><section class="card settings-block"><h3>Резервная копия</h3><p>Можно скачать всю базу клуба или восстановить её из JSON-файла.</p><div class="quick-grid"><button class="quick-card" data-action="exportData"><span class="quick-icon">${ICONS.download}</span><span><b>Экспортировать</b><small>Скачать JSON</small></span></button><button class="quick-card" data-action="importData"><span class="quick-icon">${ICONS.upload}</span><span><b>Импортировать</b><small>Загрузить JSON</small></span></button></div><div class="form-actions" style="justify-content:flex-start"><button class="btn btn-danger" data-action="resetState">Сбросить стартовые данные</button></div></section><section class="card settings-block span-2"><h3>Техническая информация</h3><p>Версия ${VERSION} · сборка ${BUILD} · данные обновлены ${new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.meta.updatedAt))}</p><div class="key-box">${esc(link)}</div></section></div></div>`}

function quickAddModal(){openModal({title:'Что добавить?',subtitle:'Выберите тип новой записи',body:`<div class="quick-grid"><button class="quick-card" data-action="addRevenue"><span class="quick-icon">₽</span><span><b>Поступление</b><small>Факт выручки по дню</small></span></button><button class="quick-card" data-action="addTask"><span class="quick-icon">✓</span><span><b>Задача</b><small>Ответственный и дедлайн</small></span></button><button class="quick-card" data-action="addEvent"><span class="quick-icon">⚡</span><span><b>Событие</b><small>Соревнование, лагерь, сборы</small></span></button><button class="quick-card" data-action="addGroup"><span class="quick-icon">👥</span><span><b>Группа</b><small>Расписание и загрузка</small></span></button><button class="quick-card" data-action="addGoal"><span class="quick-icon">◎</span><span><b>Цель</b><small>План развития</small></span></button><button class="quick-card" data-action="addRecommendation"><span class="quick-icon">→</span><span><b>Рекомендация</b><small>Следующий шаг ребёнка</small></span></button></div>`})}
function peopleOptions(selected='',roles=null){return state.people.filter(p=>!roles||roles.includes(p.role)||roles.includes(p.id)).map(p=>`<option value="${p.id}" ${selected===p.id?'selected':''}>${esc(p.name)} · ${esc(p.area||p.title)}</option>`).join('')}
function formActions(label='Сохранить'){return`<div class="form-actions span-2"><button type="button" class="btn btn-ghost" data-action="closeModal">Отмена</button><button type="submit" class="btn btn-primary">${esc(label)}</button></div>`}
function monthModal(){const m=currentMonth();openModal({title:`План / факт · ${m.label}`,subtitle:'Финансовые уровни и ежедневные поступления',body:`<form id="monthForm" class="form-grid"><div class="field"><label>Минимум</label><input class="input" type="number" name="minimum" value="${m.minimum}"></div><div class="field"><label>Цель</label><input class="input" type="number" name="target" value="${m.target}"></div><div class="field"><label>Сильная цель</label><input class="input" type="number" name="stretch" value="${m.stretch}"></div><div class="field"><label>Факт вручную</label><input class="input" type="number" name="fact" value="${m.fact||0}"></div><div class="field span-2"><label>Фокус месяца</label><textarea class="textarea" name="focus">${esc(m.focus||'')}</textarea></div><div class="field"><label>Цель загрузки, %</label><input class="input" type="number" min="0" max="100" name="loadTarget" value="${m.loadTarget||80}"></div>${formActions()}</form>`})}
function revenueModal(){const m=currentMonth();openModal({title:'Добавить поступление',subtitle:m.label,body:`<form id="revenueForm" class="form-grid"><div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${today().startsWith(m.key)?today():m.key+'-01'}" required></div><div class="field"><label>Сумма</label><input class="input" type="number" min="0" name="amount" required></div><div class="field span-2"><label>Комментарий</label><input class="input" name="note" placeholder="Продления, новые продажи, мероприятие…"></div>${formActions('Добавить')}</form>${(m.daily||[]).length?`<div style="margin-top:20px"><div class="card-head"><div><h3>Последние поступления</h3></div></div><div class="compact-list">${m.daily.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(x=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${money(x.amount)}</b><small>${formatDate(x.date)} · ${esc(x.note||'без комментария')}</small></div><button class="icon-btn" data-action="deleteRevenue" data-id="${x.id}">×</button></div>`).join('')}</div></div>`:''}`})}
function taskModal(item=null,owner=''){const monthKey=item?.monthKey||taskMonthKey(item)||state.settings.currentMonth,defaultDeadline=item?.deadline||((today().startsWith(monthKey))?today():monthKey+'-01'),t=item||{id:'',title:'',description:'',ownerId:owner||'roman',deadline:defaultDeadline,monthKey,priority:'medium',status:'todo',linkType:'',linkId:''};openModal({title:item?'Редактировать задачу':'Новая задача',subtitle:`${monthLabel(monthKey)} · ответственный, дедлайн и приоритет`,body:`<form id="taskForm" data-id="${esc(t.id)}" class="form-grid"><div class="field span-2"><label>Название</label><input class="input" name="title" value="${esc(t.title)}" required></div><div class="field span-2"><label>Описание</label><textarea class="textarea" name="description">${esc(t.description||'')}</textarea></div><div class="field"><label>Месяц</label><select class="select" name="monthKey">${Object.keys(state.months).sort().map(k=>`<option value="${k}" ${monthKey===k?'selected':''}>${esc(state.months[k].label||monthLabel(k))}</option>`).join('')}</select></div><div class="field"><label>Ответственный</label><select class="select" name="ownerId">${peopleOptions(t.ownerId,['owner','manager','stas','mentor','admin'])}</select></div><div class="field"><label>Дедлайн</label><input class="input" type="date" name="deadline" value="${esc(t.deadline||defaultDeadline)}"></div><div class="field"><label>Приоритет</label><select class="select" name="priority"><option value="high" ${t.priority==='high'?'selected':''}>Высокий</option><option value="medium" ${t.priority==='medium'?'selected':''}>Средний</option><option value="low" ${t.priority==='low'?'selected':''}>Низкий</option></select></div><div class="field"><label>Статус</label><select class="select" name="status">${TASK_COLUMNS.map(([v,l])=>`<option value="${v}" ${t.status===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="form-actions span-2">${item&&canDeleteTask()?`<button type="button" class="btn btn-danger" data-action="deleteTask" data-id="${t.id}">Удалить</button>`:''}<span style="flex:1"></span><button type="button" class="btn btn-ghost" data-action="closeModal">Отмена</button><button type="submit" class="btn btn-primary">Сохранить</button></div></form>`})}
function groupModal(item=null){const g=item||{id:'',mentorId:'stas',name:'',discipline:'Ролики',day:'Понедельник',time:'16:00',level:'БАЗА',capacity:8,students:0,monthlyPrice:0,status:'active'};openModal({title:item?'Редактировать группу':'Новая группа',subtitle:'Расписание, вместимость и фактическая загрузка',body:`<form id="groupForm" data-id="${esc(g.id)}" class="form-grid"><div class="field span-2"><label>Название группы</label><input class="input" name="name" value="${esc(g.name)}" required></div><div class="field"><label>Наставник</label><select class="select" name="mentorId">${peopleOptions(g.mentorId,['stas','mentor'])}</select></div><div class="field"><label>Направление</label><select class="select" name="discipline">${['Ролики','Фигурное катание','Беговел','Вело','BMX','Скейт'].map(v=>`<option ${g.discipline===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>День</label><select class="select" name="day">${['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'].map(v=>`<option ${g.day===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Время</label><input class="input" name="time" value="${esc(g.time)}" required></div><div class="field"><label>Уровень</label><select class="select" name="level">${['БАЗА','БАЗА+','СПОРТ','ФИГУРНОЕ'].map(v=>`<option ${g.level===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Вместимость</label><input class="input" type="number" min="0" name="capacity" value="${g.capacity}"></div><div class="field"><label>Детей сейчас</label><input class="input" type="number" min="0" name="students" value="${g.students}"></div><div class="field"><label>Выручка с ребёнка / мес.</label><input class="input" type="number" min="0" name="monthlyPrice" value="${g.monthlyPrice||0}"></div>${formActions()}</form>`})}
function goalModal(item=null){const g=item||{id:'',title:'',category:'Финансы',ownerId:'roman',deadline:'2026-09-30',progress:0,status:'active',priority:'medium',metric:'',target:0,current:0,notes:''};openModal({title:item?'Редактировать цель':'Новая цель',subtitle:'Измеримый результат и дедлайн',body:`<form id="goalForm" data-id="${esc(g.id)}" class="form-grid"><div class="field span-2"><label>Цель</label><input class="input" name="title" value="${esc(g.title)}" required></div><div class="field"><label>Категория</label><input class="input" name="category" value="${esc(g.category)}"></div><div class="field"><label>Ответственный</label><select class="select" name="ownerId">${peopleOptions(g.ownerId,['owner','stas','mentor','admin'])}</select></div><div class="field"><label>Дедлайн</label><input class="input" type="date" name="deadline" value="${esc(g.deadline)}"></div><div class="field"><label>Выполнение, %</label><input class="input" type="number" min="0" max="100" name="progress" value="${g.progress}"></div><div class="field"><label>Приоритет</label><select class="select" name="priority">${['high','medium','low'].map(v=>`<option value="${v}" ${g.priority===v?'selected':''}>${priorityLabel(v)}</option>`).join('')}</select></div><div class="field"><label>Статус</label><select class="select" name="status"><option value="active" ${g.status==='active'?'selected':''}>В работе</option><option value="paused" ${g.status==='paused'?'selected':''}>Пауза</option><option value="done" ${g.status==='done'?'selected':''}>Готово</option></select></div><div class="field"><label>Показатель</label><input class="input" name="metric" value="${esc(g.metric||'')}"></div><div class="field"><label>Целевое значение</label><input class="input" type="number" name="target" value="${g.target||0}"></div><div class="field span-2"><label>Комментарий</label><textarea class="textarea" name="notes">${esc(g.notes||'')}</textarea></div>${formActions()}</form>`})}
function eventModal(item=null){const e=item||{id:'',type:'club',title:'',date:today(),time:'16:00',venue:'EXTREME KIDS Тропарёво',ownerId:'stas',status:'planning',participantsPlan:0,participantsFact:0,revenuePlan:0,revenueFact:0,costPlan:0,costFact:0,gifts:'',plan:'',actual:'',notes:''};openModal({title:item?'Редактировать событие':'Новое событие',subtitle:'План / факт мероприятия',body:`<form id="eventForm" data-id="${esc(e.id)}" class="form-grid"><div class="field span-2"><label>Название</label><input class="input" name="title" value="${esc(e.title)}" required></div><div class="field"><label>Тип</label><select class="select" name="type">${['competition','gathering','camp','club','marketing','meeting'].map(v=>`<option value="${v}" ${e.type===v?'selected':''}>${typeLabel(v)}</option>`).join('')}</select></div><div class="field"><label>Ответственный</label><select class="select" name="ownerId">${peopleOptions(e.ownerId,['owner','stas','mentor','admin'])}</select></div><div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${esc(e.date)}" required></div><div class="field"><label>Время</label><input class="input" name="time" value="${esc(e.time||'')}"></div><div class="field span-2"><label>Место</label><input class="input" name="venue" value="${esc(e.venue||'')}"></div><div class="field"><label>Участники · план</label><input class="input" type="number" min="0" name="participantsPlan" value="${e.participantsPlan||0}"></div><div class="field"><label>Участники · факт</label><input class="input" type="number" min="0" name="participantsFact" value="${e.participantsFact||0}"></div><div class="field"><label>Выручка · план</label><input class="input" type="number" min="0" name="revenuePlan" value="${e.revenuePlan||0}"></div><div class="field"><label>Выручка · факт</label><input class="input" type="number" min="0" name="revenueFact" value="${e.revenueFact||0}"></div><div class="field"><label>Расходы · план</label><input class="input" type="number" min="0" name="costPlan" value="${e.costPlan||0}"></div><div class="field"><label>Расходы · факт</label><input class="input" type="number" min="0" name="costFact" value="${e.costFact||0}"></div><div class="field span-2"><label>Подарки</label><input class="input" name="gifts" value="${esc(e.gifts||'')}"></div><div class="field span-2"><label>План</label><textarea class="textarea" name="plan">${esc(e.plan||'')}</textarea></div><div class="field span-2"><label>Факт / итог</label><textarea class="textarea" name="actual">${esc(e.actual||'')}</textarea></div><div class="field"><label>Статус</label><select class="select" name="status">${['planning','selling','ready','completed'].map(v=>`<option value="${v}" ${e.status===v?'selected':''}>${statusLabel(v)}</option>`).join('')}</select></div>${formActions()}</form>`})}
function recommendationModal(item=null,mentorId='stas'){const r=item||{id:'',childName:'',mentorId,recommendation:'Перевести в БАЗА+',status:'new',notes:''};openModal({title:item?'Редактировать рекомендацию':'Рекомендация ребёнку',subtitle:'Наставник передаёт администратору экспертный следующий шаг',body:`<form id="recommendationForm" data-id="${esc(r.id)}" class="form-grid"><div class="field"><label>Ребёнок</label><input class="input" name="childName" value="${esc(r.childName)}" required></div><div class="field"><label>Наставник</label><select class="select" name="mentorId">${peopleOptions(r.mentorId,['stas','mentor'])}</select></div><div class="field span-2"><label>Рекомендация</label><input class="input" name="recommendation" value="${esc(r.recommendation)}" required></div><div class="field"><label>Статус</label><select class="select" name="status"><option value="new" ${r.status==='new'?'selected':''}>Новая</option><option value="contacted" ${r.status==='contacted'?'selected':''}>Связались</option><option value="offered" ${r.status==='offered'?'selected':''}>Предложили</option><option value="done" ${r.status==='done'?'selected':''}>Продано / закрыто</option></select></div><div class="field span-2"><label>Комментарий</label><textarea class="textarea" name="notes">${esc(r.notes||'')}</textarea></div>${formActions()}</form>`})}
function salesModal(){const s=currentSales();openModal({title:'Показатели продаж',subtitle:currentMonth().label,body:`<form id="salesForm" class="form-grid"><div class="field"><label>Пробные назначено</label><input class="input" type="number" min="0" name="trialsPlanned" value="${s.trialsPlanned||0}"></div><div class="field"><label>Пробные пришли</label><input class="input" type="number" min="0" name="trialsVisited" value="${s.trialsVisited||0}"></div><div class="field"><label>Покупки после пробной</label><input class="input" type="number" min="0" name="purchases" value="${s.purchases||0}"></div><div class="field"><label>Продления к оплате</label><input class="input" type="number" min="0" name="renewalsDue" value="${s.renewalsDue||0}"></div><div class="field"><label>Связались по продлениям</label><input class="input" type="number" min="0" name="renewalsContacted" value="${s.renewalsContacted||0}"></div><div class="field"><label>Продления оплачены</label><input class="input" type="number" min="0" name="renewalsPaid" value="${s.renewalsPaid||0}"></div><div class="field"><label>План Ани</label><input class="input" type="number" min="0" name="anyaPlan" value="${s.adminPlans?.anya||0}"></div><div class="field"><label>Факт Ани</label><input class="input" type="number" min="0" name="anyaFact" value="${s.adminFacts?.anya||0}"></div><div class="field"><label>План Адель</label><input class="input" type="number" min="0" name="adelPlan" value="${s.adminPlans?.adel||0}"></div><div class="field"><label>Факт Адель</label><input class="input" type="number" min="0" name="adelFact" value="${s.adminFacts?.adel||0}"></div>${formActions()}</form>`})}
function closeMonthModal(){const m=currentMonth(),ls=loadStats(),ts=taskStats();openModal({title:`Закрыть ${m.label}`,subtitle:'Снимок сохранится в архиве и больше не будет зависеть от текущих изменений',body:`<form id="closeMonthForm" class="form-grid"><div class="field"><label>Факт выручки</label><input class="input" type="number" name="fact" value="${monthFact(m)}"></div><div class="field"><label>Загрузка, %</label><input class="input" type="number" name="load" value="${Math.round(ls.load)}"></div><div class="field"><label>Выполнение задач, %</label><input class="input" type="number" name="tasksProgress" value="${Math.round(ts.progress)}"></div><div class="field"><label>Мероприятий</label><input class="input" type="number" name="eventsCount" value="${activeEvents().filter(e=>e.date?.startsWith(m.key)).length}"></div><div class="field span-2"><label>Итог и выводы</label><textarea class="textarea" name="comment" placeholder="Что сработало, что не получилось, что переносим дальше"></textarea></div>${formActions('Закрыть месяц')}</form>`})}
function capacityAuditModal(){const gs=activeGroups(),missing=gs.filter(g=>!g.capacity),zero=gs.filter(g=>g.capacity>0&&g.students===0);openModal({title:'Аудит вместимости',subtitle:'Проверка данных, от которых зависит вся аналитика загрузки',body:`<div class="grid-2">${metricCard('Групп без вместимости',String(missing.length),'Нужно заполнить в первую очередь','groups')}${metricCard('Групп без факта детей',String(zero.length),'Проверьте, действительно ли там 0','users')}</div><div style="margin-top:16px" class="compact-list">${[...missing,...zero].slice(0,20).map(g=>`<div class="compact-item" data-action="editGroup" data-id="${g.id}"><i class="item-dot ${!g.capacity?'red':''}"></i><div class="item-main"><b>${esc(g.name)}</b><small>${esc(person(g.mentorId).name)} · ${esc(g.day)} ${esc(g.time)}</small></div><span>${g.students}/${g.capacity}</span></div>`).join('')||'<div class="empty"><b>Данные заполнены</b>Критических пропусков нет.</div>'}</div>`})}

function formValues(form){return Object.fromEntries(new FormData(form).entries())}
function num(v){return Number(v)||0}
function upsert(list,item){const i=list.findIndex(x=>x.id===item.id);if(i>=0)list[i]=item;else list.push(item)}
function deleteRecord(list,idValue,label){const x=list.find(x=>x.id===idValue);if(!x)return;if(!confirm(`Удалить «${label||x.title||x.name}»?`))return;x.deletedAt=nowIso();x.updatedAt=nowIso();touch(`Удалено: ${label||x.title||x.name}`)}

function handleSubmit(e){
 const f=e.target;if(!(f instanceof HTMLFormElement))return;e.preventDefault();const v=formValues(f),stamp=nowIso();
 if(f.id==='monthForm'){const m=currentMonth();Object.assign(m,{minimum:num(v.minimum),target:num(v.target),stretch:num(v.stretch),fact:num(v.fact),focus:v.focus,loadTarget:num(v.loadTarget),updatedAt:stamp});closeModal();touch(`Обновлён план месяца ${m.label}`)}
 if(f.id==='revenueForm'){const m=currentMonth();m.daily=m.daily||[];m.daily.push({id:id('rev'),date:v.date,amount:num(v.amount),note:v.note,updatedAt:stamp});m.fact=sum(m.daily,x=>x.amount);m.updatedAt=stamp;closeModal();touch(`Добавлено поступление ${money(v.amount)}`)}
 if(f.id==='taskForm'){const old=state.tasks.find(x=>x.id===f.dataset.id);const item={...(old||{}),id:old?.id||id('task'),title:v.title,description:v.description,ownerId:v.ownerId,monthKey:v.monthKey||monthKeyFromDate(v.deadline)||state.settings.currentMonth,deadline:v.deadline,priority:v.priority,status:v.status,required:f.elements.required?.checked||false,createdBy:old?.createdBy||(currentRole==='manager'?'manager':currentRole==='owner'?'owner':credentials.role),updatedAt:stamp};upsert(state.tasks,item);closeModal();touch(`Задача: ${item.title}`)}
 if(f.id==='groupForm'){const old=state.groups.find(x=>x.id===f.dataset.id);const item={...(old||{}),id:old?.id||id('grp'),mentorId:v.mentorId,name:v.name,discipline:v.discipline,day:v.day,time:v.time,level:v.level,capacity:num(v.capacity),students:num(v.students),monthlyPrice:num(v.monthlyPrice),prime:/1[6-9]:|20:|Суббота|Воскресенье/.test(v.time+' '+v.day),status:'active',updatedAt:stamp};upsert(state.groups,item);closeModal();touch(`Группа: ${item.name}`)}
 if(f.id==='goalForm'){const old=state.goals.find(x=>x.id===f.dataset.id);const item={...(old||{}),id:old?.id||id('goal'),title:v.title,category:v.category,ownerId:v.ownerId,deadline:v.deadline,progress:clamp(v.progress,0,100),status:v.status,priority:v.priority,metric:v.metric,target:num(v.target),notes:v.notes,updatedAt:stamp};upsert(state.goals,item);closeModal();touch(`Цель: ${item.title}`)}
 if(f.id==='eventForm'){const old=state.events.find(x=>x.id===f.dataset.id);const item={...(old||{}),id:old?.id||id('event'),title:v.title,type:v.type,ownerId:v.ownerId,date:v.date,time:v.time,venue:v.venue,participantsPlan:num(v.participantsPlan),participantsFact:num(v.participantsFact),revenuePlan:num(v.revenuePlan),revenueFact:num(v.revenueFact),costPlan:num(v.costPlan),costFact:num(v.costFact),gifts:v.gifts,plan:v.plan,actual:v.actual,status:v.status,updatedAt:stamp};upsert(state.events,item);closeModal();touch(`Событие: ${item.title}`)}
 if(f.id==='recommendationForm'){const old=state.recommendations.find(x=>x.id===f.dataset.id);const item={...(old||{}),id:old?.id||id('rec'),childName:v.childName,mentorId:v.mentorId,recommendation:v.recommendation,status:v.status,notes:v.notes,updatedAt:stamp};upsert(state.recommendations,item);closeModal();touch(`Рекомендация для ${item.childName}`)}
 if(f.id==='salesForm'){const key=state.settings.currentMonth;state.salesByMonth=state.salesByMonth||{};state.salesByMonth[key]={...currentSales(),trialsPlanned:num(v.trialsPlanned),trialsVisited:num(v.trialsVisited),purchases:num(v.purchases),renewalsDue:num(v.renewalsDue),renewalsContacted:num(v.renewalsContacted),renewalsPaid:num(v.renewalsPaid),adminPlans:{anya:num(v.anyaPlan),adel:num(v.adelPlan)},adminFacts:{anya:num(v.anyaFact),adel:num(v.adelFact)},updatedAt:stamp};state.sales=state.salesByMonth[key];closeModal();touch(`Обновлены показатели продаж · ${currentMonth().label}`)}
 if(f.id==='closeMonthForm'){const m=currentMonth(),old=state.archive.find(x=>x.monthKey===m.key&&!x.deletedAt),item={...(old||{}),id:old?.id||id('archive'),monthKey:m.key,label:m.label,fact:num(v.fact),target:m.target,minimum:m.minimum,stretch:m.stretch,load:num(v.load),tasksProgress:num(v.tasksProgress),eventsCount:num(v.eventsCount),comment:v.comment,closedAt:stamp,updatedAt:stamp};upsert(state.archive,item);closeModal();touch(`Закрыт месяц ${m.label}`)}
 if(f.id==='settingsForm'){state.settings.defaultMonthlyRevenuePerChild=num(v.defaultMonthlyRevenuePerChild);state.settings.syncInterval=clamp(num(v.syncInterval),10,300)*1000;state.settings.autoSync=f.elements.autoSync.checked;closeModal();setupAutoSync();touch('Обновлены настройки системы')}
}

function copyText(text,msg='Ссылка скопирована'){navigator.clipboard?.writeText(text).then(()=>toast(msg)).catch(()=>prompt('Скопируйте:',text))}
function roleLink(role){const p=new URLSearchParams();p.set('w',credentials.workspace);p.set('k',credentials.key);p.set('r',role);p.set('t',`${role}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`);return`${location.origin}${location.pathname}#${p.toString()}`}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`EXTREME_KIDS_Growth_OS_6_${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Резервная копия скачана')}
async function importFile(file){try{const raw=JSON.parse(await file.text());state=ensureState(raw);state.meta.updatedAt=nowIso();persistLocal();renderShell();renderCurrentView();await syncNow({quiet:true,push:true});toast('База восстановлена','Импорт завершён успешно.')}catch(e){toast('Не удалось импортировать файл',e.message,'error')}}
function resetState(){if(!confirm('Сбросить данные этого рабочего пространства к стартовой структуре?'))return;state=seedState();persistLocal();renderShell();renderCurrentView();touch('Сброшены стартовые данные')}
function setupAutoSync(){clearInterval(syncTimer);if(state.settings.autoSync)syncTimer=setInterval(()=>syncNow({quiet:true,push:true}),clamp(state.settings.syncInterval,10000,300000))}

function handleClick(e){
 const view=e.target.closest('[data-view]');if(view){e.preventDefault();setView(view.dataset.view);return}
 const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;
 if(a==='toggleSidebar'){$('#sidebar').classList.toggle('open');$('#sidebarScrim').classList.toggle('hidden');return}
 if(a==='closeModal'){closeModal();return}if(a==='quickAdd'){quickAddModal();return}if(a==='settings'){setView('settings');return}
 if(a==='roleMenu'){$('#rolePopover').classList.toggle('hidden');return}if(a==='switchRole'){switchRole(el.dataset.role);return}
 if(a==='syncNow'){syncNow();return}if(a==='editMonth'){monthModal();return}if(a==='addRevenue'){revenueModal();return}
 if(a==='addTask'){taskModal(null,el.dataset.owner||'');return}if(a==='editTask'){taskModal(state.tasks.find(x=>x.id===el.dataset.id));return}if(a==='deleteTask'){if(!canDeleteTask()){toast('Удаление недоступно','Удалять задачи могут только Роман и Софа.','error');return}const x=state.tasks.find(t=>t.id===el.dataset.id);closeModal();deleteRecord(state.tasks,el.dataset.id,x?.title);return}
 if(a==='addGroup'){groupModal();return}if(a==='editGroup'){groupModal(state.groups.find(x=>x.id===el.dataset.id));return}if(a==='deleteGroup'){const x=state.groups.find(g=>g.id===el.dataset.id);deleteRecord(state.groups,el.dataset.id,x?.name);return}
 if(a==='addGoal'){goalModal();return}if(a==='editGoal'){goalModal(state.goals.find(x=>x.id===el.dataset.id));return}if(a==='deleteGoal'){const x=state.goals.find(g=>g.id===el.dataset.id);deleteRecord(state.goals,el.dataset.id,x?.title);return}
 if(a==='addEvent'){eventModal();return}if(a==='editEvent'){eventModal(state.events.find(x=>x.id===el.dataset.id));return}if(a==='deleteEvent'){const x=state.events.find(g=>g.id===el.dataset.id);deleteRecord(state.events,el.dataset.id,x?.title);return}
 if(a==='addRecommendation'){recommendationModal(null,el.dataset.mentor||state.ui.selectedMentor||'stas');return}if(a==='editRecommendation'){recommendationModal(state.recommendations.find(x=>x.id===el.dataset.id));return}
 if(a==='editSales'){salesModal();return}if(a==='closeMonth'){closeMonthModal();return}if(a==='capacityAudit'){capacityAuditModal();return}
 if(a==='selectMonth'){state.settings.currentMonth=el.dataset.key;state.ui.taskMonthMode='selected';state.meta.updatedAt=nowIso();persistLocal();renderShell();renderCurrentView();return}
 if(a==='eventFilter'){state.ui.eventType=el.dataset.type;persistLocal();renderCurrentView();return}
 if(a==='deleteRevenue'){const m=currentMonth(),x=m.daily.find(r=>r.id===el.dataset.id);if(x&&confirm(`Удалить поступление ${money(x.amount)}?`)){m.daily=m.daily.filter(r=>r.id!==x.id);m.fact=sum(m.daily,r=>r.amount);m.updatedAt=nowIso();revenueModal();touch('Удалено поступление')}return}
 if(a==='copyOwnerLink'){copyText(roleLink('owner'),'Личная ссылка Романа скопирована');return}if(a==='copyRoleLink'){copyText(roleLink(el.dataset.role),`Ссылка роли «${ROLES[el.dataset.role].name}» скопирована`);return}
 if(a==='exportData'){exportData();return}if(a==='importData'){$('#importInput').click();return}if(a==='resetState'){resetState();return}
}
function handleChange(e){const el=e.target;if(el.id==='monthSelect'){state.settings.currentMonth=el.value;state.ui.taskMonthMode='selected';state.meta.updatedAt=nowIso();persistLocal();renderShell();renderCurrentView();return}if(el.dataset.filter==='groupMentor'){state.ui.groupMentor=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='groupDiscipline'){state.ui.groupDiscipline=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='taskOwner'){state.ui.taskOwner=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='taskMonthMode'){state.ui.taskMonthMode=el.value;persistLocal();renderCurrentView()}if(el.dataset.filter==='selectedMentor'){state.ui.selectedMentor=el.value;persistLocal();renderCurrentView()}}
function handleInput(e){const el=e.target;if(el.dataset.filter==='groupSearch'){state.ui.groupSearch=el.value;persistLocal();clearTimeout(el.__t);el.__t=setTimeout(renderCurrentView,220)}}

async function boot(){
 try{
  state=loadLocal();currentRole=credentials.role||DEFAULT_ROLE;currentView=ROLES[currentRole]?.start||'dashboard';
  renderShell();renderCurrentView();$('#appShell').classList.remove('hidden');$('#mobileNav').classList.remove('hidden');
  $('#bootText').textContent='Система готова';setTimeout(()=>$('#boot').classList.add('fade'),280);setTimeout(()=>$('#boot').classList.add('hidden'),850);
  setupAutoSync();
  try{channel=new BroadcastChannel(`EK_GROWTH_6_${credentials.workspace}`);channel.onmessage=e=>{if(e.data?.type==='state'&&String(e.data.at)>String(state.meta.updatedAt)){state=mergeStates(state,e.data.state);persistLocal();renderShell();renderCurrentView()}}}catch{}
  setTimeout(()=>syncNow({quiet:true,push:true}),650);
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js?v=6003').catch(()=>{});
 }catch(e){console.error('BOOT_FAILED',e);$('#bootText').textContent='Ошибка запуска: '+e.message;$('#bootRetry').classList.remove('hidden');$('#bootRetry').onclick=()=>location.reload()}
}

// PAYROLL_TEAM_READABILITY_V1_START
const PAYROLL_EXTENSION_BUILD='2026.08.31-payroll-team-readability';
const DEFAULT_ADMIN_COMPENSATION={
  shiftRate:2500,
  groupRate:.07,
  itRate:.03,
  bonusTiers:[
    {id:'base',from:0,to:2499999.99,amount:10000,label:'до 2,5 млн ₽'},
    {id:'target',from:2500000,to:3499999.99,amount:12500,label:'2,5–3,5 млн ₽'},
    {id:'strong',from:3500000,to:null,amount:15000,label:'от 3,5 млн ₽'}
  ]
};
const AUGUST_ADMIN_SNAPSHOT={monthKey:'2026-08',clubRevenue:0,admins:{}};

function payrollClone(value){return JSON.parse(JSON.stringify(value))}
function salaryMoney(value){return new Intl.NumberFormat('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value)||0)+' ₽'}
function activeAdmins(){return (state?.people||[]).filter(p=>p.role==='admin'&&p.active!==false&&!p.archivedAt&&!p.deletedAt)}
function activeMentors(){return (state?.people||[]).filter(p=>(p.role==='mentor'||p.id==='stas')&&p.active!==false&&!p.archivedAt&&!p.deletedAt)}
function payrollEnsure(s){
  if(!s||typeof s!=='object')return s;
  s.settings=s.settings||{};
  const incoming=s.settings.adminCompensation||{};
  s.settings.adminCompensation={...payrollClone(DEFAULT_ADMIN_COMPENSATION),...incoming,bonusTiers:Array.isArray(incoming.bonusTiers)&&incoming.bonusTiers.length?incoming.bonusTiers:payrollClone(DEFAULT_ADMIN_COMPENSATION.bonusTiers)};
  s.settings.uiScale=clamp(Number(s.settings.uiScale)||1.1,1,1.22);
  s.adminOperationsByMonth=s.adminOperationsByMonth&&typeof s.adminOperationsByMonth==='object'?s.adminOperationsByMonth:{};
  s.mentorPayroll=Array.isArray(s.mentorPayroll)?s.mentorPayroll:[];
  s.adminSalarySnapshots=s.adminSalarySnapshots&&typeof s.adminSalarySnapshots==='object'?s.adminSalarySnapshots:{};
  if(!s.adminSalarySnapshots['2026-08'])s.adminSalarySnapshots['2026-08']=payrollClone(AUGUST_ADMIN_SNAPSHOT);
  if(!s.months['2026-08'])s.months['2026-08']={key:'2026-08',label:'Август 2026',minimum:2500000,target:2500000,stretch:3500000,fact:0,daily:[],focus:'Исторический расчёт зарплаты администраторов',loadTarget:75,updatedAt:'2026-08-31T23:59:59.000Z'};
  s.people=(s.people||[]).map(p=>({...p,active:p.active!==false}));
  s.ui={...(s.ui||{}),selectedAdmin:s.ui?.selectedAdmin||'anya',selectedMentor:s.ui?.selectedMentor||'stas',payrollTab:s.ui?.payrollTab||'all'};
  s.meta=s.meta||{};s.meta.build=PAYROLL_EXTENSION_BUILD;
  return s;
}

const __seedStatePayrollBase=seedState;
seedState=function(){return payrollEnsure(__seedStatePayrollBase())};
const __ensureStatePayrollBase=ensureState;
ensureState=function(raw){return payrollEnsure(__ensureStatePayrollBase(raw))};

credentials.personId=new URLSearchParams(location.hash.replace(/^#/,'')).get('p')||credentials.personId||'';
credentials.requestedView=new URLSearchParams(location.hash.replace(/^#/,'')).get('v')||'';

function adminViewerId(){
  const list=activeAdmins();
  if(currentRole==='admin'&&list.some(p=>p.id===credentials.personId))return credentials.personId;
  const chosen=state?.ui?.selectedAdmin;
  return list.some(p=>p.id===chosen)?chosen:(list[0]?.id||'anya');
}
function mentorViewerId(){
  const list=activeMentors();
  if(currentRole==='mentor'&&list.some(p=>p.id===credentials.personId))return credentials.personId;
  const chosen=state?.ui?.selectedMentor;
  return list.some(p=>p.id===chosen)?chosen:(list[0]?.id||'stas');
}
function isPersonalRole(){return (currentRole==='admin'||currentRole==='mentor')&&Boolean(credentials.personId)}
function canManageAdminPayroll(){return currentRole==='owner'||currentRole==='manager'}
function canManageMentorPayroll(){return currentRole==='owner'}
function canManageMentors(){return currentRole==='owner'}

const __roleInfoPayrollBase=roleInfo;
roleInfo=function(){
  if(state&&currentRole==='admin'){
    const p=person(adminViewerId());return{name:p.name,title:p.title||'Администратор',avatar:p.avatar||String(p.name||'А')[0],start:'admin'};
  }
  if(state&&currentRole==='mentor'){
    const p=person(mentorViewerId());return{name:p.name,title:p.title||'Наставник',avatar:p.avatar||String(p.name||'Н')[0],start:'mentor'};
  }
  return __roleInfoPayrollBase();
};

const __peopleOptionsPayrollBase=peopleOptions;
peopleOptions=function(selected='',roles=null){
  return (state.people||[]).filter(p=>p.active!==false&&!p.archivedAt&&!p.deletedAt).filter(p=>!roles||roles.includes(p.role)||roles.includes(p.id)).map(p=>`<option value="${p.id}" ${selected===p.id?'selected':''}>${esc(p.name)} · ${esc(p.area||p.title)}</option>`).join('');
};

function personalRoleLink(role,personId=''){
  const p=new URLSearchParams();p.set('w',credentials.workspace);p.set('k',credentials.key);p.set('r',role);if(personId)p.set('p',personId);p.set('t',`${role}-${personId||'team'}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`);return`${location.origin}${location.pathname}#${p.toString()}`;
}
roleLink=function(role,personId=''){return personalRoleLink(role,personId)};

const workSection=NAV.find(section=>section.section==='Работа');
if(workSection&&!workSection.items.some(x=>x.id==='payroll'))workSection.items.splice(3,0,{id:'payroll',label:'ЗП и мотивация',icon:'revenue',roles:['owner','manager']});

function applyUiScale(){if(!state)return;document.documentElement.style.setProperty('--ui-scale',String(clamp(state.settings.uiScale||1.1,1,1.22)))}
const __renderShellPayrollBase=renderShell;
renderShell=function(){applyUiScale();return __renderShellPayrollBase()};

const __switchRolePayrollBase=switchRole;
switchRole=function(role){
  if(role==='admin')credentials.personId=state?.ui?.selectedAdmin||activeAdmins()[0]?.id||'';
  else if(role==='mentor')credentials.personId=state?.ui?.selectedMentor||activeMentors()[0]?.id||'';
  else credentials.personId='';
  __switchRolePayrollBase(role);
  const p=new URLSearchParams(location.hash.slice(1));if(credentials.personId)p.set('p',credentials.personId);else p.delete('p');history.replaceState(null,'',location.pathname+location.search+'#'+p.toString());
};

function adminOpsMonth(key=state.settings.currentMonth){
  state.adminOperationsByMonth=state.adminOperationsByMonth||{};
  if(!state.adminOperationsByMonth[key])state.adminOperationsByMonth[key]={sales:[],shifts:[],adjustments:[],updatedAt:nowIso()};
  const m=state.adminOperationsByMonth[key];m.sales=Array.isArray(m.sales)?m.sales:[];m.shifts=Array.isArray(m.shifts)?m.shifts:[];m.adjustments=Array.isArray(m.adjustments)?m.adjustments:[];return m;
}
function adminRates(adminId){
  const base=state.settings.adminCompensation||DEFAULT_ADMIN_COMPENSATION,p=person(adminId),own=p.adminPay||{};
  return{shiftRate:Number(own.shiftRate??base.shiftRate)||0,groupRate:Number(own.groupRate??base.groupRate)||0,itRate:Number(own.itRate??base.itRate)||0,bonusTiers:Array.isArray(base.bonusTiers)?base.bonusTiers:DEFAULT_ADMIN_COMPENSATION.bonusTiers};
}
function bonusForRevenue(revenue,tiers){const r=Number(revenue)||0;const tier=(tiers||[]).find(x=>r>=Number(x.from||0)&&(x.to==null||r<=Number(x.to)));return tier?Number(tier.amount)||0:0}
function recordLive(x){return x&&!x.deletedAt}
function taskIsRequired(t){return t?.required===true||t?.mandatory===true||String(t?.required||t?.mandatory||'').toLowerCase()==='да'}
function monthRecordDate(key){const {mode}=dayOfProjection(key);if(mode==='past')return`${key}-${String(new Date(Number(key.slice(0,4)),Number(key.slice(5,7)),0).getDate()).padStart(2,'0')}`;if(mode==='future')return`${key}-00`;return today()}
function adminAllSalesForMonth(key){return adminOpsMonth(key).sales.filter(recordLive)}
function adminMonthStats(adminId,key=state.settings.currentMonth){
  const snapshot=state.adminSalarySnapshots?.[key]?.admins?.[adminId],ops=adminOpsMonth(key),sales=ops.sales.filter(x=>recordLive(x)&&x.adminId===adminId),shifts=ops.shifts.filter(x=>recordLive(x)&&x.adminId===adminId),adjustments=ops.adjustments.filter(x=>recordLive(x)&&x.adminId===adminId),rates=adminRates(adminId);
  if(snapshot&&!sales.length&&!shifts.length&&!adjustments.length){
    const daily=(snapshot.daily||[]).map(x=>({...x,shift:Boolean(x.totalShift),planned:false})),dailyMap=new Map(daily.map(x=>[x.date,x]));
    return{adminId,key,legacy:true,rates,revenue:snapshot.revenue||0,groupRevenue:0,itRevenue:0,salesCount:snapshot.sales||0,groupSales:snapshot.groupSales||0,itSales:snapshot.itSales||0,groupCommission:0,itCommission:0,commission:snapshot.commission||0,autoShifts:snapshot.shifts||0,manualShifts:0,shifts:snapshot.shifts||0,forecastShifts:snapshot.shifts||0,shiftPay:snapshot.shiftPay||0,projectedShiftPay:snapshot.shiftPay||0,premiums:snapshot.premiums||0,fines:snapshot.fines||0,corrections:snapshot.corrections||0,required:snapshot.required||0,requiredDone:snapshot.requiredDone||0,tasks:snapshot.tasks||0,tasksDone:snapshot.done||0,taskProgress:snapshot.tasks?snapshot.done/snapshot.tasks*100:0,bonusEligible:true,bonus:snapshot.bonus||0,bonusPotential:snapshot.bonus||0,total:snapshot.total||0,forecastTotal:snapshot.total||0,clubRevenue:state.adminSalarySnapshots[key].clubRevenue||0,clubForecast:state.adminSalarySnapshots[key].clubRevenue||0,daily,dailyMap,salesEntries:[],shiftEntries:[],adjustmentEntries:[]};
  }
  const groupSales=sales.filter(s=>s.type==='group'),itSales=sales.filter(s=>s.type==='it'),groupRevenue=sum(groupSales,s=>s.amount),itRevenue=sum(itSales,s=>s.amount),revenue=groupRevenue+itRevenue;
  const groupCommission=sum(groupSales,s=>Number(s.amount||0)*Number(s.rate??rates.groupRate)),itCommission=sum(itSales,s=>Number(s.amount||0)*Number(s.rate??rates.itRate)),commission=groupCommission+itCommission;
  const saleDates=new Set(sales.map(s=>s.date).filter(Boolean));
  const projection=dayOfProjection(key),cutoff=monthRecordDate(key),workedShiftEntries=shifts.filter(s=>s.status==='worked'||(s.status!=='planned'&&String(s.date||'')<=cutoff)),plannedEntries=shifts.filter(s=>s.status==='planned'||String(s.date||'')>cutoff);
  const manualDates=new Set(workedShiftEntries.map(s=>s.date).filter(d=>d&&!saleDates.has(d))),plannedDates=new Set(plannedEntries.map(s=>s.date).filter(d=>d&&!saleDates.has(d)));
  const actualShiftDates=new Set([...saleDates,...manualDates]),shiftsActual=actualShiftDates.size,explicitForecastShiftDates=new Set([...actualShiftDates,...plannedDates]);
  let forecastShifts=shiftsActual,projectedCommission=commission;
  if(projection.mode==='current'&&projection.elapsed){
    const paceShifts=Math.round(shiftsActual/projection.elapsed*projection.days),paceCommission=commission/projection.elapsed*projection.days;
    forecastShifts=Math.max(explicitForecastShiftDates.size,paceShifts);projectedCommission=Math.max(commission,paceCommission);
  }else if(projection.mode==='future'){forecastShifts=explicitForecastShiftDates.size;projectedCommission=commission}else if(projection.mode==='past'){forecastShifts=shiftsActual;projectedCommission=commission}
  const taskList=tasksForMonth(key).filter(t=>t.ownerId===adminId),requiredTasks=taskList.filter(taskIsRequired),requiredDone=requiredTasks.filter(t=>statusDone(t.status)).length,tasksDone=taskList.filter(t=>statusDone(t.status)).length,bonusEligible=requiredTasks.length>0&&requiredDone===requiredTasks.length;
  const clubRevenueFromMonth=monthFact(state.months[key]||{}),allAdminRevenue=sum(adminAllSalesForMonth(key),s=>s.amount),clubRevenue=clubRevenueFromMonth||allAdminRevenue;
  let clubForecast=clubRevenue;try{clubForecast=forecast(state.months[key]||currentMonth()).base||clubRevenue}catch{}
  if(!clubForecast&&projection.mode==='current'&&projection.elapsed)clubForecast=allAdminRevenue/projection.elapsed*projection.days;
  const bonus=bonusEligible?bonusForRevenue(clubRevenue,rates.bonusTiers):0,bonusPotential=requiredTasks.length?bonusForRevenue(clubForecast,rates.bonusTiers):0;
  const premiums=sum(adjustments.filter(a=>a.type==='premium'),a=>Math.abs(a.amount)),fines=sum(adjustments.filter(a=>a.type==='fine'),a=>Math.abs(a.amount)),corrections=sum(adjustments.filter(a=>a.type==='correction'),a=>a.amount),shiftPay=shiftsActual*rates.shiftRate,projectedShiftPay=forecastShifts*rates.shiftRate,total=shiftPay+commission+bonus+premiums+corrections-fines,forecastTotal=projectedShiftPay+projectedCommission+bonusPotential+premiums+corrections-fines;
  const dailyMap=new Map();
  const ensureDay=date=>{if(!dailyMap.has(date))dailyMap.set(date,{date,sales:0,revenue:0,commission:0,autoShift:0,manualShift:0,totalShift:0,planned:false,tasks:0,done:0});return dailyMap.get(date)};
  sales.forEach(s=>{const d=ensureDay(s.date);d.sales++;d.revenue+=Number(s.amount)||0;d.commission+=Number(s.amount||0)*Number(s.rate??(s.type==='group'?rates.groupRate:rates.itRate));d.autoShift=1;d.totalShift=1});
  shifts.forEach(s=>{const d=ensureDay(s.date);if(s.status==='planned'||String(s.date||'')>cutoff)d.planned=true;else if(!d.autoShift){d.manualShift=1;d.totalShift=1}});
  taskList.forEach(t=>{const date=t.deadline||`${key}-01`,d=ensureDay(date);d.tasks++;if(statusDone(t.status))d.done++});
  return{adminId,key,legacy:false,rates,revenue,groupRevenue,itRevenue,salesCount:sales.length,groupSales:groupSales.length,itSales:itSales.length,groupCommission,itCommission,commission,projectedCommission,autoShifts:saleDates.size,manualShifts:manualDates.size,shifts:shiftsActual,forecastShifts,shiftPay,projectedShiftPay,premiums,fines,corrections,required:requiredTasks.length,requiredDone,tasks:taskList.length,tasksDone,taskProgress:taskList.length?tasksDone/taskList.length*100:0,bonusEligible,bonus,bonusPotential,total,forecastTotal,clubRevenue,clubForecast,daily:[...dailyMap.values()].sort((a,b)=>a.date.localeCompare(b.date)),dailyMap,salesEntries:sales.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))),shiftEntries:shifts.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))),adjustmentEntries:adjustments.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))};
}

function mentorEntries(mentorId,key=state.settings.currentMonth){return state.mentorPayroll.filter(x=>recordLive(x)&&x.mentorId===mentorId&&monthKeyFromDate(x.date)===key).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function mentorPayrollStats(mentorId,key=state.settings.currentMonth){const entries=mentorEntries(mentorId,key),total=sum(entries,e=>e.amount),paid=sum(entries.filter(e=>e.status==='paid'),e=>e.amount),planned=total-paid;return{mentorId,key,entries,total,paid,planned,count:entries.length}}

function mergeMonthRecords(localMap={},remoteMap={}){
  const out={...localMap,...remoteMap};
  for(const key of new Set([...Object.keys(localMap||{}),...Object.keys(remoteMap||{})])){
    const l=localMap?.[key]||{},r=remoteMap?.[key]||{};out[key]={...l,...r,sales:mergeLists(l.sales||[],r.sales||[]),shifts:mergeLists(l.shifts||[],r.shifts||[]),adjustments:mergeLists(l.adjustments||[],r.adjustments||[]),updatedAt:[l.updatedAt,r.updatedAt].filter(Boolean).sort().pop()||nowIso()};
  }
  return out;
}
const __mergeStatesPayrollBase=mergeStates;
mergeStates=function(local,remote){
  const out=payrollEnsure(__mergeStatesPayrollBase(local,remote));if(!remote)return out;
  out.adminOperationsByMonth=mergeMonthRecords(local?.adminOperationsByMonth||{},remote?.adminOperationsByMonth||{});
  out.mentorPayroll=mergeLists(local?.mentorPayroll||[],remote?.mentorPayroll||[]);
  out.adminSalarySnapshots={...(local?.adminSalarySnapshots||{}),...(remote?.adminSalarySnapshots||{})};
  return payrollEnsure(out);
};

function adminSelectHtml(id){return`<select class="select readable-select" data-filter="selectedAdmin">${activeAdmins().map(p=>`<option value="${p.id}" ${p.id===id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`}
function mentorSelectHtml(id){return`<select class="select readable-select" data-filter="selectedMentor">${activeMentors().map(p=>`<option value="${p.id}" ${p.id===id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`}
function salaryBreakdownRows(stats){
  const rows=[['Оплата смен',stats.shiftPay,`${stats.shifts} × ${salaryMoney(stats.rates.shiftRate)}`]];
  if(stats.legacy)rows.push(['Комиссия с продаж',stats.commission,`${stats.salesCount} продаж · исторический расчёт из таблицы`]);
  else{rows.push([`Комиссия · групповые ${Math.round(stats.rates.groupRate*100)}%`,stats.groupCommission,stats.groupRevenue?`с ${salaryMoney(stats.groupRevenue)}`:'нет продаж']);rows.push([`Комиссия · ИТ ${Math.round(stats.rates.itRate*100)}%`,stats.itCommission,stats.itRevenue?`с ${salaryMoney(stats.itRevenue)}`:'нет продаж'])}
  rows.push(['Бонус за обязательные задачи',stats.bonus,stats.required?`${stats.requiredDone}/${stats.required} выполнено`:'обязательные задачи не назначены'],['Премии',stats.premiums,'ручные начисления'],['Корректировки',stats.corrections,'могут быть со знаком минус'],['Штрафы',-stats.fines,'вычитаются из зарплаты']);
  return rows;
}
function adminMotivationCard(stats){const tiers=stats.rates.bonusTiers||[];return`<section class="card pad payroll-motivation"><div class="card-head"><div><h3>Как считается зарплата</h3><p>Правила из таблицы «ЗП и задачи админов» перенесены в систему</p></div>${currentRole==='owner'?`<button class="btn btn-small btn-ghost" data-action="editAdminRates" data-id="${stats.adminId}">Изменить ставки</button>`:''}</div><div class="motivation-grid"><div><span>Смена</span><b>${salaryMoney(stats.rates.shiftRate)}</b></div><div><span>Групповая продажа</span><b>${Math.round(stats.rates.groupRate*100)}%</b></div><div><span>ИТ</span><b>${Math.round(stats.rates.itRate*100)}%</b></div><div class="${stats.bonusEligible?'good':'attention'}"><span>Бонус</span><b>${stats.required?`${stats.requiredDone}/${stats.required}`:'нет обяз. задач'}</b></div></div><div class="bonus-tiers">${tiers.map(t=>`<div class="bonus-tier ${stats.clubForecast>=Number(t.from||0)&&(t.to==null||stats.clubForecast<=Number(t.to))?'active':''}"><span>${esc(t.label||'Уровень')}</span><b>${salaryMoney(t.amount)}</b></div>`).join('')}</div><p class="readable-note">Бонус начисляется только при выполнении всех обязательных задач месяца. Уровень бонуса зависит от общей выручки клуба.</p></section>`}
function renderAdminSchedule(stats){
  const cells=calendarData(stats.key);return`<section class="card pad"><div class="card-head"><div><h3>График смен по дням</h3><p>Продажа автоматически засчитывает смену. Будущие смены по графику отмечены отдельно.</p></div>${canManageAdminPayroll()?`<button class="btn btn-small btn-ghost" data-action="addAdminShift" data-admin="${stats.adminId}">+ Смена / график</button>`:''}</div><div class="salary-calendar-week"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div><div class="salary-calendar">${cells.map(c=>{const d=stats.dailyMap.get(c.date),hasShift=d&&(d.totalShift||d.planned),cls=[c.off?'off':'',c.date===today()?'today':'',d?.totalShift?'worked':'',d?.planned&&!d?.totalShift?'planned':''].filter(Boolean).join(' ');return`<div class="salary-day ${cls}"><div class="salary-date"><b>${c.day}</b>${hasShift?`<span>${d.totalShift?'Смена':'План'}</span>`:''}</div>${d?`<small>${d.sales?`${d.sales} прод. · ${compactMoney(d.revenue)}`:d.planned?'по графику':d.tasks?`задачи ${d.done}/${d.tasks}`:''}</small>${d.commission?`<em>+${salaryMoney(d.commission)}</em>`:''}`:'<small>—</small>'}</div>`}).join('')}</div></section>`;
}
function adminHistoryHtml(stats,manage){
  const rows=[];
  rows.push(...stats.salesEntries.slice(0,6).map(s=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${s.type==='group'?'Групповая':'ИТ'} · ${salaryMoney(s.amount)}</b><small>${formatDate(s.date)}${s.client?` · ${esc(s.client)}`:''}</small></div>${manage?`<button class="task-delete" data-action="deleteAdminSale" data-id="${s.id}">${ICONS.trash}</button>`:''}</div>`));
  rows.push(...stats.adjustmentEntries.slice(0,5).map(a=>`<div class="compact-item"><i class="item-dot ${a.type==='fine'?'red':''}"></i><div class="item-main"><b>${a.type==='premium'?'Премия':a.type==='fine'?'Штраф':'Корректировка'} · ${salaryMoney(a.type==='fine'?-Math.abs(a.amount):a.amount)}</b><small>${formatDate(a.date)} · ${esc(a.note||'без комментария')}</small></div>${manage?`<button class="task-delete" data-action="deleteAdminAdjustment" data-id="${a.id}">${ICONS.trash}</button>`:''}</div>`));
  if(stats.legacy)rows.push(`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Исторические данные августа 2026</b><small>Перенесены из таблицы «ЗП и задачи админов Extreme Kids Тропарёво»</small></div></div>`);
  return rows.length?rows.join(''):'<div class="empty">Пока нет продаж и начислений в журнале.</div>';
}
function renderAdmin(){
  const adminId=adminViewerId(),p=person(adminId),stats=adminMonthStats(adminId),manage=canManageAdminPayroll(),selector=!isPersonalRole()&&['owner','manager'].includes(currentRole)?adminSelectHtml(adminId):'';
  const actions=`${selector}${manage?`<button class="btn btn-ghost" data-action="addAdminSale" data-admin="${adminId}">+ Продажа</button><button class="btn btn-primary" data-action="addAdminAdjustment" data-admin="${adminId}">+ Начисление</button>`:''}`;
  const tasks=tasksForMonth(stats.key).filter(t=>t.ownerId===adminId).sort(sortByDate);
  return`<div class="page readable-page">${pageHead('ЛИЧНЫЙ КАБИНЕТ АДМИНИСТРАТОРА',`${p.name} · зарплата и задачи`,`${currentMonth().label}: график, продажи, мотивация и прогноз зарплаты`,actions)}
  <section class="card payroll-hero"><div><div class="eyebrow">НАЧИСЛЕНО СЕЙЧАС</div><div class="payroll-hero-value">${salaryMoney(stats.total)}</div><p>Прогноз к концу месяца: <b>${salaryMoney(stats.forecastTotal)}</b>${stats.required&&!stats.bonusEligible?' · при выполнении обязательных задач':''}</p></div><div class="payroll-forecast"><span>Прогноз смен</span><b>${stats.forecastShifts}</b><small>сейчас ${stats.shifts}</small></div></section>
  <div class="grid-4">${metricCard('Моя выручка',compactMoney(stats.revenue),`${stats.salesCount} продаж`,'revenue')}${metricCard('Комиссия',salaryMoney(stats.commission),`прогноз ${salaryMoney(stats.projectedCommission??stats.commission)}`,'analytics')}${metricCard('Смены',String(stats.shifts),`прогноз ${stats.forecastShifts} · ставка ${salaryMoney(stats.rates.shiftRate)}`,'calendar')}${metricCard('Задачи',pct(stats.taskProgress),`${stats.tasksDone}/${stats.tasks} · обязательные ${stats.requiredDone}/${stats.required}`,'tasks',stats.taskProgress)}</div>
  <div class="grid-main">${adminMotivationCard(stats)}<section class="card pad"><div class="card-head"><div><h3>Расчёт зарплаты</h3><p>Все составляющие видны отдельно</p></div></div><div class="salary-breakdown">${salaryBreakdownRows(stats).map(([label,value,note])=>`<div class="salary-row"><div><b>${esc(label)}</b><small>${esc(note)}</small></div><strong class="${Number(value)<0?'negative':''}">${salaryMoney(value)}</strong></div>`).join('')}<div class="salary-row total"><div><b>Итоговая зарплата</b><small>на текущий момент</small></div><strong>${salaryMoney(stats.total)}</strong></div></div></section></div>
  ${renderAdminSchedule(stats)}
  <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Мои задачи</h3><p>Обязательные задачи влияют на бонус</p></div><button class="btn btn-small btn-ghost" data-view="tasks">Все задачи</button></div><div class="compact-list">${tasks.length?tasks.map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${formatDateShort(t.deadline)} · ${esc(statusLabel(t.status))}</small></div>${taskIsRequired(t)?'<span class="pill">Обязательная</span>':''}</div>`).join(''):'<div class="empty"><b>Задач нет</b>На выбранный месяц задачи не назначены.</div>'}</div></section>
  <section class="card pad"><div class="card-head"><div><h3>Продажи и начисления</h3><p>История, из которой собирается зарплата</p></div></div><div class="compact-list payroll-history">${adminHistoryHtml(stats,manage)}</div></section></div></div>`;
}

function renderMentor(){
  const mentorId=mentorViewerId(),p=person(mentorId),gs=activeGroups().filter(g=>g.mentorId===mentorId),ls=loadStats(gs),tasks=currentMonthTasks().filter(t=>t.ownerId===mentorId&&!statusDone(t.status)),recs=state.recommendations.filter(r=>r.mentorId===mentorId&&!r.deletedAt),pay=mentorPayrollStats(mentorId),selector=!isPersonalRole()&&['owner','manager','stas'].includes(currentRole)?mentorSelectHtml(mentorId):'';
  const actions=`${selector}<button class="btn btn-ghost" data-action="addRecommendation" data-mentor="${mentorId}">+ Рекомендация</button>${canManageMentorPayroll()?`<button class="btn btn-primary" data-action="addMentorPayment" data-mentor="${mentorId}">+ Начисление ЗП</button>`:''}`;
  return`<div class="page readable-page">${pageHead('ЛИЧНЫЙ КАБИНЕТ НАСТАВНИКА',`${p.name} · работа и зарплата`,`${currentMonth().label}: группы, задачи, рекомендации и начисления`,actions)}
  <section class="card payroll-hero mentor-pay-hero"><div><div class="eyebrow">МОЯ ЗАРПЛАТА ЗА МЕСЯЦ</div><div class="payroll-hero-value">${salaryMoney(pay.total)}</div><p>${pay.count?`${pay.count} начислений · выплачено ${salaryMoney(pay.paid)}`:'Роман ещё не добавил начисления за выбранный месяц'}</p></div><div class="payroll-forecast"><span>Группы</span><b>${gs.length}</b><small>${ls.students} детей</small></div></section>
  <div class="grid-4">${metricCard('Начислено',salaryMoney(pay.total),`${pay.count} позиций`,'revenue')}${metricCard('Выплачено',salaryMoney(pay.paid),`к выплате ${salaryMoney(pay.planned)}`,'analytics')}${metricCard('Загрузка',pct(ls.load),`${ls.students}/${ls.capacity} мест`,'users',ls.load)}${metricCard('Открытые задачи',String(tasks.length),'Ближайшие дедлайны','tasks')}</div>
  <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>За что начислена зарплата</h3><p>Каждая сумма и комментарий Романа отображаются отдельно</p></div>${canManageMentorPayroll()?`<button class="btn btn-small btn-ghost" data-action="addMentorPayment" data-mentor="${mentorId}">+ Добавить</button>`:''}</div><div class="salary-entry-list">${pay.entries.length?pay.entries.map(e=>`<div class="salary-entry"><div><span>${formatDate(e.date)} · ${esc(e.category||'Начисление')}</span><b>${esc(e.reason||'Без описания')}</b><small>${e.status==='paid'?'Выплачено':'Начислено к выплате'}</small></div><strong class="${Number(e.amount)<0?'negative':''}">${salaryMoney(e.amount)}</strong>${canManageMentorPayroll()?`<button class="task-delete" data-action="deleteMentorPayment" data-id="${e.id}">${ICONS.trash}</button>`:''}</div>`).join(''):'<div class="empty"><b>Начислений пока нет</b>После добавления суммы Романом она появится здесь.</div>'}</div></section>
  <section class="card pad"><div class="card-head"><div><h3>Мои задачи</h3><p>Ближайшие дедлайны</p></div></div><div class="compact-list">${tasks.sort(sortByDate).slice(0,7).map(t=>`<div class="compact-item" data-action="editTask" data-id="${t.id}"><i class="item-dot ${isOverdue(t)?'red':''}"></i><div class="item-main"><b>${esc(t.title)}</b><small>${formatDateShort(t.deadline)} · ${esc(statusLabel(t.status))}</small></div></div>`).join('')||'<div class="empty">Задач нет</div>'}</div></section></div>
  <section class="card pad"><div class="card-head"><div><h3>Мои группы</h3><p>День, время, загрузка и свободные места</p></div></div>${gs.length?groupsMiniTable(gs):'<div class="empty"><b>Группы ещё не назначены</b>Роман или руководитель может добавить группы этому наставнику.</div>'}</section>
  <section class="card pad"><div class="card-head"><div><h3>Рекомендации детям</h3><p>Повышение уровня, вторая тренировка, спорт-группа или индивидуальная</p></div></div><div class="compact-list">${recs.map(r=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(r.childName)}</b><small>${esc(r.recommendation)} · ${esc(statusLabel(r.status))}</small></div><div class="table-actions"><button data-action="editRecommendation" data-id="${r.id}">${ICONS.edit}</button></div></div>`).join('')||'<div class="empty"><b>Рекомендаций пока нет</b>Передавайте администраторам следующий шаг ребёнка.</div>'}</div></section></div>`;
}

function renderPayroll(){
  const key=state.settings.currentMonth,admins=activeAdmins().map(p=>({p,s:adminMonthStats(p.id,key)})),mentors=activeMentors().map(p=>({p,s:mentorPayrollStats(p.id,key),groups:activeGroups().filter(g=>g.mentorId===p.id)})),adminFund=sum(admins,x=>x.s.total),adminForecast=sum(admins,x=>x.s.forecastTotal),mentorFund=sum(mentors,x=>x.s.total),manageMentors=canManageMentorPayroll();
  return`<div class="page readable-page">${pageHead('ЗАРПЛАТА И МОТИВАЦИЯ','ЗП команды',`${currentMonth().label}: прозрачный расчёт администраторов и начисления наставникам`,`${manageMentors?'<button class="btn btn-ghost" data-action="addMentor">+ Наставник</button><button class="btn btn-primary" data-action="addMentorPayment">+ Начисление наставнику</button>':''}`)}
  <div class="grid-4">${metricCard('ЗП администраторов',salaryMoney(adminFund),`прогноз ${salaryMoney(adminForecast)}`,'revenue')}${metricCard('ЗП наставников',salaryMoney(mentorFund),`${sum(mentors,x=>x.s.count)} начислений`,'users')}${metricCard('Общий фонд ЗП',salaryMoney(adminFund+mentorFund),`прогноз с админами ${salaryMoney(adminForecast+mentorFund)}`,'analytics')}${metricCard('Наставников',String(mentors.length),'активных кабинетов','mentor')}</div>
  <section class="card pad"><div class="card-head"><div><h3>Администраторы · автоматический расчёт</h3><p>Смена 2 500 ₽, групповые 7%, ИТ 3%; бонус — при выполнении всех обязательных задач</p></div>${currentRole==='owner'?'<button class="btn btn-small btn-ghost" data-action="editAdminRules">Настроить мотивацию</button>':''}</div><div class="table-wrap"><table class="data-table payroll-table"><thead><tr><th>Администратор</th><th>Выручка</th><th>Смены</th><th>Комиссия</th><th>Задачи</th><th>Бонус</th><th>ЗП сейчас</th><th>Прогноз</th><th></th></tr></thead><tbody>${admins.map(({p,s})=>`<tr><td><div class="table-title"><span class="avatar small">${esc(p.avatar||p.name[0])}</span><div><b>${esc(p.name)}</b><small>${Math.round(s.rates.groupRate*100)}% / ${Math.round(s.rates.itRate*100)}% · смена ${salaryMoney(s.rates.shiftRate)}</small></div></div></td><td>${salaryMoney(s.revenue)}</td><td>${s.shifts} → ${s.forecastShifts}</td><td>${salaryMoney(s.commission)}</td><td>${s.tasksDone}/${s.tasks}${s.required?` · обяз. ${s.requiredDone}/${s.required}`:''}</td><td>${salaryMoney(s.bonus)}${!s.bonusEligible&&s.bonusPotential?`<small class="table-sub">возможно ${salaryMoney(s.bonusPotential)}</small>`:''}</td><td><b>${salaryMoney(s.total)}</b></td><td><b>${salaryMoney(s.forecastTotal)}</b></td><td><div class="table-actions"><button data-action="openAdminCabinet" data-id="${p.id}" title="Открыть кабинет">${ICONS.edit}</button>${canManageAdminPayroll()?`<button data-action="addAdminSale" data-admin="${p.id}" title="Добавить продажу">${ICONS.plus}</button>`:''}<button data-action="copyPersonLink" data-role="admin" data-id="${p.id}" title="Скопировать личную ссылку">${ICONS.copy}</button></div></td></tr>`).join('')}</tbody></table></div></section>
  <section class="card pad"><div class="card-head"><div><h3>Наставники · начисления Романа</h3><p>Роман указывает сумму и за что она начислена; наставник видит это в своём кабинете</p></div>${manageMentors?'<button class="btn btn-small btn-primary" data-action="addMentorPayment">+ Начисление</button>':''}</div><div class="table-wrap"><table class="data-table payroll-table"><thead><tr><th>Наставник</th><th>Направление</th><th>Группы</th><th>Начислений</th><th>Сумма месяца</th><th>Последнее начисление</th><th></th></tr></thead><tbody>${mentors.map(({p,s,groups})=>`<tr><td><div class="table-title"><span class="avatar small">${esc(p.avatar||p.name[0])}</span><div><b>${esc(p.name)}</b><small>${esc(p.title||'Наставник')}</small></div></div></td><td>${esc(p.area||'—')}</td><td>${groups.length}</td><td>${s.count}</td><td><b>${salaryMoney(s.total)}</b></td><td>${s.entries[0]?`${formatDateShort(s.entries[0].date)} · ${esc(s.entries[0].reason||s.entries[0].category||'Начисление')}`:'—'}</td><td><div class="table-actions"><button data-action="openMentorCabinet" data-id="${p.id}" title="Открыть кабинет">${ICONS.edit}</button>${manageMentors?`<button data-action="addMentorPayment" data-mentor="${p.id}" title="Начислить зарплату">${ICONS.plus}</button>`:''}<button data-action="copyPersonLink" data-role="mentor" data-id="${p.id}" title="Скопировать личную ссылку">${ICONS.copy}</button>${canManageMentors()&&p.id!=='stas'?`<button data-action="archiveMentor" data-id="${p.id}" title="Удалить наставника">${ICONS.trash}</button>`:''}</div></td></tr>`).join('')}</tbody></table></div></section>
  ${canManageMentors()?renderArchivedMentors():''}</div>`;
}
function renderArchivedMentors(){const list=(state.people||[]).filter(p=>(p.role==='mentor'||p.id==='stas')&&(p.active===false||p.archivedAt));return list.length?`<section class="card pad"><div class="card-head"><div><h3>Удалённые наставники</h3><p>История начислений сохранена; кабинет можно восстановить</p></div></div><div class="compact-list">${list.map(p=>`<div class="compact-item"><span class="avatar small">${esc(p.avatar||p.name[0])}</span><div class="item-main"><b>${esc(p.name)}</b><small>${esc(p.area||'Наставник')}</small></div><button class="btn btn-small btn-ghost" data-action="restoreMentor" data-id="${p.id}">Восстановить</button></div>`).join('')}</div></section>`:''}

function appendBeforePageClose(html,extra){const i=html.lastIndexOf('</div>');return i<0?html+extra:html.slice(0,i)+extra+html.slice(i)}
const __renderSettingsPayrollBase=renderSettings;
renderSettings=function(){
  const base=__renderSettingsPayrollBase();if(currentRole!=='owner')return base;
  const extra=`<section class="card settings-block span-2 readable-settings"><h3>Размер и читаемость интерфейса</h3><p>По умолчанию включён комфортный масштаб 110%: текст крупнее, контраст мягче, строки свободнее.</p><div class="scale-buttons">${[[1,'100%'],[1.1,'110% · комфорт'],[1.2,'120% · крупно']].map(([v,l])=>`<button class="btn ${Math.abs((state.settings.uiScale||1.1)-v)<.01?'btn-primary':'btn-ghost'}" data-action="setUiScale" data-value="${v}">${l}</button>`).join('')}</div></section><section class="card settings-block span-2"><h3>Персональные ссылки сотрудников</h3><p>Каждый администратор и наставник получает собственный кабинет. Полная ссылка содержит ключ общей базы — отправляйте её только конкретному сотруднику.</p><div class="personal-links-grid"><div><h4>Администраторы</h4><div class="compact-list">${activeAdmins().map(p=>`<div class="compact-item"><span class="avatar small">${esc(p.avatar||p.name[0])}</span><div class="item-main"><b>${esc(p.name)}</b><small>Зарплата, график и задачи</small></div><button class="btn btn-small btn-ghost" data-action="copyPersonLink" data-role="admin" data-id="${p.id}">Копировать</button></div>`).join('')}</div></div><div><h4>Наставники</h4><div class="compact-list">${activeMentors().map(p=>`<div class="compact-item"><span class="avatar small">${esc(p.avatar||p.name[0])}</span><div class="item-main"><b>${esc(p.name)}</b><small>Группы, задачи и начисления</small></div><button class="btn btn-small btn-ghost" data-action="copyPersonLink" data-role="mentor" data-id="${p.id}">Копировать</button></div>`).join('')}</div></div></div></section>`;
  return appendBeforePageClose(base,extra);
};

const __taskModalPayrollBase=taskModal;
taskModal=function(item=null,owner=''){
  __taskModalPayrollBase(item,owner);const form=$('#taskForm');if(!form||form.querySelector('[name="required"]'))return;const actions=form.querySelector('.form-actions');if(!actions)return;const label=document.createElement('label');label.className='check span-2 mandatory-task-check';label.innerHTML=`<input type="checkbox" name="required" ${taskIsRequired(item)?'checked':''}> Обязательная задача — влияет на бонус администратора`;actions.before(label);
};

function adminSaleModal(item=null,adminId=adminViewerId()){
  const rates=adminRates(adminId),s=item||{id:'',adminId,date:today().startsWith(state.settings.currentMonth)?today():state.settings.currentMonth+'-01',type:'group',client:'',amount:0,note:'',countInRevenue:true};
  openModal({title:item?'Редактировать продажу':'Добавить продажу администратора',subtitle:'Продажа участвует в комиссии и автоматически засчитывает смену',body:`<form id="adminSaleForm" data-id="${esc(s.id||'')}" class="form-grid"><div class="field"><label>Администратор</label><select class="select" name="adminId">${activeAdmins().map(p=>`<option value="${p.id}" ${p.id===s.adminId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${esc(s.date)}" required></div><div class="field"><label>Тип продажи</label><select class="select" name="type"><option value="group" ${s.type==='group'?'selected':''}>Групповой абонемент · ${Math.round(rates.groupRate*100)}%</option><option value="it" ${s.type==='it'?'selected':''}>ИТ · ${Math.round(rates.itRate*100)}%</option></select></div><div class="field"><label>Сумма продажи</label><input class="input" type="number" min="0" step="0.01" name="amount" value="${Number(s.amount)||''}" required></div><div class="field span-2"><label>Клиент</label><input class="input" name="client" value="${esc(s.client||'')}" placeholder="Имя ребёнка или родителя"></div><div class="field span-2"><label>Комментарий</label><input class="input" name="note" value="${esc(s.note||'')}" placeholder="Абонемент, период, особые условия"></div><label class="check span-2"><input type="checkbox" name="countInRevenue" ${s.countInRevenue!==false?'checked':''}> Добавить эту продажу в общую выручку клуба</label>${formActions(item?'Сохранить':'Добавить продажу')}</form>`});
}
function adminShiftModal(item=null,adminId=adminViewerId()){
  const s=item||{id:'',adminId,date:today().startsWith(state.settings.currentMonth)?today():state.settings.currentMonth+'-01',status:'worked',note:''};openModal({title:item?'Редактировать смену':'Добавить смену в график',subtitle:'Смена с продажей уже считается автоматически; вручную добавляйте дни без продаж или будущий график',body:`<form id="adminShiftForm" data-id="${esc(s.id||'')}" class="form-grid"><div class="field"><label>Администратор</label><select class="select" name="adminId">${activeAdmins().map(p=>`<option value="${p.id}" ${p.id===s.adminId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${esc(s.date)}" required></div><div class="field span-2"><label>Статус</label><select class="select" name="status"><option value="worked" ${s.status==='worked'?'selected':''}>Отработана вручную · засчитать в ЗП</option><option value="planned" ${s.status==='planned'?'selected':''}>По графику · учесть в прогнозе</option></select></div><div class="field span-2"><label>Комментарий</label><input class="input" name="note" value="${esc(s.note||'')}" placeholder="Причина ручной смены или примечание к графику"></div>${formActions(item?'Сохранить':'Добавить смену')}</form>`});
}
function adminAdjustmentModal(item=null,adminId=adminViewerId()){
  const a=item||{id:'',adminId,date:today().startsWith(state.settings.currentMonth)?today():state.settings.currentMonth+'-01',type:'premium',amount:0,note:''};openModal({title:item?'Редактировать начисление':'Премия, штраф или корректировка',subtitle:'Ручные начисления сразу отражаются в кабинете администратора',body:`<form id="adminAdjustmentForm" data-id="${esc(a.id||'')}" class="form-grid"><div class="field"><label>Администратор</label><select class="select" name="adminId">${activeAdmins().map(p=>`<option value="${p.id}" ${p.id===a.adminId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${esc(a.date)}" required></div><div class="field"><label>Тип</label><select class="select" name="type"><option value="premium" ${a.type==='premium'?'selected':''}>Премия</option><option value="fine" ${a.type==='fine'?'selected':''}>Штраф</option><option value="correction" ${a.type==='correction'?'selected':''}>Корректировка (+/−)</option></select></div><div class="field"><label>Сумма</label><input class="input" type="number" step="0.01" name="amount" value="${Number(a.amount)||''}" required></div><div class="field span-2"><label>За что</label><textarea class="textarea" name="note" required>${esc(a.note||'')}</textarea></div>${formActions(item?'Сохранить':'Добавить')}</form>`});
}
function mentorPaymentModal(item=null,mentorId=mentorViewerId()){
  const e=item||{id:'',mentorId,date:today().startsWith(state.settings.currentMonth)?today():state.settings.currentMonth+'-01',category:'Тренировки',reason:'',amount:0,status:'accrued'};openModal({title:item?'Редактировать начисление':'Начислить зарплату наставнику',subtitle:'Сумма и описание сразу появятся в личном кабинете наставника',body:`<form id="mentorPaymentForm" data-id="${esc(e.id||'')}" class="form-grid"><div class="field"><label>Наставник</label><select class="select" name="mentorId">${activeMentors().map(p=>`<option value="${p.id}" ${p.id===e.mentorId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${esc(e.date)}" required></div><div class="field"><label>Категория</label><select class="select" name="category">${['Тренировки','Индивидуальные тренировки','Лагерь / сборы','Мероприятие','Премия','Штраф / корректировка','Другое'].map(v=>`<option ${e.category===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Сумма</label><input class="input" type="number" step="0.01" name="amount" value="${Number(e.amount)||''}" required></div><div class="field span-2"><label>За что начислено</label><textarea class="textarea" name="reason" placeholder="Количество тренировок, мероприятие, премия и т. д." required>${esc(e.reason||'')}</textarea></div><div class="field span-2"><label>Статус</label><select class="select" name="status"><option value="accrued" ${e.status!=='paid'?'selected':''}>Начислено к выплате</option><option value="paid" ${e.status==='paid'?'selected':''}>Выплачено</option></select></div>${formActions(item?'Сохранить':'Начислить')}</form>`});
}
function mentorPersonModal(item=null){const p=item||{id:'',name:'',area:'',title:'Наставник',avatar:''};openModal({title:item?'Редактировать наставника':'Добавить наставника',subtitle:'После сохранения появится отдельный кабинет и персональная ссылка',body:`<form id="mentorPersonForm" data-id="${esc(p.id||'')}" class="form-grid"><div class="field span-2"><label>Имя</label><input class="input" name="name" value="${esc(p.name||'')}" required></div><div class="field"><label>Направление</label><input class="input" name="area" value="${esc(p.area||'')}" placeholder="Ролики, скейт, BMX…"></div><div class="field"><label>Должность</label><input class="input" name="title" value="${esc(p.title||'Наставник')}"></div><div class="field"><label>Буква на аватаре</label><input class="input" name="avatar" maxlength="3" value="${esc(p.avatar||'')}"></div>${formActions(item?'Сохранить':'Добавить наставника')}</form>`});}
function adminRulesModal(){const r=state.settings.adminCompensation||DEFAULT_ADMIN_COMPENSATION,t=r.bonusTiers||DEFAULT_ADMIN_COMPENSATION.bonusTiers;openModal({title:'Система мотивации администраторов',subtitle:'Значения по умолчанию для всей команды',body:`<form id="adminRulesForm" class="form-grid"><div class="field"><label>Ставка за смену</label><input class="input" type="number" min="0" name="shiftRate" value="${r.shiftRate}"></div><div class="field"><label>Групповые, %</label><input class="input" type="number" min="0" max="100" step="0.1" name="groupRate" value="${r.groupRate*100}"></div><div class="field"><label>ИТ, %</label><input class="input" type="number" min="0" max="100" step="0.1" name="itRate" value="${r.itRate*100}"></div><div class="field"><label>Бонус до 2,5 млн</label><input class="input" type="number" min="0" name="bonus1" value="${t[0]?.amount||10000}"></div><div class="field"><label>Бонус 2,5–3,5 млн</label><input class="input" type="number" min="0" name="bonus2" value="${t[1]?.amount||12500}"></div><div class="field"><label>Бонус от 3,5 млн</label><input class="input" type="number" min="0" name="bonus3" value="${t[2]?.amount||15000}"></div>${formActions()}</form>`});}
function adminRatesModal(adminId){const p=person(adminId),r=adminRates(adminId);openModal({title:`Ставки · ${p.name}`,subtitle:'Персональные ставки перекрывают общие настройки',body:`<form id="adminRatesForm" data-id="${adminId}" class="form-grid"><div class="field"><label>Ставка за смену</label><input class="input" type="number" min="0" name="shiftRate" value="${r.shiftRate}"></div><div class="field"><label>Групповые, %</label><input class="input" type="number" min="0" max="100" step="0.1" name="groupRate" value="${r.groupRate*100}"></div><div class="field"><label>ИТ, %</label><input class="input" type="number" min="0" max="100" step="0.1" name="itRate" value="${r.itRate*100}"></div>${formActions()}</form>`});}

function ensureMonthForDate(date){const key=monthKeyFromDate(date);if(!key)return currentMonth();if(!state.months[key])state.months[key]={key,label:monthLabel(key),minimum:state.settings.minimumRevenue||2500000,target:state.settings.normalRevenue||3000000,stretch:state.settings.strongRevenue||3500000,fact:0,daily:[],focus:'',loadTarget:80,updatedAt:nowIso()};return state.months[key]}
function removeLinkedRevenue(sourceId){for(const m of Object.values(state.months||{})){m.daily=(m.daily||[]).filter(r=>r.sourceId!==sourceId);if(m.daily.length)m.fact=sum(m.daily,r=>r.amount);m.updatedAt=nowIso()}}
function syncSaleRevenue(sale){removeLinkedRevenue(sale.id);if(!sale.countInRevenue||sale.deletedAt)return;const m=ensureMonthForDate(sale.date);m.daily=m.daily||[];m.daily.push({id:`rev_${sale.id}`,date:sale.date,amount:Number(sale.amount)||0,note:`Продажа ${person(sale.adminId).name} · ${sale.type==='group'?'групповой':'ИТ'}${sale.client?' · '+sale.client:''}`,source:'admin-sale',sourceId:sale.id,updatedAt:nowIso()});m.fact=sum(m.daily,r=>r.amount);m.updatedAt=nowIso()}

const __handleSubmitPayrollBase=handleSubmit;
handleSubmit=function(e){
  const f=e.target;if(!(f instanceof HTMLFormElement))return __handleSubmitPayrollBase(e);const v=formValues(f),stamp=nowIso();
  if(f.id==='adminSaleForm'){
    e.preventDefault();const key=monthKeyFromDate(v.date)||state.settings.currentMonth,ops=adminOpsMonth(key),old=Object.values(state.adminOperationsByMonth).flatMap(x=>x.sales||[]).find(x=>x.id===f.dataset.id),rates=adminRates(v.adminId),item={...(old||{}),id:old?.id||id('asale'),adminId:v.adminId,date:v.date,type:v.type,client:v.client,amount:num(v.amount),note:v.note,countInRevenue:f.elements.countInRevenue.checked,rate:v.type==='group'?rates.groupRate:rates.itRate,updatedAt:stamp,createdAt:old?.createdAt||stamp};if(old&&monthKeyFromDate(old.date)!==key){const oldOps=adminOpsMonth(monthKeyFromDate(old.date));oldOps.sales=oldOps.sales.filter(x=>x.id!==old.id)}upsert(ops.sales,item);syncSaleRevenue(item);closeModal();touch(`Продажа ${person(item.adminId).name}: ${salaryMoney(item.amount)}`);return;
  }
  if(f.id==='adminShiftForm'){
    e.preventDefault();const key=monthKeyFromDate(v.date)||state.settings.currentMonth,ops=adminOpsMonth(key),old=Object.values(state.adminOperationsByMonth).flatMap(x=>x.shifts||[]).find(x=>x.id===f.dataset.id),item={...(old||{}),id:old?.id||id('ashift'),adminId:v.adminId,date:v.date,status:v.status,note:v.note,updatedAt:stamp,createdAt:old?.createdAt||stamp};if(old&&monthKeyFromDate(old.date)!==key){const oldOps=adminOpsMonth(monthKeyFromDate(old.date));oldOps.shifts=oldOps.shifts.filter(x=>x.id!==old.id)}upsert(ops.shifts,item);closeModal();touch(`Смена ${person(item.adminId).name}: ${formatDate(item.date)}`);return;
  }
  if(f.id==='adminAdjustmentForm'){
    e.preventDefault();const key=monthKeyFromDate(v.date)||state.settings.currentMonth,ops=adminOpsMonth(key),old=Object.values(state.adminOperationsByMonth).flatMap(x=>x.adjustments||[]).find(x=>x.id===f.dataset.id),item={...(old||{}),id:old?.id||id('aadj'),adminId:v.adminId,date:v.date,type:v.type,amount:num(v.amount),note:v.note,updatedAt:stamp,createdAt:old?.createdAt||stamp};if(old&&monthKeyFromDate(old.date)!==key){const oldOps=adminOpsMonth(monthKeyFromDate(old.date));oldOps.adjustments=oldOps.adjustments.filter(x=>x.id!==old.id)}upsert(ops.adjustments,item);closeModal();touch(`Начисление ${person(item.adminId).name}: ${salaryMoney(item.amount)}`);return;
  }
  if(f.id==='mentorPaymentForm'){
    e.preventDefault();if(!canManageMentorPayroll())return;const old=state.mentorPayroll.find(x=>x.id===f.dataset.id),item={...(old||{}),id:old?.id||id('mpay'),mentorId:v.mentorId,date:v.date,category:v.category,reason:v.reason,amount:num(v.amount),status:v.status,updatedAt:stamp,createdAt:old?.createdAt||stamp};upsert(state.mentorPayroll,item);closeModal();touch(`ЗП ${person(item.mentorId).name}: ${salaryMoney(item.amount)}`);return;
  }
  if(f.id==='mentorPersonForm'){
    e.preventDefault();if(!canManageMentors())return;const old=state.people.find(x=>x.id===f.dataset.id),item={...(old||{}),id:old?.id||`mentor_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,name:v.name,role:'mentor',title:v.title||'Наставник',area:v.area,avatar:(v.avatar||v.name||'Н').trim().slice(0,3),active:true,archivedAt:null,updatedAt:stamp,createdAt:old?.createdAt||stamp};upsert(state.people,item);state.ui.selectedMentor=item.id;closeModal();touch(`Наставник: ${item.name}`);setView('payroll');return;
  }
  if(f.id==='adminRulesForm'){
    e.preventDefault();if(currentRole!=='owner')return;state.settings.adminCompensation={shiftRate:num(v.shiftRate),groupRate:num(v.groupRate)/100,itRate:num(v.itRate)/100,bonusTiers:[{id:'base',from:0,to:2499999.99,amount:num(v.bonus1),label:'до 2,5 млн ₽'},{id:'target',from:2500000,to:3499999.99,amount:num(v.bonus2),label:'2,5–3,5 млн ₽'},{id:'strong',from:3500000,to:null,amount:num(v.bonus3),label:'от 3,5 млн ₽'}]};closeModal();touch('Обновлена система мотивации администраторов');return;
  }
  if(f.id==='adminRatesForm'){
    e.preventDefault();if(currentRole!=='owner')return;const p=state.people.find(x=>x.id===f.dataset.id);if(p){p.adminPay={shiftRate:num(v.shiftRate),groupRate:num(v.groupRate)/100,itRate:num(v.itRate)/100};p.updatedAt=stamp}closeModal();touch(`Обновлены ставки ${p?.name||''}`);return;
  }
  return __handleSubmitPayrollBase(e);
};

function softDeleteAdminRecord(collection,idValue,label){const item=collection.find(x=>x.id===idValue);if(!item)return;if(!confirm(`Удалить «${label}»?`))return;item.deletedAt=nowIso();item.updatedAt=nowIso();if(collection===Object.values(state.adminOperationsByMonth).flatMap(x=>x.sales||[]))removeLinkedRevenue(item.id);touch(`Удалено: ${label}`)}
function findAdminRecord(type,idValue){for(const m of Object.values(state.adminOperationsByMonth||{})){const list=m[type]||[],item=list.find(x=>x.id===idValue);if(item)return{m,list,item}}return null}
const __handleClickPayrollBase=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');if(el){const a=el.dataset.action;
    if(a==='addAdminSale'){if(canManageAdminPayroll())adminSaleModal(null,el.dataset.admin||adminViewerId());return}
    if(a==='addAdminShift'){if(canManageAdminPayroll())adminShiftModal(null,el.dataset.admin||adminViewerId());return}
    if(a==='addAdminAdjustment'){if(canManageAdminPayroll())adminAdjustmentModal(null,el.dataset.admin||adminViewerId());return}
    if(a==='deleteAdminSale'){if(!canManageAdminPayroll())return;const found=findAdminRecord('sales',el.dataset.id);if(found&&confirm('Удалить продажу?')){found.item.deletedAt=nowIso();found.item.updatedAt=nowIso();removeLinkedRevenue(found.item.id);touch('Продажа удалена')}return}
    if(a==='deleteAdminAdjustment'){if(!canManageAdminPayroll())return;const found=findAdminRecord('adjustments',el.dataset.id);if(found&&confirm('Удалить начисление?')){found.item.deletedAt=nowIso();found.item.updatedAt=nowIso();touch('Начисление удалено')}return}
    if(a==='openAdminCabinet'){state.ui.selectedAdmin=el.dataset.id;persistLocal();setView('admin');return}
    if(a==='openMentorCabinet'){state.ui.selectedMentor=el.dataset.id;persistLocal();setView('mentor');return}
    if(a==='addMentorPayment'){if(canManageMentorPayroll())mentorPaymentModal(null,el.dataset.mentor||mentorViewerId());return}
    if(a==='deleteMentorPayment'){if(!canManageMentorPayroll())return;const item=state.mentorPayroll.find(x=>x.id===el.dataset.id);if(item&&confirm('Удалить начисление наставнику?')){item.deletedAt=nowIso();item.updatedAt=nowIso();touch('Начисление наставнику удалено')}return}
    if(a==='addMentor'){if(canManageMentors())mentorPersonModal();return}
    if(a==='archiveMentor'){if(!canManageMentors())return;const p=state.people.find(x=>x.id===el.dataset.id);if(p&&confirm(`Удалить наставника «${p.name}»? История зарплаты сохранится.`)){p.active=false;p.archivedAt=nowIso();p.updatedAt=nowIso();touch(`Наставник удалён: ${p.name}`)}return}
    if(a==='restoreMentor'){if(!canManageMentors())return;const p=state.people.find(x=>x.id===el.dataset.id);if(p){p.active=true;p.archivedAt=null;p.updatedAt=nowIso();touch(`Наставник восстановлен: ${p.name}`)}return}
    if(a==='copyPersonLink'){copyText(personalRoleLink(el.dataset.role,el.dataset.id),`Личная ссылка ${person(el.dataset.id).name} скопирована`);return}
    if(a==='editAdminRules'){if(currentRole==='owner')adminRulesModal();return}
    if(a==='editAdminRates'){if(currentRole==='owner')adminRatesModal(el.dataset.id);return}
    if(a==='setUiScale'){state.settings.uiScale=clamp(Number(el.dataset.value)||1.1,1,1.22);applyUiScale();persistLocal();renderCurrentView();toast('Масштаб интерфейса изменён');return}
  }
  return __handleClickPayrollBase(e);
};

const __handleChangePayrollBase=handleChange;
handleChange=function(e){const el=e.target;if(el.dataset.filter==='selectedAdmin'){state.ui.selectedAdmin=el.value;persistLocal();renderProfile();renderCurrentView();return}return __handleChangePayrollBase(e)};

const __renderCurrentViewPayrollBase=renderCurrentView;
renderCurrentView=function(){if(currentView==='payroll'){if(!allowedView('payroll'))currentView=roleInfo().start;else{$('#pageTitle').textContent='ЗП и мотивация';$('#pages').innerHTML=renderPayroll();renderNav();animateNumbers();return}}return __renderCurrentViewPayrollBase()};

const __bootPayrollBase=boot;
boot=async function(){const result=await __bootPayrollBase();applyUiScale();if(credentials.requestedView&&allowedView(credentials.requestedView))setTimeout(()=>setView(credentials.requestedView),30);setTimeout(()=>{if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,adminStats:(id,key)=>adminMonthStats(id,key),mentorPayroll:(id,key)=>mentorPayrollStats(id,key),personalLink:personalRoleLink,payrollBuild:PAYROLL_EXTENSION_BUILD}},40);return result};
// PAYROLL_TEAM_READABILITY_V1_END

// ATTENDANCE_INTELLIGENCE_V1_START
const ATTENDANCE_EXTENSION_BUILD='2026.09.01-weekly-attendance-intelligence';
const ATTENDANCE_STATUS={
  present:'Пришёл',sick:'Заболел',warned:'Предупредили',vacation:'Отпуск',freeze:'Заморозка',noShow:'Неявка',unknown:'Не отмечен'
};
const ATTENDANCE_STATUS_SHORT={present:'Пришёл',sick:'Болезнь',warned:'Предупредили',vacation:'Отпуск',freeze:'Заморозка',noShow:'Неявка',unknown:'—'};
const ATTENDANCE_DAY_INDEX={Понедельник:0,Вторник:1,Среда:2,Четверг:3,Пятница:4,Суббота:5,Воскресенье:6};
const ATTENDANCE_DEFAULTS={
  fillGood:75,attendanceGood:80,densityGood:70,lowDensity:50,consecutiveMisses:2,autoTasks:true,forecastWeeks:8
};

ICONS.attendance='<svg viewBox="0 0 24 24"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/><path d="M3 21h18"/><circle cx="4" cy="7" r="2"/><circle cx="9" cy="3" r="2"/><circle cx="14" cy="10" r="2"/><circle cx="19" cy="1" r="2"/></svg>';
const attendanceWorkSection=NAV.find(section=>section.section==='Работа');
if(attendanceWorkSection&&!attendanceWorkSection.items.some(x=>x.id==='attendance')){
  attendanceWorkSection.items.splice(2,0,{id:'attendance',label:'Посещаемость',icon:'attendance',roles:['owner','manager','stas','mentor','admin']});
}

function attendanceIsoDate(value=new Date()){
  const d=value instanceof Date?new Date(value):new Date(String(value).length===10?String(value)+'T12:00:00':value);
  if(Number.isNaN(+d))return today();
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return`${y}-${m}-${day}`;
}
function attendanceAddDays(value,days){const d=new Date(attendanceIsoDate(value)+'T12:00:00');d.setDate(d.getDate()+Number(days||0));return attendanceIsoDate(d)}
function attendanceWeekStart(value=today()){
  const d=new Date(attendanceIsoDate(value)+'T12:00:00'),delta=(d.getDay()+6)%7;d.setDate(d.getDate()-delta);return attendanceIsoDate(d);
}
function attendanceWeekEnd(weekKey){return attendanceAddDays(attendanceWeekStart(weekKey),6)}
function attendanceWeekLabel(weekKey){
  const start=new Date(attendanceWeekStart(weekKey)+'T12:00:00'),end=new Date(attendanceWeekEnd(weekKey)+'T12:00:00');
  const a=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(start),b=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',year:'numeric'}).format(end);
  return`${a} — ${b}`;
}
function attendanceSelectedWeek(){return attendanceWeekStart(state?.ui?.attendanceWeek||today())}
function attendanceWeekDateForGroup(group,weekKey=attendanceSelectedWeek()){return attendanceAddDays(weekKey,ATTENDANCE_DAY_INDEX[group?.day]??0)}
function attendanceInWeek(date,weekKey){return String(date||'')>=attendanceWeekStart(weekKey)&&String(date||'')<=attendanceWeekEnd(weekKey)}
function attendanceLive(x){return x&&!x.deletedAt&&x.active!==false}
function attendanceSessionActual(s){return attendanceLive(s)&&s.mode!=='planned'&&s.status!=='cancelled'}
function attendanceSessions(){return(state.attendanceSessions||[]).filter(attendanceLive)}
function attendanceChildren(){return(state.attendanceChildren||[]).filter(attendanceLive)}
function attendanceMemberships(){return(state.attendanceMemberships||[]).filter(attendanceLive)}
function attendanceArchives(){return(state.attendanceWeekArchives||[]).filter(attendanceLive)}
function attendanceSettings(){return{...ATTENDANCE_DEFAULTS,...(state.attendanceSettings||{})}}
function attendanceMembers(groupId){
  const childMap=new Map(attendanceChildren().map(c=>[c.id,c]));
  return attendanceMemberships().filter(m=>m.groupId===groupId&&m.status!=='inactive').map(m=>({membership:m,child:childMap.get(m.childId)})).filter(x=>x.child);
}
function attendanceEnrolled(group){const count=attendanceMembers(group.id).length;return group.rosterManaged?count:Math.max(Number(group.students)||0,count)}
function attendanceCapacity(group,sessions=[]){return Number(sessions[0]?.capacitySnapshot)||Number(group?.capacity)||0}
function attendanceSessionCounts(s){
  const records=Array.isArray(s.records)?s.records:[],count=status=>records.filter(r=>r.status===status).length;
  const fromRecords=records.length>0;
  const present=fromRecords?count('present'):Number(s.presentCount)||0;
  const sick=fromRecords?count('sick'):Number(s.sickCount)||0;
  const warned=fromRecords?count('warned'):Number(s.warnedCount)||0;
  const vacation=fromRecords?count('vacation'):Number(s.vacationCount)||0;
  const freeze=fromRecords?count('freeze'):Number(s.freezeCount)||0;
  const noShow=fromRecords?count('noShow'):Number(s.noShowCount)||0;
  const unknown=fromRecords?count('unknown'):Math.max(0,(Number(s.expectedCount)||0)-present-sick-warned-noShow);
  const makeup=Number(s.makeupCount)||0,trial=Number(s.trialCount)||0,guest=Number(s.guestCount)||0;
  const expected=Math.max(Number(s.expectedCount)||0,present+sick+warned+noShow+unknown);
  const actual=present+makeup+trial+guest;
  return{expected,present,sick,warned,vacation,freeze,noShow,unknown,makeup,trial,guest,actual,objective:sick+warned+vacation+freeze};
}
function attendanceGroupWeekStats(group,weekKey=attendanceSelectedWeek(),includePlanned=false){
  const sessions=attendanceSessions().filter(s=>s.groupId===group.id&&attendanceInWeek(s.date,weekKey)&&(includePlanned||attendanceSessionActual(s)));
  const actualSessions=sessions.filter(attendanceSessionActual),source=includePlanned?sessions:actualSessions;
  const totals=source.reduce((a,s)=>{const c=attendanceSessionCounts(s);Object.keys(c).forEach(k=>a[k]=(a[k]||0)+(Number(c[k])||0));return a},{expected:0,present:0,sick:0,warned:0,vacation:0,freeze:0,noShow:0,unknown:0,makeup:0,trial:0,guest:0,actual:0,objective:0});
  const enrolledSlots=source.reduce((a,s)=>a+(Number(s.enrolledSnapshot)||attendanceEnrolled(group)),0);
  const capacitySlots=source.reduce((a,s)=>a+(Number(s.capacitySnapshot)||Number(group.capacity)||0),0);
  const enrolled=attendanceEnrolled(group),capacity=Number(group.capacity)||0;
  const fill=capacity?enrolled/capacity*100:0;
  const attendance=totals.expected?totals.present/totals.expected*100:0;
  const density=capacitySlots?totals.actual/capacitySlots*100:0;
  return{group,weekKey,sessions,actualSessions,sessionCount:actualSessions.length,enrolled,capacity,enrolledSlots,capacitySlots,...totals,fill,attendance,density,hasData:actualSessions.length>0};
}
function attendanceAggregate(groups,weekKey=attendanceSelectedWeek()){
  const stats=groups.map(g=>attendanceGroupWeekStats(g,weekKey)),withData=stats.filter(x=>x.hasData);
  const enrolledSlots=sum(withData,x=>x.enrolledSlots),capacitySlots=sum(withData,x=>x.capacitySlots),expected=sum(withData,x=>x.expected),present=sum(withData,x=>x.present),actual=sum(withData,x=>x.actual);
  const currentCapacity=sum(groups,g=>Number(g.capacity)||0),currentEnrolled=sum(groups,g=>attendanceEnrolled(g));
  return{weekKey,stats,withData,groups:groups.length,sessions:sum(withData,x=>x.sessionCount),currentCapacity,currentEnrolled,fill:currentCapacity?currentEnrolled/currentCapacity*100:0,attendance:expected?present/expected*100:0,density:capacitySlots?actual/capacitySlots*100:0,expected,present,actual,objective:sum(withData,x=>x.objective),sick:sum(withData,x=>x.sick),warned:sum(withData,x=>x.warned),vacation:sum(withData,x=>x.vacation),freeze:sum(withData,x=>x.freeze),noShow:sum(withData,x=>x.noShow),makeup:sum(withData,x=>x.makeup),trial:sum(withData,x=>x.trial),guest:sum(withData,x=>x.guest),completeness:groups.length?withData.length/groups.length*100:0};
}
function attendanceScopeGroups(){
  const all=activeGroups();
  if(currentRole==='mentor')return all.filter(g=>g.mentorId===mentorViewerId());
  if(currentRole==='stas')return all.filter(g=>['stas','ivan','tasya','karina'].includes(g.mentorId)||/ролик|фигур/i.test(g.discipline||g.name));
  return all;
}
function attendanceMentorIds(groups=attendanceScopeGroups()){return[...new Set(groups.map(g=>g.mentorId))]}
function attendanceMentorWeekStats(mentorId,weekKey=attendanceSelectedWeek()){
  const groups=attendanceScopeGroups().filter(g=>g.mentorId===mentorId),agg=attendanceAggregate(groups,weekKey),expectedLogs=groups.length,logged=agg.withData.length;
  const tasks=activeTasks().filter(t=>t.linkType==='attendance'&&t.ownerId===mentorId&&attendanceInWeek(t.attendanceWeek||t.deadline,weekKey));
  const done=tasks.filter(t=>statusDone(t.status)).length;
  const followup=tasks.length?done/tasks.length*100:100,logging=expectedLogs?logged/expectedLogs*100:0,workIndex=logging*.65+followup*.35;
  return{mentorId,p:person(mentorId),groups,agg,logging,followup,workIndex,tasks,done};
}
function attendanceWeekSeries(groups,endWeek=attendanceSelectedWeek(),weeks=8){
  const result=[];for(let i=weeks-1;i>=0;i--){const key=attendanceAddDays(endWeek,-7*i),a=attendanceAggregate(groups,key);result.push({key,label:attendanceWeekLabel(key),...a})}return result;
}
function attendanceGroupTrend(group,endWeek=attendanceSelectedWeek(),weeks=4){return attendanceWeekSeries([group],endWeek,weeks).map(x=>x.sessions?Math.round(x.actual/Math.max(1,x.sessions)):null)}
function attendanceTrendText(values){return values.map(v=>v==null?'—':String(v)).join(' → ')}
function attendanceForecastGroup(group,nextWeek=attendanceAddDays(attendanceSelectedWeek(),7)){
  const settings=attendanceSettings(),series=attendanceWeekSeries([group],attendanceAddDays(nextWeek,-7),settings.forecastWeeks).filter(x=>x.sessions>0),enrolled=attendanceEnrolled(group),capacity=Number(group.capacity)||0;
  const rates=series.map(x=>x.expected?x.present/x.expected:0).filter(Number.isFinite),actuals=series.map(x=>x.sessions?x.actual/x.sessions:0);
  let base,spread,method,confidence;
  if(rates.length>=2){const weights=rates.map((_,i)=>i+1),ws=sum(weights),rate=rates.reduce((a,v,i)=>a+v*weights[i],0)/ws;base=enrolled*rate;const mean=avg(actuals),sd=Math.sqrt(avg(actuals.map(v=>(v-mean)**2)));spread=Math.max(.75,sd);method=`${rates.length} недель`;confidence=rates.length>=6?'высокая':rates.length>=4?'средняя':'низкая'}
  else{base=enrolled*.78;spread=Math.max(1,enrolled*.18);method='стартовая оценка';confidence='низкая'}
  const planned=attendanceSessions().filter(s=>s.groupId===group.id&&attendanceInWeek(s.date,nextWeek)&&s.mode==='planned'),knownAbs=sum(planned,s=>{const c=attendanceSessionCounts(s);return c.sick+c.vacation+c.freeze+c.warned});
  base=Math.max(0,base-knownAbs);const low=Math.max(0,Math.floor(base-spread)),high=Math.min(Math.max(capacity,enrolled),Math.ceil(base+spread));
  return{group,nextWeek,low,high,base:Math.round(base*10)/10,confidence,method,knownAbs};
}
function attendanceForecast(groups=attendanceScopeGroups(),nextWeek=attendanceAddDays(attendanceSelectedWeek(),7)){
  const rows=groups.map(g=>attendanceForecastGroup(g,nextWeek)),low=sum(rows,x=>x.low),high=sum(rows,x=>x.high),base=sum(rows,x=>x.base);return{rows,low,high,base,nextWeek};
}
function attendanceChildMissSignals(groups,weekKey=attendanceSelectedWeek()){
  const groupIds=new Set(groups.map(g=>g.id)),members=attendanceMemberships().filter(m=>groupIds.has(m.groupId)),childrenMap=new Map(attendanceChildren().map(c=>[c.id,c])),signals=[];
  for(const m of members){const sessions=attendanceSessions().filter(s=>s.groupId===m.groupId&&attendanceSessionActual(s)&&s.date<=attendanceWeekEnd(weekKey)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,4);const records=sessions.map(s=>({s,r:(s.records||[]).find(r=>r.childId===m.childId)})).filter(x=>x.r);let streak=0,last=[];for(const x of records){if(['sick','warned','vacation','freeze','noShow'].includes(x.r.status)){streak++;last.push(x)}else break}if(streak>=attendanceSettings().consecutiveMisses){const child=childrenMap.get(m.childId),g=groups.find(x=>x.id===m.groupId),unexcused=last.some(x=>x.r.status==='noShow');signals.push({kind:unexcused?'red':'gold',title:`${child?.name||'Ребёнок'} пропустил ${streak} занятия подряд`,text:`${g?.name||'Группа'} · ${unexcused?'есть неявка без предупреждения':'причины отмечены'} · нужен контакт перед следующим занятием`,groupId:m.groupId,childId:m.childId,task:{key:`child-${m.childId}-${weekKey}`,ownerId:(state.people.find(p=>p.role==='admin'&&p.active!==false)?.id)||g?.mentorId||'roman',title:`Связаться после повторных пропусков: ${child?.name||'ребёнок'}`,description:`Группа: ${g?.name||'—'}. Пропущено подряд: ${streak}. Уточнить возвращение и зафиксировать результат вместе с наставником.`}})}}
  return signals;
}
function attendanceSignals(groups=attendanceScopeGroups(),weekKey=attendanceSelectedWeek()){
  const a=attendanceAggregate(groups,weekKey),settings=attendanceSettings(),signals=[];
  if(!a.sessions)signals.push({kind:'gold',title:'Неделя ещё не заполнена',text:'Отметьте фактическое посещение после каждой тренировки — показатели и прогноз появятся автоматически.'});
  else if(a.completeness<70)signals.push({kind:'gold',title:`Учёт заполнен на ${Math.round(a.completeness)}%`,text:`Есть данные по ${a.withData.length} из ${a.groups} групп. Незаполненные тренировки не считаются нулевой посещаемостью.`});
  for(const s of a.stats){if(!s.hasData)continue;
    if(s.fill>=80&&s.density<55)signals.push({kind:'gold',title:`${s.group.name}: запись высокая, плотность низкая`,text:`Закреплено ${s.enrolled}/${s.capacity}, фактически ${Math.round(s.density)}%. Проверьте болезни, заморозки и регулярность.`,groupId:s.group.id});
    if(s.fill<50&&s.attendance>=80)signals.push({kind:'gold',title:`${s.group.name}: ходят стабильно, но группа недопродана`,text:`Посещаемость ${Math.round(s.attendance)}%, заполненность ${Math.round(s.fill)}%. Это задача продаж, а не качества наставника.`,groupId:s.group.id});
    const prev=attendanceGroupWeekStats(s.group,attendanceAddDays(weekKey,-7));if(s.density<settings.lowDensity&&prev.hasData&&prev.density<settings.lowDensity)signals.push({kind:'red',title:`${s.group.name}: плотность ниже ${settings.lowDensity}% две недели`,text:`Сейчас ${Math.round(s.density)}%, неделей ранее ${Math.round(prev.density)}%. Нужен разбор времени, состава и удержания.`,groupId:s.group.id,task:{key:`density-${s.group.id}-${weekKey}`,ownerId:s.group.mentorId,title:`Разобрать низкую посещаемость: ${s.group.name}`,description:`Фактическая плотность ниже ${settings.lowDensity}% две недели подряд. Совместно с администратором проверить состав, причины пропусков и план возврата.`}});
    const four=attendanceWeekSeries([s.group],weekKey,4);if(four.filter(x=>x.sessions&&x.density>=settings.densityGood).length>=3&&s.fill>=85)signals.push({kind:'gold',title:`${s.group.name}: кандидат на лист ожидания`,text:'Высокая заполненность и фактическая плотность минимум три недели из четырёх. Можно оценить дополнительный слот.',groupId:s.group.id});
  }
  if(a.noShow)signals.push({kind:'red',title:`Неявки без предупреждения: ${a.noShow}`,text:'Администратору нужно связаться с семьями и зафиксировать результат контакта.'});
  return[...attendanceChildMissSignals(groups,weekKey),...signals];
}
function attendanceTaskDeadline(weekKey){const d=attendanceAddDays(attendanceWeekEnd(weekKey),1);return d<today()?today():d}
function attendanceReconcileTasks(weekKey=attendanceSelectedWeek()){
  if(!attendanceSettings().autoTasks)return 0;let created=0;
  for(const signal of attendanceSignals(attendanceScopeGroups(),weekKey).filter(x=>x.task)){
    const key=`attendance:${signal.task.key}`;if(activeTasks().some(t=>t.attendanceAlertKey===key))continue;
    state.tasks.push({id:id('task'),title:signal.task.title,description:signal.task.description,ownerId:signal.task.ownerId,monthKey:monthKeyFromDate(weekKey),deadline:attendanceTaskDeadline(weekKey),priority:signal.kind==='red'?'high':'medium',status:'todo',required:false,linkType:'attendance',linkId:signal.groupId||'',attendanceAlertKey:key,attendanceWeek:weekKey,createdBy:'attendance',createdAt:nowIso(),updatedAt:nowIso()});created++;
  }
  return created;
}
function attendanceEnsure(s){
  if(!s||typeof s!=='object')return s;s.attendanceSettings={...ATTENDANCE_DEFAULTS,...(s.attendanceSettings||{})};
  s.attendanceChildren=Array.isArray(s.attendanceChildren)?s.attendanceChildren:[];s.attendanceMemberships=Array.isArray(s.attendanceMemberships)?s.attendanceMemberships:[];s.attendanceSessions=Array.isArray(s.attendanceSessions)?s.attendanceSessions:[];s.attendanceWeekArchives=Array.isArray(s.attendanceWeekArchives)?s.attendanceWeekArchives:[];
  s.ui={...(s.ui||{}),attendanceWeek:attendanceWeekStart(s.ui?.attendanceWeek||today()),attendanceTab:s.ui?.attendanceTab||'overview',attendanceMentor:s.ui?.attendanceMentor||'all',attendanceGroup:s.ui?.attendanceGroup||'all'};s.meta=s.meta||{};s.meta.attendanceBuild=ATTENDANCE_EXTENSION_BUILD;return s;
}
const __seedStateAttendanceBase=seedState;seedState=function(){return attendanceEnsure(__seedStateAttendanceBase())};
const __ensureStateAttendanceBase=ensureState;ensureState=function(raw){return attendanceEnsure(__ensureStateAttendanceBase(raw))};
const __mergeStatesAttendanceBase=mergeStates;mergeStates=function(local,remote){const out=attendanceEnsure(__mergeStatesAttendanceBase(local,remote));if(!remote)return out;out.attendanceChildren=mergeLists(local?.attendanceChildren||[],remote?.attendanceChildren||[]);out.attendanceMemberships=mergeLists(local?.attendanceMemberships||[],remote?.attendanceMemberships||[]);out.attendanceSessions=mergeLists(local?.attendanceSessions||[],remote?.attendanceSessions||[]);out.attendanceWeekArchives=mergeLists(local?.attendanceWeekArchives||[],remote?.attendanceWeekArchives||[]);out.attendanceSettings={...ATTENDANCE_DEFAULTS,...(local?.attendanceSettings||{}),...(remote?.attendanceSettings||{})};return attendanceEnsure(out)};

function attendancePct(value){return Number.isFinite(value)?`${Math.round(value)}%`:'—'}
function attendanceValue(value){return Number.isFinite(Number(value))?String(Math.round(Number(value))):'—'}
function attendanceMetric(label,value,sub,progressValue=null,kind=''){return`<article class="card attendance-metric ${kind}"><span>${esc(label)}</span><b>${value}</b><small>${esc(sub)}</small>${progressValue===null?'':`<div class="progress"><i style="width:${clamp(progressValue,0,100)}%"></i></div>`}</article>`}
function attendanceTabs(active){const tabs=[['overview','Эта неделя'],['groups','Группы'],['mentors','Наставники'],['log','Журнал'],['forecast','Прогноз'],['archive','Архив недель']];return`<div class="attendance-tabs">${tabs.map(([idv,label])=>`<button class="${active===idv?'active':''}" data-action="attendanceTab" data-tab="${idv}">${label}</button>`).join('')}</div>`}
function attendanceWeekToolbar(){const week=attendanceSelectedWeek();return`<div class="attendance-weekbar"><div class="attendance-week-nav"><button class="icon-btn" data-action="attendancePrevWeek" title="Предыдущая неделя">‹</button><div><span>Рабочая неделя</span><b>${esc(attendanceWeekLabel(week))}</b></div><button class="icon-btn" data-action="attendanceNextWeek" title="Следующая неделя">›</button><button class="btn btn-small btn-ghost" data-action="attendanceCurrentWeek">Текущая</button></div><div class="attendance-week-actions"><button class="btn btn-ghost" data-action="attendanceAddChild">+ Ребёнок</button><button class="btn btn-primary" data-action="attendanceAddSession">+ Отметить тренировку</button></div></div>`}
function attendanceReasonGrid(a){const rows=[['Болезнь',a.sick,'sick'],['Предупредили',a.warned,'warned'],['Отпуск / заморозка',a.vacation+a.freeze,'vacation'],['Неявка',a.noShow,'noShow'],['Отработка',a.makeup,'makeup'],['Пробные / гости',a.trial+a.guest,'guest']];return`<div class="attendance-reasons">${rows.map(([label,v,k])=>`<div class="attendance-reason ${k}"><i></i><span>${label}</span><b>${v}</b></div>`).join('')}</div>`}
function attendanceTrendChart(series,metric='density'){
  const data=series.filter(x=>x.sessions>0);if(data.length<2)return`<div class="empty"><b>Недостаточно истории</b>После двух заполненных недель появится диаграмма динамики.</div>`;
  const W=760,H=240,P=34,max=100,pts=data.map((x,i)=>[P+(W-2*P)*(i/Math.max(1,data.length-1)),H-P-(H-2*P)*(clamp(x[metric],0,100)/max)]),path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' '),area=path+` L ${pts.at(-1)[0]} ${H-P} L ${pts[0][0]} ${H-P} Z`;
  return`<svg class="attendance-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="attGoldArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdc55" stop-opacity=".34"/><stop offset="1" stop-color="#f0c72f" stop-opacity="0"/></linearGradient></defs>${[25,50,75,100].map(v=>{const y=H-P-(H-2*P)*v/100;return`<line x1="${P}" y1="${y}" x2="${W-P}" y2="${y}" class="attendance-gridline"/><text x="4" y="${y+4}" class="attendance-axis-label">${v}%</text>`}).join('')}<path d="${area}" fill="url(#attGoldArea)"/><path d="${path}" class="attendance-chart-line"/>${pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" class="attendance-chart-dot"/><text x="${p[0]}" y="${Math.max(14,p[1]-12)}" text-anchor="middle" class="attendance-chart-value">${Math.round(data[i][metric])}%</text>`).join('')}</svg>`;
}
function attendanceGroupRows(groups,weekKey){return groups.map(g=>{const s=attendanceGroupWeekStats(g,weekKey),trend=attendanceTrendText(attendanceGroupTrend(g,weekKey,4));return`<tr><td><div class="table-title"><span class="discipline-icon">${disciplineEmoji(g.discipline)}</span><div><b>${esc(g.name)}</b><small>${esc(g.day)} · ${esc(g.time)}</small></div></div></td><td>${esc(person(g.mentorId).name)}</td><td><b>${s.enrolled}/${s.capacity}</b><small class="attendance-table-sub">${attendancePct(s.fill)}</small></td><td>${s.hasData?s.expected:'—'}</td><td>${s.hasData?`<b>${s.actual}</b><small class="attendance-table-sub">основных ${s.present}</small>`:'—'}</td><td>${s.hasData?attendancePct(s.attendance):'—'}</td><td>${s.hasData?attendancePct(s.density):'—'}</td><td>${s.hasData?`${s.objective} / ${s.noShow}`:'—'}<small class="attendance-table-sub">уваж. / неявки</small></td><td><span class="attendance-trend">${trend}</span></td><td><div class="table-actions"><button data-action="attendanceSessionForGroup" data-id="${g.id}" title="Отметить тренировку">${ICONS.plus}</button><button data-action="attendanceRoster" data-id="${g.id}" title="Состав группы">${ICONS.users}</button></div></td></tr>`}).join('')}
function attendanceSignalsHtml(signals){return`<div class="attendance-signal-list">${signals.length?signals.slice(0,12).map(s=>`<article class="attendance-signal ${s.kind==='red'?'red':''}"><i></i><div><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div>${s.groupId?`<button class="btn btn-small btn-ghost" data-action="attendanceSessionForGroup" data-id="${s.groupId}">Открыть</button>`:''}</article>`).join(''):'<div class="empty"><b>Критичных сигналов нет</b>Продолжайте отмечать каждую тренировку.</div>'}</div>`}
function attendanceOverview(groups,weekKey){const a=attendanceAggregate(groups,weekKey),series=attendanceWeekSeries(groups,weekKey,8),signals=attendanceSignals(groups,weekKey),forecastNext=attendanceForecast(groups,attendanceAddDays(weekKey,7));return`<div class="attendance-kpis">${attendanceMetric('Заполненность групп',attendancePct(a.fill),`${a.currentEnrolled}/${a.currentCapacity} закреплённых мест`,a.fill)}${attendanceMetric('Посещаемость',a.sessions?attendancePct(a.attendance):'—',`${a.present} пришли из ${a.expected} ожидаемых`,a.sessions?a.attendance:null)}${attendanceMetric('Фактическая плотность',a.sessions?attendancePct(a.density):'—',`${a.actual} фактических посещений`,a.sessions?a.density:null)}${attendanceMetric('Учёт недели',attendancePct(a.completeness),`${a.withData.length}/${a.groups} групп заполнено`,a.completeness,a.completeness<70?'attention':'')}</div><div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Динамика фактической плотности</h3><p>Последние 8 недель; пустая неделя не считается нулём</p></div></div>${attendanceTrendChart(series,'density')}</section><section class="card pad"><div class="card-head"><div><h3>Причины и дополнительные посещения</h3><p>Болезнь и отпуск не ухудшают KPI наставника</p></div></div>${attendanceReasonGrid(a)}<div class="attendance-next-forecast"><span>Следующая неделя</span><b>${forecastNext.low}–${forecastNext.high}</b><small>фактических посещений по текущему составу</small></div></section></div><section class="card pad"><div class="card-head"><div><h3>Что требует внимания</h3><p>Система разделяет проблему продаж, объективные пропуски и работу наставника</p></div><button class="btn btn-small btn-ghost" data-action="attendanceCreateTasks">Создать задачи из сигналов</button></div>${attendanceSignalsHtml(signals)}</section><section class="card pad"><div class="card-head"><div><h3>Группы этой недели</h3><p>Записано → ожидалось → пришло → причины → динамика</p></div></div><div class="table-wrap"><table class="data-table attendance-table"><thead><tr><th>Группа</th><th>Наставник</th><th>Записано</th><th>Ожидалось</th><th>Пришло</th><th>Посещаемость</th><th>Плотность</th><th>Пропуски</th><th>4 недели</th><th></th></tr></thead><tbody>${attendanceGroupRows(groups,weekKey)}</tbody></table></div></section>`}
function attendanceGroupsView(groups,weekKey){const a=attendanceAggregate(groups,weekKey);return`<div class="grid-4">${metricCard('Групп в контуре',String(groups.length),'По выбранной роли','groups')}${metricCard('Закреплено детей',String(a.currentEnrolled),`${a.currentCapacity} мест`,'users',a.fill)}${metricCard('Факт посещений',String(a.actual),`${a.sessions} тренировок отмечено`,'attendance')}${metricCard('Неявки',String(a.noShow),`${a.objective} уважительных причин`,'tasks')}</div><section class="card pad"><div class="card-head"><div><h3>Все группы</h3><p>Главная управленческая таблица недели</p></div></div><div class="table-wrap"><table class="data-table attendance-table"><thead><tr><th>Группа</th><th>Наставник</th><th>Записано</th><th>Ожидалось</th><th>Пришло</th><th>Посещаемость</th><th>Плотность</th><th>Пропуски</th><th>4 недели</th><th></th></tr></thead><tbody>${attendanceGroupRows(groups,weekKey)}</tbody></table></div></section>`}
function attendanceMentorsView(groups,weekKey){const rows=attendanceMentorIds(groups).map(mid=>attendanceMentorWeekStats(mid,weekKey));return`<div class="grid-4">${metricCard('Наставников',String(rows.length),'В доступном контуре','mentor')}${metricCard('Учёт тренировок',attendancePct(avg(rows.map(x=>x.logging))),'Доля отмеченных групп','attendance')}${metricCard('Обработка рисков',attendancePct(avg(rows.map(x=>x.followup))),'Выполнение задач по пропускам','tasks')}${metricCard('Средняя плотность',attendancePct(attendanceAggregate(groups,weekKey).density),'Не используется как штраф за болезни','users')}</div><section class="card pad"><div class="card-head"><div><h3>Еженедельная статистика наставников</h3><p>Абсолютные числа показаны рядом, но сравнение строится по процентам и на одно занятие</p></div></div><div class="table-wrap"><table class="data-table attendance-table"><thead><tr><th>Наставник</th><th>Группы</th><th>Отмечено</th><th>Заполненность</th><th>Посещаемость</th><th>Плотность</th><th>Уважительные</th><th>Неявки</th><th>Рабочий индекс</th></tr></thead><tbody>${rows.map(x=>`<tr><td><div class="table-title"><span class="avatar small">${esc(x.p.avatar||x.p.name?.[0]||'Н')}</span><div><b>${esc(x.p.name)}</b><small>${esc(x.p.area||x.p.title||'')}</small></div></div></td><td>${x.groups.length}</td><td>${x.agg.withData.length}/${x.groups.length}<small class="attendance-table-sub">${attendancePct(x.logging)}</small></td><td>${attendancePct(x.agg.fill)}</td><td>${x.agg.sessions?attendancePct(x.agg.attendance):'—'}</td><td>${x.agg.sessions?attendancePct(x.agg.density):'—'}</td><td>${x.agg.objective}</td><td>${x.agg.noShow}</td><td><b>${attendancePct(x.workIndex)}</b><small class="attendance-table-sub">учёт + реакция</small></td></tr>`).join('')}</tbody></table></div><p class="readable-note">Рабочий индекс не зависит от того, заболели ли дети. Он учитывает полноту отметок и выполнение задач по возврату/контакту.</p></section>`}
function attendanceLogView(groups,weekKey){const groupIds=new Set(groups.map(g=>g.id)),sessions=attendanceSessions().filter(s=>groupIds.has(s.groupId)&&attendanceInWeek(s.date,weekKey)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));return`<section class="card pad"><div class="card-head"><div><h3>Журнал тренировок</h3><p>Каждая запись хранит снимок состава и вместимости на дату занятия</p></div><button class="btn btn-primary" data-action="attendanceAddSession">+ Отметить</button></div><div class="attendance-session-list">${sessions.length?sessions.map(s=>{const g=activeGroups().find(x=>x.id===s.groupId)||{name:'Удалённая группа',mentorId:''},c=attendanceSessionCounts(s);return`<article class="attendance-session"><div class="attendance-session-date"><b>${new Date(s.date+'T12:00:00').toLocaleDateString('ru-RU',{day:'2-digit',month:'short'})}</b><span>${s.mode==='planned'?'План':'Факт'}</span></div><div class="attendance-session-main"><b>${esc(g.name)}</b><small>${esc(person(g.mentorId).name)} · ожидалось ${c.expected} · пришло ${c.actual} · уваж. ${c.objective} · неявки ${c.noShow}</small></div><div class="attendance-session-metrics"><span>${attendancePct((Number(s.capacitySnapshot)||g.capacity)?c.actual/(Number(s.capacitySnapshot)||g.capacity)*100:0)} плотность</span></div><div class="table-actions"><button data-action="attendanceEditSession" data-id="${s.id}">${ICONS.edit}</button><button data-action="attendanceDeleteSession" data-id="${s.id}">${ICONS.trash}</button></div></article>`}).join(''):'<div class="empty"><b>Записей пока нет</b>После тренировки отметьте фактическое посещение.</div>'}</div></section>`}
function attendanceForecastView(groups,weekKey){const next=attendanceAddDays(weekKey,7),forecastData=attendanceForecast(groups,next),series=attendanceWeekSeries(groups,weekKey,8);return`<section class="attendance-forecast-hero"><div><div class="eyebrow">ПРОГНОЗ · ${esc(attendanceWeekLabel(next))}</div><h3>Ожидается ${Math.round(forecastData.base)} посещений</h3><p>Рабочий диапазон <b>${forecastData.low}–${forecastData.high}</b>. Это оценка, а не обещание точного числа.</p></div><div class="attendance-forecast-range"><span>Диапазон</span><b>${forecastData.low}–${forecastData.high}</b><small>по всем доступным группам</small></div></section><div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>История посещаемости</h3><p>Посещаемость последних недель используется для прогноза</p></div></div>${attendanceTrendChart(series,'attendance')}</section><section class="card pad"><div class="card-head"><div><h3>Как читать прогноз</h3><p>Модель учитывает 4–8 недель и текущий состав</p></div></div><div class="compact-list"><div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Не выдаёт дробных детей</b><small>Показывает честный диапазон, например 4–6 человек.</small></div></div><div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Известные отсутствия уменьшают прогноз</b><small>Предварительные болезни, отпуск и заморозки можно внести как план.</small></div></div><div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Пустая неделя не равна нулю</b><small>Незаполненный журнал не портит историю.</small></div></div></div></section></div><section class="card pad"><div class="card-head"><div><h3>Прогноз следующей недели по группам</h3><p>Чем больше истории, тем выше уверенность</p></div></div><div class="table-wrap"><table class="data-table attendance-table"><thead><tr><th>Группа</th><th>Наставник</th><th>Записано</th><th>Прогноз</th><th>Уверенность</th><th>Основание</th><th>Известно отсутствий</th></tr></thead><tbody>${forecastData.rows.map(x=>`<tr><td><b>${esc(x.group.name)}</b><small class="attendance-table-sub">${esc(x.group.day)} · ${esc(x.group.time)}</small></td><td>${esc(person(x.group.mentorId).name)}</td><td>${attendanceEnrolled(x.group)}</td><td><b>${x.low}–${x.high}</b></td><td>${esc(x.confidence)}</td><td>${esc(x.method)}</td><td>${x.knownAbs}</td></tr>`).join('')}</tbody></table></div></section>`}
function attendanceArchiveView(groups,weekKey){const list=attendanceArchives().sort((a,b)=>String(b.weekKey).localeCompare(String(a.weekKey)));return`<section class="card pad"><div class="card-head"><div><h3>Архив закрытых недель</h3><p>Снимок больше не меняется при переводе ребёнка или редактировании группы</p></div><button class="btn btn-primary" data-action="attendanceCloseWeek">Закрыть ${esc(attendanceWeekLabel(weekKey))}</button></div>${list.length?`<div class="attendance-archive-grid">${list.map(a=>`<article class="attendance-archive-card"><div class="eyebrow">${esc(a.weekKey)}</div><h4>${esc(a.label||attendanceWeekLabel(a.weekKey))}</h4><div class="attendance-archive-kpis"><div><span>Заполненность</span><b>${attendancePct(a.metrics?.fill||0)}</b></div><div><span>Посещаемость</span><b>${attendancePct(a.metrics?.attendance||0)}</b></div><div><span>Плотность</span><b>${attendancePct(a.metrics?.density||0)}</b></div><div><span>Тренировки</span><b>${a.metrics?.sessions||0}</b></div></div>${a.comment?`<p>${esc(a.comment)}</p>`:''}</article>`).join('')}</div>`:'<div class="empty"><b>Закрытых недель пока нет</b>В конце воскресенья сохраните итог и комментарий.</div>'}</section>`}
function renderAttendance(){const groups=attendanceScopeGroups(),weekKey=attendanceSelectedWeek(),tab=state.ui.attendanceTab||'overview';let body='';if(tab==='overview')body=attendanceOverview(groups,weekKey);if(tab==='groups')body=attendanceGroupsView(groups,weekKey);if(tab==='mentors')body=attendanceMentorsView(groups,weekKey);if(tab==='log')body=attendanceLogView(groups,weekKey);if(tab==='forecast')body=attendanceForecastView(groups,weekKey);if(tab==='archive')body=attendanceArchiveView(groups,weekKey);return`<div class="page readable-page attendance-page">${pageHead('ЕЖЕНЕДЕЛЬНЫЙ КОНТРОЛЬ','Посещаемость и плотность',`${attendanceWeekLabel(weekKey)}: записано, ожидалось, пришло, причины и динамика`)}${attendanceWeekToolbar()}${attendanceTabs(tab)}${body}</div>`}

function attendanceStatusOptions(selected='unknown'){return Object.entries(ATTENDANCE_STATUS).map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${esc(l)}</option>`).join('')}
function attendanceSessionModal(item=null,groupId='',dateValue=''){
  const groups=attendanceScopeGroups(),group=groups.find(g=>g.id===(item?.groupId||groupId))||groups[0];if(!group){toast('Нет доступных групп','Сначала добавьте группу.','error');return}
  const date=dateValue||item?.date||attendanceWeekDateForGroup(group),members=attendanceMembers(group.id),counts=item?attendanceSessionCounts(item):null,enrolled=attendanceEnrolled(group),future=date>today(),mode=item?.mode||(future?'planned':'actual');
  const rosterHtml=members.length?`<div class="span-2 attendance-roster-editor"><div class="attendance-roster-head"><div><b>Состав группы · ${members.length}</b><small>${group.rosterManaged?'официальный состав':'частичный список; заполненность не уменьшается ниже числа в карточке группы'}</small></div><button type="button" class="btn btn-small btn-ghost" data-action="attendanceRoster" data-id="${group.id}">Управление составом</button></div>${members.map(({child})=>{const record=(item?.records||[]).find(r=>r.childId===child.id);return`<label class="attendance-child-row"><span>${esc(child.name)}</span><select class="select" data-att-child="${child.id}">${attendanceStatusOptions(record?.status||'unknown')}</select></label>`}).join('')}</div>`:`<div class="span-2 attendance-no-roster"><b>Именной состав пока не внесён</b><span>Можно работать по общим числам. Для автоматического поиска повторных пропусков добавьте детей в состав группы.</span><button type="button" class="btn btn-small btn-ghost" data-action="attendanceRoster" data-id="${group.id}">Добавить состав</button></div>`;
  const aggregate=!members.length?`<div class="field"><label>Ожидалось</label><input class="input" type="number" min="0" name="expectedCount" value="${counts?.expected??enrolled}"></div><div class="field"><label>Пришли из состава</label><input class="input" type="number" min="0" name="presentCount" value="${counts?.present??0}"></div><div class="field"><label>Заболели</label><input class="input" type="number" min="0" name="sickCount" value="${counts?.sick??0}"></div><div class="field"><label>Предупредили</label><input class="input" type="number" min="0" name="warnedCount" value="${counts?.warned??0}"></div><div class="field"><label>Отпуск</label><input class="input" type="number" min="0" name="vacationCount" value="${counts?.vacation??0}"></div><div class="field"><label>Заморозка</label><input class="input" type="number" min="0" name="freezeCount" value="${counts?.freeze??0}"></div><div class="field"><label>Неявка без предупреждения</label><input class="input" type="number" min="0" name="noShowCount" value="${counts?.noShow??0}"></div>`:'';
  openModal({title:item?'Изменить посещаемость':'Отметить тренировку',subtitle:`${group.name} · ${group.day} ${group.time}`,body:`<form id="attendanceSessionForm" data-id="${esc(item?.id||'')}" class="form-grid"><div class="field"><label>Группа</label><select class="select" name="groupId" data-filter="attendanceModalGroup">${groups.map(g=>`<option value="${g.id}" ${g.id===group.id?'selected':''}>${esc(person(g.mentorId).name)} · ${esc(g.name)} · ${esc(g.day)} ${esc(g.time)}</option>`).join('')}</select></div><div class="field"><label>Дата</label><input class="input" type="date" name="date" value="${date}" required></div><div class="field span-2"><label>Тип записи</label><select class="select" name="mode"><option value="actual" ${mode==='actual'?'selected':''}>Факт проведённой тренировки</option><option value="planned" ${mode==='planned'?'selected':''}>План / известные отсутствия</option></select></div>${rosterHtml}${aggregate}<div class="field"><label>Отработки</label><input class="input" type="number" min="0" name="makeupCount" value="${counts?.makeup??0}"></div><div class="field"><label>Пробные</label><input class="input" type="number" min="0" name="trialCount" value="${counts?.trial??0}"></div><div class="field"><label>Гости</label><input class="input" type="number" min="0" name="guestCount" value="${counts?.guest??0}"></div><div class="field span-2"><label>Комментарий</label><textarea class="textarea" name="notes" placeholder="Причины, особенности тренировки, что сделать дальше">${esc(item?.notes||'')}</textarea></div><div class="attendance-form-summary span-2"><span>Вместимость: <b>${group.capacity||0}</b></span><span>Закреплено: <b>${enrolled}</b></span><span>Неделя: <b>${esc(attendanceWeekLabel(attendanceWeekStart(date)))}</b></span></div>${formActions(item?'Сохранить':'Добавить')}</form>`});
}
function attendanceRosterModal(groupId){const group=attendanceScopeGroups().find(g=>g.id===groupId)||activeGroups().find(g=>g.id===groupId);if(!group)return;const members=attendanceMembers(group.id);openModal({title:`Состав · ${group.name}`,subtitle:`${person(group.mentorId).name} · ${group.day} ${group.time}`,body:`<div class="attendance-roster-manage"><div class="attendance-roster-summary"><div><span>В карточке группы</span><b>${group.students||0}</b></div><div><span>Имен в списке</span><b>${members.length}</b></div><div><span>Для аналитики</span><b>${attendanceEnrolled(group)}</b></div></div><div class="compact-list">${members.length?members.map(({child,membership})=>`<div class="compact-item"><span class="avatar small">${esc(child.name.slice(0,2))}</span><div class="item-main"><b>${esc(child.name)}</b><small>${esc(child.parentContact||'контакт не указан')}</small></div><button class="task-delete" data-action="attendanceRemoveMember" data-id="${membership.id}" title="Убрать из группы">${ICONS.trash}</button></div>`).join(''):'<div class="empty"><b>Список пуст</b>Добавьте детей, чтобы видеть повторные пропуски поимённо.</div>'}</div><label class="check attendance-roster-mode"><input type="checkbox" data-action="attendanceRosterManaged" data-id="${group.id}" ${group.rosterManaged?'checked':''}> Список полный — считать его официальным составом группы</label><div class="form-actions"><button class="btn btn-ghost" data-action="closeModal">Закрыть</button><button class="btn btn-primary" data-action="attendanceAddChild" data-group="${group.id}">+ Добавить ребёнка</button></div></div>`})}
function attendanceChildModal(groupId=''){const groups=attendanceScopeGroups(),selected=groups.find(g=>g.id===groupId)||groups[0];if(!selected)return;openModal({title:'Добавить ребёнка в группу',subtitle:'Имя хранится в общей зашифрованной базе',body:`<form id="attendanceChildForm" class="form-grid"><div class="field span-2"><label>Имя ребёнка</label><input class="input" name="name" required></div><div class="field span-2"><label>Группа</label><select class="select" name="groupId">${groups.map(g=>`<option value="${g.id}" ${g.id===selected.id?'selected':''}>${esc(person(g.mentorId).name)} · ${esc(g.name)} · ${esc(g.day)} ${esc(g.time)}</option>`).join('')}</select></div><div class="field span-2"><label>Контакт родителя</label><input class="input" name="parentContact" placeholder="Телефон или имя в CRM — необязательно"></div><div class="field"><label>Дата начала</label><input class="input" type="date" name="startDate" value="${today()}"></div><div class="field span-2"><label>Комментарий</label><textarea class="textarea" name="notes"></textarea></div>${formActions('Добавить')}</form>`})}
function attendanceCloseWeekModal(){const weekKey=attendanceSelectedWeek(),groups=attendanceScopeGroups(),a=attendanceAggregate(groups,weekKey),old=attendanceArchives().find(x=>x.weekKey===weekKey);openModal({title:`Закрыть неделю`,subtitle:attendanceWeekLabel(weekKey),body:`<form id="attendanceCloseWeekForm" data-id="${old?.id||''}" class="form-grid"><div class="attendance-close-preview span-2"><div><span>Заполненность</span><b>${attendancePct(a.fill)}</b></div><div><span>Посещаемость</span><b>${attendancePct(a.attendance)}</b></div><div><span>Плотность</span><b>${attendancePct(a.density)}</b></div><div><span>Тренировки</span><b>${a.sessions}</b></div></div><div class="field span-2"><label>Итоги и решения на следующую неделю</label><textarea class="textarea" name="comment" placeholder="Что сработало, какие группы требуют продаж, кому нужно позвонить">${esc(old?.comment||'')}</textarea></div>${formActions(old?'Обновить снимок':'Закрыть неделю')}</form>`})}

const __renderDashboardAttendanceBase=renderDashboard;renderDashboard=function(){const base=__renderDashboardAttendanceBase(),groups=attendanceScopeGroups(),a=attendanceAggregate(groups,attendanceSelectedWeek());const panel=`<section class="card pad attendance-dashboard-panel"><div class="card-head"><div><h3>Посещаемость этой недели</h3><p>Записано, пришло и фактическая плотность — отдельно от обычной загрузки</p></div><button class="btn btn-small btn-ghost" data-view="attendance">Открыть</button></div><div class="attendance-mini-grid"><div><span>Заполненность</span><b>${attendancePct(a.fill)}</b></div><div><span>Посещаемость</span><b>${a.sessions?attendancePct(a.attendance):'—'}</b></div><div><span>Плотность</span><b>${a.sessions?attendancePct(a.density):'—'}</b></div><div><span>Неявки</span><b>${a.noShow}</b></div></div></section>`;return appendBeforePageClose(base,panel)};
const __renderAnalyticsAttendanceBase=renderAnalytics;renderAnalytics=function(){const base=__renderAnalyticsAttendanceBase(),groups=attendanceScopeGroups(),week=attendanceSelectedWeek(),a=attendanceAggregate(groups,week),f=attendanceForecast(groups,attendanceAddDays(week,7));const panel=`<section class="card pad"><div class="card-head"><div><h3>Посещаемость и прогноз следующей недели</h3><p>Фактическая плотность ${a.sessions?attendancePct(a.density):'ещё не заполнена'} · прогноз ${f.low}–${f.high} посещений</p></div><button class="btn btn-small btn-ghost" data-view="attendance">Подробная аналитика</button></div>${attendanceTrendChart(attendanceWeekSeries(groups,week,8),'attendance')}</section>`;return appendBeforePageClose(base,panel)};
const __renderStasAttendanceBase=renderStas;renderStas=function(){const base=__renderStasAttendanceBase(),groups=attendanceScopeGroups(),a=attendanceAggregate(groups,attendanceSelectedWeek());const panel=`<section class="card pad"><div class="card-head"><div><h3>Роллер-школа · неделя</h3><p>Болезни не снижают оценку наставников; контролируются учёт и реакция</p></div><button class="btn btn-small btn-ghost" data-view="attendance">Посещаемость</button></div><div class="attendance-mini-grid"><div><span>Отмечено групп</span><b>${a.withData.length}/${a.groups}</b></div><div><span>Посещаемость</span><b>${a.sessions?attendancePct(a.attendance):'—'}</b></div><div><span>Плотность</span><b>${a.sessions?attendancePct(a.density):'—'}</b></div><div><span>Неявки</span><b>${a.noShow}</b></div></div></section>`;return appendBeforePageClose(base,panel)};
const __renderMentorAttendanceBase=renderMentor;renderMentor=function(){const base=__renderMentorAttendanceBase(),groups=attendanceScopeGroups(),a=attendanceAggregate(groups,attendanceSelectedWeek());const panel=`<section class="card pad"><div class="card-head"><div><h3>Моя неделя · посещаемость</h3><p>Отметьте факт после каждой тренировки</p></div><button class="btn btn-small btn-primary" data-view="attendance">Открыть журнал</button></div><div class="attendance-mini-grid"><div><span>Групп отмечено</span><b>${a.withData.length}/${a.groups}</b></div><div><span>Пришло</span><b>${a.actual}</b></div><div><span>Уважительные</span><b>${a.objective}</b></div><div><span>Неявки</span><b>${a.noShow}</b></div></div></section>`;return appendBeforePageClose(base,panel)};
const __renderAdminAttendanceBase=renderAdmin;renderAdmin=function(){const base=__renderAdminAttendanceBase(),groups=attendanceScopeGroups(),signals=attendanceSignals(groups,attendanceSelectedWeek()).filter(x=>x.childId||x.kind==='red');const panel=`<section class="card pad"><div class="card-head"><div><h3>Кого вернуть на тренировку</h3><p>Повторные пропуски и неявки из журнала наставников</p></div><button class="btn btn-small btn-ghost" data-view="attendance">Все сигналы</button></div>${attendanceSignalsHtml(signals.slice(0,6))}</section>`;return appendBeforePageClose(base,panel)};

const __renderCurrentViewAttendanceBase=renderCurrentView;renderCurrentView=function(){if(currentView==='attendance'){if(!allowedView('attendance'))currentView=roleInfo().start;else{$('#pageTitle').textContent='Посещаемость';$('#pages').innerHTML=renderAttendance();renderNav();animateNumbers();return}}return __renderCurrentViewAttendanceBase()};

const __handleSubmitAttendanceBase=handleSubmit;handleSubmit=function(e){const f=e.target;if(!(f instanceof HTMLFormElement))return __handleSubmitAttendanceBase(e);const v=formValues(f),stamp=nowIso();
  if(f.id==='attendanceSessionForm'){e.preventDefault();const group=activeGroups().find(g=>g.id===v.groupId);if(!group)return;const old=state.attendanceSessions.find(x=>x.id===f.dataset.id);const records=[...f.querySelectorAll('[data-att-child]')].map(sel=>({childId:sel.dataset.attChild,status:sel.value,nameSnapshot:attendanceChildren().find(c=>c.id===sel.dataset.attChild)?.name||'',updatedAt:stamp}));let expected=num(v.expectedCount),present=num(v.presentCount),sick=num(v.sickCount),warned=num(v.warnedCount),vacation=num(v.vacationCount),freeze=num(v.freezeCount),noShow=num(v.noShowCount);if(records.length){const c=k=>records.filter(r=>r.status===k).length;present=c('present');sick=c('sick');warned=c('warned');vacation=c('vacation');freeze=c('freeze');noShow=c('noShow');expected=present+sick+warned+noShow+c('unknown')}expected=Math.max(expected,present+sick+warned+noShow);const item={...(old||{}),id:old?.id||id('attendance'),groupId:group.id,date:v.date,weekKey:attendanceWeekStart(v.date),mode:v.mode||'actual',status:'completed',enrolledSnapshot:attendanceEnrolled(group),capacitySnapshot:Number(group.capacity)||0,expectedCount:expected,presentCount:present,sickCount:sick,warnedCount:warned,vacationCount:vacation,freezeCount:freeze,noShowCount:noShow,makeupCount:num(v.makeupCount),trialCount:num(v.trialCount),guestCount:num(v.guestCount),records,notes:v.notes,createdAt:old?.createdAt||stamp,updatedAt:stamp};upsert(state.attendanceSessions,item);state.ui.attendanceWeek=item.weekKey;const made=attendanceReconcileTasks(item.weekKey);closeModal();touch(`Посещаемость: ${group.name}${made?` · создано задач ${made}`:''}`);return}
  if(f.id==='attendanceChildForm'){e.preventDefault();const child={id:id('child'),name:v.name,parentContact:v.parentContact,notes:v.notes,active:true,createdAt:stamp,updatedAt:stamp};state.attendanceChildren.push(child);state.attendanceMemberships.push({id:id('membership'),childId:child.id,groupId:v.groupId,startDate:v.startDate||today(),status:'active',createdAt:stamp,updatedAt:stamp});const g=activeGroups().find(x=>x.id===v.groupId),count=attendanceMembers(v.groupId).length;if(g){if(g.rosterManaged)g.students=count;else g.students=Math.max(Number(g.students)||0,count);g.updatedAt=stamp}closeModal();touch(`Добавлен в состав: ${child.name}`);attendanceRosterModal(v.groupId);return}
  if(f.id==='attendanceCloseWeekForm'){e.preventDefault();const weekKey=attendanceSelectedWeek(),groups=attendanceScopeGroups(),a=attendanceAggregate(groups,weekKey),mentorRows=attendanceMentorIds(groups).map(mid=>attendanceMentorWeekStats(mid,weekKey)),old=state.attendanceWeekArchives.find(x=>x.id===f.dataset.id||x.weekKey===weekKey);const item={...(old||{}),id:old?.id||id('weekArchive'),weekKey,label:attendanceWeekLabel(weekKey),scope:currentRole,metrics:{fill:a.fill,attendance:a.attendance,density:a.density,sessions:a.sessions,expected:a.expected,present:a.present,actual:a.actual,objective:a.objective,noShow:a.noShow,completeness:a.completeness},groups:a.stats.map(x=>({groupId:x.group.id,name:x.group.name,mentorId:x.group.mentorId,enrolled:x.enrolled,capacity:x.capacity,expected:x.expected,present:x.present,actual:x.actual,fill:x.fill,attendance:x.attendance,density:x.density,objective:x.objective,noShow:x.noShow,sessions:x.sessionCount})),mentors:mentorRows.map(x=>({mentorId:x.mentorId,name:x.p.name,logging:x.logging,followup:x.followup,workIndex:x.workIndex,attendance:x.agg.attendance,density:x.agg.density})),comment:v.comment,closedAt:stamp,updatedAt:stamp};upsert(state.attendanceWeekArchives,item);const made=attendanceReconcileTasks(weekKey);closeModal();touch(`Закрыта неделя ${attendanceWeekLabel(weekKey)}${made?` · задач ${made}`:''}`);return}
  return __handleSubmitAttendanceBase(e)
};

const __handleClickAttendanceBase=handleClick;handleClick=function(e){const el=e.target.closest('[data-action]');if(el){const a=el.dataset.action;
  if(a==='attendanceTab'){state.ui.attendanceTab=el.dataset.tab;persistLocal();renderCurrentView();return}
  if(a==='attendancePrevWeek'){state.ui.attendanceWeek=attendanceAddDays(attendanceSelectedWeek(),-7);persistLocal();renderCurrentView();return}
  if(a==='attendanceNextWeek'){state.ui.attendanceWeek=attendanceAddDays(attendanceSelectedWeek(),7);persistLocal();renderCurrentView();return}
  if(a==='attendanceCurrentWeek'){state.ui.attendanceWeek=attendanceWeekStart(today());persistLocal();renderCurrentView();return}
  if(a==='attendanceAddSession'){attendanceSessionModal();return}
  if(a==='attendanceSessionForGroup'){attendanceSessionModal(null,el.dataset.id);return}
  if(a==='attendanceEditSession'){attendanceSessionModal(state.attendanceSessions.find(x=>x.id===el.dataset.id));return}
  if(a==='attendanceDeleteSession'){const x=state.attendanceSessions.find(s=>s.id===el.dataset.id);if(x&&confirm('Удалить запись посещаемости?')){x.deletedAt=nowIso();x.updatedAt=nowIso();touch('Запись посещаемости удалена')}return}
  if(a==='attendanceRoster'){attendanceRosterModal(el.dataset.id);return}
  if(a==='attendanceAddChild'){attendanceChildModal(el.dataset.group||'');return}
  if(a==='attendanceRemoveMember'){const m=state.attendanceMemberships.find(x=>x.id===el.dataset.id);if(m&&confirm('Убрать ребёнка из этой группы?')){m.deletedAt=nowIso();m.updatedAt=nowIso();const g=activeGroups().find(x=>x.id===m.groupId);if(g?.rosterManaged){g.students=attendanceMembers(g.id).length;g.updatedAt=nowIso()}touch('Состав группы обновлён');attendanceRosterModal(m.groupId)}return}
  if(a==='attendanceRosterManaged'){return}
  if(a==='attendanceCreateTasks'){const made=attendanceReconcileTasks(attendanceSelectedWeek());if(made)touch(`Создано задач по посещаемости: ${made}`);else toast('Новых задач нет','Все текущие сигналы уже обработаны или не требуют задачи.');return}
  if(a==='attendanceCloseWeek'){attendanceCloseWeekModal();return}
 }
 return __handleClickAttendanceBase(e)};
const __handleChangeAttendanceBase=handleChange;handleChange=function(e){const el=e.target;
  if(el.dataset.filter==='attendanceModalGroup'){attendanceSessionModal(null,el.value,$('#attendanceSessionForm [name="date"]')?.value||attendanceWeekDateForGroup(activeGroups().find(g=>g.id===el.value)));return}
  if(el.dataset.action==='attendanceRosterManaged'){const g=activeGroups().find(x=>x.id===el.dataset.id);if(g){g.rosterManaged=el.checked;g.students=el.checked?attendanceMembers(g.id).length:Math.max(Number(g.students)||0,attendanceMembers(g.id).length);g.updatedAt=nowIso();touch(`Состав группы ${g.name}: ${el.checked?'официальный':'частичный'}`);attendanceRosterModal(g.id)}return}
  return __handleChangeAttendanceBase(e)};

const __navBadgeAttendanceBase=navBadge;navBadge=function(view){if(view==='attendance'){const a=attendanceAggregate(attendanceScopeGroups(),attendanceSelectedWeek());return a.noShow||attendanceSignals(attendanceScopeGroups(),attendanceSelectedWeek()).filter(x=>x.kind==='red').length||''}return __navBadgeAttendanceBase(view)};
const __bootAttendanceBase=boot;boot=async function(){const result=await __bootAttendanceBase();if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,attendanceBuild:ATTENDANCE_EXTENSION_BUILD,attendanceWeek:week=>attendanceAggregate(attendanceScopeGroups(),attendanceWeekStart(week||today())),attendanceForecast:week=>attendanceForecast(attendanceScopeGroups(),attendanceWeekStart(week||attendanceAddDays(today(),7)))};return result};
// ATTENDANCE_INTELLIGENCE_V1_END

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

// MANAGEMENT_GROUP_ACCESS_V1_START
const MANAGEMENT_GROUP_ACCESS_BUILD='2026.09.03-management-all-groups';

function canSeeAllGroups(){
  return currentRole==='owner'||currentRole==='manager'||currentRole==='stas'||isIvanSeniorMentor();
}
function personalGroupMentorId(){
  return currentRole==='mentor'?mentorViewerId():'';
}
const __activeGroupsManagementBase=activeGroups;
function groupScopeList(){
  const list=__activeGroupsManagementBase();
  if(canSeeAllGroups())return list;
  const mentorId=personalGroupMentorId();
  return mentorId?list.filter(g=>g.mentorId===mentorId):[];
}
function groupVisibleToCurrentUser(group){
  return Boolean(group)&&(canSeeAllGroups()||group.mentorId===personalGroupMentorId());
}
function groupAccessDescription(){
  if(currentRole==='owner')return'Роман видит все активные группы клуба для контроля.';
  if(currentRole==='manager')return'Софа видит все активные группы клуба для операционного контроля.';
  if(currentRole==='stas')return'Стас видит все активные группы клуба как руководитель направления.';
  if(isIvanSeniorMentor())return'Ваня видит все активные группы клуба как старший наставник.';
  const mentorId=personalGroupMentorId();
  return mentorId?`В кабинете ${person(mentorId).name} отображаются только его группы.`:'Группы других наставников недоступны.';
}

const __renderGroupsManagementBase=renderGroups;
renderGroups=function(){
  const originalActiveGroups=activeGroups;
  const previousMentorFilter=state.ui.groupMentor;
  activeGroups=groupScopeList;
  if(!canSeeAllGroups())state.ui.groupMentor='all';
  try{
    let html=__renderGroupsManagementBase();
    const note=`<div class="task-access-note"><i></i><div><b>${esc(canSeeAllGroups()?'Контроль всех групп':'Личный доступ к группам')}</b><small>${esc(groupAccessDescription())}</small></div></div>`;
    html=html.replace('<div class="toolbar">',note+'<div class="toolbar">');
    return html;
  }finally{
    activeGroups=originalActiveGroups;
    state.ui.groupMentor=previousMentorFilter;
  }
};

const __navBadgeManagementGroupsBase=navBadge;
navBadge=function(view){
  if(view==='groups')return loadStats(groupScopeList()).free||'';
  return __navBadgeManagementGroupsBase(view);
};

const __groupModalManagementBase=groupModal;
groupModal=function(item=null){
  if(item&&!groupVisibleToCurrentUser(item)){
    toast('Эта группа недоступна','В личном кабинете наставника доступны только его группы.','error');
    return;
  }
  __groupModalManagementBase(item);
  if(canSeeAllGroups()||currentRole!=='mentor')return;
  const form=$('#groupForm');if(!form)return;
  const select=form.querySelector('[name="mentorId"]');if(!select)return;
  const field=select.closest('.field');if(!field)return;
  const mentorId=personalGroupMentorId(),p=person(mentorId);
  field.innerHTML=`<label>Наставник</label><div class="task-fixed-owner"><span class="avatar small">${esc(p.avatar||String(p.name||'?')[0])}</span><b>${esc(p.name)}</b></div><input type="hidden" name="mentorId" value="${esc(mentorId)}">`;
};

const __handleSubmitManagementGroupsBase=handleSubmit;
handleSubmit=function(e){
  const form=e.target;
  if(form instanceof HTMLFormElement&&form.id==='groupForm'&&!canSeeAllGroups()&&currentRole==='mentor'){
    const mentor=form.querySelector('[name="mentorId"]');
    if(mentor)mentor.value=personalGroupMentorId();
  }
  return __handleSubmitManagementGroupsBase(e);
};

const __handleClickManagementGroupsBase=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');
  if(el){
    const action=el.dataset.action;
    if((action==='editGroup'||action==='deleteGroup')&&!canSeeAllGroups()&&currentRole==='mentor'){
      const group=state.groups.find(g=>g.id===el.dataset.id);
      if(!groupVisibleToCurrentUser(group)){
        toast('Эта группа недоступна','Наставник может работать только со своими группами.','error');
        return;
      }
    }
  }
  return __handleClickManagementGroupsBase(e);
};

const __bootManagementGroupsBase=boot;
boot=async function(){
  const result=await __bootManagementGroupsBase();
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,managementGroupAccessBuild:MANAGEMENT_GROUP_ACCESS_BUILD,canSeeAllGroups:()=>canSeeAllGroups(),visibleGroups:()=>groupScopeList()};
  return result;
};
// MANAGEMENT_GROUP_ACCESS_V1_END

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

// SOFA3_UNIQUE_MERGE_V1_START
const SOFA3_MERGE_BUILD='2026.09.03-sofa3-unique-merge';

const SOFA3_CHECK_GROUPS={
  'Открытие смены':[
    ['open_clean','Клуб готов и чист','Ресепшен, раздевалки, зал, туалет, зона сотрудников.'],
    ['open_cash','Касса и остатки сверены','Нет необъяснимых расхождений, оплаты видны.'],
    ['open_schedule','Расписание и команда подтверждены','Смены, замены, пробные, индивидуальные тренировки.'],
    ['open_safe','Инвентарь и безопасность проверены','Аптечка, неисправности, опасные зоны.']
  ],
  'Продажи и клиенты':[
    ['sales_leads','Новые лиды обработаны','В рабочее время ответ — до 10 минут.'],
    ['sales_trials','Пробные доведены до решения','Подтверждение, визит, обратная связь, предложение.'],
    ['sales_renew','Продления в работе','Начинать за 7 дней до окончания.'],
    ['sales_unpaid','Неоплаты разобраны','У каждого клиента есть следующий шаг и дата контакта.']
  ],
  'Команда и сервис':[
    ['team_tasks','Команда понимает задачи','У каждой задачи есть ответственный и срок.'],
    ['team_parents','Нет родителей без ответа','Сложные ситуации не зависают у администраторов.'],
    ['team_feedback','Дана обратная связь родителям','Родитель понимает прогресс ребёнка и следующий этап.'],
    ['team_audit','Проверено качество','Хотя бы одна тренировка или зона клуба проверена.']
  ],
  'Закрытие дня':[
    ['close_cash','Касса и CRM закрыты','Оплаты, лиды и следующий шаг актуальны.'],
    ['close_incidents','Инциденты и жалобы зафиксированы','Нет ситуации, которая существует только в переписке.'],
    ['close_tasks','Задачи обновлены','Просрочки разобраны, завтра определено.'],
    ['close_report','Отчёт собственнику отправлен','До 21:30 — цифры, проблемы, решения и завтра.']
  ]
};
const SOFA3_RHYTHM=[
  ['09:30','Открытие смены','Чистота, касса, расписание, пробные, оплаты и безопасность.'],
  ['10:30','Входящие и пробные','Нет потерянных лидов, визиты подтверждены, следующий шаг установлен.'],
  ['13:30','Контроль середины дня','Продажи, задачи команды, родители, чистота и отклонения.'],
  ['16:30','Деньги сегодня','Продления, неоплаты, клиенты после пробной, обещанные платежи.'],
  ['19:00','Качество и родители','Тренировки, обратная связь, сложные ситуации, риск ухода.'],
  ['21:15','Закрытие системы','Касса, CRM, задачи, инциденты и черновик отчёта.'],
  ['21:30','Отчёт Роману','Только итог, исключения, решения и три результата на завтра.']
];
const SOFA3_MANUAL_METRICS=[
  ['Продажи и оплаты',[
    ['expected','Ожидаемые оплаты','₽'],
    ['leads','Новых лидов','шт.'],
    ['unanswered','Лидов без ответа','шт.'],
    ['unpaidClients','Неоплаченных клиентов','шт.'],
    ['unpaidAmount','Сумма неоплат','₽']
  ]],
  ['Пробные и продления',[
    ['booked','Записано на пробную','шт.'],
    ['confirmed','Пробных подтверждено','шт.'],
    ['attended','Пробных пришло','шт.'],
    ['sold','После пробной купило','шт.'],
    ['renewDue','Продлений в работе','шт.'],
    ['renewDone','Продлено','шт.'],
    ['cleanliness','Чистота','%']
  ]]
];
const SOFA3_MEETING_TEMPLATES={
  week:{title:'Роман + Софа',duration:60,participants:'Роман, Софа',description:'Недельное управление: цифры, отклонения, решения, три результата.',agenda:['План и факт выручки','Поступления и обязательства ближайших 14 дней','Продажи, пробные и продления','Загрузка групп','Проблемы родителей','Команда и дисциплина','Риски','Три результата недели']},
  admins:{title:'Собрание администраторов',duration:45,participants:'Софа, администраторы',description:'Продажи, клиенты, задачи и качество коммуникации.',agenda:['План и факт месяца','Лиды без следующего шага','Пробные сегодня и на неделю','Продления','Неоплаченные клиенты','Ошибки коммуникации','Просроченные задачи','Мини-обучение','Три задачи каждого администратора']},
  sales:{title:'Воронка продаж',duration:20,participants:'Софа, администраторы',description:'Короткий разбор клиентов, которых нужно довести до решения и оплаты.',agenda:['Новые лиды','Пробные без покупки','Продления','Обещанные оплаты','Риск ухода','Следующий шаг по каждому клиенту']},
  quality:{title:'Качество и дисциплина',duration:30,participants:'Софа, ответственные сотрудники',description:'Сервис, чистота, тренировки, безопасность, дисциплина и исправления.',agenda:['Чистота','Качество тренировок','Безопасность','Обратная связь родителям','Жалобы','Дисциплина','Просроченные задачи','План исправлений']},
  month:{title:'Закрытие месяца',duration:90,participants:'Роман, Софа',description:'Полный управленческий разбор месяца и решения на следующий.',agenda:['План / факт выручки','ПиУ и ДДС','Точка безубыточности','Прибыль и свободный поток','Продажи и продления','Загрузка','KPI команды','Качество и жалобы','Риски','Три задачи следующего месяца']}
};
const SOFA3_KPIS=[
  ['sales','Продажи и CRM','Нет потерянных лидов, пробных, продлений и неоплат.'],
  ['team','Команда','Задачи, сроки, смены, просрочки и обучение под контролем.'],
  ['service','Родители и сервис','Обращения, жалобы, обратная связь и риски ухода отработаны.'],
  ['quality','Качество управления','Отчёты, чистота, аудиты, инциденты и планы ведутся системно.']
];
const SOFA3_TIERS=[[5000000,80000],[4500000,70000],[4000000,60000],[3500000,45000],[3000000,30000],[2700000,20000],[2400000,10000],[0,0]];
const SOFA3_BASE_SALARY=100000;

function sofa3Date(value=today()){
  const s=String(value||'');
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const d=new Date(value);if(Number.isNaN(+d))return today();
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function sofa3AddDays(value,days){const d=new Date(sofa3Date(value)+'T12:00:00');d.setDate(d.getDate()+Number(days||0));return sofa3Date(d)}
function sofa3PrettyDate(value){const d=new Date(sofa3Date(value)+'T12:00:00');return new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d).replace(/^./,x=>x.toUpperCase())}
function sofa3WeekStart(value=today()){const d=new Date(sofa3Date(value)+'T12:00:00'),delta=(d.getDay()+6)%7;d.setDate(d.getDate()-delta);return sofa3Date(d)}
function sofa3WeekEnd(value=today()){return sofa3AddDays(sofa3WeekStart(value),6)}
function sofa3IsoWeekKey(value=today()){
  const d=new Date(sofa3Date(value)+'T12:00:00');d.setHours(0,0,0,0);d.setDate(d.getDate()+3-((d.getDay()+6)%7));const first=new Date(d.getFullYear(),0,4);const week=1+Math.round(((d-first)/86400000-3+((first.getDay()+6)%7))/7);return`${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}
function sofa3SelectedDate(){return sofa3Date(state?.ui?.operationsDate||today())}
function sofa3DayBase(dateValue){
  const checks={};Object.values(SOFA3_CHECK_GROUPS).flat().forEach(([key])=>checks[key]=false);
  const rhythm={};SOFA3_RHYTHM.forEach((_,i)=>rhythm[i]=false);
  const metrics={};SOFA3_MANUAL_METRICS.flatMap(([,items])=>items).forEach(([key])=>metrics[key]=0);
  return{date:sofa3Date(dateValue),priorities:['','',''],checks,rhythm,metrics,notes:{parents:'',team:'',incidents:'',risks:'',solved:'',owner:'',unpaidNext:'',tomorrowComment:''},report:{tomorrow:['','',''],sentAt:null,snapshot:null},updatedAt:nowIso()};
}
function sofa3WeekBase(key){return{key,results:['','',''],resultStatus:[0,0,0],revenueTarget:0,risk:'',team:'',parents:'',improvement:'',decision:'',closedAt:null,snapshot:null,updatedAt:nowIso()}}
function sofa3MotivationBase(key){const checks={};SOFA3_KPIS.forEach(([k])=>checks[k]=false);return{key,checks,closedAt:null,snapshot:null,updatedAt:nowIso()}}
function sofa3MeetingDraft(type='week'){
  const t=SOFA3_MEETING_TEMPLATES[type]||SOFA3_MEETING_TEMPLATES.week;
  return{type,date:today(),participants:t.participants,duration:t.duration,agenda:t.agenda.map((text,i)=>({id:`${type}_${i}`,text,done:false})),notes:'',decision:'',tasks:'',updatedAt:nowIso()};
}
function sofa3EnsureState(s){
  if(!s||typeof s!=='object')return s;
  s.operationsDays=s.operationsDays&&typeof s.operationsDays==='object'?s.operationsDays:{};
  s.managementPlans=s.managementPlans&&typeof s.managementPlans==='object'?s.managementPlans:{weeks:{}};
  s.managementPlans.weeks=s.managementPlans.weeks&&typeof s.managementPlans.weeks==='object'?s.managementPlans.weeks:{};
  s.managementMeetings=Array.isArray(s.managementMeetings)?s.managementMeetings:[];
  s.sofiaMotivationByMonth=s.sofiaMotivationByMonth&&typeof s.sofiaMotivationByMonth==='object'?s.sofiaMotivationByMonth:{};
  s.managementMeetingDraft=s.managementMeetingDraft&&typeof s.managementMeetingDraft==='object'?s.managementMeetingDraft:sofa3MeetingDraft('week');
  if(!SOFA3_MEETING_TEMPLATES[s.managementMeetingDraft.type])s.managementMeetingDraft=sofa3MeetingDraft('week');
  s.ui={...(s.ui||{}),operationsDate:sofa3Date(s.ui?.operationsDate||today()),operationsTab:s.ui?.operationsTab||'today'};
  s.meta=s.meta||{};s.meta.sofa3MergeBuild=SOFA3_MERGE_BUILD;
  if(Array.isArray(s.staffDocuments)&&!s.staffDocuments.some(x=>x.id==='sofa3-manager-guide')){
    s.staffDocuments.push({id:'sofa3-manager-guide',personId:'sofia',title:'Система управляющей',type:'Регламент',description:'Не делать всё самой: поставить задачу, назначить ответственного, дать ресурс и срок, проверить результат и разобрать повторную ошибку. Знать план/факт, лиды, пробные, конверсию, продления, ожидаемые оплаты и загрузку. Быть в клубе, видеть тренировки, слышать команду и улучшать один процесс в неделю.',seeded:true,createdBy:'system',createdAt:'2026-09-03T00:00:00.000Z',updatedAt:'2026-09-03T00:00:00.000Z'});
  }
  return s;
}
const __seedStateSofa3Base=seedState;seedState=function(){return sofa3EnsureState(__seedStateSofa3Base())};
const __ensureStateSofa3Base=ensureState;ensureState=function(raw){return sofa3EnsureState(__ensureStateSofa3Base(raw))};
function sofa3MergeKeyed(local={},remote={}){const out={...local,...remote};for(const key of new Set([...Object.keys(local||{}),...Object.keys(remote||{})]))out[key]=local?.[key]&&remote?.[key]?newer(local[key],remote[key]):(local?.[key]||remote?.[key]);return out}
const __mergeStatesSofa3Base=mergeStates;mergeStates=function(local,remote){
  const out=sofa3EnsureState(__mergeStatesSofa3Base(local,remote));if(!remote)return out;
  out.operationsDays=sofa3MergeKeyed(local?.operationsDays||{},remote?.operationsDays||{});
  out.managementPlans={weeks:sofa3MergeKeyed(local?.managementPlans?.weeks||{},remote?.managementPlans?.weeks||{})};
  out.sofiaMotivationByMonth=sofa3MergeKeyed(local?.sofiaMotivationByMonth||{},remote?.sofiaMotivationByMonth||{});
  out.managementMeetings=mergeLists(local?.managementMeetings||[],remote?.managementMeetings||[]);
  out.managementMeetingDraft=newer(local?.managementMeetingDraft||{},remote?.managementMeetingDraft||{});
  return sofa3EnsureState(out);
};

function sofa3EnsureDay(dateValue=sofa3SelectedDate()){const d=sofa3Date(dateValue);if(!state.operationsDays[d])state.operationsDays[d]=sofa3DayBase(d);return state.operationsDays[d]}
function sofa3EnsureWeek(dateValue=sofa3SelectedDate()){const key=sofa3IsoWeekKey(dateValue);if(!state.managementPlans.weeks[key])state.managementPlans.weeks[key]=sofa3WeekBase(key);return state.managementPlans.weeks[key]}
function sofa3EnsureMotivation(key=state.settings.currentMonth){if(!state.sofiaMotivationByMonth[key])state.sofiaMotivationByMonth[key]=sofa3MotivationBase(key);return state.sofiaMotivationByMonth[key]}
function sofa3Month(dateValue){const key=monthKeyFromDate(dateValue),m=state.months[key];return m||{key,label:monthLabel(key),minimum:state.settings.minimumRevenue||0,target:state.settings.normalRevenue||0,stretch:state.settings.strongRevenue||0,fact:0,daily:[]}}
function sofa3RevenueOnDate(dateValue){const m=sofa3Month(dateValue),d=sofa3Date(dateValue);return sum((m.daily||[]).filter(x=>x.date===d&&!x.deletedAt),x=>x.amount)}
function sofa3SalesOnDate(dateValue){
  const d=sofa3Date(dateValue),key=monthKeyFromDate(d),sales=(state.adminOperationsByMonth?.[key]?.sales||[]).filter(x=>!x.deletedAt&&x.date===d);
  const group=sales.filter(x=>x.type==='group'),it=sales.filter(x=>x.type==='it');
  const byAdmin={};for(const s of sales){byAdmin[s.adminId]=byAdmin[s.adminId]||{count:0,amount:0};byAdmin[s.adminId].count++;byAdmin[s.adminId].amount+=Number(s.amount)||0}
  return{sales,groupCount:group.length,groupAmount:sum(group,x=>x.amount),individualCount:it.length,individualAmount:sum(it,x=>x.amount),byAdmin};
}
function sofa3DerivedMetrics(dateValue=sofa3SelectedDate()){
  const d=sofa3Date(dateValue),day=sofa3EnsureDay(d),snapshot=day.report?.snapshot||null,sales=sofa3SalesOnDate(d),current=d===today();
  const load=snapshot&&!current?Number(snapshot.occupancy)||0:loadStats().load;
  const derived={revenue:sofa3RevenueOnDate(d),groupCount:sales.groupCount,groupAmount:sales.groupAmount,individualCount:sales.individualCount,individualAmount:sales.individualAmount,anyaSalesCount:sales.byAdmin.anya?.count||0,anyaSalesAmount:sales.byAdmin.anya?.amount||0,adelSalesCount:sales.byAdmin.adel?.count||0,adelSalesAmount:sales.byAdmin.adel?.amount||0,occupancy:load};
  if(snapshot&&!current){for(const k of Object.keys(derived))if(snapshot[k]!==undefined)derived[k]=snapshot[k]}
  return{...day.metrics,...derived};
}
function sofa3Stats(dateValue=sofa3SelectedDate()){
  const d=sofa3Date(dateValue),day=sofa3EnsureDay(d),m=sofa3Month(d),fact=monthFact(m),plan=Number(m.target)||0,daysInMonth=new Date(Number(d.slice(0,4)),Number(d.slice(5,7)),0).getDate(),dateNumber=Number(d.slice(8,10)),remaining=Math.max(0,plan-fact),remainingDays=Math.max(1,daysInMonth-dateNumber),need=remaining/remainingDays;
  let forecastValue=0;try{forecastValue=forecast(m).base||0}catch{forecastValue=dateNumber?fact/dateNumber*daysInMonth:0}
  const metrics=sofa3DerivedMetrics(d),conversion=Number(metrics.attended)?Number(metrics.sold)/Number(metrics.attended)*100:0,renew=Number(metrics.renewDue)?Number(metrics.renewDone)/Number(metrics.renewDue)*100:0;
  const checks=Object.values(day.checks||{}),rhythm=Object.values(day.rhythm||{}),checkDone=checks.filter(Boolean).length,rhythmDone=rhythm.filter(Boolean).length,readiness=Math.round(((checks.length?checkDone/checks.length:0)*.7+(rhythm.length?rhythmDone/rhythm.length:0)*.3)*100);
  return{date:d,day,m,metrics,fact,plan,remaining,need,forecast:forecastValue,conversion,renew,readiness,checkDone,checkTotal:checks.length,rhythmDone,rhythmTotal:rhythm.length,progress:plan?fact/plan*100:0};
}
function sofa3NextRhythm(day,dateValue=sofa3SelectedDate()){
  const selected=sofa3Date(dateValue),now=new Date(),nowMin=now.getHours()*60+now.getMinutes();
  for(let i=0;i<SOFA3_RHYTHM.length;i++){
    if(day.rhythm?.[i])continue;const [time,title,text]=SOFA3_RHYTHM[i],parts=time.split(':').map(Number),mins=parts[0]*60+parts[1];
    if(selected!==today()||mins>=nowMin)return[time,title,text,i];
  }
  return SOFA3_RHYTHM.map((x,i)=>[...x,i]).find(x=>!day.rhythm?.[x[3]])||null;
}
function sofa3Alerts(s){
  const list=[];if(Number(s.metrics.unanswered))list.push({red:true,text:`${s.metrics.unanswered} лид(а) без ответа`});if(Number(s.metrics.unpaidClients))list.push({red:true,text:`${s.metrics.unpaidClients} неоплаченных клиент(а) · ${compactMoney(s.metrics.unpaidAmount)}`});
  const overdue=activeTasks().filter(t=>!statusDone(t.status)&&t.deadline&&t.deadline<s.date).length;if(overdue)list.push({red:true,text:`${overdue} просроченных задач в общей системе`});
  if(Number(s.metrics.cleanliness)>0&&Number(s.metrics.cleanliness)<85)list.push({red:false,text:`Чистота ${Math.round(s.metrics.cleanliness)}% — требуется исправление`});if(s.readiness<55)list.push({red:false,text:`Готовность дня ${s.readiness}% — не закрыты базовые контрольные точки`});return list;
}
function sofa3WeekRevenue(dateValue=sofa3SelectedDate()){const a=sofa3WeekStart(dateValue),b=sofa3WeekEnd(dateValue);let total=0;for(const m of Object.values(state.months||{}))total+=sum((m.daily||[]).filter(x=>!x.deletedAt&&x.date>=a&&x.date<=b),x=>x.amount);return total}
function sofa3WeekTasks(dateValue=sofa3SelectedDate()){const a=sofa3WeekStart(dateValue),b=sofa3WeekEnd(dateValue);return activeTasks().filter(t=>t.ownerId==='sofia'&&t.deadline>=a&&t.deadline<=b)}
function sofa3WeekScore(dateValue=sofa3SelectedDate()){
  const w=sofa3EnsureWeek(dateValue),revenue=sofa3WeekRevenue(dateValue),tasks=sofa3WeekTasks(dateValue),target=Number(w.revenueTarget)||0,components=[];
  if(target)components.push({key:'revenue',score:clamp(revenue/target*100,0,130),weight:50});
  const hasResults=(w.results||[]).some(x=>String(x||'').trim());if(hasResults){const vals=(w.resultStatus||[0,0,0]).map(Number),score=avg(vals)*100;components.push({key:'results',score,weight:30})}
  if(tasks.length){const done=tasks.filter(t=>statusDone(t.status)).length;components.push({key:'tasks',score:done/tasks.length*100,weight:20})}
  const weight=sum(components,x=>x.weight),score=weight?sum(components,x=>x.score*x.weight)/weight:0;return{w,revenue,tasks,target,components,score:clamp(score,0,130)};
}
function sofa3ScoreLabel(score,closed=false){const label=score>=90?'Выполнено':score>=70?'Частично':'Не выполнено';return closed?label:`В работе · ${Math.round(score)}%`}
function sofa3Tier(fact){for(const [threshold,bonus] of SOFA3_TIERS)if(fact>=threshold)return bonus;return 0}
function sofa3Coef(planPct){return planPct>=100?1:planPct>=95?.75:planPct>=90?.5:0}
function sofa3Salary(key=state.settings.currentMonth){
  const m=state.months[key]||sofa3Month(`${key}-01`),mot=sofa3EnsureMotivation(key),fact=monthFact(m),plan=Number(m.target)||0,planPct=plan?fact/plan*100:0,kpiCount=SOFA3_KPIS.filter(([k])=>mot.checks?.[k]).length,kpi=kpiCount*5000,tier=sofa3Tier(fact),coef=sofa3Coef(planPct),variable=tier*coef,total=SOFA3_BASE_SALARY+kpi+variable,final=mot.snapshot?.amount??null;
  return{key,mot,fact,plan,planPct,kpiCount,kpi,tier,coef,variable,total,final,display:final??total};
}

const sofa3WorkSection=NAV.find(section=>section.section==='Работа');
if(sofa3WorkSection&&!sofa3WorkSection.items.some(x=>x.id==='operations')){
  const calIndex=sofa3WorkSection.items.findIndex(x=>x.id==='calendar');sofa3WorkSection.items.splice(calIndex>=0?calIndex+1:0,0,{id:'operations',label:'Операционный день',icon:'attendance',roles:['owner','manager']});
}

function sofa3Datebar(){const d=sofa3SelectedDate();return`<div class="operations-datebar"><div class="operations-date-nav"><button class="icon-btn" data-action="sofa3PrevDay">‹</button><div class="operations-date-copy"><span>Рабочая дата</span><b>${esc(sofa3PrettyDate(d))}</b></div><button class="icon-btn" data-action="sofa3NextDay">›</button></div><div class="operations-date-actions"><input class="input" type="date" data-filter="sofa3OpsDate" value="${d}" style="width:auto"><button class="btn btn-ghost" data-action="sofa3Today">Сегодня</button></div></div>`}
function sofa3Tabs(){const active=state.ui.operationsTab||'today',tabs=[['today','Сегодня'],['control','Контроль дня'],['metrics','Цифры дня'],['report','Итог дня'],['week','Неделя']];return`<div class="operations-tabs">${tabs.map(([idv,label])=>`<button class="${active===idv?'active':''}" data-action="sofa3OpsTab" data-tab="${idv}">${label}</button>`).join('')}</div>`}
function sofa3Hero(s){const alerts=sofa3Alerts(s),next=sofa3NextRhythm(s.day,s.date),readinessText=s.readiness>=85?'Система под контролем':s.readiness>=55?'Нужно закрыть отклонения':'Нужен управленческий фокус';return`<section class="operations-hero"><div class="operations-hero-grid"><div class="operations-readiness"><div class="operations-ring" style="--p:${clamp(s.readiness,0,100)}"><b>${s.readiness}%</b></div><div><div class="eyebrow">ГОТОВНОСТЬ ДНЯ</div><h2>${esc(readinessText)}</h2><p>Безопасность и родители → деньги сегодня → команда → улучшение процесса.</p><div class="operations-next"><b>${next?`Следующая точка — ${next[0]} · ${next[1]}`:'Основные контрольные точки пройдены'}</b><small>${next?next[2]:'Можно закрывать итог дня и фиксировать завтра.'}</small></div></div></div><div class="operations-alerts">${alerts.length?alerts.slice(0,5).map(x=>`<div class="operations-alert ${x.red?'red':''}"><i></i><div><b>${x.red?'Требует внимания':'Проверь сегодня'}</b><small>${esc(x.text)}</small></div></div>`).join(''):'<div class="operations-alert"><i></i><div><b>Критических отклонений не зафиксировано</b><small>Можно переходить от тушения проблем к продажам, качеству и улучшению процесса.</small></div></div>'}</div></div></section>`}
function sofa3TodayView(){const s=sofa3Stats(),week=sofa3WeekScore(s.date),salary=sofa3Salary(monthKeyFromDate(s.date));return`${sofa3Hero(s)}<div class="grid-4">${metricCard('Выручка месяца',compactMoney(s.fact),`${pct(s.progress)} от плана`,'revenue',s.progress)}${metricCard('Нужно в день',compactMoney(s.need),`осталось ${compactMoney(s.remaining)}`,'analytics')}${metricCard('Пробная → продажа',pct(s.conversion),`${Number(s.metrics.sold)||0} из ${Number(s.metrics.attended)||0} сегодня`,'users',s.conversion)}${metricCard('Продления',pct(s.renew),`${Number(s.metrics.renewDone)||0} из ${Number(s.metrics.renewDue)||0}`,'tasks',s.renew)}</div><section class="card pad"><div class="card-head"><div><h3>Три результата дня</h3><p>Не список из двадцати дел, а три результата, которые должны измениться к закрытию.</p></div><button class="btn btn-small btn-ghost" data-view="tasks">Открыть задачи</button></div><form id="sofa3PrioritiesForm"><div class="operations-priorities">${s.day.priorities.map((v,i)=>`<label class="operations-priority"><span>${i+1}</span><textarea name="p${i}" placeholder="${['Главный результат дня','Второй результат','Третий результат'][i]}">${esc(v)}</textarea></label>`).join('')}</div><div class="operations-savebar"><button class="btn btn-primary" type="submit">Сохранить результаты дня</button></div></form></section><div class="grid-2"><section class="card pad"><div class="card-head"><div><h3>Неделя управляющей</h3><p>${esc(sofa3IsoWeekKey(s.date))} · результат из выручки, трёх результатов и задач Софы</p></div><button class="btn btn-small btn-ghost" data-action="sofa3OpsTab" data-tab="week">Подробнее</button></div><div class="management-week-score" style="min-height:140px"><div><strong>${Math.round(week.score)}%</strong><span>${esc(sofa3ScoreLabel(week.score,Boolean(week.w.closedAt)))}</span></div></div></section><section class="card pad sofia-salary-card"><div class="card-head"><div><h3>Мотивация Софы</h3><p>Формула из Управления 3.0, встроенная в общий раздел зарплаты</p></div><button class="btn btn-small btn-ghost" data-view="payroll">Открыть ЗП</button></div><div class="sofia-salary-value">${salaryMoney(salary.display)}<small>план ${pct(salary.planPct)} · KPI ${salary.kpiCount}/4</small></div></section></div>`}
function sofa3ControlView(){const s=sofa3Stats(),next=sofa3NextRhythm(s.day,s.date);return`<div class="operations-check-groups">${Object.entries(SOFA3_CHECK_GROUPS).map(([group,items])=>`<section class="operations-check-group"><h3>${esc(group)}</h3><div class="operations-check-list">${items.map(([key,title,text])=>`<button type="button" class="operations-check ${s.day.checks[key]?'done':''}" data-action="sofa3ToggleCheck" data-key="${key}"><span class="operations-check-mark">${s.day.checks[key]?'✓':'○'}</span><span><b>${esc(title)}</b><small>${esc(text)}</small></span></button>`).join('')}</div></section>`).join('')}</div><section class="card pad"><div class="card-head"><div><h3>Ритм управления</h3><p>Контрольные точки дня — чтобы управляющая не держала операционку в голове.</p></div><span class="pill">${s.rhythmDone}/${s.rhythmTotal}</span></div><div class="operations-timeline">${SOFA3_RHYTHM.map(([time,title,text],i)=>`<div class="operations-rhythm ${s.day.rhythm[i]?'done':''} ${next?.[3]===i?'current':''}"><time>${time}</time><button type="button" class="operations-rhythm-mark" data-action="sofa3ToggleRhythm" data-index="${i}">${s.day.rhythm[i]?'✓':'○'}</button><div><b>${esc(title)}</b><small>${esc(text)}</small></div>${next?.[3]===i?'<span class="pill">Следующая</span>':''}</div>`).join('')}</div></section>`}
function sofa3MetricsView(){const s=sofa3Stats(),m=s.metrics;return`<section class="card pad"><div class="card-head"><div><h3>Автоматически из основной системы</h3><p>Эти цифры не нужно вводить второй раз: они берутся из выручки, продаж администраторов и загрузки групп.</p></div></div><div class="operations-derived"><div><span>Выручка за день</span><b>${compactMoney(m.revenue)}</b><small>из поступлений Growth OS</small></div><div><span>Групповые продажи</span><b>${m.groupCount}</b><small>${compactMoney(m.groupAmount)}</small></div><div><span>Индивидуальные</span><b>${m.individualCount}</b><small>${compactMoney(m.individualAmount)}</small></div><div><span>Загрузка групп</span><b>${pct(m.occupancy)}</b><small>из общей базы групп</small></div><div><span>Аня</span><b>${m.anyaSalesCount}</b><small>${compactMoney(m.anyaSalesAmount)}</small></div><div><span>Адель</span><b>${m.adelSalesCount}</b><small>${compactMoney(m.adelSalesAmount)}</small></div><div><span>Конверсия пробной</span><b>${pct(s.conversion)}</b><small>${m.sold||0}/${m.attended||0}</small></div><div><span>Продления</span><b>${pct(s.renew)}</b><small>${m.renewDone||0}/${m.renewDue||0}</small></div></div></section><form id="sofa3MetricsForm"><div class="operations-metric-groups">${SOFA3_MANUAL_METRICS.map(([group,items])=>`<section class="operations-metric-group"><h3>${esc(group)}</h3><div class="operations-fields">${items.map(([key,label,unit])=>`<div class="field"><label>${esc(label)} · ${esc(unit)}</label><input class="input" type="number" min="0" step="${unit==='%'?'1':'1'}" name="${key}" value="${Number(s.day.metrics[key])||0}"></div>`).join('')}</div></section>`).join('')}</div><div class="operations-savebar"><button class="btn btn-primary" type="submit">Сохранить цифры дня</button></div></form>`}
function sofa3ReportText(dateValue=sofa3SelectedDate()){
  const s=sofa3Stats(dateValue),d=s.day,m=s.metrics,ts=taskStats(tasksForMonth(monthKeyFromDate(s.date))),lines=[];
  lines.push('EXTREME KIDS ТРОПАРЁВО — ИТОГ ДНЯ',sofa3PrettyDate(s.date),'','ЦИФРЫ',`• Выручка за день: ${money(m.revenue)}`,`• Факт месяца: ${money(s.fact)} / план ${money(s.plan)}`,`• Прогноз месяца: ${money(s.forecast)}`,`• До плана: ${money(s.remaining)} · нужно ${money(s.need)} в день`,'','ПРОДАЖИ И ВОРОНКА',`• Групповые: ${m.groupCount} · ${money(m.groupAmount)}`,`• Индивидуальные: ${m.individualCount} · ${money(m.individualAmount)}`,`• Лиды: ${m.leads||0} · без ответа ${m.unanswered||0}`,`• Пробные: записано ${m.booked||0} · подтверждено ${m.confirmed||0} · пришло ${m.attended||0} · купило ${m.sold||0}`,`• Конверсия пробная → продажа: ${pct(s.conversion)}`,`• Продления: ${m.renewDone||0}/${m.renewDue||0} · ${pct(s.renew)}`,`• Неоплаты: ${m.unpaidClients||0} клиентов · ${money(m.unpaidAmount||0)}`,`• Ожидаемые оплаты: ${money(m.expected||0)}`,'','УПРАВЛЕНИЕ',`• Готовность дня: ${s.readiness}% · чек-лист ${s.checkDone}/${s.checkTotal} · ритм ${s.rhythmDone}/${s.rhythmTotal}`,`• Загрузка групп: ${pct(m.occupancy)} · чистота ${pct(m.cleanliness||0)}`,`• Задачи месяца: ${ts.done}/${ts.total} выполнено · просрочено ${ts.over}`);
  if(d.notes.parents)lines.push(`• Родители / жалобы: ${d.notes.parents}`);if(d.notes.team)lines.push(`• Команда / дисциплина: ${d.notes.team}`);if(d.notes.incidents)lines.push(`• Инциденты: ${d.notes.incidents}`);if(d.notes.risks)lines.push(`• Риски: ${d.notes.risks}`);if(d.notes.solved)lines.push(`• Что решено: ${d.notes.solved}`);if(d.notes.owner)lines.push(`• Что требует решения Романа: ${d.notes.owner}`);if(d.notes.unpaidNext)lines.push(`• Неоплаты / следующий шаг: ${d.notes.unpaidNext}`);
  lines.push('','ЗАВТРА');(d.report.tomorrow||['','','']).forEach((x,i)=>lines.push(`${i+1}. ${x||'—'}`));if(d.notes.tomorrowComment)lines.push(`Комментарий: ${d.notes.tomorrowComment}`);return lines.join('\n');
}
function sofa3ReportView(){const s=sofa3Stats(),d=s.day,sent=d.report.sentAt;const noteFields=[['parents','Родители / жалобы'],['team','Команда / дисциплина'],['incidents','Инциденты'],['risks','Риски'],['solved','Что решено'],['owner','Что требует решения Романа'],['unpaidNext','Неоплаты / следующий шаг'],['tomorrowComment','Комментарий на завтра']];return`<div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>То, чего не видно из цифр</h3><p>Софа добавляет только исключения, проблемы, решения и следующий шаг.</p></div></div><div class="operations-report-status ${sent?'sent':''}"><i>●</i><b>${sent?'Отчёт зафиксирован':'Отчёт ещё не зафиксирован'}</b><span>${sent?new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(sent)):'до 21:30'}</span></div><form id="sofa3ReportForm" style="margin-top:13px"><div class="operations-note-grid">${noteFields.map(([key,label])=>`<div class="field ${key==='owner'||key==='tomorrowComment'?'full':''}"><label>${esc(label)}</label><textarea class="textarea" name="${key}" placeholder="Если ничего нет — можно оставить пустым">${esc(d.notes[key]||'')}</textarea></div>`).join('')}<div class="field full"><label>Три результата на завтра</label><div class="operations-priorities">${(d.report.tomorrow||['','','']).map((v,i)=>`<label class="operations-priority"><span>${i+1}</span><textarea name="tomorrow${i}" placeholder="Результат на завтра ${i+1}">${esc(v)}</textarea></label>`).join('')}</div></div></div><div class="operations-savebar"><button class="btn btn-ghost" type="submit">Сохранить черновик</button><button class="btn btn-primary" type="button" data-action="sofa3MarkReport">${sent?'Обновить и зафиксировать':'Зафиксировать отправку'}</button></div></form></section><section class="card pad"><div class="card-head"><div><h3>Готовый текст</h3><p>Можно сразу отправить Роману.</p></div><button class="btn btn-small btn-ghost" data-action="sofa3CopyReport">Копировать</button></div><pre id="sofa3ReportPreview" class="operations-report-preview">${esc(sofa3ReportText())}</pre></section></div>`}
function sofa3WeekView(){const x=sofa3WeekScore(),w=x.w,start=sofa3WeekStart(),end=sofa3WeekEnd(),closed=Boolean(w.closedAt),components=Object.fromEntries(x.components.map(c=>[c.key,c]));return`<div class="management-week-grid"><section class="card pad"><div class="card-head"><div><h3>Три результата недели</h3><p>${esc(start)} — ${esc(end)} · не список дел, а измеримые изменения</p></div><span class="pill">${esc(sofa3IsoWeekKey())}</span></div><form id="sofa3WeekForm"><div class="field"><label>План выручки недели</label><input class="input" type="number" min="0" name="revenueTarget" value="${Number(w.revenueTarget)||0}"></div><div class="management-result-list" style="margin-top:12px">${w.results.map((v,i)=>{const st=Number(w.resultStatus?.[i])||0;return`<div class="management-result-row"><button type="button" class="management-result-state ${st>=1?'done':st>=.5?'part':''}" data-action="sofa3CycleWeekResult" data-index="${i}">${st>=1?'✓':st>=.5?'◐':'○'}</button><input class="input" name="result${i}" value="${esc(v)}" placeholder="Результат недели ${i+1}"><span class="pill muted">${st>=1?'готово':st>=.5?'частично':'в работе'}</span></div>`}).join('')}</div><div class="operations-note-grid" style="margin-top:12px"><div class="field"><label>Главный риск</label><textarea class="textarea" name="risk">${esc(w.risk||'')}</textarea></div><div class="field"><label>Команда</label><textarea class="textarea" name="team">${esc(w.team||'')}</textarea></div><div class="field"><label>Родители</label><textarea class="textarea" name="parents">${esc(w.parents||'')}</textarea></div><div class="field"><label>Одно улучшение процесса</label><textarea class="textarea" name="improvement">${esc(w.improvement||'')}</textarea></div><div class="field full"><label>Решение недели</label><textarea class="textarea" name="decision">${esc(w.decision||'')}</textarea></div></div><div class="operations-savebar"><button class="btn btn-ghost" type="submit">Сохранить неделю</button><button class="btn btn-primary" type="button" data-action="sofa3CloseWeek">${closed?'Обновить снимок недели':'Закрыть неделю'}</button></div></form></section><section class="card pad"><div class="management-week-score"><div><div class="eyebrow">ИТОГ НЕДЕЛИ</div><strong>${Math.round(x.score)}%</strong><span>${esc(sofa3ScoreLabel(x.score,closed))}</span><div class="management-week-components"><div><span>Выручка</span><b>${components.revenue?`${compactMoney(x.revenue)} / ${compactMoney(x.target)}`:'план не задан'}</b></div><div><span>Результаты</span><b>${components.results?pct(components.results.score):'—'}</b></div><div><span>Задачи Софы</span><b>${x.tasks.filter(t=>statusDone(t.status)).length}/${x.tasks.length}</b></div></div></div></div></section></div><section class="card pad"><div class="card-head"><div><h3>Порядок приоритетов управляющей</h3><p>Регламент из Управления 3.0 — без отдельного дублирующего раздела.</p></div></div><div class="grid-2"><div class="compact-list"><div class="compact-item"><span class="item-index">1</span><div class="item-main"><b>Безопасность</b><small>Травма, ребёнок без присмотра, неисправность или угроза безопасности — немедленно.</small></div></div><div class="compact-item"><span class="item-index">2</span><div class="item-main"><b>Родители</b><small>Жалоба, конфликт, возврат или риск ухода — быстро признать обращение и довести до решения.</small></div></div><div class="compact-item"><span class="item-index">3</span><div class="item-main"><b>Деньги сегодня</b><small>Лиды, пробные, продления, неоплаты и обещанные платежи.</small></div></div><div class="compact-item"><span class="item-index">4</span><div class="item-main"><b>Команда</b><small>Смены, задачи, замены, просрочки и дисциплина.</small></div></div><div class="compact-item"><span class="item-index">5</span><div class="item-main"><b>Улучшение</b><small>Когда срочное закрыто — улучшить один процесс.</small></div></div></div><div class="compact-list"><div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Софа решает сама</b><small>Ежедневные задачи, CRM, стандартные вопросы родителей, пробные, продления, чистота, обучение и организация смен.</small></div></div><div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>Согласовать с Романом</b><small>Новые цены, нестандартная скидка, значимая компенсация, зарплата, найм/увольнение, новый постоянный расход.</small></div></div><div class="compact-item"><i class="item-dot red"></i><div class="item-main"><b>Подключить Романа сразу</b><small>Серьёзная травма, юридическая претензия, кассовая недостача, конфликт с ТЦ/УК, крупный возврат, публичный репутационный риск.</small></div></div></div></div></section>`}
function renderOperations(){const tab=state.ui.operationsTab||'today';let body=sofa3TodayView();if(tab==='control')body=sofa3ControlView();if(tab==='metrics')body=sofa3MetricsView();if(tab==='report')body=sofa3ReportView();if(tab==='week')body=sofa3WeekView();return`<div class="page readable-page operations-page">${pageHead('ОПЕРАЦИОННЫЙ ЦЕНТР','Операционный день','Уникальная логика сайта Софы 3.0 внутри общей системы — без второго списка задач, второй аналитики и второй базы.')} ${sofa3Datebar()}${sofa3Tabs()}${body}</div>`}

function sofa3SalaryCard(){const s=sofa3Salary(),mot=s.mot,canCheck=currentRole==='owner'||currentRole==='manager';return`<section class="card pad sofia-salary-card"><div class="sofia-salary-head"><div><div class="eyebrow">СОФА · МОТИВАЦИЯ УПРАВЛЯЮЩЕЙ</div><h3 style="margin:6px 0 4px">${mot.snapshot?'Зафиксированная зарплата':'Расчёт на текущий момент'}</h3><div class="sofia-salary-value">${salaryMoney(s.display)}<small>База 100 000 ₽ + KPI до 20 000 ₽ + бонус за выручку с коэффициентом выполнения плана</small></div></div>${currentRole==='owner'?`<button class="btn btn-primary" data-action="sofa3LockSalary">${mot.snapshot?'Обновить фиксацию':'Зафиксировать месяц'}</button>`:''}</div><div class="sofia-kpis">${SOFA3_KPIS.map(([key,title,text])=>`<button class="sofia-kpi ${mot.checks[key]?'done':''}" ${canCheck?'data-action="sofa3ToggleKpi" data-key="'+key+'"':'disabled'}><i>${mot.checks[key]?'✓':'○'}</i><span><b>${esc(title)}</b><small>${esc(text)} · +5 000 ₽</small></span></button>`).join('')}</div><div class="sofia-salary-breakdown"><div><span>База</span><b>${salaryMoney(SOFA3_BASE_SALARY)}</b></div><div><span>KPI</span><b>${salaryMoney(s.kpi)}</b></div><div><span>Бонус уровня</span><b>${salaryMoney(s.tier)}</b></div><div><span>Коэффициент плана</span><b>${Math.round(s.coef*100)}%</b></div></div><p class="readable-note">Факт ${compactMoney(s.fact)} / план ${compactMoney(s.plan)} · выполнение ${pct(s.planPct)}. Коэффициент бонуса: 100% плана = 100%, 95–99% = 75%, 90–94% = 50%, ниже 90% = 0%.</p></section>`}

function sofa3MeetingDraftEnsure(){let d=state.managementMeetingDraft;if(!d||!SOFA3_MEETING_TEMPLATES[d.type]){d=sofa3MeetingDraft('week');state.managementMeetingDraft=d}d.agenda=Array.isArray(d.agenda)?d.agenda:sofa3MeetingDraft(d.type).agenda;return d}
function sofa3MeetingHistory(){return(state.managementMeetings||[]).filter(x=>!x.deletedAt).sort((a,b)=>String(b.date||b.updatedAt).localeCompare(String(a.date||a.updatedAt))).slice(0,8)}
function sofa3ResolveOwner(raw){const q=String(raw||'').trim().toLowerCase();if(!q)return'sofia';const aliases={софа:'sofia',софия:'sofia',роман:'roman',стас:'stas',станислав:'stas',ваня:'ivan',иван:'ivan',аня:'anya',адель:'adel'};if(aliases[q])return aliases[q];const p=(state.people||[]).find(x=>x.id.toLowerCase()===q||String(x.name||'').toLowerCase()===q);return p?.id||'sofia'}
function sofa3ParseMeetingTasks(text,meetingId,meetingDate,type){const title=SOFA3_MEETING_TEMPLATES[type]?.title||'рабочая встреча';return String(text||'').split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{const [titleRaw,ownerRaw,dueRaw]=line.split('|').map(x=>x?.trim());const deadline=/^\d{4}-\d{2}-\d{2}$/.test(dueRaw||'')?dueRaw:sofa3AddDays(meetingDate,7);return{id:id('task'),title:titleRaw||'Задача из встречи',description:`Из встречи: ${title}`,ownerId:sofa3ResolveOwner(ownerRaw),deadline,monthKey:monthKeyFromDate(deadline),priority:'high',status:'todo',linkType:'meeting',linkId:meetingId,createdBy:managementViewerPersonId()||currentRole,createdAt:nowIso(),updatedAt:nowIso()}})}

const __renderMeetingSofa3Base=renderMeeting;
renderMeeting=function(){
  if(!isManagementBoard())return __renderMeetingSofa3Base();const d=sofa3MeetingDraftEnsure(),template=SOFA3_MEETING_TEMPLATES[d.type],history=sofa3MeetingHistory(),shared=meetingAgendaActive(),t=state.meetingTimer||{};
  return`<div class="page readable-page">${pageHead('УПРАВЛЯЮЩИЙ СОСТАВ','Собрания и решения','Шаблоны из Управления 3.0 + общая повестка УП + существующие задачи Growth OS',`<button class="btn btn-primary" data-action="addMeetingAgenda">+ Вопрос в общую повестку</button>`)}<section class="card pad"><div class="card-head"><div><h3>Формат встречи</h3><p>Выберите рабочий шаблон — повестка и длительность подставятся автоматически.</p></div></div><div class="meeting-template-grid">${Object.entries(SOFA3_MEETING_TEMPLATES).map(([key,x])=>`<button class="meeting-template-button ${d.type===key?'active':''}" data-action="sofa3MeetingTemplate" data-type="${key}"><b>${esc(x.title)}</b><small>${x.duration} минут · ${esc(x.description)}</small></button>`).join('')}</div></section><section class="card meeting-timer-card"><div class="meeting-timer-copy"><div class="eyebrow">ТАЙМЕР ВСТРЕЧИ</div><div class="meeting-timer-value" id="meetingTimerValue">${meetingTimerText()}</div><p>${t.running?'Встреча идёт':`Шаблон: ${esc(template.title)} · ${template.duration} минут`}</p></div><div class="meeting-timer-actions">${t.running?'<button class="btn btn-primary" data-action="pauseMeetingTimer">Пауза</button>':'<button class="btn btn-primary" data-action="startMeetingTimer">Старт</button>'}<button class="btn btn-ghost" data-action="resetMeetingTimer">Сбросить</button></div></section><div class="meeting-work-grid"><section class="card pad"><div class="card-head"><div><h3>${esc(template.title)}</h3><p>${esc(d.participants||template.participants)} · ${Number(d.duration)||template.duration} минут</p></div></div><form id="sofa3MeetingForm"><div class="form-grid"><div class="field"><label>Дата</label><input class="input" type="date" data-sofa-meeting-field="date" value="${esc(d.date||today())}"></div><div class="field"><label>Участники</label><input class="input" data-sofa-meeting-field="participants" value="${esc(d.participants||'')}"></div><div class="field"><label>Плановая длительность, минут</label><input class="input" type="number" min="5" data-sofa-meeting-field="duration" value="${Number(d.duration)||template.duration}"></div></div><div class="meeting-draft-agenda" style="margin-top:14px">${d.agenda.map((x,i)=>`<div class="meeting-draft-item ${x.done?'done':''}"><button type="button" data-action="sofa3ToggleMeetingDraftAgenda" data-index="${i}">${x.done?'✓':'○'}</button><div><b>${esc(x.text)}</b></div></div>`).join('')}</div><div class="field" style="margin-top:13px"><label>Заметки / факты</label><textarea class="textarea" data-sofa-meeting-field="notes">${esc(d.notes||'')}</textarea></div><div class="field" style="margin-top:10px"><label>Принятое решение</label><textarea class="textarea" data-sofa-meeting-field="decision">${esc(d.decision||'')}</textarea></div><div class="field" style="margin-top:10px"><label>Задачи из встречи</label><textarea class="textarea" data-sofa-meeting-field="tasks" placeholder="Одна строка = одна задача: Что сделать | Ответственный | 2026-09-10">${esc(d.tasks||'')}</textarea><small style="color:var(--muted)">При сохранении они попадут в уже существующий раздел «Задачи» — отдельного списка встреч не создаётся.</small></div><div class="operations-savebar"><button class="btn btn-primary" type="submit">Сохранить встречу и создать задачи</button></div></form></section><div class="stack"><section class="card pad"><div class="card-head"><div><h3>Общая повестка УП</h3><p>Вопросы между встречами</p></div><button class="btn btn-small btn-ghost" data-action="addMeetingAgenda">+ Вопрос</button></div><div class="meeting-agenda-list">${shared.length?shared.map(renderMeetingAgendaItem).join(''):'<div class="staff-empty"><b>Общая повестка пустая</b>Добавьте вопрос, который нужно разобрать руководителям.</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>История встреч</h3><p>Последние сохранённые решения</p></div></div><div class="meeting-history">${history.length?history.map(x=>`<div class="meeting-history-item"><b>${esc(x.title)} · ${formatDateShort(x.date)}</b><small>${esc(x.participants||'')} · решений: ${x.decision?'1':'0'} · задач создано ${x.tasksCreated||0}</small></div>`).join(''):'<div class="staff-empty"><b>История пока пустая</b>Сохраните первую встречу.</div>'}</div></section></div></div></div>`;
};

const __renderManagerSofa3Base=renderManager;
renderManager=function(){const base=__renderManagerSofa3Base(),s=sofa3Stats(today()),week=sofa3WeekScore(today()),salary=sofa3Salary();const alerts=sofa3Alerts(s);const extra=`<section class="card pad"><div class="card-head"><div><h3>Операционный день Софы</h3><p>Контроль дня перенесён из отдельного сайта в общую систему.</p></div><button class="btn btn-primary" data-view="operations">Открыть операционный день</button></div><div class="operations-derived"><div><span>Готовность</span><b>${s.readiness}%</b><small>${s.checkDone}/${s.checkTotal} чеков</small></div><div><span>Отклонения</span><b>${alerts.length}</b><small>требуют внимания</small></div><div><span>Неделя</span><b>${Math.round(week.score)}%</b><small>${esc(sofa3ScoreLabel(week.score,Boolean(week.w.closedAt)))}</small></div><div><span>Мотивация</span><b>${salaryMoney(salary.display)}</b><small>KPI ${salary.kpiCount}/4</small></div></div></section>`;return appendBeforePageClose(base,extra)};
const __renderPayrollSofa3Base=renderPayroll;
renderPayroll=function(){const base=__renderPayrollSofa3Base();return appendBeforePageClose(base,sofa3SalaryCard())};
const __renderArchiveSofa3Base=renderArchive;
renderArchive=function(){const base=__renderArchiveSofa3Base(),days=Object.values(state.operationsDays||{}).filter(x=>x&&!x.deletedAt).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,36),weeks=Object.values(state.managementPlans?.weeks||{}).filter(x=>x?.closedAt&&x.snapshot).sort((a,b)=>String(b.key).localeCompare(String(a.key))).slice(0,18);const extra=`<section class="card pad"><div class="card-head"><div><h3>Операционные дни</h3><p>Ежедневная история Софы: готовность, выручка и статус отчёта.</p></div><button class="btn btn-small btn-ghost" data-view="operations">Операционный день</button></div>${days.length?`<div class="daily-archive-grid">${days.map(d=>{const s=sofa3Stats(d.date),sent=Boolean(d.report?.sentAt);return`<button class="daily-archive-card" data-action="sofa3OpenDay" data-date="${esc(d.date)}"><span>${sent?'ОТЧЁТ ЗАКРЫТ':'ЧЕРНОВИК'}</span><b>${esc(sofa3PrettyDate(d.date))}</b><small>${sent?'Итог дня зафиксирован':'День можно продолжить заполнять'}</small><div class="daily-archive-meta"><div><span>Выручка</span><b>${compactMoney(s.metrics.revenue)}</b></div><div><span>Готовность</span><b>${s.readiness}%</b></div><div><span>Чистота</span><b>${pct(s.metrics.cleanliness||0)}</b></div></div></button>`}).join('')}</div>`:'<div class="empty"><b>Операционных дней пока нет</b>История появится после заполнения первого дня.</div>'}</section><section class="card pad"><div class="card-head"><div><h3>Закрытые недели управляющей</h3><p>Снимки результата недели не меняются задним числом.</p></div></div>${weeks.length?`<div class="daily-archive-grid">${weeks.map(w=>`<article class="daily-archive-card"><span>${esc(w.snapshot.status||'ЗАКРЫТО')}</span><b>${esc(w.key)}</b><small>${compactMoney(w.snapshot.revenue||0)} / ${compactMoney(w.snapshot.target||0)}</small><div class="daily-archive-meta"><div><span>Итог</span><b>${Math.round(w.snapshot.score||0)}%</b></div><div><span>Результаты</span><b>${Math.round(w.snapshot.resultsScore||0)}%</b></div><div><span>Задачи</span><b>${w.snapshot.tasksDone||0}/${w.snapshot.tasksTotal||0}</b></div></div></article>`).join('')}</div>`:'<div class="empty"><b>Закрытых недель пока нет</b>Закройте неделю в «Операционном дне».</div>'}</section>`;return appendBeforePageClose(base,extra)};

const __renderCurrentViewSofa3Base=renderCurrentView;
renderCurrentView=function(){if(currentView==='operations'){if(!allowedView('operations'))currentView=roleInfo().start;else{$('#pageTitle').textContent='Операционный день';$('#pages').innerHTML=renderOperations();renderNav();animateNumbers();return}}return __renderCurrentViewSofa3Base()};

function sofa3SaveReportForm(form){const d=sofa3EnsureDay();for(const key of ['parents','team','incidents','risks','solved','owner','unpaidNext','tomorrowComment'])d.notes[key]=form.elements[key]?.value||'';d.report.tomorrow=[0,1,2].map(i=>form.elements[`tomorrow${i}`]?.value||'');d.updatedAt=nowIso()}
const __handleSubmitSofa3Base=handleSubmit;
handleSubmit=function(e){const f=e.target;if(!(f instanceof HTMLFormElement))return __handleSubmitSofa3Base(e);const d=sofa3EnsureDay(),stamp=nowIso();
  if(f.id==='sofa3PrioritiesForm'){e.preventDefault();d.priorities=[0,1,2].map(i=>f.elements[`p${i}`]?.value||'');d.updatedAt=stamp;touch('Обновлены три результата операционного дня');return}
  if(f.id==='sofa3MetricsForm'){e.preventDefault();for(const [,items] of SOFA3_MANUAL_METRICS)for(const [key] of items)d.metrics[key]=num(f.elements[key]?.value);d.updatedAt=stamp;touch('Обновлены операционные цифры дня');return}
  if(f.id==='sofa3ReportForm'){e.preventDefault();sofa3SaveReportForm(f);touch('Сохранён черновик ежедневного отчёта');return}
  if(f.id==='sofa3WeekForm'){e.preventDefault();const w=sofa3EnsureWeek();w.revenueTarget=num(f.elements.revenueTarget?.value);w.results=[0,1,2].map(i=>f.elements[`result${i}`]?.value||'');for(const key of ['risk','team','parents','improvement','decision'])w[key]=f.elements[key]?.value||'';w.updatedAt=stamp;touch('Обновлён план и результат недели Софы');return}
  if(f.id==='sofa3MeetingForm'){e.preventDefault();if(!isManagementBoard())return;const draft=sofa3MeetingDraftEnsure(),meetingId=id('meet'),template=SOFA3_MEETING_TEMPLATES[draft.type],tasks=sofa3ParseMeetingTasks(draft.tasks,meetingId,draft.date||today(),draft.type),meeting={id:meetingId,type:draft.type,title:template.title,date:draft.date||today(),participants:draft.participants,duration:Number(draft.duration)||template.duration,agenda:draft.agenda.map(x=>({...x})),notes:draft.notes,decision:draft.decision,tasks:tasks.map(x=>x.title),tasksCreated:tasks.length,createdBy:managementActorName(),createdAt:stamp,updatedAt:stamp};state.managementMeetings.push(meeting);state.tasks.push(...tasks);state.managementMeetingDraft=sofa3MeetingDraft(draft.type);touch(`Сохранена встреча «${template.title}»${tasks.length?` · создано задач ${tasks.length}`:''}`);return}
  return __handleSubmitSofa3Base(e)
};

const __handleClickSofa3Base=handleClick;
handleClick=function(e){const el=e.target.closest('[data-action]');if(el){const a=el.dataset.action;
  if(a==='sofa3OpsTab'){state.ui.operationsTab=el.dataset.tab||'today';persistLocal();renderCurrentView();return}
  if(a==='sofa3PrevDay'){state.ui.operationsDate=sofa3AddDays(sofa3SelectedDate(),-1);persistLocal();renderCurrentView();return}
  if(a==='sofa3NextDay'){state.ui.operationsDate=sofa3AddDays(sofa3SelectedDate(),1);persistLocal();renderCurrentView();return}
  if(a==='sofa3Today'){state.ui.operationsDate=today();persistLocal();renderCurrentView();return}
  if(a==='sofa3ToggleCheck'){const d=sofa3EnsureDay();d.checks[el.dataset.key]=!d.checks[el.dataset.key];d.updatedAt=nowIso();touch(`Контроль дня: ${el.dataset.key}`);return}
  if(a==='sofa3ToggleRhythm'){const d=sofa3EnsureDay(),i=Number(el.dataset.index);d.rhythm[i]=!d.rhythm[i];d.updatedAt=nowIso();touch(`Ритм дня: ${SOFA3_RHYTHM[i]?.[1]||i}`);return}
  if(a==='sofa3CopyReport'){copyText(sofa3ReportText(),'Ежедневный отчёт скопирован');return}
  if(a==='sofa3MarkReport'){const form=$('#sofa3ReportForm');if(form)sofa3SaveReportForm(form);const d=sofa3EnsureDay(),s=sofa3Stats();d.checks.close_report=true;d.rhythm[SOFA3_RHYTHM.length-1]=true;d.report.sentAt=nowIso();d.report.snapshot={...s.metrics,readiness:sofa3Stats().readiness,createdAt:nowIso()};d.updatedAt=nowIso();touch('Ежедневный отчёт Роману зафиксирован');return}
  if(a==='sofa3CycleWeekResult'){const w=sofa3EnsureWeek(),i=Number(el.dataset.index),v=Number(w.resultStatus?.[i])||0;w.resultStatus=w.resultStatus||[0,0,0];w.resultStatus[i]=v>=1?0:v>=.5?1:.5;w.updatedAt=nowIso();touch('Обновлён результат недели');return}
  if(a==='sofa3CloseWeek'){const form=$('#sofa3WeekForm');if(form){const w=sofa3EnsureWeek();w.revenueTarget=num(form.elements.revenueTarget?.value);w.results=[0,1,2].map(i=>form.elements[`result${i}`]?.value||'');for(const key of ['risk','team','parents','improvement','decision'])w[key]=form.elements[key]?.value||''}const x=sofa3WeekScore(),done=x.tasks.filter(t=>statusDone(t.status)).length;x.w.closedAt=nowIso();x.w.snapshot={key:x.w.key,status:sofa3ScoreLabel(x.score,true),score:Math.round(x.score),revenue:x.revenue,target:x.target,resultsScore:x.components.find(c=>c.key==='results')?.score||0,tasksDone:done,tasksTotal:x.tasks.length,risk:x.w.risk,decision:x.w.decision,closedAt:x.w.closedAt};x.w.updatedAt=nowIso();touch(`Закрыта управленческая неделя ${x.w.key}`);return}
  if(a==='sofa3ToggleKpi'){if(!['owner','manager'].includes(currentRole))return;const mot=sofa3EnsureMotivation();mot.checks[el.dataset.key]=!mot.checks[el.dataset.key];mot.updatedAt=nowIso();touch(`KPI Софы: ${el.dataset.key}`);return}
  if(a==='sofa3LockSalary'){if(currentRole!=='owner')return;const s=sofa3Salary(),mot=s.mot;mot.closedAt=nowIso();mot.snapshot={amount:Math.round(s.total),base:SOFA3_BASE_SALARY,kpi:s.kpi,tier:s.tier,coef:s.coef,fact:s.fact,plan:s.plan,planPct:s.planPct,closedAt:mot.closedAt};mot.updatedAt=nowIso();touch('Зарплата Софы за месяц зафиксирована Романом');return}
  if(a==='sofa3MeetingTemplate'){if(!isManagementBoard())return;state.managementMeetingDraft=sofa3MeetingDraft(el.dataset.type);state.managementMeetingDraft.updatedAt=nowIso();touch(`Выбран шаблон встречи: ${SOFA3_MEETING_TEMPLATES[el.dataset.type]?.title||el.dataset.type}`);return}
  if(a==='sofa3ToggleMeetingDraftAgenda'){if(!isManagementBoard())return;const d=sofa3MeetingDraftEnsure(),i=Number(el.dataset.index);if(d.agenda[i]){d.agenda[i].done=!d.agenda[i].done;d.updatedAt=nowIso();persistLocal();renderCurrentView()}return}
  if(a==='sofa3OpenDay'){state.ui.operationsDate=el.dataset.date;state.ui.operationsTab='report';persistLocal();setView('operations');return}
 }return __handleClickSofa3Base(e)};

const __handleChangeSofa3Base=handleChange;
handleChange=function(e){const el=e.target;if(el.dataset.filter==='sofa3OpsDate'){state.ui.operationsDate=sofa3Date(el.value);persistLocal();renderCurrentView();return}if(el.dataset.sofaMeetingField){const d=sofa3MeetingDraftEnsure(),key=el.dataset.sofaMeetingField;d[key]=key==='duration'?num(el.value):el.value;d.updatedAt=nowIso();persistLocal();return}return __handleChangeSofa3Base(e)};
const __handleInputSofa3Base=handleInput;
handleInput=function(e){const el=e.target;if(el.dataset.sofaMeetingField){const d=sofa3MeetingDraftEnsure(),key=el.dataset.sofaMeetingField;d[key]=key==='duration'?num(el.value):el.value;d.updatedAt=nowIso();clearTimeout(el.__sofaSave);el.__sofaSave=setTimeout(persistLocal,250);return}return __handleInputSofa3Base(e)};

const __bootSofa3Base=boot;
boot=async function(){const result=await __bootSofa3Base();if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,sofa3MergeBuild:SOFA3_MERGE_BUILD,operationsDay:date=>sofa3Stats(date||today()),sofiaSalary:key=>sofa3Salary(key||state.settings.currentMonth),managementWeek:date=>sofa3WeekScore(date||today())};return result};
// SOFA3_UNIQUE_MERGE_V1_END

// SOFA3_UNIQUE_DETAILS_V1_START
const __sofa3EnsureStateDetailsBase=sofa3EnsureState;
sofa3EnsureState=function(s){
  s=__sofa3EnsureStateDetailsBase(s);if(!s)return s;
  if(Array.isArray(s.staffDocuments)&&!s.staffDocuments.some(x=>x.id==='sofa3-service-standards')){
    s.staffDocuments.push({id:'sofa3-service-standards',personId:'sofia',title:'Стандарты сервиса управляющей',type:'Регламент',description:'Ответ клиенту — до 10 минут в рабочее время. Пробную подтвердить за день и за 2 часа. После пробной — обратная связь и предложение в тот же день. Жалобу быстро признать и довести решение до 24 часов. Обратная связь родителю о прогрессе ребёнка — не реже одного раза в 4 занятия.',seeded:true,createdBy:'system',createdAt:'2026-09-03T00:00:00.000Z',updatedAt:'2026-09-03T00:00:00.000Z'});
  }
  return s;
};

const __sofa3WeekViewDetailsBase=sofa3WeekView;
sofa3WeekView=function(){
  const selected=sofa3SelectedDate(),todayStart=sofa3WeekStart(today()),todayEnd=sofa3WeekEnd(today()),todayKey=sofa3IsoWeekKey(today());
  let html=__sofa3WeekViewDetailsBase();
  if(selected!==today())html=html.replace(todayStart,sofa3WeekStart(selected)).replace(todayEnd,sofa3WeekEnd(selected)).replace(todayKey,sofa3IsoWeekKey(selected));
  return html;
};

function sofa3MeetingProtocolModal(meetingId){
  const m=(state.managementMeetings||[]).find(x=>x.id===meetingId&&!x.deletedAt);if(!m)return;
  const agenda=Array.isArray(m.agenda)?m.agenda:[];
  openModal({title:m.title||'Протокол встречи',kicker:'ПРОТОКОЛ УП',subtitle:`${formatDate(m.date)} · ${m.participants||'Участники не указаны'} · ${m.duration||0} минут`,body:`<div class="stack"><section class="card pad"><div class="card-head"><div><h3>Повестка</h3><p>Что было разобрано на встрече</p></div></div><div class="meeting-draft-agenda">${agenda.length?agenda.map(x=>`<div class="meeting-draft-item ${x.done?'done':''}"><button type="button" disabled>${x.done?'✓':'○'}</button><div><b>${esc(x.text||'')}</b></div></div>`).join(''):'<div class="empty">Повестка не сохранена</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Заметки</h3></div></div><p class="readable-note" style="white-space:pre-wrap">${esc(m.notes||'Заметок нет')}</p></section><section class="card pad"><div class="card-head"><div><h3>Принятое решение</h3></div></div><p class="readable-note" style="white-space:pre-wrap">${esc(m.decision||'Решение не зафиксировано')}</p></section><section class="card pad"><div class="card-head"><div><h3>Задачи из встречи</h3><p>Они уже находятся в общем разделе «Задачи»</p></div></div><div class="compact-list">${(m.tasks||[]).length?(m.tasks||[]).map(x=>`<div class="compact-item"><i class="item-dot"></i><div class="item-main"><b>${esc(x)}</b></div></div>`).join(''):'<div class="empty">Задач из этой встречи не создавалось</div>'}</div></section></div>`});
}

const __renderMeetingSofa3DetailsBase=renderMeeting;
renderMeeting=function(){
  let html=__renderMeetingSofa3DetailsBase();if(!isManagementBoard())return html;
  const history=sofa3MeetingHistory();
  const section=`<section class="card pad"><div class="card-head"><div><h3>История встреч</h3><p>Сохранённые протоколы, решения и созданные задачи</p></div></div><div class="meeting-history">${history.length?history.map(x=>`<button class="meeting-history-item" data-action="sofa3OpenMeeting" data-id="${esc(x.id)}" style="width:100%;text-align:left;color:inherit"><b>${esc(x.title)} · ${formatDateShort(x.date)}</b><small>${esc(x.participants||'')} · задач создано ${x.tasksCreated||0} · открыть протокол</small></button>`).join(''):'<div class="staff-empty"><b>История пока пустая</b>Сохраните первую встречу.</div>'}</div></section>`;
  return html.replace(/<section class="card pad"><div class="card-head"><div><h3>История встреч<\/h3>[\s\S]*?<\/section>/,section);
};

const __handleClickSofa3DetailsBase=handleClick;
handleClick=function(e){const el=e.target.closest('[data-action]');if(el?.dataset.action==='sofa3OpenMeeting'){sofa3MeetingProtocolModal(el.dataset.id);return}return __handleClickSofa3DetailsBase(e)};
// SOFA3_UNIQUE_DETAILS_V1_END

// SOFA65_FINISH_V2_START
const SOFA65_FINISH_BUILD='2026.09.03-sofa-cabinet-finish-v2';

(function sofa65PrepareNavigation(){
  if(SOFA3_CHECK_GROUPS['Закрытие дня'])SOFA3_CHECK_GROUPS['Закрытие дня']=SOFA3_CHECK_GROUPS['Закрытие дня'].filter(([key])=>key!=='close_report');
  const reportRhythmIndex=SOFA3_RHYTHM.findIndex(([,title])=>title==='Отчёт Роману');
  if(reportRhythmIndex>=0)SOFA3_RHYTHM.splice(reportRhythmIndex,1);
  const closeIndex=SOFA3_RHYTHM.findIndex(([,title])=>title==='Закрытие системы');
  if(closeIndex>=0)SOFA3_RHYTHM[closeIndex]=['21:15','Закрытие системы','Касса, CRM, задачи и инциденты актуальны. Всё важное зафиксировано в общей системе.'];

  const moveIds=new Set(['manager','operations','meeting','sofa_numbers','sofa_motivation','sofa_system']);
  for(const section of NAV)section.items=section.items.filter(x=>!moveIds.has(x.id));
  const oldSection=NAV.findIndex(s=>s.section==='Софа · управляющая');
  if(oldSection>=0)NAV.splice(oldSection,1);
  const cabinetIndex=NAV.findIndex(s=>s.section==='Кабинеты');
  const insertAt=cabinetIndex>=0?cabinetIndex:Math.min(2,NAV.length);
  NAV.splice(insertAt,0,{section:'Софа · управляющая',items:[
    {id:'manager',label:'Главная Софы',icon:'admin',roles:['owner','manager']},
    {id:'operations',label:'Контроль дня',icon:'tasks',roles:['owner','manager']},
    {id:'sofa_numbers',label:'Цифры клуба',icon:'analytics',roles:['owner','manager']},
    {id:'meeting',label:'Собрания',icon:'team',roles:['owner','manager']},
    {id:'sofa_motivation',label:'Мотивация Софы',icon:'revenue',roles:['owner','manager']},
    {id:'sofa_system',label:'Система управляющей',icon:'goals',roles:['owner','manager']}
  ]});
})();

function sofa65RecomputeStats(dateValue=sofa3SelectedDate()){
  const s=sofa3Stats(dateValue),day=s.day;
  const activeCheckKeys=Object.values(SOFA3_CHECK_GROUPS).flat().map(([key])=>key);
  const checkDone=activeCheckKeys.filter(key=>Boolean(day.checks?.[key])).length;
  const rhythmDone=SOFA3_RHYTHM.filter((_,i)=>Boolean(day.rhythm?.[i])).length;
  const readiness=Math.round(((activeCheckKeys.length?checkDone/activeCheckKeys.length:0)*.72+(SOFA3_RHYTHM.length?rhythmDone/SOFA3_RHYTHM.length:0)*.28)*100);
  return{...s,readiness,checkDone,checkTotal:activeCheckKeys.length,rhythmDone,rhythmTotal:SOFA3_RHYTHM.length};
}

function sofa65NumbersDatebar(){
  const d=sofa3SelectedDate();
  return`<div class="operations-datebar"><div class="operations-date-nav"><button class="icon-btn" data-action="sofa3PrevDay">‹</button><div class="operations-date-copy"><span>Рабочая дата</span><b>${esc(sofa3PrettyDate(d))}</b></div><button class="icon-btn" data-action="sofa3NextDay">›</button></div><div class="operations-date-actions"><input class="input" type="date" data-filter="sofa3OpsDate" value="${d}" style="width:auto"><button class="btn btn-ghost" data-action="sofa3Today">Сегодня</button></div></div>`;
}

function sofa65RevenueChart(month){
  const grouped={};
  for(const x of (month.daily||[])){
    if(x.deletedAt||!x.date)continue;
    grouped[x.date]=(grouped[x.date]||0)+(Number(x.amount)||0);
  }
  const rows=Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0]));
  if(rows.length<2)return`<div class="empty"><b>График появится автоматически</b>Нужно минимум два дня с фактической выручкой.</div>`;
  let running=0;
  const points=rows.map(([date,amount])=>({date,amount,cumulative:(running+=amount)}));
  const w=760,h=220,padX=24,padY=22,max=Math.max(Number(month.target)||0,...points.map(x=>x.cumulative),1);
  const xAt=i=>padX+i*(w-padX*2)/Math.max(1,points.length-1);
  const yAt=v=>h-padY-(v/max)*(h-padY*2);
  const line=points.map((p,i)=>`${i?'L':'M'}${xAt(i).toFixed(1)},${yAt(p.cumulative).toFixed(1)}`).join(' ');
  const area=`${line} L${xAt(points.length-1).toFixed(1)},${h-padY} L${xAt(0).toFixed(1)},${h-padY} Z`;
  const targetY=yAt(Number(month.target)||0).toFixed(1);
  return`<div class="sofa65-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sofa65Area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0c72f" stop-opacity=".3"/><stop offset="1" stop-color="#f0c72f" stop-opacity="0"/></linearGradient></defs><line class="sofa65-gridline" x1="${padX}" y1="${h/2}" x2="${w-padX}" y2="${h/2}"/><line class="sofa65-target" x1="${padX}" y1="${targetY}" x2="${w-padX}" y2="${targetY}"/><path class="sofa65-area" d="${area}"/><path class="sofa65-line" d="${line}"/>${points.map((p,i)=>`<circle class="sofa65-point" cx="${xAt(i)}" cy="${yAt(p.cumulative)}" r="4"/>`).join('')}</svg><div class="sofa65-chart-labels"><span>${formatDateShort(points[0].date)}</span><span>План ${compactMoney(month.target||0)}</span><span>${formatDateShort(points.at(-1).date)}</span></div></div>`;
}

function sofa65NumbersPage(){
  const s=sofa65RecomputeStats(),m=s.metrics;
  const fields=[
    ['unanswered','Лиды без ответа','шт.'],
    ['attended','Пробных пришло','шт.'],
    ['sold','После пробной купило','шт.'],
    ['renewDue','Продлений в работе','шт.'],
    ['renewDone','Продлено','шт.'],
    ['expected','Ожидаемые оплаты','₽'],
    ['unpaidClients','Клиентов без оплаты','шт.'],
    ['unpaidAmount','Сумма неоплат','₽']
  ];
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · УПРАВЛЯЮЩАЯ','Цифры клуба','Только показатели, по которым управляющая реально принимает решение сегодня. Выручка, продажи администраторов и загрузка не вводятся второй раз.')} ${sofa65NumbersDatebar()}
  <div class="grid-3 sofa65-kpi-grid">
    ${metricCard('План месяца',compactMoney(s.plan),`${pct(s.progress)} выполнено`,'revenue',s.progress)}
    ${metricCard('Факт месяца',compactMoney(s.fact),`прогноз ${compactMoney(s.forecast)}`,'analytics')}
    ${metricCard('До плана',compactMoney(s.remaining),`нужно ${compactMoney(s.need)} в день`,'revenue')}
    ${metricCard('Загрузка групп',pct(m.occupancy),`цель ${pct(s.m.loadTarget||80)}`,'users',m.occupancy)}
    ${metricCard('Пробная → покупка',pct(s.conversion),`${Number(m.sold)||0} из ${Number(m.attended)||0}`,'users',s.conversion)}
    ${metricCard('Продления',pct(s.renew),`${Number(m.renewDone)||0} из ${Number(m.renewDue)||0}`,'tasks',s.renew)}
  </div>
  <div class="grid-main">
    <section class="card pad"><div class="card-head"><div><h3>Выручка накопительно</h3><p>${esc(s.m.label||monthLabel(s.m.key))} · факт берётся из общей базы Growth OS</p></div><span class="pill">Прогноз ${compactMoney(s.forecast)}</span></div>${sofa65RevenueChart(s.m)}</section>
    <section class="card pad"><div class="card-head"><div><h3>Что требует действия</h3><p>Не статистика ради статистики, а отклонения с понятным следующим шагом</p></div></div><div class="signal-list">
      <div class="signal-item"><i class="item-dot ${Number(m.unanswered)?'red':''}"></i><div class="item-main"><b>${Number(m.unanswered)||0} лид(а) без ответа</b><small>${Number(m.unanswered)?'Закрыть до конца текущего рабочего блока.':'Потерянных лидов по внесённым данным нет.'}</small></div></div>
      <div class="signal-item"><i class="item-dot ${s.conversion<50&&Number(m.attended)?'red':''}"></i><div class="item-main"><b>Конверсия пробной ${pct(s.conversion)}</b><small>${Number(m.attended)?`${Number(m.sold)||0} покупок из ${Number(m.attended)||0} визитов.`:'Сегодня ещё нет данных по проведённым пробным.'}</small></div></div>
      <div class="signal-item"><i class="item-dot ${Number(m.renewDue)>Number(m.renewDone)?'red':''}"></i><div class="item-main"><b>Продления ${Number(m.renewDone)||0}/${Number(m.renewDue)||0}</b><small>${Number(m.renewDue)>Number(m.renewDone)?'Есть клиенты, по которым нужен следующий контакт.':'Открытых продлений по внесённым данным нет.'}</small></div></div>
      <div class="signal-item"><i class="item-dot ${Number(m.unpaidClients)?'red':''}"></i><div class="item-main"><b>Неоплаты ${Number(m.unpaidClients)||0} · ${compactMoney(m.unpaidAmount||0)}</b><small>Ожидаемые оплаты: ${compactMoney(m.expected||0)}.</small></div></div>
    </div></section>
  </div>
  <section class="card pad"><div class="card-head"><div><h3>Операционные цифры за ${formatDateShort(s.date)}</h3><p>Софа вносит только то, чего пока нет в общей CRM/базе. Остальные данные подтягиваются автоматически.</p></div><span class="pill muted">8 полей</span></div><form id="sofa65NumbersForm"><div class="sofa65-input-grid">${fields.map(([key,label,unit])=>`<label class="field"><span>${esc(label)}</span><div class="sofa65-input-unit"><input class="input" type="number" min="0" inputmode="decimal" name="${key}" value="${Number(m[key])||0}"><small>${esc(unit)}</small></div></label>`).join('')}</div><div class="operations-savebar"><button class="btn btn-primary" type="submit">Сохранить цифры</button></div></form></section>
  </div>`;
}

function sofa65MotivationPage(){
  const s=sofa3Salary(),mot=s.mot,owner=currentRole==='owner';
  const tiers=SOFA3_TIERS.filter(([threshold])=>threshold>0).slice().sort((a,b)=>a[0]-b[0]);
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · ЛИЧНАЯ МОТИВАЦИЯ','Мотивация Софы','Софа видит расчёт и понимает, что влияет на доход. Оценку KPI подтверждает Роман — сотрудник не оценивает себя сам.',owner?`<button class="btn btn-primary" data-action="sofa3LockSalary">${mot.snapshot?'Обновить фиксацию':'Зафиксировать месяц'}</button>`:'')}
  <section class="card hero"><div class="hero-top"><div><div class="eyebrow">${esc(s.m.label||monthLabel(s.key))}</div><h3 class="hero-title">${mot.snapshot?'Зафиксированная зарплата':'Расчёт на текущий момент'}</h3><div class="hero-value">${salaryMoney(s.display)}</div><div class="hero-sub">Факт ${compactMoney(s.fact)} / план ${compactMoney(s.plan)} · выполнение ${pct(s.planPct)}</div></div><div class="hero-value" style="font-size:34px">${Math.round(s.coef*100)}%</div></div><div class="hero-progress"><i style="width:${clamp(s.planPct,0,100)}%"></i></div></section>
  <div class="grid-4">${metricCard('База',salaryMoney(SOFA3_BASE_SALARY),'фиксированная часть','revenue')}${metricCard('KPI',salaryMoney(s.kpi),`${s.kpiCount}/4 подтверждено`,'tasks',s.kpiCount/4*100)}${metricCard('Бонус уровня',salaryMoney(s.tier),`по факту ${compactMoney(s.fact)}`,'analytics')}${metricCard('Бонус к выплате',salaryMoney(s.variable),`коэффициент плана ${Math.round(s.coef*100)}%`,'revenue')}</div>
  <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>KPI управляющей</h3><p>Каждый выполненный блок = +5 000 ₽. Подтверждает только Роман.</p></div><span class="pill">${s.kpiCount}/4</span></div><div class="sofia-kpis">${SOFA3_KPIS.map(([key,title,text])=>`<button class="sofia-kpi ${mot.checks[key]?'done':''}" ${owner?`data-action="sofa3ToggleKpi" data-key="${key}"`:'disabled'}><i>${mot.checks[key]?'✓':'○'}</i><span><b>${esc(title)}</b><small>${esc(text)} · +5 000 ₽</small></span></button>`).join('')}</div>${!owner?'<p class="readable-note">Статусы KPI доступны Софе только для просмотра. Изменить их может Роман в своём режиме.</p>':''}</section>
  <section class="card pad"><div class="card-head"><div><h3>Шкала бонуса за выручку</h3><p>Уровень определяется фактической выручкой клуба</p></div></div><div class="bonus-tiers">${tiers.map(([threshold,bonus])=>`<div class="bonus-tier ${s.fact>=threshold?'active':''}"><span>от ${compactMoney(threshold)}</span><b>${salaryMoney(bonus)}</b></div>`).join('')}</div><p class="readable-note">Коэффициент: 100% плана = 100% бонуса; 95–99% = 75%; 90–94% = 50%; ниже 90% = 0%.</p></section></div>
  </div>`;
}

function sofa65SystemPage(){
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · СИСТЕМА УПРАВЛЯЮЩЕЙ','Как управлять клубом','Короткий рабочий регламент из отдельного кабинета Софы — теперь внутри общей Growth OS 6.5.')}
  <section class="guide-columns"><div class="guide-card"><span class="guide-number">1</span><h3>Не делать всё самой</h3><ul><li>Поставить задачу.</li><li>Назначить ответственного.</li><li>Дать ресурс и срок.</li><li>Проверить результат.</li><li>Разобрать повторную ошибку.</li></ul></div><div class="guide-card"><span class="guide-number">2</span><h3>Знать только нужные цифры</h3><ul><li>План, факт и прогноз месяца.</li><li>Пробная → покупка.</li><li>Продления.</li><li>Ожидаемые и зависшие оплаты.</li><li>Загрузка групп.</li></ul></div><div class="guide-card"><span class="guide-number">3</span><h3>Быть в клубе</h3><ul><li>Общаться с родителями.</li><li>Видеть тренировки.</li><li>Слышать администраторов.</li><li>Ловить проблему до жалобы.</li><li>Улучшать один процесс в неделю.</li></ul></div></section>
  <div class="grid-2" style="margin-top:14px"><section class="card pad"><div class="card-head"><div><h3>Порядок приоритетов</h3><p>Что делать первым, если одновременно происходит всё</p></div></div><div class="decision-table"><div class="decision-row"><b>1. Безопасность</b><span>Травма, ребёнок без присмотра, неисправность или угроза — немедленно.</span></div><div class="decision-row"><b>2. Родители</b><span>Жалоба, конфликт, возврат или риск ухода — признать обращение и довести до решения.</span></div><div class="decision-row"><b>3. Деньги сегодня</b><span>Лиды без ответа, пробные, продления, неоплаты и обещанные платежи.</span></div><div class="decision-row"><b>4. Команда</b><span>Смены, задачи, замены, просрочки и дисциплина.</span></div><div class="decision-row"><b>5. Улучшение</b><span>Когда срочное закрыто — улучшить один процесс.</span></div></div></section><section class="card pad"><div class="card-head"><div><h3>Полномочия</h3><p>Когда Софа решает сама, а когда подключает Романа</p></div></div><div class="decision-table"><div class="decision-row"><b>Софа решает сама</b><span>Ежедневные задачи, CRM, стандартные вопросы родителей, пробные и продления, чистота, обучение и организация смен.</span></div><div class="decision-row"><b>Согласовать с Романом</b><span>Новые цены, нестандартная скидка, значимая компенсация, зарплата, найм/увольнение, новый постоянный расход.</span></div><div class="decision-row"><b>Подключить сразу</b><span>Серьёзная травма, юридическая претензия, кассовая недостача, конфликт с ТЦ/УК, крупный возврат, публичный репутационный риск.</span></div></div></section></div>
  <section class="card pad" style="margin-top:14px"><div class="card-head"><div><h3>Стандарты сервиса</h3><p>Пять норм, которые Софа контролирует у всей команды</p></div></div><section class="contours"><div class="contour"><i>10</i><b>Ответ</b><p>До 10 минут в рабочее время.</p></div><div class="contour"><i>2ч</i><b>Пробная</b><p>Подтверждение за день и за 2 часа.</p></div><div class="contour"><i>↗</i><b>После пробной</b><p>Обратная связь и предложение в тот же день.</p></div><div class="contour"><i>24</i><b>Жалоба</b><p>Признать быстро, решение — до 24 часов.</p></div><div class="contour"><i>4</i><b>Прогресс</b><p>Обратная связь не реже одного раза в 4 занятия.</p></div></section></section>
  </div>`;
}

function sofa65ManagerHome(){
  const s=sofa65RecomputeStats(today()),salary=sofa3Salary(),week=sofa3WeekScore(today());
  const myTasks=activeTasks().filter(t=>t.ownerId==='sofia'&&!statusDone(t.status)).sort(sortByDate);
  const overdue=myTasks.filter(isOverdue).length,alerts=[];
  if(Number(s.metrics.unanswered))alerts.push(`${Number(s.metrics.unanswered)} лид(а) без ответа`);
  if(Number(s.metrics.unpaidClients))alerts.push(`${Number(s.metrics.unpaidClients)} неоплаченных клиент(а) · ${compactMoney(s.metrics.unpaidAmount||0)}`);
  if(overdue)alerts.push(`${overdue} просроченных задач Софы`);
  if(s.metrics.occupancy<75)alerts.push(`Загрузка групп ${pct(s.metrics.occupancy)} — есть свободные места`);
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · УПРАВЛЯЮЩАЯ','Главная Софы','Один кабинет внутри Growth OS 6.5: цифры, контроль, собрания, мотивация и правила управления — без второго сайта и без ежедневного отчёта.')}
  <section class="card hero"><div class="hero-top"><div><div class="eyebrow">${esc(s.m.label||monthLabel(s.m.key))}</div><h3 class="hero-title">Факт ${compactMoney(s.fact)} <span style="color:var(--muted)">из ${compactMoney(s.plan)}</span></h3><div class="hero-sub">Прогноз ${compactMoney(s.forecast)} · до плана ${compactMoney(s.remaining)} · нужно ${compactMoney(s.need)} в день</div></div><div class="hero-value" style="font-size:38px">${pct(s.progress)}</div></div><div class="hero-progress"><i style="width:${clamp(s.progress,0,100)}%"></i></div></section>
  <div class="sofa65-quick-links"><button class="quick-card" data-view="sofa_numbers"><span class="quick-icon">${ICONS.analytics}</span><span><b>Цифры клуба</b><small>План, прогноз, воронка, продления, оплаты</small></span></button><button class="quick-card" data-view="operations"><span class="quick-icon">${ICONS.tasks}</span><span><b>Контроль дня</b><small>Чек-лист, ритм и три результата</small></span></button><button class="quick-card" data-view="meeting"><span class="quick-icon">${ICONS.team}</span><span><b>Собрания</b><small>Повестка, решения и задачи</small></span></button><button class="quick-card" data-view="sofa_motivation"><span class="quick-icon">${ICONS.revenue}</span><span><b>Моя мотивация</b><small>${salaryMoney(salary.display)} · KPI ${salary.kpiCount}/4</small></span></button><button class="quick-card" data-view="sofa_system"><span class="quick-icon">${ICONS.goals}</span><span><b>Система управляющей</b><small>Приоритеты, полномочия и стандарты</small></span></button><button class="quick-card" data-view="tasks"><span class="quick-icon">${ICONS.tasks}</span><span><b>Задачи</b><small>${myTasks.length} в работе · ${overdue} просрочено</small></span></button></div>
  <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Что требует внимания</h3><p>Только реальные отклонения, без длинного ежедневного отчёта</p></div><button class="btn btn-small btn-ghost" data-view="sofa_numbers">Открыть цифры</button></div><div class="signal-list">${alerts.length?alerts.slice(0,5).map(text=>`<div class="signal-item"><i class="item-dot red"></i><div class="item-main"><b>${esc(text)}</b><small>Открой соответствующий раздел и зафиксируй следующий шаг.</small></div></div>`).join(''):'<div class="empty"><b>Критических отклонений не зафиксировано</b>Фокус — продажи, качество и улучшение одного процесса.</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Неделя и мотивация</h3><p>Два показателя личной управленческой ответственности</p></div></div><div class="operations-derived"><div><span>Неделя</span><b>${Math.round(week.score)}%</b><small>${esc(sofa3ScoreLabel(week.score,Boolean(week.w.closedAt)))}</small></div><div><span>Мотивация</span><b>${salaryMoney(salary.display)}</b><small>KPI ${salary.kpiCount}/4</small></div><div><span>Загрузка</span><b>${pct(s.metrics.occupancy)}</b><small>цель ${pct(s.m.loadTarget||80)}</small></div><div><span>Пробная → покупка</span><b>${pct(s.conversion)}</b><small>${Number(s.metrics.sold)||0}/${Number(s.metrics.attended)||0}</small></div></div></section></div>
  </div>`;
}

sofa3Tabs=function(){const active=state.ui.operationsTab||'today',tabs=[['today','Сегодня'],['control','Контроль'],['week','Неделя']];return`<div class="operations-tabs">${tabs.map(([idv,label])=>`<button class="${active===idv?'active':''}" data-action="sofa3OpsTab" data-tab="${idv}">${label}</button>`).join('')}</div>`};
renderOperations=function(){let tab=state.ui.operationsTab||'today';if(!['today','control','week'].includes(tab)){tab='today';state.ui.operationsTab='today'}let body=sofa3TodayView();if(tab==='control')body=sofa3ControlView();if(tab==='week')body=sofa3WeekView();return`<div class="page readable-page operations-page">${pageHead('СОФА · УПРАВЛЯЮЩАЯ','Контроль дня','Чек-лист, ритм и результаты. Ежедневный отчёт собственнику больше не используется — вся рабочая информация живёт в общей системе.')} ${sofa3Datebar()}${sofa3Tabs()}${body}</div>`};
renderManager=sofa65ManagerHome;

const __sofa65SalaryCardBase=sofa3SalaryCard;
sofa3SalaryCard=function(){
  const html=__sofa65SalaryCardBase();
  return currentRole==='manager'?html.replace(/<button class="sofia-kpi /g,'<button disabled class="sofia-kpi ').replace(/ data-action="sofa3ToggleKpi" data-key="[^"]+"/g,''):html;
};

const __renderArchiveSofa65Base=renderArchive;
renderArchive=function(){
  let html=__renderArchiveSofa65Base();
  html=html.replace(/<section class="card pad"><div class="card-head"><div><h3>Операционные дни<\/h3>[\s\S]*?<\/section>/,'');
  return html;
};

const __allowedViewSofa65Base=allowedView;
allowedView=function(id){if(['sofa_numbers','sofa_motivation','sofa_system'].includes(id))return['owner','manager'].includes(currentRole);return __allowedViewSofa65Base(id)};

const __renderCurrentViewSofa65Base=renderCurrentView;
renderCurrentView=function(){
  if(currentView==='sofa_numbers'){if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65Base()}$('#pageTitle').textContent='Цифры клуба';$('#pages').innerHTML=sofa65NumbersPage();renderNav();animateNumbers();return}
  if(currentView==='sofa_motivation'){if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65Base()}$('#pageTitle').textContent='Мотивация Софы';$('#pages').innerHTML=sofa65MotivationPage();renderNav();animateNumbers();return}
  if(currentView==='sofa_system'){if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65Base()}$('#pageTitle').textContent='Система управляющей';$('#pages').innerHTML=sofa65SystemPage();renderNav();animateNumbers();return}
  return __renderCurrentViewSofa65Base();
};

const __handleSubmitSofa65Base=handleSubmit;
handleSubmit=function(e){
  const f=e.target;
  if(f instanceof HTMLFormElement&&f.id==='sofa65NumbersForm'){
    e.preventDefault();
    const d=sofa3EnsureDay();
    for(const key of ['unanswered','attended','sold','renewDue','renewDone','expected','unpaidClients','unpaidAmount'])d.metrics[key]=num(f.elements[key]?.value);
    d.updatedAt=nowIso();touch('Обновлены ключевые цифры клуба');return;
  }
  return __handleSubmitSofa65Base(e);
};

const __handleClickSofa65Base=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');
  if(el?.dataset.action==='sofa3ToggleKpi'&&currentRole!=='owner')return;
  if(el?.dataset.action==='sofa3CopyReport'||el?.dataset.action==='sofa3MarkReport')return;
  return __handleClickSofa65Base(e);
};

(function sofa65InstallStyles(){
  if(document.getElementById('sofa65-finish-style'))return;
  const style=document.createElement('style');style.id='sofa65-finish-style';style.textContent=`
  .sofa65-page{max-width:1680px;margin:0 auto}.sofa65-quick-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}.sofa65-quick-links .quick-card{min-height:104px}.sofa65-kpi-grid{margin:14px 0}.sofa65-input-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.sofa65-input-unit{display:flex;align-items:center;gap:9px}.sofa65-input-unit .input{min-width:0}.sofa65-input-unit small{min-width:28px;color:var(--muted);font-weight:800}.sofa65-chart{margin-top:8px}.sofa65-chart svg{display:block;width:100%;height:235px;overflow:visible}.sofa65-gridline{stroke:#2e2818;stroke-width:1}.sofa65-target{stroke:#8c7428;stroke-width:1.2;stroke-dasharray:6 7}.sofa65-area{fill:url(#sofa65Area)}.sofa65-line{fill:none;stroke:var(--yellow-bright);stroke-width:3;vector-effect:non-scaling-stroke}.sofa65-point{fill:#11100c;stroke:var(--yellow-bright);stroke-width:2;vector-effect:non-scaling-stroke}.sofa65-chart-labels{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-top:8px}.sofia-kpi:disabled{cursor:default;opacity:.92}.sofia-kpi:disabled:hover{transform:none}.nav-section{white-space:normal}
  @media(max-width:1100px){.sofa65-input-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sofa65-quick-links{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:680px){.sofa65-input-grid,.sofa65-quick-links{grid-template-columns:1fr}.sofa65-chart svg{height:190px}}
  `;document.head.appendChild(style);
})();

const __bootSofa65Base=boot;
boot=async function(){
  const result=await __bootSofa65Base();
  if(state?.ui?.operationsTab==='report'||state?.ui?.operationsTab==='metrics'){state.ui.operationsTab='today';persistLocal()}
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,sofa65FinishBuild:SOFA65_FINISH_BUILD,sofiaNumbers:()=>sofa65RecomputeStats(),sofiaSalary:key=>sofa3Salary(key||state.settings.currentMonth)};
  return result;
};
// SOFA65_FINISH_V2_END

// SOFA65_CORRECTIONS_V3_START
const SOFA65_CORRECTIONS_BUILD='2026.09.03-sofa-cabinet-corrections-v3';

(function sofa65RestoreManagementMeetingAccess(){
  const sofaSection=NAV.find(s=>s.section==='Софа · управляющая');
  const sofaMeeting=sofaSection?.items?.find(x=>x.id==='meeting');
  if(sofaMeeting)sofaMeeting.id='sofa_meetings';
  const cabinets=NAV.find(s=>s.section==='Кабинеты');
  if(cabinets&&!cabinets.items.some(x=>x.id==='meeting')){
    const beforeTeam=Math.max(0,cabinets.items.findIndex(x=>x.id==='team'));
    cabinets.items.splice(beforeTeam>=0?beforeTeam:cabinets.items.length,0,{id:'meeting',label:'Собрание УП',icon:'team',roles:['owner','manager','stas','mentor']});
  }
})();

const __sofa65StatsRawV3=sofa3Stats;
sofa65RecomputeStats=function(dateValue=sofa3SelectedDate()){
  const s=__sofa65StatsRawV3(dateValue),day=s.day;
  const activeCheckKeys=Object.values(SOFA3_CHECK_GROUPS).flat().map(([key])=>key);
  const checkDone=activeCheckKeys.filter(key=>Boolean(day.checks?.[key])).length;
  const rhythmDone=SOFA3_RHYTHM.filter((_,i)=>Boolean(day.rhythm?.[i])).length;
  const readiness=Math.round(((activeCheckKeys.length?checkDone/activeCheckKeys.length:0)*.72+(SOFA3_RHYTHM.length?rhythmDone/SOFA3_RHYTHM.length:0)*.28)*100);
  return{...s,readiness,checkDone,checkTotal:activeCheckKeys.length,rhythmDone,rhythmTotal:SOFA3_RHYTHM.length};
};
sofa3Stats=sofa65RecomputeStats;

sofa65MotivationPage=function(){
  const s=sofa3Salary(),mot=s.mot,owner=currentRole==='owner';
  const tiers=SOFA3_TIERS.filter(([threshold])=>threshold>0).slice().sort((a,b)=>a[0]-b[0]);
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · ЛИЧНАЯ МОТИВАЦИЯ','Мотивация Софы','Софа видит расчёт и понимает, что влияет на доход. Оценку KPI подтверждает Роман — сотрудник не оценивает себя сам.',owner?`<button class="btn btn-primary" data-action="sofa3LockSalary">${mot.snapshot?'Обновить фиксацию':'Зафиксировать месяц'}</button>`:'')}
  <section class="card hero"><div class="hero-top"><div><div class="eyebrow">${esc(monthLabel(s.key))}</div><h3 class="hero-title">${mot.snapshot?'Зафиксированная зарплата':'Расчёт на текущий момент'}</h3><div class="hero-value">${salaryMoney(s.display)}</div><div class="hero-sub">Факт ${compactMoney(s.fact)} / план ${compactMoney(s.plan)} · выполнение ${pct(s.planPct)}</div></div><div class="hero-value" style="font-size:34px">${Math.round(s.coef*100)}%</div></div><div class="hero-progress"><i style="width:${clamp(s.planPct,0,100)}%"></i></div></section>
  <div class="grid-4">${metricCard('База',salaryMoney(SOFA3_BASE_SALARY),'фиксированная часть','revenue')}${metricCard('KPI',salaryMoney(s.kpi),`${s.kpiCount}/4 подтверждено`,'tasks',s.kpiCount/4*100)}${metricCard('Бонус уровня',salaryMoney(s.tier),`по факту ${compactMoney(s.fact)}`,'analytics')}${metricCard('Бонус к выплате',salaryMoney(s.variable),`коэффициент плана ${Math.round(s.coef*100)}%`,'revenue')}</div>
  <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>KPI управляющей</h3><p>Каждый выполненный блок = +5 000 ₽. Подтверждает только Роман.</p></div><span class="pill">${s.kpiCount}/4</span></div><div class="sofia-kpis">${SOFA3_KPIS.map(([key,title,text])=>`<button class="sofia-kpi ${mot.checks?.[key]?'done':''}" ${owner?`data-action="sofa3ToggleKpi" data-key="${key}"`:'disabled'}><i>${mot.checks?.[key]?'✓':'○'}</i><span><b>${esc(title)}</b><small>${esc(text)} · +5 000 ₽</small></span></button>`).join('')}</div>${!owner?'<p class="readable-note">Статусы KPI доступны Софе только для просмотра. Изменить их может Роман в своём режиме.</p>':''}</section>
  <section class="card pad"><div class="card-head"><div><h3>Шкала бонуса за выручку</h3><p>Уровень определяется фактической выручкой клуба</p></div></div><div class="bonus-tiers">${tiers.map(([threshold,bonus])=>`<div class="bonus-tier ${s.fact>=threshold?'active':''}"><span>от ${compactMoney(threshold)}</span><b>${salaryMoney(bonus)}</b></div>`).join('')}</div><p class="readable-note">Коэффициент: 100% плана = 100% бонуса; 95–99% = 75%; 90–94% = 50%; ниже 90% = 0%.</p></section></div>
  </div>`;
};

const __sofa65ManagerHomeV3=sofa65ManagerHome;
sofa65ManagerHome=function(){return __sofa65ManagerHomeV3().replace('data-view="meeting"><span class="quick-icon">','data-view="sofa_meetings"><span class="quick-icon">')};
renderManager=sofa65ManagerHome;

const __allowedViewSofa65V3Base=allowedView;
allowedView=function(id){if(id==='sofa_meetings')return['owner','manager'].includes(currentRole);return __allowedViewSofa65V3Base(id)};

const __renderCurrentViewSofa65V3Base=renderCurrentView;
renderCurrentView=function(){
  if(currentView==='operations'){
    if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65V3Base()}
    $('#pageTitle').textContent='Контроль дня';$('#pages').innerHTML=renderOperations();renderNav();animateNumbers();return;
  }
  if(currentView==='sofa_meetings'){
    if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65V3Base()}
    $('#pageTitle').textContent='Собрания';$('#pages').innerHTML=renderMeeting();renderNav();animateNumbers();managementMeetingTicker();return;
  }
  return __renderCurrentViewSofa65V3Base();
};

const __bootSofa65V3Base=boot;
boot=async function(){
  const result=await __bootSofa65V3Base();
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,sofa65CorrectionsBuild:SOFA65_CORRECTIONS_BUILD};
  return result;
};
// SOFA65_CORRECTIONS_V3_END

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

// SOFA65_CLEANUP_V4_1_START
// V3 stored the previous Sofia home function in renderManager by reference.
// Rebind after the V4 home implementation so the cleaned action-first dashboard is actually rendered.
renderManager=sofa65ManagerHome;

// A form can stay open while another device changes a different field.
// Stamp only values that this device actually changed; otherwise a later submit could
// make an untouched stale field look newer and overwrite the other device's edit.
handleSubmit=function(e){
  const f=e.target;
  if(f instanceof HTMLFormElement){
    const stamp=nowIso();
    if(f.id==='sofa65NumbersForm'){
      const d=sofa3EnsureDay();
      for(const k of ['unanswered','attended','sold','renewDue','renewDone','expected','unpaidClients','unpaidAmount']){
        const next=num(f.elements[k]?.value);
        if(Number(d.metrics?.[k]||0)!==Number(next||0))sofa65V4Stamp(d,`metrics.${k}`,stamp);
      }
    }
    if(f.id==='sofa3PrioritiesForm'){
      const d=sofa3EnsureDay();
      for(let i=0;i<3;i++){
        const next=f.elements[`p${i}`]?.value||'';
        if(String(d.priorities?.[i]||'')!==String(next))sofa65V4Stamp(d,`priorities.${i}`,stamp);
      }
    }
    if(f.id==='sofa3WeekForm'){
      const w=sofa3EnsureWeek();
      const target=num(f.elements.revenueTarget?.value);
      if(Number(w.revenueTarget||0)!==Number(target||0))sofa65V4Stamp(w,'revenueTarget',stamp);
      for(let i=0;i<3;i++){
        const next=f.elements[`result${i}`]?.value||'';
        if(String(w.results?.[i]||'')!==String(next))sofa65V4Stamp(w,`results.${i}`,stamp);
      }
      for(const k of ['risk','team','parents','improvement','decision']){
        const next=f.elements[k]?.value||'';
        if(String(w[k]||'')!==String(next))sofa65V4Stamp(w,k,stamp);
      }
    }
  }
  // Skip the first V4 submit wrapper (it stamped every visible field) and continue
  // with the real Sofia/base submit handler, which writes values and performs normal sync.
  return __handleSubmitSofa65V4(e);
};

// Stronger conflict test: different devices may legitimately win on different fields.
sofa65V4MergeSelfTest=function(){
  const a={
    updatedAt:'2026-09-04T10:03:00.000Z',
    checks:{open_clean:true},metrics:{unanswered:9,expected:1000},priorities:['A','',''],rhythm:{0:false},notes:{},
    _fieldUpdatedAt:{
      'checks.open_clean':'2026-09-04T10:04:00.000Z',
      'metrics.unanswered':'2026-09-04T10:05:00.000Z',
      'metrics.expected':'2026-09-04T10:01:00.000Z'
    }
  };
  const b={
    updatedAt:'2026-09-04T10:04:00.000Z',
    checks:{open_clean:false},metrics:{unanswered:1,expected:5000},priorities:['A','',''],rhythm:{0:false},notes:{},
    _fieldUpdatedAt:{
      'checks.open_clean':'2026-09-04T09:59:00.000Z',
      'metrics.unanswered':'2026-09-04T10:02:00.000Z',
      'metrics.expected':'2026-09-04T10:06:00.000Z'
    }
  };
  const m=sofa65V4MergeDay(a,b);
  return m.checks.open_clean===true&&Number(m.metrics.unanswered)===9&&Number(m.metrics.expected)===5000;
};
// SOFA65_CLEANUP_V4_1_END

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
  if(!/^([01]\d|2[0-3]):[0-5]\d(?:[–-]([01]\d|2[0-3]):[0-5]\d)?$/.test(v.time||''))return'Время должно быть в формате ЧЧ:ММ, например 16:30.';
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

// Inside the existing 6.5 closure, before event handlers are registered.
// This replaces the legacy transport, bootstrap and identity model, not the UI.
const S65=window.EK65Model;
let s65Actor=null,s65Csrf='',s65Base=null,s65Promise=null,s65Flight=null,s65Conflict=null,s65Polling=null,s65CacheKey=null,s65CacheSave=Promise.resolve();
const s65LocalKey=()=>s65Actor?`EK65_SECURE:${s65Actor.workspaceId}:${s65Actor.id}:${s65Actor.securityEpoch}`:null;
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
  if(!res.ok){if(res.status===401&&s65Actor&&data.error==='AUTH_REQUIRED'){clearInterval(s65Polling);await s65CacheSave;state=null;location.replace('/login')}throw Object.assign(Error(data.message||'Ошибка обмена.'),{status:res.status,code:data.error})}
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

// R3: account lifecycle controls, local-cache quarantine and visible sync failures.
let h65Busy=false,h65LoggingOut=false,h65Users=[];
const h65Roles={mentor:'Наставник',admin:'Администратор',manager:'Управляющая',stas:'Руководитель направления',team:'Командный экран'};
function h65Invitation(r){const link=location.origin+'/login#invite='+r.token;openModal({title:'Личное приглашение',subtitle:'Одноразовое · 24 часа. Старые сеансы и приглашения отозваны.',body:`<input class="input" readonly value="${esc(link)}"><p>Передайте лично сотруднику. Не публикуйте в общем рабочем чате.</p>`})}
function h65PasswordModal(){openModal({title:'Смена пароля',subtitle:'После смены остальные сеансы будут закрыты. Несохранённые изменения сначала отправляются на сервер.',body:`<form id="h65PasswordForm" class="form-grid"><div class="field full"><label>Текущий пароль</label><input class="input" name="oldPassword" type="password" required maxlength="128" autocomplete="current-password"></div><div class="field full"><label>Новый пароль · минимум 12 символов</label><input class="input" name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></div><div class="field full"><label>Повторите новый пароль</label><input class="input" name="confirmPassword" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></div><p class="full" id="h65PasswordError" role="alert"></p>${formActions('Сменить пароль')}</form>`})}
function h65AccessModal(id){const u=h65Users.find(x=>x.id===id);if(!u)return;openModal({title:'Права · '+u.displayName,subtitle:'Изменение действует на сервере. Все текущие сеансы сотрудника будут закрыты.',body:`<form id="h65AccessForm" class="form-grid"><input type="hidden" name="userId" value="${esc(u.id)}"><div class="field"><label>Роль</label><select class="select" name="role">${Object.entries(h65Roles).map(([v,t])=>`<option value="${v}" ${u.role===v?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label><input type="checkbox" name="management" ${(u.scopes||[]).includes('management')?'checked':''}> Старший наставник: доступ к работе команды</label><small>Дополнительные полномочия применяются только к роли наставника.</small></div>${formActions('Изменить права')}</form>`})}
s65Users=async function(){h65Users=await s65Fetch('/api/users');const users=h65Users;
 const list=users.map(u=>`<div class="compact-item"><div class="item-main"><b>${esc(u.displayName)} · ${esc(h65Roles[u.role]||'Собственник')}</b><small>${esc(u.username)} · ${u.active?(u.activated?'активен':'ждёт активации'):'отключён'}</small></div>${u.id!==s65Actor.id&&u.role!=='owner'?`<div class="hero-actions" style="margin-top:0">${u.active?`<button class="btn btn-ghost" data-action="h65Access" data-id="${esc(u.id)}">Права</button><button class="btn btn-ghost" data-action="s65Revoke" data-id="${esc(u.id)}">Отключить</button>`:''}<button class="btn btn-ghost" data-action="h65Reissue" data-id="${esc(u.id)}">Новое приглашение</button></div>`:''}</div>`).join('');
 const people=state.people.filter(p=>p.id!==s65Actor.personId&&p.active!==false&&!p.deletedAt&&!p.archivedAt&&!users.some(u=>u.personId===p.id));
 openModal({title:'Доступы сотрудников',body:`<div class="compact-list">${list}</div><p>Архивация карточки сотрудника автоматически отключает его учётную запись. Зарплатная история сохраняется.</p>${people.length?`<h3>Новый доступ</h3><form id="s65InviteForm" class="form-grid"><div class="field"><label>Сотрудник</label><select class="select" name="personId">${people.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div><div class="field"><label>Логин (латиницей)</label><input class="input" name="username" required pattern="[a-z0-9][a-z0-9_.-]{2,63}" maxlength="64"></div><div class="field"><label>Роль</label><select class="select" name="role">${Object.entries(h65Roles).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div><div class="field"><label><input type="checkbox" name="management"> Полномочия старшего наставника</label></div>${formActions('Создать приглашение')}</form>`:'<p>Для нового доступа сначала добавьте карточку сотрудника. Для существующей учётной записи используйте «Новое приглашение».</p>'}`});
};
const h65Click=handleClick;
handleClick=function(e){const el=e.target.closest('[data-action]'),a=el?.dataset.action;
 if(a==='h65Password'){e.preventDefault();return h65PasswordModal()}
 if(a==='h65Access'){e.preventDefault();return h65AccessModal(el.dataset.id)}
 if(a==='h65Reissue'){e.preventDefault();if(h65Busy||!confirm('Отозвать прежние сеансы и создать новое одноразовое приглашение?'))return;h65Busy=true;s65Fetch('/api/reissue',{method:'POST',body:JSON.stringify({userId:el.dataset.id})}).then(h65Invitation).catch(err=>toast('Приглашение не создано',err.message,'error')).finally(()=>{h65Busy=false});return}
 if(a==='s65Logout'){
  e.preventDefault();if(h65LoggingOut)return;
  if((s65Flight||s65Conflict||s65Changes().length)&&!confirm('Есть несохранённые изменения. Выйти и удалить локальный черновик?'))return;
  h65LoggingOut=true;clearInterval(s65Polling);clearTimeout(saveTimer);
  (async()=>{if(s65Promise)await s65Promise;const key=s65LocalKey();await s65Fetch('/api/logout',{method:'POST',body:'{}'});await s65CacheSave;localStorage.removeItem(key);state=null;location.replace('/login')})().catch(err=>{h65LoggingOut=false;setupAutoSync();toast('Выход не завершён',err.message,'error')});return;
 }
 return h65Click(e);
};
const h65Submit=handleSubmit;
handleSubmit=function(e){const f=e.target;
 if(f.id==='h65PasswordForm'||f.id==='h65AccessForm'){
  e.preventDefault();if(h65Busy)return;const v=formValues(f),button=f.querySelector('button[type=submit]');
  if(f.id==='h65PasswordForm'&&v.password!==v.confirmPassword){f.querySelector('#h65PasswordError').textContent='Пароли не совпадают.';return}
  h65Busy=true;if(button)button.disabled=true;
  (async()=>{
   if(f.id==='h65PasswordForm'){
    if(!(await syncNow({quiet:true}))||s65Flight||s65Conflict||s65Changes().length)throw Error('Не все изменения сохранены. Сначала восстановите связь или разберите конфликт.');
    const key=s65LocalKey();clearInterval(s65Polling);clearTimeout(saveTimer);
    try{await s65Fetch('/api/password',{method:'POST',body:JSON.stringify({oldPassword:v.oldPassword,password:v.password})});await s65CacheSave;localStorage.removeItem(key);location.replace('/app')}
    catch(err){setupAutoSync();throw err}
   }else{
    await s65Fetch('/api/access',{method:'POST',body:JSON.stringify({userId:v.userId,role:v.role,management:f.elements.management.checked})});await s65Users();toast('Права изменены','Старые сеансы отозваны. Сотруднику нужно войти заново.');
   }
  })().catch(err=>{const message=f.querySelector('#h65PasswordError');if(message)message.textContent=err.message;else toast('Изменение не выполнено',err.message,'error')}).finally(()=>{h65Busy=false;if(button)button.disabled=false});return;
 }
 return h65Submit(e);
};
const h65Boot=boot;
boot=async function(){await h65Boot();if(!state||!s65Actor)return;
 const oldPrefix=`EK65_SECURE:${s65Actor.workspaceId}:${s65Actor.id}`;
 let oldCache=false;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(oldPrefix)&&k!==s65LocalKey())oldCache=true}
 if(oldCache)toast('Обнаружен черновик прежнего доступа','Он не загружается после смены прав или пароля. Данные старого черновика не удалены.');
 const button=document.createElement('button');button.className='btn btn-ghost';button.dataset.action='h65Password';button.textContent='Пароль';document.querySelector('.top-actions')?.appendChild(button);
};
window.EK65SecureStatus.version='6.5-security.3';

document.addEventListener('click',handleClick);
document.addEventListener('submit',handleSubmit);
document.addEventListener('change',handleChange);
document.addEventListener('input',handleInput);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();$('#rolePopover').classList.add('hidden')}});
document.addEventListener('click',e=>{if(!e.target.closest('.role-switch'))$('#rolePopover')?.classList.add('hidden')});
$('#importInput').addEventListener('change',e=>{if(e.target.files?.[0])importFile(e.target.files[0]);e.target.value=''});
window.addEventListener('online',()=>syncNow({quiet:true,push:true}));window.addEventListener('focus',()=>{if(Date.now()-lastRemotePush>10000)syncNow({quiet:true,push:true})});
window.EKGrowthOS={version:VERSION,build:BUILD,getState:()=>state,setView,sync:()=>syncNow({quiet:true})};
boot();
})();

