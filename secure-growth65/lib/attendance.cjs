'use strict';
// Preserve the two task-producing rules from Growth 6.5 attendanceSignals:
// consecutive absences -> administrator; low density in two weeks -> mentor.
// Derived tasks are now created inside the server transaction, never under a
// mentor's client-side authority to write someone else's tasks.
const {createHash}=require('node:crypto');
const iso=d=>new Date(d).toISOString().slice(0,10);
const add=(d,n)=>iso(Date.parse(d+'T12:00:00Z')+n*86400000);
const week=d=>add(d,-((new Date(d+'T12:00:00Z').getUTCDay()+6)%7));
const live=x=>x&&!x.deletedAt&&x.active!==false;
const actual=s=>live(s)&&s.mode!=='planned'&&s.status!=='cancelled';
function counts(s){const records=s.records||[],present=records.length?records.filter(r=>r.status==='present').length:Number(s.presentCount)||0;return present+(Number(s.makeupCount)||0)+(Number(s.trialCount)||0)+(Number(s.guestCount)||0)}
function generate(s,weeks,today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
 const settings={lowDensity:50,consecutiveMisses:2,autoTasks:true,...s.attendanceSettings};if(!settings.autoTasks)return[];
 const groups=(s.groups||[]).filter(g=>live(g)&&g.status!=='archived'),members=(s.attendanceMemberships||[]).filter(live),children=new Map((s.attendanceChildren||[]).filter(live).map(c=>[c.id,c])),sessions=(s.attendanceSessions||[]).filter(actual),output=[],known=new Set((s.tasks||[]).map(t=>t.attendanceAlertKey));
 function task(w,key,ownerId,title,description,groupId,red){const alert='attendance:'+key;if(known.has(alert)||!ownerId)return;known.add(alert);const due=add(w,7);output.push({id:'att65-'+createHash('sha256').update(alert).digest('hex').slice(0,24),title,description,ownerId,monthKey:w.slice(0,7),deadline:due<today?today:due,priority:red?'high':'medium',status:'todo',required:false,linkType:'attendance',linkId:groupId,attendanceAlertKey:alert,attendanceWeek:w,createdBy:'attendance'})}
 for(const w of [...new Set(weeks)].filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v))){
  for(const m of members){const g=groups.find(g=>g.id===m.groupId),child=children.get(m.childId);if(!g||!child)continue;
   const records=sessions.filter(x=>x.groupId===g.id&&x.date<=add(w,6)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,4).map(x=>(x.records||[]).find(r=>r.childId===m.childId)).filter(Boolean);
   let streak=0,red=false;for(const r of records){if(!['sick','warned','vacation','freeze','noShow'].includes(r.status))break;streak++;red=red||r.status==='noShow'}
   if(streak>=settings.consecutiveMisses){const admin=(s.people||[]).find(p=>p.role==='admin'&&p.active!==false&&!p.deletedAt)?.id||g.mentorId;
    task(w,`child-${child.id}-${w}`,admin,`Связаться после повторных пропусков: ${child.name}`,`Группа: ${g.name}. Пропущено подряд: ${streak}. Уточнить возвращение и зафиксировать результат вместе с наставником.`,g.id,red)}
  }
  for(const g of groups){const density=k=>{const rows=sessions.filter(x=>x.groupId===g.id&&x.date>=k&&x.date<=add(k,6)),capacity=rows.reduce((n,x)=>n+(Number(x.capacitySnapshot)||Number(g.capacity)||0),0);return{hasData:!!rows.length,value:capacity?rows.reduce((n,x)=>n+counts(x),0)/capacity*100:0}};const current=density(w),previous=density(add(w,-7));
   if(current.hasData&&previous.hasData&&current.value<settings.lowDensity&&previous.value<settings.lowDensity)task(w,`density-${g.id}-${w}`,g.mentorId,`Разобрать низкую посещаемость: ${g.name}`,`Фактическая плотность ниже ${settings.lowDensity}% две недели подряд. Совместно с администратором проверить состав, причины пропусков и план возврата.`,g.id,true);
  }
 }
 return output;
}
function affectedWeeks(before,after,changes){const out=[];for(const c of changes){if(!['attendanceSessions','attendanceWeekArchives'].includes(c.path[0]))continue;const root=c.path[0],id=c.path[1]?.slice(1);for(const state of [before,after]){const row=(state[root]||[]).find(x=>x.id===id);if(row?.date)out.push(week(row.date));else if(row?.weekKey)out.push(week(row.weekKey))}}return out}
module.exports={generate,affectedWeeks,week};
