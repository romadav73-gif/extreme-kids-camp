'use strict';
const fs=require('node:fs');
require('./growth65-build-audited.cjs');
let source=fs.readFileSync('.github/scripts/growth65-regression.cjs','utf8');
function replaceOnce(from,to){if(source.split(from).length!==2)throw Error('Harness source changed; refusing ambiguous replacement: '+from.slice(0,100));source=source.replace(from,to)}
// The first concurrent test sampled owner BEFORE the last manager reconciliation.
// Keep both edits, require convergence on BOTH devices, and cap reconciliation.
replaceOnce("await Promise.all([sync(a),sync(b)]);await sync(a);await sync(b);\n  return E(a,'(()=>{const t=state.tasks.find(t=>t.title===\"QA-NATIVE-TASK\");return t.description===\"owner changed\"&&t.priority===\"low\"})()');",
"await Promise.all([sync(a),sync(b)]);\n  let matched=false;for(let round=0;round<5;round++){await sync(a);await sync(b);await sync(a);const check='(()=>{const t=state.tasks.find(t=>t.title===\"QA-NATIVE-TASK\");return t.description===\"owner changed\"&&t.priority===\"low\"})()';matched=(await E(a,check))&&(await E(b,check));if(matched)break;}return matched;");
const extra=String.raw`
 await test('sync:repeated-two-device-field-convergence',async()=>{
  for(let i=0;i<6;i++){
   const description='QA concurrent round '+i,priority=i%2?'high':'low';
   await E(a,'(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");t.description='+JSON.stringify(description)+';t.updatedAt=nowIso();touch("QA concurrent A")})()');
   await E(b,'(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");t.priority='+JSON.stringify(priority)+';t.updatedAt=nowIso();touch("QA concurrent B")})()');
   await Promise.all([sync(a),sync(b)]);
   const predicate='(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");return t.description==='+JSON.stringify(description)+'&&t.priority==='+JSON.stringify(priority)+'})()';let matched=false;
   for(let j=0;j<5;j++){await sync(a);await sync(b);await sync(a);if(await E(a,predicate)&&await E(b,predicate)){matched=true;break}}
   if(!matched)return false;
  }return true;
 });
 await test('attendance:child-and-group-membership',async()=>{
  await E(a,'closeModal();setView("attendance");attendanceChildModal(state.groups.find(g=>g.name==="QA GROUP").id)');
  await fill(a,'attendanceChildForm',{name:'QA ATTENDANCE CHILD',parentContact:'SYNTHETIC QA ONLY',startDate:'2026-09-01'});await save(a,'attendanceChildForm');
  return E(a,'(()=>{const child=state.attendanceChildren.find(c=>c.name==="QA ATTENDANCE CHILD"),g=state.groups.find(g=>g.name==="QA GROUP");return !!child&&state.attendanceMemberships.some(m=>m.childId===child.id&&m.groupId===g.id)})()');
 });
 await test('attendance:record-and-sync-training',async()=>{
  await E(a,'closeModal();attendanceSessionModal(null,state.groups.find(g=>g.name==="QA GROUP").id,"2026-09-07")');
  await fill(a,'attendanceSessionForm',{mode:'actual',makeupCount:0,trialCount:0,guestCount:0,notes:'QA ATTENDANCE SESSION'});await a.locator('#attendanceSessionForm select[data-att-child]').selectOption('present');await save(a,'attendanceSessionForm');
  await sync(a);await sync(b);
  return E(b,'(()=>{const s=state.attendanceSessions.find(s=>s.notes==="QA ATTENDANCE SESSION");return !!s&&attendanceSessionCounts(s).actual===1})()');
 });
 await test('attendance:week-archive',async()=>{
  await E(a,'closeModal();attendanceCloseWeekModal()');await fill(a,'attendanceCloseWeekForm',{comment:'QA WEEK ARCHIVE'});await save(a,'attendanceCloseWeekForm');await sync(a);await sync(b);
  return E(b,'state.attendanceWeekArchives.some(x=>x.comment==="QA WEEK ARCHIVE")');
 });
 await test('payroll:mentor-accrual-through-form',async()=>{
  await E(a,'closeModal()');await open(a,'payroll','addMentorPayment');await fill(a,'mentorPaymentForm',{mentorId:'tasya',date:'2026-09-07',category:'Премия',amount:700,reason:'QA MENTOR ACCRUAL',status:'accrued'});await save(a,'mentorPaymentForm');await sync(a);await sync(b);
  return E(b,'JSON.stringify(state.mentorPayroll).includes("QA MENTOR ACCRUAL")');
 });
 await test('sofa:owner-confirms-kpi-and-locks-snapshot',async()=>{
  await E(a,'closeModal();setView("sofa_motivation")');
  const toggle=a.locator('[data-action=sofa3ToggleKpi]').first();if(await toggle.count())await toggle.click();
  const before=await E(a,'sofa3Salary().total');await a.locator('[data-action=sofa3LockSalary]').click();
  await sync(a);await sync(b);return E(b,'!!sofa3EnsureMotivation().closedAt&&!!sofa3EnsureMotivation().snapshot&&Number.isFinite(sofa3Salary().total)');
 });
 await test('archive:close-month-through-form',async()=>{
  await E(a,'closeModal()');await open(a,'archive','closeMonth');await fill(a,'closeMonthForm',{fact:123000,load:65,tasksProgress:75,eventsCount:2,comment:'QA MONTH ARCHIVE'});await save(a,'closeMonthForm');await sync(a);await sync(b);
  return E(b,'JSON.stringify(state.archive).includes("QA MONTH ARCHIVE")');
 });
 await test('archive:snapshot-does-not-follow-live-edits',async()=>{
  const previous=await E(a,'JSON.stringify(state.archive)');await E(a,'currentMonth().fact=321000;touch("QA post-archive live edit")');await sync(a);await sync(b);return previous===await E(b,'JSON.stringify(state.archive)');
 });
 await test('sync:legacy-encrypted-state-can-be-read',()=>E(a,'(async()=>{const s=clone(state);delete s.sync65;const iv=crypto.getRandomValues(new Uint8Array(12));const data=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await cryptoKey(),new TextEncoder().encode(JSON.stringify(s))));const old=JSON.stringify({v:6,alg:"A256GCM",iv:bytesToB64(iv),data:bytesToB64(data),updatedAt:nowIso()});return (await decryptPayload(old)).tasks.length===s.tasks.length})()'));
 await test('ui:no-legacy-daily-report-tab',async()=>{await E(b,'closeModal();setView("operations")');return !(await b.locator('#pages').innerText()).includes('Отправить ежедневный отчёт')&&await b.locator('[data-tab=report]').count()===0});
 const Z=await fresh('owner','midnight-boundary'),z=Z.page;
 await test('date:Moscow-after-midnight-not-previous-day',async()=>{await z.clock.setFixedTime(new Date('2026-09-06T21:30:00Z'));return E(z,'today()==="2026-09-07"')});
 await Z.context.close();
`;
replaceOnce(' report.regression=results;',extra+'\n report.regression=results;');
// Use the exact compiled bundle; retain the original audit guard and browser-only
// instrumentation. Do not inject the source patches a second time.
replaceOnce("new Function('require',prefix+'\\n'+suite)(require);", "new Function('require',prefix+'\\n'+suite)(require);");
// In the actual source the separator is a JS newline escape, not a literal newline.
const call="new Function('require',prefix+'\\n'+suite)(require);";
// Construct the entry via a targeted replacement of the final invocation token.
const token="new Function('require',prefix+";
if(!source.includes(token))throw Error('Missing regression invocation');
source=source.replace(token,"new Function('require',prefix.replace(\"let html=fs.readFileSync('growth-os/index.html','utf8');\",\"let html=fs.readFileSync('audit-output/build/index.html','utf8');\").replace(/let patches=\\[[^\\n]+?join\\('\\\\n'\\);/,\"let patches='';\")+");
fs.writeFileSync('.github/scripts/growth65-final-generated.cjs',source);
require('./growth65-final-generated.cjs');
