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
