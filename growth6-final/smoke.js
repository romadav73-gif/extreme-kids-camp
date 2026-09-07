(()=>{
  const p=new URLSearchParams(location.search);
  if(p.get('smoke')!=='1')return;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const wait=async(fn,timeout=18000)=>{const start=Date.now();while(Date.now()-start<timeout){try{if(fn())return}catch(_e){}await sleep(90)}throw new Error('Timeout waiting for application')};
  const fail=e=>{document.title='GROWTH6_SMOKE_FAIL';const x=document.createElement('pre');x.id='growth6-smoke-result';x.textContent='GROWTH6_SMOKE_FAIL\n'+String(e&&e.stack||e);document.body.appendChild(x)};
  window.__growth6Errors=[];
  addEventListener('error',e=>window.__growth6Errors.push(String(e.error||e.message||'window error')));
  addEventListener('unhandledrejection',e=>window.__growth6Errors.push(String(e.reason||'unhandled rejection')));
  addEventListener('load',async()=>{try{
    await wait(()=>window.EKGrowthOS&&document.querySelector('#app:not(.hidden)')&&document.querySelectorAll('#nav [data-id]').length>=10);
    const cs=getComputedStyle(document.documentElement);
    const yellow=(cs.getPropertyValue('--ek-yellow').trim()||cs.getPropertyValue('--yellow').trim()).toLowerCase();
    const font=parseFloat(getComputedStyle(document.body).fontSize);
    if(window.EKGrowthOS.version!=='6.0.0')throw new Error('Wrong version '+window.EKGrowthOS.version);
    if(!yellow.includes('f0c72f')&&!yellow.includes('240, 199, 47'))throw new Error('Wrong yellow '+yellow);
    if(font<16)throw new Error('Font too small '+font);
    const views=['dashboard','analytics','year','groups','strategy','tasks','calendar','events','archive','stas','teamboards','admin','coach'];
    const ok=[];
    for(const view of views){
      window.EKGrowthOS.navigate(view);await sleep(110);
      const page=document.querySelector('#content'),txt=(page?.innerText||'').trim();
      if(!page||page.children.length===0||txt.length<18)throw new Error('Empty view '+view);
      if(/\bundefined\b|\bNaN\b/.test(txt))throw new Error('Invalid value in '+view);
      if(!document.querySelector(`#nav [data-id="${view}"].active`))throw new Error('Active tab missing '+view);
      ok.push(view+':ok');
    }
    window.EKGrowthOS.navigate('analytics');await sleep(160);
    if(!document.querySelector('#content .analytics-page'))throw new Error('Analytics page missing');
    if(document.querySelectorAll('#content svg,#content .donut,#content .month-bars').length<3)throw new Error('Analytics charts missing');
    window.EKGrowthOS.navigate('tasks');await sleep(100);window.taskForm();await sleep(100);
    if(document.querySelector('#modal')?.classList.contains('hidden'))throw new Error('Task modal failed');
    window.closeModal();
    await Promise.race([window.EKGrowthOS.sync(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Sync timeout')),15000))]);
    await wait(()=>document.querySelector('#syncText')?.textContent.includes('Синхронизировано'),6000);
    if(window.__growth6Errors.length)throw new Error(window.__growth6Errors.join(' | '));
    document.title='GROWTH6_SMOKE_OK';const x=document.createElement('pre');x.id='growth6-smoke-result';x.textContent='GROWTH6_SMOKE_OK\n'+ok.join('\n')+'\nyellow='+yellow+'\nfont='+font+'\nsync=ok';document.body.appendChild(x);
  }catch(e){fail(e)}},{once:true});
})();
