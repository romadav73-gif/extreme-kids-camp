// SOFA65_FINISH_V2_START
const SOFA65_FINISH_BUILD='2026.09.03-sofa-cabinet-finish-v2';

(function sofa65PrepareNavigation(){
  if(SOFA3_CHECK_GROUPS['Закрытие дня'])SOFA3_CHECK_GROUPS['Закрытие дня']=SOFA3_CHECK_GROUPS['Закрытие дня'].filter(([key])=>key!=='close_report');
  const reportRhythmIndex=SOFA3_RHYTHM.findIndex(([,title])=>title==='Отчёт Роману');
  if(reportRhythmIndex>=0)SOFA3_RHYTHM.splice(reportRhythmIndex,1);
  const closeIndex=SOFA3_RHYTHM.findIndex(([,title])=>title==='Закрытие системы');
  if(closeIndex>=0)SOFA3_RHYTHM[closeIndex]=['21:15','Закрытие системы','Касса, CRM, задачи и инциденты актуальны. Всё важное зафиксировано в общей системе.'];

  const moveIds=new Set(['manager','operations','meeting','sofa_numbers','sofa_motivation','sofa_system']);
  for(const section of NAV)section.items=section.items.filter(x=>!moveIds.has(x.id));
  const oldSection=NAV.findIndex(s=>s.section==='Софа · управляющая');
  if(oldSection>=0)NAV.splice(oldSection,1);
  const cabinetIndex=NAV.findIndex(s=>s.section==='Кабинеты');
  const insertAt=cabinetIndex>=0?cabinetIndex:Math.min(2,NAV.length);
  NAV.splice(insertAt,0,{section:'Софа · управляющая',items:[
    {id:'manager',label:'Главная Софы',icon:'admin',roles:['owner','manager']},
    {id:'operations',label:'Контроль дня',icon:'tasks',roles:['owner','manager']},
    {id:'sofa_numbers',label:'Цифры клуба',icon:'analytics',roles:['owner','manager']},
    {id:'meeting',label:'Собрания',icon:'team',roles:['owner','manager']},
    {id:'sofa_motivation',label:'Мотивация Софы',icon:'revenue',roles:['owner','manager']},
    {id:'sofa_system',label:'Система управляющей',icon:'goals',roles:['owner','manager']}
  ]});
})();

function sofa65RecomputeStats(dateValue=sofa3SelectedDate()){
  const s=sofa3Stats(dateValue),day=s.day;
  const activeCheckKeys=Object.values(SOFA3_CHECK_GROUPS).flat().map(([key])=>key);
  const checkDone=activeCheckKeys.filter(key=>Boolean(day.checks?.[key])).length;
  const rhythmDone=SOFA3_RHYTHM.filter((_,i)=>Boolean(day.rhythm?.[i])).length;
  const readiness=Math.round(((activeCheckKeys.length?checkDone/activeCheckKeys.length:0)*.72+(SOFA3_RHYTHM.length?rhythmDone/SOFA3_RHYTHM.length:0)*.28)*100);
  return{...s,readiness,checkDone,checkTotal:activeCheckKeys.length,rhythmDone,rhythmTotal:SOFA3_RHYTHM.length};
}

function sofa65NumbersDatebar(){
  const d=sofa3SelectedDate();
  return`<div class="operations-datebar"><div class="operations-date-nav"><button class="icon-btn" data-action="sofa3PrevDay">‹</button><div class="operations-date-copy"><span>Рабочая дата</span><b>${esc(sofa3PrettyDate(d))}</b></div><button class="icon-btn" data-action="sofa3NextDay">›</button></div><div class="operations-date-actions"><input class="input" type="date" data-filter="sofa3OpsDate" value="${d}" style="width:auto"><button class="btn btn-ghost" data-action="sofa3Today">Сегодня</button></div></div>`;
}

function sofa65RevenueChart(month){
  const grouped={};
  for(const x of (month.daily||[])){
    if(x.deletedAt||!x.date)continue;
    grouped[x.date]=(grouped[x.date]||0)+(Number(x.amount)||0);
  }
  const rows=Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0]));
  if(rows.length<2)return`<div class="empty"><b>График появится автоматически</b>Нужно минимум два дня с фактической выручкой.</div>`;
  let running=0;
  const points=rows.map(([date,amount])=>({date,amount,cumulative:(running+=amount)}));
  const w=760,h=220,padX=24,padY=22,max=Math.max(Number(month.target)||0,...points.map(x=>x.cumulative),1);
  const xAt=i=>padX+i*(w-padX*2)/Math.max(1,points.length-1);
  const yAt=v=>h-padY-(v/max)*(h-padY*2);
  const line=points.map((p,i)=>`${i?'L':'M'}${xAt(i).toFixed(1)},${yAt(p.cumulative).toFixed(1)}`).join(' ');
  const area=`${line} L${xAt(points.length-1).toFixed(1)},${h-padY} L${xAt(0).toFixed(1)},${h-padY} Z`;
  const targetY=yAt(Number(month.target)||0).toFixed(1);
  return`<div class="sofa65-chart"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sofa65Area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0c72f" stop-opacity=".3"/><stop offset="1" stop-color="#f0c72f" stop-opacity="0"/></linearGradient></defs><line class="sofa65-gridline" x1="${padX}" y1="${h/2}" x2="${w-padX}" y2="${h/2}"/><line class="sofa65-target" x1="${padX}" y1="${targetY}" x2="${w-padX}" y2="${targetY}"/><path class="sofa65-area" d="${area}"/><path class="sofa65-line" d="${line}"/>${points.map((p,i)=>`<circle class="sofa65-point" cx="${xAt(i)}" cy="${yAt(p.cumulative)}" r="4"/>`).join('')}</svg><div class="sofa65-chart-labels"><span>${formatDateShort(points[0].date)}</span><span>План ${compactMoney(month.target||0)}</span><span>${formatDateShort(points.at(-1).date)}</span></div></div>`;
}

function sofa65NumbersPage(){
  const s=sofa65RecomputeStats(),m=s.metrics;
  const fields=[
    ['unanswered','Лиды без ответа','шт.'],
    ['attended','Пробных пришло','шт.'],
    ['sold','После пробной купило','шт.'],
    ['renewDue','Продлений в работе','шт.'],
    ['renewDone','Продлено','шт.'],
    ['expected','Ожидаемые оплаты','₽'],
    ['unpaidClients','Клиентов без оплаты','шт.'],
    ['unpaidAmount','Сумма неоплат','₽']
  ];
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · УПРАВЛЯЮЩАЯ','Цифры клуба','Только показатели, по которым управляющая реально принимает решение сегодня. Выручка, продажи администраторов и загрузка не вводятся второй раз.')} ${sofa65NumbersDatebar()}
  <div class="grid-3 sofa65-kpi-grid">
    ${metricCard('План месяца',compactMoney(s.plan),`${pct(s.progress)} выполнено`,'revenue',s.progress)}
    ${metricCard('Факт месяца',compactMoney(s.fact),`прогноз ${compactMoney(s.forecast)}`,'analytics')}
    ${metricCard('До плана',compactMoney(s.remaining),`нужно ${compactMoney(s.need)} в день`,'revenue')}
    ${metricCard('Загрузка групп',pct(m.occupancy),`цель ${pct(s.m.loadTarget||80)}`,'users',m.occupancy)}
    ${metricCard('Пробная → покупка',pct(s.conversion),`${Number(m.sold)||0} из ${Number(m.attended)||0}`,'users',s.conversion)}
    ${metricCard('Продления',pct(s.renew),`${Number(m.renewDone)||0} из ${Number(m.renewDue)||0}`,'tasks',s.renew)}
  </div>
  <div class="grid-main">
    <section class="card pad"><div class="card-head"><div><h3>Выручка накопительно</h3><p>${esc(s.m.label||monthLabel(s.m.key))} · факт берётся из общей базы Growth OS</p></div><span class="pill">Прогноз ${compactMoney(s.forecast)}</span></div>${sofa65RevenueChart(s.m)}</section>
    <section class="card pad"><div class="card-head"><div><h3>Что требует действия</h3><p>Не статистика ради статистики, а отклонения с понятным следующим шагом</p></div></div><div class="signal-list">
      <div class="signal-item"><i class="item-dot ${Number(m.unanswered)?'red':''}"></i><div class="item-main"><b>${Number(m.unanswered)||0} лид(а) без ответа</b><small>${Number(m.unanswered)?'Закрыть до конца текущего рабочего блока.':'Потерянных лидов по внесённым данным нет.'}</small></div></div>
      <div class="signal-item"><i class="item-dot ${s.conversion<50&&Number(m.attended)?'red':''}"></i><div class="item-main"><b>Конверсия пробной ${pct(s.conversion)}</b><small>${Number(m.attended)?`${Number(m.sold)||0} покупок из ${Number(m.attended)||0} визитов.`:'Сегодня ещё нет данных по проведённым пробным.'}</small></div></div>
      <div class="signal-item"><i class="item-dot ${Number(m.renewDue)>Number(m.renewDone)?'red':''}"></i><div class="item-main"><b>Продления ${Number(m.renewDone)||0}/${Number(m.renewDue)||0}</b><small>${Number(m.renewDue)>Number(m.renewDone)?'Есть клиенты, по которым нужен следующий контакт.':'Открытых продлений по внесённым данным нет.'}</small></div></div>
      <div class="signal-item"><i class="item-dot ${Number(m.unpaidClients)?'red':''}"></i><div class="item-main"><b>Неоплаты ${Number(m.unpaidClients)||0} · ${compactMoney(m.unpaidAmount||0)}</b><small>Ожидаемые оплаты: ${compactMoney(m.expected||0)}.</small></div></div>
    </div></section>
  </div>
  <section class="card pad"><div class="card-head"><div><h3>Операционные цифры за ${formatDateShort(s.date)}</h3><p>Софа вносит только то, чего пока нет в общей CRM/базе. Остальные данные подтягиваются автоматически.</p></div><span class="pill muted">8 полей</span></div><form id="sofa65NumbersForm"><div class="sofa65-input-grid">${fields.map(([key,label,unit])=>`<label class="field"><span>${esc(label)}</span><div class="sofa65-input-unit"><input class="input" type="number" min="0" inputmode="decimal" name="${key}" value="${Number(m[key])||0}"><small>${esc(unit)}</small></div></label>`).join('')}</div><div class="operations-savebar"><button class="btn btn-primary" type="submit">Сохранить цифры</button></div></form></section>
  </div>`;
}

function sofa65MotivationPage(){
  const s=sofa3Salary(),mot=s.mot,owner=currentRole==='owner';
  const tiers=SOFA3_TIERS.filter(([threshold])=>threshold>0).slice().sort((a,b)=>a[0]-b[0]);
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · ЛИЧНАЯ МОТИВАЦИЯ','Мотивация Софы','Софа видит расчёт и понимает, что влияет на доход. Оценку KPI подтверждает Роман — сотрудник не оценивает себя сам.',owner?`<button class="btn btn-primary" data-action="sofa3LockSalary">${mot.snapshot?'Обновить фиксацию':'Зафиксировать месяц'}</button>`:'')}
  <section class="card hero"><div class="hero-top"><div><div class="eyebrow">${esc(monthLabel(s.key))}</div><h3 class="hero-title">${mot.snapshot?'Зафиксированная зарплата':'Расчёт на текущий момент'}</h3><div class="hero-value">${salaryMoney(s.display)}</div><div class="hero-sub">Факт ${compactMoney(s.fact)} / план ${compactMoney(s.plan)} · выполнение ${pct(s.planPct)}</div></div><div class="hero-value" style="font-size:34px">${Math.round(s.coef*100)}%</div></div><div class="hero-progress"><i style="width:${clamp(s.planPct,0,100)}%"></i></div></section>
  <div class="grid-4">${metricCard('База',salaryMoney(SOFA3_BASE_SALARY),'фиксированная часть','revenue')}${metricCard('KPI',salaryMoney(s.kpi),`${s.kpiCount}/4 подтверждено`,'tasks',s.kpiCount/4*100)}${metricCard('Бонус уровня',salaryMoney(s.tier),`по факту ${compactMoney(s.fact)}`,'analytics')}${metricCard('Бонус к выплате',salaryMoney(s.variable),`коэффициент плана ${Math.round(s.coef*100)}%`,'revenue')}</div>
  <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>KPI управляющей</h3><p>Каждый выполненный блок = +5 000 ₽. Подтверждает только Роман.</p></div><span class="pill">${s.kpiCount}/4</span></div><div class="sofia-kpis">${SOFA3_KPIS.map(([key,title,text])=>`<button class="sofia-kpi ${mot.checks[key]?'done':''}" ${owner?`data-action="sofa3ToggleKpi" data-key="${key}"`:'disabled'}><i>${mot.checks[key]?'✓':'○'}</i><span><b>${esc(title)}</b><small>${esc(text)} · +5 000 ₽</small></span></button>`).join('')}</div>${!owner?'<p class="readable-note">Статусы KPI доступны Софе только для просмотра. Изменить их может Роман в своём режиме.</p>':''}</section>
  <section class="card pad"><div class="card-head"><div><h3>Шкала бонуса за выручку</h3><p>Уровень определяется фактической выручкой клуба</p></div></div><div class="bonus-tiers">${tiers.map(([threshold,bonus])=>`<div class="bonus-tier ${s.fact>=threshold?'active':''}"><span>от ${compactMoney(threshold)}</span><b>${salaryMoney(bonus)}</b></div>`).join('')}</div><p class="readable-note">Коэффициент: 100% плана = 100% бонуса; 95–99% = 75%; 90–94% = 50%; ниже 90% = 0%.</p></section></div>
  </div>`;
}

function sofa65SystemPage(){
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · СИСТЕМА УПРАВЛЯЮЩЕЙ','Как управлять клубом','Короткий рабочий регламент из отдельного кабинета Софы — теперь внутри общей Growth OS 6.5.')}
  <section class="guide-columns"><div class="guide-card"><span class="guide-number">1</span><h3>Не делать всё самой</h3><ul><li>Поставить задачу.</li><li>Назначить ответственного.</li><li>Дать ресурс и срок.</li><li>Проверить результат.</li><li>Разобрать повторную ошибку.</li></ul></div><div class="guide-card"><span class="guide-number">2</span><h3>Знать только нужные цифры</h3><ul><li>План, факт и прогноз месяца.</li><li>Пробная → покупка.</li><li>Продления.</li><li>Ожидаемые и зависшие оплаты.</li><li>Загрузка групп.</li></ul></div><div class="guide-card"><span class="guide-number">3</span><h3>Быть в клубе</h3><ul><li>Общаться с родителями.</li><li>Видеть тренировки.</li><li>Слышать администраторов.</li><li>Ловить проблему до жалобы.</li><li>Улучшать один процесс в неделю.</li></ul></div></section>
  <div class="grid-2" style="margin-top:14px"><section class="card pad"><div class="card-head"><div><h3>Порядок приоритетов</h3><p>Что делать первым, если одновременно происходит всё</p></div></div><div class="decision-table"><div class="decision-row"><b>1. Безопасность</b><span>Травма, ребёнок без присмотра, неисправность или угроза — немедленно.</span></div><div class="decision-row"><b>2. Родители</b><span>Жалоба, конфликт, возврат или риск ухода — признать обращение и довести до решения.</span></div><div class="decision-row"><b>3. Деньги сегодня</b><span>Лиды без ответа, пробные, продления, неоплаты и обещанные платежи.</span></div><div class="decision-row"><b>4. Команда</b><span>Смены, задачи, замены, просрочки и дисциплина.</span></div><div class="decision-row"><b>5. Улучшение</b><span>Когда срочное закрыто — улучшить один процесс.</span></div></div></section><section class="card pad"><div class="card-head"><div><h3>Полномочия</h3><p>Когда Софа решает сама, а когда подключает Романа</p></div></div><div class="decision-table"><div class="decision-row"><b>Софа решает сама</b><span>Ежедневные задачи, CRM, стандартные вопросы родителей, пробные и продления, чистота, обучение и организация смен.</span></div><div class="decision-row"><b>Согласовать с Романом</b><span>Новые цены, нестандартная скидка, значимая компенсация, зарплата, найм/увольнение, новый постоянный расход.</span></div><div class="decision-row"><b>Подключить сразу</b><span>Серьёзная травма, юридическая претензия, кассовая недостача, конфликт с ТЦ/УК, крупный возврат, публичный репутационный риск.</span></div></div></section></div>
  <section class="card pad" style="margin-top:14px"><div class="card-head"><div><h3>Стандарты сервиса</h3><p>Пять норм, которые Софа контролирует у всей команды</p></div></div><section class="contours"><div class="contour"><i>10</i><b>Ответ</b><p>До 10 минут в рабочее время.</p></div><div class="contour"><i>2ч</i><b>Пробная</b><p>Подтверждение за день и за 2 часа.</p></div><div class="contour"><i>↗</i><b>После пробной</b><p>Обратная связь и предложение в тот же день.</p></div><div class="contour"><i>24</i><b>Жалоба</b><p>Признать быстро, решение — до 24 часов.</p></div><div class="contour"><i>4</i><b>Прогресс</b><p>Обратная связь не реже одного раза в 4 занятия.</p></div></section></section>
  </div>`;
}

function sofa65ManagerHome(){
  const s=sofa65RecomputeStats(today()),salary=sofa3Salary(),week=sofa3WeekScore(today());
  const myTasks=activeTasks().filter(t=>t.ownerId==='sofia'&&!statusDone(t.status)).sort(sortByDate);
  const overdue=myTasks.filter(isOverdue).length,alerts=[];
  if(Number(s.metrics.unanswered))alerts.push(`${Number(s.metrics.unanswered)} лид(а) без ответа`);
  if(Number(s.metrics.unpaidClients))alerts.push(`${Number(s.metrics.unpaidClients)} неоплаченных клиент(а) · ${compactMoney(s.metrics.unpaidAmount||0)}`);
  if(overdue)alerts.push(`${overdue} просроченных задач Софы`);
  if(s.metrics.occupancy<75)alerts.push(`Загрузка групп ${pct(s.metrics.occupancy)} — есть свободные места`);
  return`<div class="page readable-page sofa65-page">${pageHead('СОФА · УПРАВЛЯЮЩАЯ','Главная Софы','Один кабинет внутри Growth OS 6.5: цифры, контроль, собрания, мотивация и правила управления — без второго сайта и без ежедневного отчёта.')}
  <section class="card hero"><div class="hero-top"><div><div class="eyebrow">${esc(s.m.label||monthLabel(s.m.key))}</div><h3 class="hero-title">Факт ${compactMoney(s.fact)} <span style="color:var(--muted)">из ${compactMoney(s.plan)}</span></h3><div class="hero-sub">Прогноз ${compactMoney(s.forecast)} · до плана ${compactMoney(s.remaining)} · нужно ${compactMoney(s.need)} в день</div></div><div class="hero-value" style="font-size:38px">${pct(s.progress)}</div></div><div class="hero-progress"><i style="width:${clamp(s.progress,0,100)}%"></i></div></section>
  <div class="sofa65-quick-links"><button class="quick-card" data-view="sofa_numbers"><span class="quick-icon">${ICONS.analytics}</span><span><b>Цифры клуба</b><small>План, прогноз, воронка, продления, оплаты</small></span></button><button class="quick-card" data-view="operations"><span class="quick-icon">${ICONS.tasks}</span><span><b>Контроль дня</b><small>Чек-лист, ритм и три результата</small></span></button><button class="quick-card" data-view="meeting"><span class="quick-icon">${ICONS.team}</span><span><b>Собрания</b><small>Повестка, решения и задачи</small></span></button><button class="quick-card" data-view="sofa_motivation"><span class="quick-icon">${ICONS.revenue}</span><span><b>Моя мотивация</b><small>${salaryMoney(salary.display)} · KPI ${salary.kpiCount}/4</small></span></button><button class="quick-card" data-view="sofa_system"><span class="quick-icon">${ICONS.goals}</span><span><b>Система управляющей</b><small>Приоритеты, полномочия и стандарты</small></span></button><button class="quick-card" data-view="tasks"><span class="quick-icon">${ICONS.tasks}</span><span><b>Задачи</b><small>${myTasks.length} в работе · ${overdue} просрочено</small></span></button></div>
  <div class="grid-main"><section class="card pad"><div class="card-head"><div><h3>Что требует внимания</h3><p>Только реальные отклонения, без длинного ежедневного отчёта</p></div><button class="btn btn-small btn-ghost" data-view="sofa_numbers">Открыть цифры</button></div><div class="signal-list">${alerts.length?alerts.slice(0,5).map(text=>`<div class="signal-item"><i class="item-dot red"></i><div class="item-main"><b>${esc(text)}</b><small>Открой соответствующий раздел и зафиксируй следующий шаг.</small></div></div>`).join(''):'<div class="empty"><b>Критических отклонений не зафиксировано</b>Фокус — продажи, качество и улучшение одного процесса.</div>'}</div></section><section class="card pad"><div class="card-head"><div><h3>Неделя и мотивация</h3><p>Два показателя личной управленческой ответственности</p></div></div><div class="operations-derived"><div><span>Неделя</span><b>${Math.round(week.score)}%</b><small>${esc(sofa3ScoreLabel(week.score,Boolean(week.w.closedAt)))}</small></div><div><span>Мотивация</span><b>${salaryMoney(salary.display)}</b><small>KPI ${salary.kpiCount}/4</small></div><div><span>Загрузка</span><b>${pct(s.metrics.occupancy)}</b><small>цель ${pct(s.m.loadTarget||80)}</small></div><div><span>Пробная → покупка</span><b>${pct(s.conversion)}</b><small>${Number(s.metrics.sold)||0}/${Number(s.metrics.attended)||0}</small></div></div></section></div>
  </div>`;
}

sofa3Tabs=function(){const active=state.ui.operationsTab||'today',tabs=[['today','Сегодня'],['control','Контроль'],['week','Неделя']];return`<div class="operations-tabs">${tabs.map(([idv,label])=>`<button class="${active===idv?'active':''}" data-action="sofa3OpsTab" data-tab="${idv}">${label}</button>`).join('')}</div>`};
renderOperations=function(){let tab=state.ui.operationsTab||'today';if(!['today','control','week'].includes(tab)){tab='today';state.ui.operationsTab='today'}let body=sofa3TodayView();if(tab==='control')body=sofa3ControlView();if(tab==='week')body=sofa3WeekView();return`<div class="page readable-page operations-page">${pageHead('СОФА · УПРАВЛЯЮЩАЯ','Контроль дня','Чек-лист, ритм и результаты. Ежедневный отчёт собственнику больше не используется — вся рабочая информация живёт в общей системе.')} ${sofa3Datebar()}${sofa3Tabs()}${body}</div>`};
renderManager=sofa65ManagerHome;

const __sofa65SalaryCardBase=sofa3SalaryCard;
sofa3SalaryCard=function(){
  const html=__sofa65SalaryCardBase();
  return currentRole==='manager'?html.replace(/<button class="sofia-kpi /g,'<button disabled class="sofia-kpi ').replace(/ data-action="sofa3ToggleKpi" data-key="[^"]+"/g,''):html;
};

const __renderArchiveSofa65Base=renderArchive;
renderArchive=function(){
  let html=__renderArchiveSofa65Base();
  html=html.replace(/<section class="card pad"><div class="card-head"><div><h3>Операционные дни<\/h3>[\s\S]*?<\/section>/,'');
  return html;
};

const __allowedViewSofa65Base=allowedView;
allowedView=function(id){if(['sofa_numbers','sofa_motivation','sofa_system'].includes(id))return['owner','manager'].includes(currentRole);return __allowedViewSofa65Base(id)};

const __renderCurrentViewSofa65Base=renderCurrentView;
renderCurrentView=function(){
  if(currentView==='sofa_numbers'){if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65Base()}$('#pageTitle').textContent='Цифры клуба';$('#pages').innerHTML=sofa65NumbersPage();renderNav();animateNumbers();return}
  if(currentView==='sofa_motivation'){if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65Base()}$('#pageTitle').textContent='Мотивация Софы';$('#pages').innerHTML=sofa65MotivationPage();renderNav();animateNumbers();return}
  if(currentView==='sofa_system'){if(!allowedView(currentView)){currentView=roleInfo().start;return __renderCurrentViewSofa65Base()}$('#pageTitle').textContent='Система управляющей';$('#pages').innerHTML=sofa65SystemPage();renderNav();animateNumbers();return}
  return __renderCurrentViewSofa65Base();
};

const __handleSubmitSofa65Base=handleSubmit;
handleSubmit=function(e){
  const f=e.target;
  if(f instanceof HTMLFormElement&&f.id==='sofa65NumbersForm'){
    e.preventDefault();
    const d=sofa3EnsureDay();
    for(const key of ['unanswered','attended','sold','renewDue','renewDone','expected','unpaidClients','unpaidAmount'])d.metrics[key]=num(f.elements[key]?.value);
    d.updatedAt=nowIso();touch('Обновлены ключевые цифры клуба');return;
  }
  return __handleSubmitSofa65Base(e);
};

const __handleClickSofa65Base=handleClick;
handleClick=function(e){
  const el=e.target.closest('[data-action]');
  if(el?.dataset.action==='sofa3ToggleKpi'&&currentRole!=='owner')return;
  if(el?.dataset.action==='sofa3CopyReport'||el?.dataset.action==='sofa3MarkReport')return;
  return __handleClickSofa65Base(e);
};

(function sofa65InstallStyles(){
  if(document.getElementById('sofa65-finish-style'))return;
  const style=document.createElement('style');style.id='sofa65-finish-style';style.textContent=`
  .sofa65-page{max-width:1680px;margin:0 auto}.sofa65-quick-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}.sofa65-quick-links .quick-card{min-height:104px}.sofa65-kpi-grid{margin:14px 0}.sofa65-input-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.sofa65-input-unit{display:flex;align-items:center;gap:9px}.sofa65-input-unit .input{min-width:0}.sofa65-input-unit small{min-width:28px;color:var(--muted);font-weight:800}.sofa65-chart{margin-top:8px}.sofa65-chart svg{display:block;width:100%;height:235px;overflow:visible}.sofa65-gridline{stroke:#2e2818;stroke-width:1}.sofa65-target{stroke:#8c7428;stroke-width:1.2;stroke-dasharray:6 7}.sofa65-area{fill:url(#sofa65Area)}.sofa65-line{fill:none;stroke:var(--yellow-bright);stroke-width:3;vector-effect:non-scaling-stroke}.sofa65-point{fill:#11100c;stroke:var(--yellow-bright);stroke-width:2;vector-effect:non-scaling-stroke}.sofa65-chart-labels{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-top:8px}.sofia-kpi:disabled{cursor:default;opacity:.92}.sofia-kpi:disabled:hover{transform:none}.nav-section{white-space:normal}
  @media(max-width:1100px){.sofa65-input-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sofa65-quick-links{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:680px){.sofa65-input-grid,.sofa65-quick-links{grid-template-columns:1fr}.sofa65-chart svg{height:190px}}
  `;document.head.appendChild(style);
})();

const __bootSofa65Base=boot;
boot=async function(){
  const result=await __bootSofa65Base();
  if(state?.ui?.operationsTab==='report'||state?.ui?.operationsTab==='metrics'){state.ui.operationsTab='today';persistLocal()}
  if(window.EKGrowthOS)window.EKGrowthOS={...window.EKGrowthOS,sofa65FinishBuild:SOFA65_FINISH_BUILD,sofiaNumbers:()=>sofa65RecomputeStats(),sofiaSalary:key=>sofa3Salary(key||state.settings.currentMonth)};
  return result;
};
// SOFA65_FINISH_V2_END
