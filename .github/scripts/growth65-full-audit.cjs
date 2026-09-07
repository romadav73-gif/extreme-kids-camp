'use strict';
// This harness NEVER uses the real club workspace. All cloud traffic is restricted
// to disposable, randomly keyed audit namespaces. Instrumentation exists only in
// the browser's intercepted response, never in the deployed application.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const BASE='https://extreme-kids-roller-control-v6.vercel.app';
const RUN=String(process.env.GITHUB_RUN_ID||Date.now());
const PREFIX='ek65-audit-'+RUN;
const KEY=crypto.randomBytes(32).toString('hex');
const OUT='audit-output';fs.mkdirSync(OUT,{recursive:true});
const report={date:new Date().toISOString(),base:BASE,run:RUN,mode:process.env.AUDIT_MODE||'production',tests:[],pages:[],forms:[],runtimeErrors:[],networkErrors:[],blockedWorkspaces:[],source:[],limitations:['Synthetic data only; no real client records or employee credentials used.']};
function record(name,ok,details={},severity='error'){const r={name,ok:!!ok,severity,...details};report.tests.push(r);console.log('AUDIT '+JSON.stringify(r));return ok;}
const instrument="\nwindow.__qa65={run:function(source){return eval(source)}};\n";
function inject(html){const marker="document.addEventListener('click',handleClick);";if(!html.includes(marker))return html;return html.replace(marker,instrument+marker);}
const E=(p,s)=>p.evaluate(source=>window.__qa65.run(source),s);
let browser;
async function newPage(role,person='',workspace='role-'+role+'-'+(person||'base'),width=1440,view=''){
 const context=await browser.newContext({viewport:{width,height:1000},timezoneId:'Europe/Moscow',ignoreHTTPSErrors:true});
 await context.route('**/mantledb.sh/**',async route=>{const u=new URL(route.request().url());if(!u.pathname.startsWith('/v2/'+PREFIX+'-')){report.blockedWorkspaces.push({method:route.request().method(),host:u.host});return route.abort();}return route.continue();});
 if(process.env.AUDIT_MODE==='candidate'){
  let html=fs.readFileSync('growth-os/index.html','utf8');
  const marker="document.addEventListener('click',handleClick);";
  let patches=['growth-os/sofa-cabinet-v4.patch.js','growth-os/sofa-cabinet-v4.1.patch.js','growth-os/audit65-fixes.patch.js'].filter(x=>fs.existsSync(x)).map(x=>fs.readFileSync(x,'utf8')).join('\n');
  html=inject(html.replace(marker,patches+'\n'+marker));
  await context.route(BASE+'/**',route=>{if(route.request().resourceType()==='document')return route.fulfill({status:200,contentType:'text/html',body:html});return route.continue();});
 }else{
  await context.route('**/growth-os/index.html',async route=>{const r=await route.fetch();return route.fulfill({response:r,body:inject(await r.text())});});
 }
 const page=await context.newPage();
 page.on('pageerror',err=>report.runtimeErrors.push({role,person,view:page.url().split('#')[0],error:String(err)}));
 page.on('requestfailed',r=>{if(!r.url().includes('mantledb.sh')&&!r.url().includes('favicon'))report.networkErrors.push({role,host:new URL(r.url()).host,error:r.failure()?.errorText});});
 page.on('dialog',d=>d.dismiss());
 const hash=new URLSearchParams({w:PREFIX+'-'+workspace,k:KEY,r:role,t:'audit-'+RUN});if(person){hash.set('m',person);hash.set('a',person);hash.set('p',person)}if(view)hash.set('v',view);
 await page.goto(BASE+'/?audit='+RUN+'#'+hash,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__qa65&&document.querySelector('#appShell')&&!document.querySelector('#appShell').classList.contains('hidden'),{},{timeout:45000});
 await page.waitForTimeout(400);
 return {page,context,workspace};
}
async function stable(p){await p.waitForFunction(()=>window.__qa65&&!window.__qa65.run('syncing'),{},{timeout:30000});}
async function sync(p,push=true){await stable(p);return E(p,'syncNow({quiet:true,push:'+push+'})');}
function safeFilename(s){return s.replace(/[^a-z0-9_-]/gi,'_');}
async function inspectRole(role,width=1440){
 const {page:p,context}=await newPage(role,role==='mentor'?'ivan':role==='admin'?'anya':'','nav-'+role+'-'+width,width);
 try{
  await stable(p);
  const nav=await E(p,'NAV.flatMap(s=>s.items).filter(x=>x.roles.includes(currentRole)).map(x=>({id:x.id,label:x.label}))');
  const seen=new Set();
  for(const n of nav){
   try{
    await E(p,'setView('+JSON.stringify(n.id)+')');await p.waitForTimeout(80);
    const detail=await p.evaluate(()=>({title:document.querySelector('#pageTitle')?.textContent,text:document.querySelector('#pages')?.innerText||'',width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,actions:[...document.querySelectorAll('#pages [data-action]')].map(e=>({action:e.dataset.action,label:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,90),data:{...e.dataset}})),forms:[...document.querySelectorAll('#pages form')].map(f=>({id:f.id,fields:[...f.elements].map(e=>({name:e.name,type:e.type,min:e.min,max:e.max,required:e.required,value:e.type==='password'?'':e.value})).filter(e=>e.name)}))}));
    report.pages.push({role,width,id:n.id,label:n.label,title:detail.title,chars:detail.text.length,actions:detail.actions,forms:detail.forms});
    record('view:'+role+':'+width+':'+n.id,detail.text.length>30&&!/Ошибка запуска|ReferenceError|TypeError/.test(detail.text),{title:detail.title});
    record('layout:'+role+':'+width+':'+n.id,detail.scroll<=detail.width+2,{viewport:detail.width,documentWidth:detail.scroll},'warning');
    if(/\bNaN\b|Infinity|\bundefined\b/.test(detail.text))record('finite-values:'+role+':'+n.id,false,{excerpt:detail.text.match(/.{0,60}(?:NaN|Infinity|undefined).{0,60}/)?.[0]});
    if(width===390||['manager','settings','sofa_motivation','attendance','mentor','admin'].includes(n.id))await p.screenshot({path:OUT+'/'+safeFilename(role+'-'+width+'-'+n.id)+'.png',fullPage:true});
    if(width===1440){
     const subtabs=detail.actions.filter(a=>/tab/i.test(a.action)&&!/(delete|close|lock|toggle|save|add)/i.test(a.action));
     for(const item of subtabs.slice(0,24)){
      const key=JSON.stringify(item.data);if(seen.has(key))continue;seen.add(key);
      try{
       await E(p,'setView('+JSON.stringify(n.id)+')');
       await p.evaluate(data=>{const e=[...document.querySelectorAll('#pages [data-action]')].find(e=>Object.entries(data).every(([k,v])=>e.dataset[k]===v));e?.click()},item.data);
       await p.waitForTimeout(60);
       const txt=await p.locator('#pages').innerText();
       record('subtab:'+role+':'+n.id+':'+item.label,txt.length>30&&!/ReferenceError|TypeError/.test(txt));
      }catch(e){record('subtab:'+role+':'+n.id+':'+item.label,false,{error:e.message.slice(0,250)})}
     }
     const opens=detail.actions.filter(a=>/^(add|new|edit|open)/i.test(a.action)&&!/(import|reset|reopen|export|sync)/i.test(a.action));
     for(const item of opens.slice(0,6)){
      const key=n.id+':'+item.action;if(seen.has(key))continue;seen.add(key);
      try{
       await E(p,'setView('+JSON.stringify(n.id)+')');
       await p.evaluate(data=>{const e=[...document.querySelectorAll('#pages [data-action]')].find(e=>Object.entries(data).every(([k,v])=>e.dataset[k]===v));e?.click()},item.data);await p.waitForTimeout(100);
       const f=await p.evaluate(()=>({title:document.querySelector('#modalTitle')?.innerText,open:!document.querySelector('#modal')?.classList.contains('hidden'),forms:[...document.querySelectorAll('#modal form')].map(f=>({id:f.id,fields:[...f.elements].filter(e=>e.name).map(e=>({name:e.name,type:e.type,required:e.required,min:e.min,max:e.max,options:e.tagName==='SELECT'?[...e.options].map(o=>({v:o.value,t:o.text})):undefined}))}))}));
       report.forms.push({role,view:n.id,action:item.action,...f});
       record('open-action:'+role+':'+n.id+':'+item.action,f.open||!!(await E(p,'currentView!=='+JSON.stringify(n.id))),{modal:f.title},'warning');
       await E(p,'closeModal()');
      }catch(e){record('open-action:'+role+':'+n.id+':'+item.action,false,{error:e.message.slice(0,250)})}
     }
    }
   }catch(e){record('view:'+role+':'+width+':'+n.id,false,{error:e.message.slice(0,350)})}
  }
  const all=await E(p,'NAV.flatMap(s=>s.items).filter(x=>!x.roles.includes(currentRole)).map(x=>x.id)');
  for(const id of all){await E(p,'setView('+JSON.stringify(id)+')');const got=await E(p,'currentView');record('route-guard:'+role+':'+id,got!==id,{actual:got});}
  if(role!=='owner'){
   const full=await E(p,'({payroll:!!state.payroll,months:!!state.months,settings:!!state.settings,people:state.people.length,keys:Object.keys(state)})');
   report.tests.push({name:'data-scope:'+role,ok:false,severity:'critical',detail:'The browser holds shared workspace state; menu filtering is not server authorization.',stateKeys:full.keys});
  }
 }finally{await context.close()}
}
async function syncTests(){
 const A=await newPage('owner','','sync');const a=A.page;await stable(a);record('cloud-initial-push',await sync(a));
 const baseline=await E(a,'({groups:state.groups.length,tasks:state.tasks.length})');
 const B=await newPage('manager','','sync');const b=B.page;await stable(b);await sync(b,false);
 const bcounts=await E(b,'({groups:state.groups.length,tasks:state.tasks.length})');
 record('fresh-device-no-seed-duplicates',baseline.groups===bcounts.groups&&baseline.tasks===bcounts.tasks,{baseline,second:bcounts});
 const fnNames=['readCredentials','initCredentials','storageKey','linkFor','personalLink','makeLink','canEdit','canEditGroup','canEditTask','canEditSalary','activeGroups','activeTasks','tasksForMonth','sofa65RecomputeStats','sofa3Salary','sofa3SaveNumbers','sofa65V4SilentTouch','syncNow','pushRemote','fetchRemote','decryptPayload','mergeStates','handleClick','handleSubmit'];
 for(const name of fnNames){const src=await E(a,'(()=>{try{return typeof '+name+'===\'function\'?String('+name+'):null}catch{return null}})()');if(src)report.source.push({name,source:src.slice(0,26000)})}
 await E(a,"state.tasks.push({id:'qa-sync-task',title:'QA ONLY: synchronization',ownerId:'sofia',status:'todo',priority:'medium',deadline:today(),monthKey:state.settings.currentMonth,updatedAt:nowIso()});touch('QA isolated task')");
 record('owner-push-task',await sync(a));await sync(b,false);
 record('owner-to-manager-task',await E(b,"state.tasks.some(t=>t.id==='qa-sync-task')"));
 await E(b,"(()=>{const t=state.tasks.find(t=>t.id==='qa-sync-task');if(!t)throw Error('Missing test task');t.status='done';t.updatedAt=nowIso();touch('QA isolated task status')})()");await sync(b);await sync(a,false);
 record('manager-to-owner-status',await E(a,"state.tasks.find(t=>t.id==='qa-sync-task')?.status==='done'"));
 await a.reload({waitUntil:'domcontentloaded'});await a.waitForFunction(()=>window.__qa65);await stable(a);await sync(a,false);
 record('reload-persistence',await E(a,"state.tasks.find(t=>t.id==='qa-sync-task')?.status==='done'"));
 await E(a,"(()=>{const t=state.tasks.find(t=>t.id==='qa-sync-task');t.deletedAt=nowIso();t.updatedAt=t.deletedAt;touch('QA isolated deletion')})()");await sync(a);await sync(b,false);
 record('delete-tombstone-sync',await E(b,"!!state.tasks.find(t=>t.id==='qa-sync-task')?.deletedAt"));
 const merge=await E(a,"(()=>{const x=clone(state),y=clone(state),t0='2026-09-01T00:00:00.000Z',t1='2026-09-02T00:00:00.000Z';x.tasks=[{id:'qa-conflict',title:'EDIT A',status:'todo',updatedAt:t0}];y.tasks=[{id:'qa-conflict',title:'BASE',status:'done',updatedAt:t1}];const t=mergeStates(x,y).tasks[0];const k=state.settings.currentMonth;const mx=clone(state),my=clone(state);mx.months[k]={...mx.months[k],daily:[{date:k+'-01',amount:100,updatedAt:t0}],updatedAt:t0};my.months[k]={...my.months[k],daily:[{date:k+'-02',amount:200,updatedAt:t1}],updatedAt:t1};return {task:t,dates:mergeStates(mx,my).months[k].daily}})()");
 record('concurrent-distinct-task-fields',merge.task.title==='EDIT A'&&merge.task.status==='done',{actual:merge.task},'critical');
 record('concurrent-revenue-dates',merge.dates.length===2,{dates:merge.dates.map(x=>x.date)},'critical');
 const cryptoResult=await E(a,"(async()=>{const s=clone(state),enc=await encryptState(s);let str=false,obj=false,badRejected=false;try{str=(await decryptPayload(enc))?.version===s.version}catch{}try{obj=(await decryptPayload(JSON.parse(enc)))?.version===s.version}catch{}const original=credentials.key;try{credentials.key='different-audit-key';await decryptPayload(enc)}catch{badRejected=true}finally{credentials.key=original}return{str,obj,badRejected}})()");
 record('encrypted-roundtrip-string',cryptoResult.str);record('encrypted-roundtrip-object',cryptoResult.obj);record('wrong-key-rejected',cryptoResult.badRejected);
 await A.context.setOffline(true);await E(a,"state.tasks.push({id:'qa-offline-task',title:'QA offline',ownerId:'sofia',status:'todo',monthKey:state.settings.currentMonth,updatedAt:nowIso()});touch('QA offline')");
 const offline=await sync(a);record('offline-no-false-success',!offline);record('offline-local-persistence',await E(a,"JSON.parse(localStorage.getItem(storageKey())).tasks.some(t=>t.id==='qa-offline-task')"));await A.context.setOffline(false);await sync(a);await sync(b,false);record('offline-reconnect-sync',await E(b,"state.tasks.some(t=>t.id==='qa-offline-task')"));
 // Editing the role field on a link must not grant owner rights. Only a disposable
 // audit workspace is used here. Do not log any capability or production URL hash.
 const C=await newPage('team','','sync');const c=C.page;await stable(c);
 const u=new URL(c.url());const h=new URLSearchParams(u.hash.slice(1));h.set('r','owner');u.hash=h.toString();await c.goto(u.toString(),{waitUntil:'domcontentloaded'});await c.reload({waitUntil:'domcontentloaded'});await c.waitForFunction(()=>window.__qa65);await stable(c);
 const escalated=await E(c,"currentRole==='owner'&&allowedView('settings')");record('role-escalation-blocked',!escalated,{},'critical');
 await A.context.close();await B.context.close();await C.context.close();
}
(async()=>{
 const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--ignore-certificate-errors']});
 try{
  for(const role of ['owner','manager','stas','mentor','admin','team']){try{await inspectRole(role)}catch(e){record('role-boot:'+role,false,{error:e.message})}}
  for(const role of ['owner','manager','mentor','admin']){try{await inspectRole(role,390)}catch(e){record('mobile-boot:'+role,false,{error:e.message})}}
  try{await syncTests()}catch(e){record('sync-suite',false,{error:e.stack})}
 }finally{
  if(browser)await browser.close();
  record('no-cross-workspace-traffic',report.blockedWorkspaces.length===0,{blocked:report.blockedWorkspaces.length},'critical');
  record('no-runtime-errors',report.runtimeErrors.length===0,{errors:report.runtimeErrors});
  report.summary={total:report.tests.length,passed:report.tests.filter(t=>t.ok).length,failed:report.tests.filter(t=>!t.ok).length,critical:report.tests.filter(t=>!t.ok&&t.severity==='critical').length,pages:report.pages.length};
  fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));
  fs.writeFileSync(OUT+'/source-functions.json',JSON.stringify(report.source,null,2));
  console.log('AUDIT_SUMMARY '+JSON.stringify(report.summary));
  console.log('AUDIT_FORMS '+JSON.stringify(report.forms));
  console.log('AUDIT_RUNTIME '+JSON.stringify(report.runtimeErrors));
  console.log('AUDIT_SOURCE '+JSON.stringify(report.source));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'# Growth OS 6.5 full audit\n\n'+JSON.stringify(report.summary)+'\n\n'+report.tests.filter(t=>!t.ok).map(t=>'- **'+t.severity+'** '+t.name+': '+(t.error||t.detail||JSON.stringify(t))).join('\n'));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
