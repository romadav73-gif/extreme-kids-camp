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
