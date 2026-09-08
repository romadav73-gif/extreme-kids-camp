'use strict';
// Cross-collection integrity, in addition to the existing field/role policy.
// Nothing in this module infers a server account's privileges from directory data.
const M=require('./model.cjs');
const isLive=x=>x&&!x.deletedAt;
const safeId=x=>typeof x==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(x);
const month=x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x);
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
const num=(x,min=0,max=1e12)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
function bad(message){throw Object.assign(Error(message),{status:422,code:'INTEGRITY'})}
function ids(list,label){if(!Array.isArray(list))bad('Ожидался список: '+label);const map=new Map();for(const x of list){if(!M.obj(x)||!safeId(x.id)||map.has(x.id))bad('Неверный или повторный ID: '+label);map.set(x.id,x)}return map}
function reference(map,id,label){if(!map.has(id))bad('Связанная запись не найдена: '+label)}
function optionalDate(x,label){if(x!==undefined&&x!==null&&x!==''&&!date(x))bad('Некорректная дата: '+label)}
function validate(s){
 const people=ids(s.people||[],'сотрудники'),groups=ids(s.groups||[],'группы'),children=ids(s.attendanceChildren||[],'спортсмены');
 const collections=['tasks','goals','events','recommendations','mentorPayroll','staffDocuments','staffDuties','attendanceMemberships','attendanceSessions','attendanceWeekArchives','managementMeetings','meetingAgenda','archive'];
 for(const root of collections)ids(s[root]||[],root);
 for(const p of people.values()){if(!['owner','manager','stas','mentor','admin','team'].includes(p.role)||typeof p.name!=='string'||!p.name.trim())bad('Некорректная карточка сотрудника');if(p.compensation)compensation(p.compensation)}
 if(s.settings?.adminCompensation)compensation(s.settings.adminCompensation);
 for(const g of groups.values()){
  reference(people,g.mentorId,'наставник группы');
  const parts=String(g.time||'').split(/[–-]/);if(parts.length===2&&parts[1]<=parts[0])bad('Окончание тренировки должно быть позже начала');
 }
 for(const root of ['tasks','goals'])for(const x of s[root]||[]){if(x.ownerId)reference(people,x.ownerId,'ответственный');if(root==='tasks'&&x.monthKey!==undefined&&!month(x.monthKey))bad('Некорректный месяц задачи')}
 for(const root of ['staffDocuments','staffDuties'])for(const x of s[root]||[]){reference(people,x.personId,'сотрудник документа');if(x.url){let u;try{u=new URL(x.url)}catch{bad('Некорректная ссылка документа')}if(u.protocol!=='https:'||u.username||u.password)bad('Ссылка должна быть HTTPS без логина и пароля')}}
 for(const root of ['mentorPayroll','recommendations'])for(const x of s[root]||[])reference(people,x.mentorId,'наставник записи');
 for(const [key,m] of Object.entries(s.months||{})){
  if(!month(key)||m.key&&m.key!==key)bad('Некорректный ключ месяца');
  ids(m.daily||[],'поступления за '+key);
  for(const x of m.daily||[])if(!date(x.date)||x.date.slice(0,7)!==key||!num(x.amount))bad('Некорректное поступление');
 }
 for(const e of (s.events||[]).filter(isLive)){
  if(!date(e.date)||typeof e.title!=='string'||!e.title.trim())bad('У мероприятия должны быть название и корректная дата');
  if(e.ownerId)reference(people,e.ownerId,'ответственный мероприятия');
  for(const k of ['participantsPlan','participantsFact','pricePlan','priceFact','revenuePlan','revenueFact','costPlan','costFact'])if(e[k]!==undefined&&!num(e[k]))bad('Некорректное число в мероприятии');
 }
 const memberships=(s.attendanceMemberships||[]).filter(isLive);
 for(const x of memberships){reference(groups,x.groupId,'группа спортсмена');reference(children,x.childId,'спортсмен');optionalDate(x.startDate,'начало занятий');optionalDate(x.endDate,'окончание занятий');if(x.startDate&&x.endDate&&x.endDate<x.startDate)bad('Дата окончания раньше даты начала')}
 const ranges=new Map();for(const x of memberships.filter(x=>x.status!=='archived')){const key=x.groupId+':'+x.childId;const a=ranges.get(key)||[];for(const y of a){if((x.startDate||'0000')<=(y.endDate||'9999')&&(y.startDate||'0000')<=(x.endDate||'9999'))bad('Пересекающиеся записи одного ребёнка в одной группе')}a.push(x);ranges.set(key,a)}
 const slots=new Set();for(const x of (s.attendanceSessions||[]).filter(isLive)){
  reference(groups,x.groupId,'группа занятия');if(x.mentorId)reference(people,x.mentorId,'наставник занятия');
  if(!date(x.date))bad('Некорректная дата занятия');const key=x.groupId+':'+x.date+':'+(x.mode||'actual');if(slots.has(key))bad('За эту дату занятие группы уже записано');slots.add(key);
  for(const rec of x.records||[]){reference(children,rec.childId,'спортсмен в занятии');if(!memberships.some(m=>m.groupId===x.groupId&&m.childId===rec.childId&&(!m.startDate||m.startDate<=x.date)&&(!m.endDate||m.endDate>=x.date)))bad('Спортсмен не числился в группе на дату занятия')}
 }
 const saleIds=new Set(),shiftIds=new Set(),adjustmentIds=new Set();
 for(const [key,m] of Object.entries(s.adminOperationsByMonth||{})){
  if(!month(key))bad('Некорректный месяц администратора');
  for(const [root,seen] of [['sales',saleIds],['shifts',shiftIds],['adjustments',adjustmentIds]]){
   ids(m[root]||[],root);for(const x of m[root]||[]){if(seen.has(x.id))bad('Повторная финансовая запись между месяцами');seen.add(x.id);reference(people,x.adminId,'администратор');if(people.get(x.adminId).role!=='admin')bad('Продажа или смена назначена не администратору');if(!date(x.date)||x.date.slice(0,7)!==key)bad('Дата не соответствует месяцу');
    if(root==='sales'&&(!['group','it'].includes(x.type)||!num(x.amount)||x.rate!==undefined&&!num(x.rate,0,1)))bad('Некорректная продажа или ставка');
    if(root==='shifts'&&!['worked','planned'].includes(x.status))bad('Неизвестный статус смены');
    if(root==='adjustments'&&(!['premium','fine','correction'].includes(x.type)||!num(x.amount,x.type==='correction'?-1e8:0,1e8)))bad('Некорректная премия или корректировка');
   }
  }
  for(const value of Object.values(m.adminPlans||{}))if(!num(value))bad('Некорректный план администратора');
 }
 return true;
}
function compensation(c){if(!M.obj(c))bad('Некорректные ставки');for(const k of ['shiftRate'])if(c[k]!==undefined&&!num(c[k]))bad('Некорректная ставка смены');for(const k of ['groupRate','itRate'])if(c[k]!==undefined&&!num(c[k],0,1))bad('Процент должен быть от 0 до 100%');for(const t of c.bonusTiers||[])if(t.amount!==undefined&&!num(t.amount))bad('Некорректная премия')}
function immutableId(c){return c.path.some((k,i)=>k==='id'&&i>0&&c.path[i-1].startsWith('@'))}
module.exports={validate,immutableId};
