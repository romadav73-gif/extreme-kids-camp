'use strict';
const fs=require('node:fs');
// Reuse the navigation harness; all data requests remain confined to disposable
// audit namespaces. This script NEVER runs against the club's real workspace.
const prefix=fs.readFileSync('.github/scripts/growth65-full-audit.cjs','utf8').split('(async()=>{\n const executablePath=')[0];
const suite=String.raw`
async function regression(){
 const results=[];
 async function test(name,fn){try{const value=await fn();const ok=value!==false;record(name,ok,{value});results.push({name,ok,value});return value}catch(e){record(name,false,{error:e.message});results.push({name,ok:false,error:e.message});return null}}
 async function fresh(role,space,person=''){const x=await newPage(role,person,space);x.page.setDefaultTimeout(7000);await stable(x.page);await E(x.page,'state.settings.autoSync=false;clearInterval(syncTimer);clearTimeout(saveTimer);persistLocal()');await sync(x.page);return x}
 async function fill(p,id,values){for(const [key,value] of Object.entries(values)){const el=p.locator('#'+id+' [name="'+key+'"]');const type=await el.getAttribute('type'),tag=await el.evaluate(x=>x.tagName);if(tag==='SELECT')await el.selectOption(String(value));else if(type==='checkbox')await el.setChecked(Boolean(value));else await el.fill(String(value))}}
 async function save(p,id){await p.locator('#'+id+' button[type=submit]').click();await p.waitForTimeout(40)}
 async function open(p,view,action){await E(p,'setView('+JSON.stringify(view)+')');await p.locator('[data-action="'+action+'"]').first().click()}
 const A=await fresh('owner','regression'),a=A.page;
 const B=await fresh('manager','regression'),b=B.page;
 await test('sync:new-device-no-duplicates',()=>E(b,'state.groups.length===68&&state.tasks.length===5'));
 await test('crypto:gzip-and-all-envelope-shapes',()=>E(a,'(async()=>{const x=await encryptState(state);return JSON.parse(x).zip==="gzip"&&(await decryptPayload(x)).version===6&&(await decryptPayload(JSON.parse(x))).version===6&&(await decryptPayload({data:x})).version===6})()'));
 await test('crypto:wrong-key-rejected',()=>E(a,'(async()=>{const x=await encryptState(state),k=credentials.key;try{credentials.key="wrong-audit-key";await decryptPayload(x);return false}catch{return true}finally{credentials.key=k}})()'));
 await test('crypto:corrupt-state-rejected',()=>E(a,'(async()=>{try{await decryptPayload({unexpected:"data"});return false}catch{return true}})()'));
 await test('form:task-create',async()=>{await open(a,'tasks','addTask');await fill(a,'taskForm',{title:'QA-NATIVE-TASK',ownerId:'sofia',description:'initial'});await save(a,'taskForm');return E(a,'state.tasks.some(t=>t.title==="QA-NATIVE-TASK")')});
 await test('sync:owner-to-manager',async()=>{await sync(a);await sync(b);return E(b,'state.tasks.some(t=>t.title==="QA-NATIVE-TASK")')});
 await test('form:manager-task-status',async()=>{await E(b,'setView("tasks");taskModal(state.tasks.find(t=>t.title==="QA-NATIVE-TASK"))');await fill(b,'taskForm',{status:'done'});await save(b,'taskForm');await sync(b);await sync(a);return E(a,'state.tasks.find(t=>t.title==="QA-NATIVE-TASK")?.status==="done"')});
 await test('sync:concurrent-independent-fields',async()=>{
  await E(a,'(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");t.description="owner changed";t.updatedAt=nowIso();touch("QA owner edit")})()');
  await E(b,'(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");t.priority="low";t.updatedAt=nowIso();touch("QA manager edit")})()');
  await Promise.all([sync(a),sync(b)]);await sync(a);await sync(b);
  return E(a,'(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");return t.description==="owner changed"&&t.priority==="low"})()');
 });
 await test('sync:stale-open-form-preserves-new-field',async()=>{
  await E(a,'setView("tasks");taskModal(state.tasks.find(t=>t.title==="QA-NATIVE-TASK"))');await fill(a,'taskForm',{description:'typed in open form'});
  await E(b,'(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");t.priority="high";t.updatedAt=nowIso();touch("QA remote priority")})()');await sync(b);await sync(a);
  await save(a,'taskForm');await sync(a);await sync(b);
  return E(b,'(()=>{const t=state.tasks.find(t=>t.title==="QA-NATIVE-TASK");return t.description==="typed in open form"&&t.priority==="high"})()');
 });
 await test('sync:concurrent-revenue-rows',async()=>{
  await E(a,'currentMonth().daily.push({id:"qa-revenue-a",date:"2026-09-01",amount:100,updatedAt:nowIso()});touch("QA revenue A")');
  await E(b,'currentMonth().daily.push({id:"qa-revenue-b",date:"2026-09-02",amount:200,updatedAt:nowIso()});touch("QA revenue B")');
  await Promise.all([sync(a),sync(b)]);await sync(a);await sync(b);return E(a,'currentMonth().daily.filter(x=>x.id.startsWith("qa-revenue-")).length===2');
 });
 await test('sync:deleted-revenue-does-not-return',async()=>{await E(a,'currentMonth().daily=currentMonth().daily.filter(x=>x.id!=="qa-revenue-a");touch("QA revenue deletion")');await sync(a);await sync(b);return E(b,'!currentMonth().daily.some(x=>x.id==="qa-revenue-a")')});
 await test('sync:month-selection-is-local',async()=>{await E(a,'state.settings.currentMonth="2026-10";persistLocal()');await sync(a);await sync(b);const ok=await E(b,'state.settings.currentMonth==="2026-09"');await E(a,'state.settings.currentMonth="2026-09";persistLocal()');return ok});
 await test('sync:offline-edit-reconnect',async()=>{
  await A.context.setOffline(true);await E(a,'state.tasks.push({id:"qa-offline",title:"QA OFFLINE",ownerId:"sofia",status:"todo",monthKey:"2026-09",updatedAt:nowIso()});touch("QA offline")');
  const rejected=!(await sync(a)),stored=await E(a,'JSON.parse(localStorage.getItem(storageKey())).tasks.some(t=>t.id==="qa-offline")');await A.context.setOffline(false);const restored=await sync(a);await sync(b);return rejected&&stored&&restored&&await E(b,'state.tasks.some(t=>t.id==="qa-offline")');
 });
 await test('sync:reload-keeps-records',async()=>{await a.reload({waitUntil:'domcontentloaded'});await a.waitForFunction(()=>window.__qa65);await stable(a);await sync(a);return E(a,'state.tasks.some(t=>t.id==="qa-offline")')});
 const formCases=[
  ['groups','addGroup','groupForm',{name:'QA GROUP',mentorId:'ivan',time:'16:30',capacity:10,students:4,monthlyPrice:9000},'state.groups.some(x=>x.name==="QA GROUP"&&x.capacity===10&&x.students===4)'],
  ['goals','addGoal','goalForm',{title:'QA GOAL',target:80,notes:'QA audit'},'state.goals.some(x=>x.title==="QA GOAL")'],
  ['calendar','addEvent','eventForm',{title:'QA EVENT',date:'2026-09-10',time:'16:00',venue:'QA synthetic venue'},'state.events.some(x=>x.title==="QA EVENT")'],
  ['analytics','addRevenue','revenueForm',{date:'2026-09-07',amount:1000,note:'QA native revenue'},'currentMonth().daily.some(x=>x.amount===1000)'],
  ['admin','addAdminSale','adminSaleForm',{adminId:'anya',date:'2026-09-07',type:'group',amount:10000,client:'QA synthetic client',countInRevenue:true},'adminOpsMonth().sales.some(x=>x.client==="QA synthetic client")'],
  ['admin','addAdminShift','adminShiftForm',{adminId:'anya',date:'2026-09-07',status:'worked',note:'QA shift'},'adminOpsMonth().shifts.some(x=>x.note==="QA shift")'],
  ['admin','addAdminAdjustment','adminAdjustmentForm',{adminId:'anya',date:'2026-09-07',type:'premium',amount:500,note:'QA premium'},'adminOpsMonth().adjustments.some(x=>x.note==="QA premium")'],
  ['mentor','addRecommendation','recommendationForm',{childName:'QA CHILD',recommendation:'QA recommendation'},'state.recommendations.some(x=>x.childName==="QA CHILD")'],
  ['documents','addStaffDuty','staffDutyForm',{title:'QA DUTY',description:'QA duty'},'JSON.stringify(state).includes("QA DUTY")'],
  ['documents','addStaffDocument','staffDocumentForm',{title:'QA DOCUMENT',url:'https://example.com/audit',notes:'QA document'},'JSON.stringify(state).includes("QA DOCUMENT")'],
  ['meeting','addMeetingAgenda','meetingAgendaForm',{title:'QA AGENDA',notes:'QA meeting agenda'},'JSON.stringify(state).includes("QA AGENDA")'],
 ];
 for(const [view,action,id,values,assertion] of formCases)await test('form:save:'+id,async()=>{await E(a,'closeModal()');await open(a,view,action);await fill(a,id,values);await save(a,id);return E(a,assertion)});
 await test('form:invalid-group-capacity-blocked',async()=>{await E(a,'closeModal()');await open(a,'groups','addGroup');await fill(a,'groupForm',{name:'QA INVALID',capacity:2,students:8,time:'16:00'});await save(a,'groupForm');const ok=await E(a,'!state.groups.some(g=>g.name==="QA INVALID")');await E(a,'closeModal()');return ok});
 await test('form:foreign-month-revenue-blocked',async()=>{await open(a,'analytics','addRevenue');await fill(a,'revenueForm',{date:'2026-10-01',amount:99991});await save(a,'revenueForm');const ok=await E(a,'!currentMonth().daily.some(x=>x.amount===99991)');await E(a,'closeModal()');return ok});
 await test('sofa:save-operational-numbers',async()=>{await E(b,'setView("sofa_numbers")');await fill(b,'sofa65NumbersForm',{unanswered:2,attended:4,sold:2,renewDue:6,renewDone:3,expected:10000,unpaidClients:1,unpaidAmount:2000});await save(b,'sofa65NumbersForm');await sync(b);await sync(a);return E(a,'sofa3EnsureDay().metrics.attended===4&&sofa3EnsureDay().metrics.sold===2')});
 await test('sofa:invalid-conversion-blocked',async()=>{await E(b,'setView("sofa_numbers")');await fill(b,'sofa65NumbersForm',{attended:1,sold:10});await save(b,'sofa65NumbersForm');return E(b,'sofa3EnsureDay().metrics.sold!==10')});
 await test('sofa:finite-motivation-calculation',()=>E(a,'(()=>{const x=sofa3Salary();return Number.isFinite(x.total)&&Number.isFinite(x.variable)&&x.total>=0})()'));
 await test('sofa:manager-cannot-confirm-own-kpi',async()=>{await E(b,'setView("sofa_motivation")');const before=await E(b,'JSON.stringify(sofa3EnsureMotivation().checks)');await E(b,'(()=>{const e=document.createElement("button");e.dataset.action="sofa3ToggleKpi";e.dataset.key=SOFA3_KPIS[0][0];document.body.appendChild(e);e.click();e.remove()})()');return before===await E(b,'JSON.stringify(sofa3EnsureMotivation().checks)')});
 const T=await fresh('team','team-regression'),t=T.page;
 await test('access:team-event-write-blocked',()=>E(t,'(()=>{eventModal();const f=document.querySelector("#eventForm");f.elements.title.value="QA FORBIDDEN EVENT";f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));return !state.events.some(e=>e.title==="QA FORBIDDEN EVENT")})()'));
 const M=await fresh('mentor','mentor-regression','tasya'),m=M.page;
 await test('access:mentor-group-scope',()=>E(m,'groupScopeList().every(g=>g.mentorId===mentorViewerId())'));
 await test('access:mentor-task-scope',()=>E(m,'taskScopeList().every(t=>t.ownerId===mentorViewerId())'));
 await test('access:mentor-cannot-edit-another-task',()=>E(m,'(()=>{const t=state.tasks.find(x=>x.ownerId!==mentorViewerId());const f=document.createElement("form");f.id="taskForm";f.dataset.id=t.id;f.innerHTML="<input name=title value=FORBIDDEN><input name=ownerId value=tasya>";document.body.appendChild(f);const before=t.title;f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));f.remove();return state.tasks.find(x=>x.id===t.id).title===before})()'));
 await test('access:calendar-hides-other-staff-tasks',()=>E(m,'(()=>{setView("calendar");const txt=document.querySelector("#pages").innerText;return !state.tasks.filter(t=>t.ownerId!==mentorViewerId()).some(t=>txt.includes(t.title))})()'));
 // Known architecture blocker: do not conceal a failure behind menu tests.
 await test('SECURITY:role-link-cannot-escalate',async()=>{const u=new URL(t.url()),h=new URLSearchParams(u.hash.slice(1));h.set('r','owner');u.hash=h.toString();await t.goto(u.toString());await t.reload({waitUntil:'domcontentloaded'});await t.waitForFunction(()=>window.__qa65);return E(t,'currentRole!=="owner"')});
 report.regression=results;
 await A.context.close();await B.context.close();await T.context.close();await M.context.close();
}
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const role of ['owner','manager','stas','mentor','admin','team'])await inspectRole(role);
  for(const role of ['owner','manager','mentor','admin'])await inspectRole(role,390);
  await regression();
 }catch(e){record('regression-harness',false,{error:e.stack})}
 finally{
  await browser.close();record('no-production-data-touched',report.blockedWorkspaces.length===0);record('no-runtime-errors',report.runtimeErrors.length===0,{errors:report.runtimeErrors});
  report.summary={total:report.tests.length,passed:report.tests.filter(x=>x.ok).length,failed:report.tests.filter(x=>!x.ok).length,pages:report.pages.length};
  fs.writeFileSync(OUT+'/candidate-report.json',JSON.stringify(report,null,2));
  fs.writeFileSync(OUT+'/candidate-failures.json',JSON.stringify(report.tests.filter(x=>!x.ok),null,2));
  fs.copyFileSync('growth-os/audit65-fixes.patch.js',OUT+'/tested-audit65-fixes.patch.js');
  console.log('CANDIDATE_SUMMARY '+JSON.stringify(report.summary));console.log('CANDIDATE_FAILURES '+JSON.stringify(report.tests.filter(x=>!x.ok)));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
`;
new Function('require',prefix+'\n'+suite)(require);
