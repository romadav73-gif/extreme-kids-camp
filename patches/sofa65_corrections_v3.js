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
