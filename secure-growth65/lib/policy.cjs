'use strict';
const M=require('./model.cjs');
const ROLES=['owner','manager','stas','mentor','admin','team'];
const managers=a=>a.role==='owner'||a.role==='manager';
const board=a=>managers(a)||a.role==='stas'||a.role==='mentor'&&a.scopes.includes('management');
const live=x=>x&&!x.deletedAt;
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>M.own(o||{},k)).map(k=>[k,M.clone(o[k])]));
const commonEvent=['id','type','title','date','time','venue','status'];
const taskFields=['id','title','description','ownerId','monthKey','deadline','priority','status','required','linkType','linkId','createdBy','deletedAt'];
const groupFields=['id','mentorId','name','discipline','day','time','level','capacity','students','monthlyPrice','prime','rosterManaged','status','deletedAt'];
const eventFields=commonEvent.concat(['ownerId','participantsPlan','participantsFact','gifts','plan','actual','notes','deletedAt','revenuePlan','revenueFact','costPlan','costFact','pricePlan','priceFact']);
const collections={tasks:taskFields,groups:groupFields,events:eventFields,goals:['id','title','category','ownerId','deadline','progress','status','priority','metric','target','current','notes','deletedAt'],people:['id','name','role','title','area','avatar','active','archivedAt','deletedAt','compensation','managementRole','managementScope'],recommendations:['id','childName','mentorId','recommendation','status','notes','deletedAt'],mentorPayroll:['id','mentorId','date','category','reason','amount','status','deletedAt'],staffDocuments:['id','personId','title','type','url','notes','deletedAt'],staffDuties:['id','personId','title','description','deletedAt'],meetingAgenda:['id','title','notes','ownerId','personId','status','done','deletedAt'],attendanceChildren:['id','name','birthDate','parentContact','notes','active','deletedAt'],attendanceMemberships:['id','childId','groupId','startDate','endDate','status','notes','deletedAt'],attendanceSessions:['id','groupId','date','time','mentorId','mode','planned','present','sick','vacation','makeup','absent','noShow','cancelled','roster','marks','statuses','children','childStatuses','childStates','members','attendance','weekKey','status','enrolledSnapshot','capacitySnapshot','expectedCount','presentCount','sickCount','warnedCount','vacationCount','freezeCount','noShowCount','records','makeupCount','trialCount','guestCount','notes','deletedAt'],attendanceWeekArchives:null,managementMeetings:null,archive:null};
const VIEWS={owner:['dashboard','year','groups','goals','tasks','calendar','attendance','analytics','payroll','archive','manager','operations','sofa_numbers','sofa_meetings','sofa_motivation','sofa_system','staff','stas','mentor','admin','documents','meeting','team','settings'],manager:['groups','tasks','calendar','attendance','manager','operations','sofa_numbers','sofa_meetings','sofa_motivation','sofa_system','staff','stas','mentor','admin','documents','team'],stas:['year','goals','analytics','groups','tasks','calendar','attendance','stas','mentor','documents','meeting','team'],mentor:['groups','tasks','calendar','attendance','mentor','documents','meeting','team'],admin:['tasks','calendar','attendance','admin','documents','team'],team:['calendar','team']};
function publicActor(a){return pick(a,['id','workspaceId','personId','role','scopes','username','displayName'])}
function projection(s,a){
 if(a.role==='owner')return M.clean(s);
 const out=M.emptyState(s.settings?.currentMonth);out.months={};out.settings=pick(s.settings,['clubName','currentMonth','minimumRevenue','normalRevenue','strongRevenue','stretchRevenue','defaultMonthlyRevenuePerChild','adminCompensation']);
 if(!managers(a))delete out.settings.adminCompensation;
 const publicPeople=['id','name','role','title','area','avatar','active','archivedAt','deletedAt','managementRole','managementScope'];
 out.people=(s.people||[]).map(p=>({...pick(p,publicPeople),...(p.id===a.personId||managers(a)&&p.role==='admin'?pick(p,['compensation']):{})}));
 if(a.role==='team')out.people=[];
 out.groups=(s.groups||[]).filter(g=>board(a)||a.role==='admin'||g.mentorId===a.personId).map(g=>{const p=M.clone(g);if(!managers(a))delete p.monthlyPrice;return p});if(a.role==='team')out.groups=[];
 const gids=new Set(out.groups.map(g=>g.id));
 out.tasks=(s.tasks||[]).filter(t=>board(a)||t.ownerId===a.personId);if(a.role==='team')out.tasks=[];
 out.events=(s.events||[]).map(e=>managers(a)?M.clone(e):a.role==='stas'?pick(e,eventFields.filter(k=>!/(revenue|cost|price)/i.test(k))):pick(e,commonEvent));
 out.goals=board(a)?(s.goals||[]).filter(g=>g.category!=='Финансы'&&g.ownerId!=='roman'):[];
 if(managers(a)||a.role==='admin'||a.role==='stas')for(const [k,m] of Object.entries(s.months||{}))out.months[k]={...pick(m,['key','label','minimum','target','stretch','loadTarget']),fact:m.daily?.length?m.daily.reduce((n,r)=>n+Number(r.amount||0),0):m.fact||0,daily:[],focus:''};
 if(!Object.keys(out.months).length)out.months=M.emptyState(s.settings?.currentMonth).months;
 out.recommendations=(s.recommendations||[]).filter(x=>board(a)||a.role==='admin'||x.mentorId===a.personId);
 out.mentorPayroll=(s.mentorPayroll||[]).filter(x=>x.mentorId===a.personId);
 out.staffDocuments=(s.staffDocuments||[]).filter(x=>board(a)||x.personId===a.personId);
 out.staffDuties=(s.staffDuties||[]).filter(x=>board(a)||x.personId===a.personId);
 out.attendanceMemberships=(s.attendanceMemberships||[]).filter(x=>gids.has(x.groupId));
 const cids=new Set(out.attendanceMemberships.map(x=>x.childId));
 out.attendanceChildren=(s.attendanceChildren||[]).filter(x=>cids.has(x.id)).map(x=>managers(a)||a.role==='admin'?M.clone(x):pick(x,['id','name','active','deletedAt']));
 out.attendanceSessions=(s.attendanceSessions||[]).filter(x=>gids.has(x.groupId));
 out.attendanceWeekArchives=board(a)?s.attendanceWeekArchives||[]:[];
 out.attendanceSettings=M.clone(s.attendanceSettings||{});
 if(board(a)){out.meetingAgenda=M.clone(s.meetingAgenda||[]);out.meetingTimer=M.clone(s.meetingTimer||{})}
 if(managers(a)){
  for(const k of ['sales','salesByMonth','operationsDays','managementPlans','managementMeetings','managementMeetingDraft','sofiaMotivationByMonth'])out[k]=M.clone(s[k]||out[k]);
 }
 if(managers(a)||a.role==='admin'){
  for(const [k,m] of Object.entries(s.adminOperationsByMonth||{})){const n={};for(const [f,v] of Object.entries(m))n[f]=Array.isArray(v)?v.filter(x=>managers(a)||x.adminId===a.personId):f==='adminPlans'?Object.fromEntries(Object.entries(v||{}).filter(([pid])=>managers(a)||pid===a.personId)):f==='updatedAt'?v:undefined;out.adminOperationsByMonth[k]=n}
  for(const [k,x] of Object.entries(s.adminSalarySnapshots||{}))out.adminSalarySnapshots[k]={monthKey:x.monthKey,clubRevenue:x.clubRevenue,admins:Object.fromEntries(Object.entries(x.admins||{}).filter(([pid])=>managers(a)||pid===a.personId))};
 }
 if(a.role==='team'){for(const k of ['recommendations','staffDocuments','staffDuties','attendanceChildren','attendanceMemberships','attendanceSessions'])out[k]=[];out.settings=pick(out.settings,['clubName','currentMonth'])}
 out.meta={revision:s.meta?.revision||0,updatedAt:s.meta?.updatedAt||''};return M.clean(out);
}
// Writes are deny-by-default. Account role is never inferred from state.people.
function permission(s,a,c){
 const p=c.path,root=p[0];if(a.role==='team')return false;
 if(['meta','ui','activity','sync65','version'].includes(root))return false;
 const record=p[1]?.startsWith('@')?(s[root]||[]).find(x=>x.id===p[1].slice(1)):null;
 if(root in collections){
  if(!p[1]?.startsWith('@')||p.length<2)return false;
  const fields=collections[root]?.concat('createdBy');if(fields&&p[2]&&!fields.includes(p[2]))return false;
  if(fields&&p.length===2&&c.op==='set'&&Object.keys(c.value).some(k=>!fields.includes(k)&&!['_fieldUpdatedAt','updatedAt','createdAt'].includes(k)))return false;
  const candidate=p.length===2&&c.op==='set'?c.value:record;
  if(!candidate)return false;
  if(root==='people'||root==='mentorPayroll'||root==='archive')return a.role==='owner';
  if(root==='tasks'){
   if(!board(a)&&record&&record.ownerId!==a.personId)return false;
   if(!board(a)&&p.length===2&&candidate.ownerId!==a.personId)return false;
   if(!board(a)&&['ownerId','required','createdBy','monthKey'].includes(p[2]))return false;
   if(!board(a)&&record?.required&&(['deletedAt','title','description','deadline'].includes(p[2])||c.op==='remove'||p.length===2))return false;
   return board(a)||!record||['status','description'].includes(p[2]);
  }
  if(root==='groups')return board(a)||(['mentor','admin'].includes(a.role)&&(a.role==='admin'||record?.mentorId===a.personId)&&['students'].includes(p[2]));
  if(root==='events')return managers(a)||a.role==='stas'&&!(p[2]&&/(revenue|cost|price)/i.test(p[2]))&&!(p.length===2&&Object.keys(candidate).some(k=>/(revenue|cost|price)/i.test(k)));
  if(root==='goals')return a.role==='owner'||a.role==='stas'&&candidate.ownerId!=='roman'&&candidate.category!=='Финансы';
  if(root==='staffDocuments'||root==='staffDuties'||root==='meetingAgenda')return board(a);
  if(root==='managementMeetings')return managers(a);
  if(root==='attendanceWeekArchives')return board(a);
  if(root==='recommendations')return board(a)||a.role==='admin'&&['status','notes'].includes(p[2])||a.role==='mentor'&&candidate.mentorId===a.personId&&(p[2]!=='mentorId')&&(!record||record.mentorId===a.personId);
  if(root==='attendanceChildren')return managers(a)||a.role==='admin';
  if(root==='attendanceMemberships')return board(a)||a.role==='admin';
  if(root==='attendanceSessions'){
   const g=(s.groups||[]).find(x=>x.id===candidate.groupId);if(!g||g.deletedAt)return false;
   return board(a)||a.role==='admin'||a.role==='mentor'&&g.mentorId===a.personId&&(p[2]!=='groupId');
  }
  return false;
 }
 if(root==='months')return a.role==='owner'&&p.length>=2&&/^\d{4}-\d{2}$/.test(p[1]);
 if(root==='settings')return a.role==='owner'&&p.length>=2&&['clubName','minimumRevenue','normalRevenue','strongRevenue','stretchRevenue','defaultMonthlyRevenuePerChild','adminCompensation'].includes(p[1]);
 if(root==='sofiaMotivationByMonth')return a.role==='owner'&&p.length>=2;
 if(['operationsDays','managementPlans','managementMeetingDraft','sales','salesByMonth'].includes(root))return managers(a);
 if(root==='meetingTimer')return board(a);
 if(root==='attendanceSettings')return managers(a);
 if(root==='adminSalarySnapshots')return a.role==='owner';
 if(root==='adminOperationsByMonth')return managers(a); // self-reported financial entries require a manager
 return false;
}
function validateState(s,changed){
 try{M.validateJson(s)}catch{throw Object.assign(Error('Некорректная структура данных.'),{status:422})}const fail=m=>{const e=Error(m);e.status=422;throw e};
 const num=(v,min=0,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().startsWith(d);
 const hasRoot=k=>changed.some(c=>c.path[0]===k);
 for(const [root,fields] of Object.entries(collections))if(hasRoot(root)){
  if(!Array.isArray(s[root]))fail('Ожидался список '+root);
  const ids=new Set();for(const x of s[root]){if(typeof x.id!=='string'||!/^[a-zA-Z0-9_.:-]{1,128}$/.test(x.id)||ids.has(x.id))fail('Неверный или повторный ID');ids.add(x.id);if(x.url&&!/^https:\/\//i.test(x.url))fail('Разрешены только HTTPS-ссылки');if(x.deletedAt&&!date(x.deletedAt.slice(0,10)))fail('Неверная дата удаления')}
 }
 if(hasRoot('tasks'))for(const x of s.tasks.filter(live)){if(!x.title?.trim()||!['todo','inprogress','review','done'].includes(x.status))fail('Некорректная задача');if(!(s.people||[]).some(p=>p.id===x.ownerId))fail('Ответственный не найден');if(x.deadline&&!date(x.deadline))fail('Некорректный срок')}
 if(hasRoot('groups'))for(const g of s.groups.filter(live)){if(!num(g.capacity,0,1000)||!Number.isInteger(g.capacity)||!num(g.students,0,g.capacity)||!Number.isInteger(g.students))fail('Детей не может быть больше вместимости');if(!/^([01]\d|2[0-3]):[0-5]\d(?:[–-]([01]\d|2[0-3]):[0-5]\d)?$/.test(g.time||''))fail('Некорректное время');if(!(s.people||[]).some(p=>p.id===g.mentorId))fail('Наставник не найден')}
 if(hasRoot('months'))for(const [k,m] of Object.entries(s.months)){for(const n of ['minimum','target','stretch','fact'])if(m[n]!==undefined&&!num(m[n]))fail('Некорректная сумма');if((m.minimum||0)>(m.target||0)||(m.target||0)>(m.stretch||0))fail('Минимум ≤ план ≤ сильный результат');for(const r of m.daily||[])if(!date(r.date)||!r.date.startsWith(k)||!num(r.amount))fail('Поступление не соответствует месяцу')}
 if(hasRoot('operationsDays'))for(const d of Object.values(s.operationsDays||{})){const m=d.metrics||{};for(const v of Object.values(m))if(typeof v==='number'&&!num(v))fail('Некорректный показатель');if((m.sold||0)>(m.attended||0)||(m.renewDone||0)>(m.renewDue||0))fail('Показатели воронки противоречат друг другу')}
 if(hasRoot('mentorPayroll'))for(const x of s.mentorPayroll.filter(live))if(!date(x.date)||!num(x.amount,-1e8,1e8)||!x.reason?.trim())fail('Некорректное начисление');
 if(hasRoot('adminOperationsByMonth'))for(const [k,m] of Object.entries(s.adminOperationsByMonth))for(const f of ['sales','shifts','adjustments'])for(const x of m[f]||[]){if(!date(x.date)||!x.date.startsWith(k))fail('Неверный месяц записи');if(x.amount!==undefined&&!num(x.amount,f==='adjustments'?-1e8:0))fail('Некорректная сумма')}
 if(hasRoot('attendanceMemberships'))for(const x of s.attendanceMemberships.filter(live)){if(!s.groups.some(g=>g.id===x.groupId)||!s.attendanceChildren.some(c=>c.id===x.childId))fail('Ребёнок или группа не найдены')}
 if(hasRoot('attendanceSessions'))for(const x of s.attendanceSessions.filter(live)){
  const group=s.groups.find(g=>g.id===x.groupId&&!g.deletedAt);if(!date(x.date)||!group)fail('Некорректное занятие');
  for(const[k,v]of Object.entries(x))if(/Count$|Snapshot$/.test(k)&&typeof v==='number'&&(!num(v,0,1000)||!Number.isInteger(v)))fail('Некорректное количество на занятии');
  if(x.mode&&!['actual','planned'].includes(x.mode))fail('Неизвестный режим занятия');
  if(x.records){if(!Array.isArray(x.records))fail('Ожидался список отметок');const seen=new Set();for(const rec of x.records){if(seen.has(rec.childId)||!s.attendanceChildren.some(c=>c.id===rec.childId&&!c.deletedAt)||!s.attendanceMemberships.some(m=>m.childId===rec.childId&&m.groupId===group.id&&!m.deletedAt))fail('Ребёнок не относится к группе');seen.add(rec.childId);if(!['present','sick','warned','vacation','freeze','noShow','expected','unknown'].includes(rec.status))fail('Неизвестная отметка')}}
 }

 if(Buffer.byteLength(JSON.stringify(s))>2500000)fail('База превысила лимит. Нужна архивация, а не перезапись.');
}
module.exports={ROLES,VIEWS,managers,board,publicActor,projection,permission,validateState,collections};
