# Sofa 3.0 exact functional details

Source commit: `32408ad6b5c6c0af052167a180ebd7fcc8ccd121`

## CONST `CHECK_GROUPS`
```javascript
const CHECK_GROUPS = {
    'Открытие смены': [
      ['open_clean', 'Клуб готов и чист', 'Ресепшен, раздевалки, зал, туалет, зона сотрудников.'],
      ['open_cash', 'Касса и остатки сверены', 'Нет необъяснимых расхождений, оплаты видны.'],
      ['open_schedule', 'Расписание и команда подтверждены', 'Смены, замены, пробные, индивидуальные тренировки.'],
      ['open_safe', 'Инвентарь и безопасность проверены', 'Аптечка, неисправности, опасные зоны.']
    ],
    'Продажи и клиенты': [
      ['sales_leads', 'Новые лиды обработаны', 'В рабочее время ответ — до 10 минут.'],
      ['sales_trials', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.'],
      ['sales_renew', 'Продления в работе', 'Начинать за 7 дней до окончания.'],
      ['sales_unpaid', 'Неоплаты разобраны', 'У каждого клиента есть следующий шаг и дата контакта.']
    ],
    'Команда и сервис': [
      ['team_tasks', 'Команда понимает задачи', 'У каждой задачи есть ответственный и срок.'],
      ['team_parents', 'Нет родителей без ответа', 'Сложные ситуации не зависают у администраторов.'],
      ['team_feedback', 'Дана обратная связь родителям', 'Родитель понимает прогресс ребёнка и следующий этап.'],
      ['team_audit', 'Проверено качество', 'Хотя бы одна тренировка или зона клуба проверена.']
    ],
    'Закрытие дня': [
      ['close_cash', 'Касса и CRM закрыты', 'Оплаты, лиды и следующий шаг актуальны.'],
      ['close_incidents', 'Инциденты и жалобы зафиксированы', 'Нет ситуации, которая существует только в переписке.'],
      ['close_tasks', 'Задачи обновлены', 'Просрочки разобраны, завтра определено.'],
      ['close_report', 'Отчёт собственнику отправлен', 'До 21:30 — цифры, проблемы, решения и завтра.']
    ]
  };
```

## CONST `RHYTHM`
```javascript
const RHYTHM = [
    ['09:30', 'Открытие смены', 'Чистота, касса, расписание, пробные, оплаты и безопасность.'],
    ['10:30', 'Входящие и пробные', 'Нет потерянных лидов, визиты подтверждены, следующий шаг установлен.'],
    ['13:30', 'Контроль середины дня', 'Продажи, задачи команды, родители, чистота и отклонения.'],
    ['16:30', 'Деньги сегодня', 'Продления, неоплаты, клиенты после пробной, обещанные платежи.'],
    ['19:00', 'Качество и родители', 'Тренировки, обратная связь, сложные ситуации, риск ухода.'],
    ['21:15', 'Закрытие системы', 'Касса, CRM, задачи, инциденты и черновик отчёта.'],
    ['21:30', 'Отчёт Роману', 'Только итог, исключения, решения и три результата на завтра.']
  ];
```

## CONST `METRIC_GROUPS`
```javascript
const METRIC_GROUPS = {
    'Деньги и продажи': [
      ['revenue', 'Выручка за день', '₽'],
      ['groupCount', 'Групповых продаж', 'шт.'],
      ['groupAmount', 'Сумма групповых продаж', '₽'],
      ['individualCount', 'Индивидуальных продаж', 'шт.'],
      ['individualAmount', 'Сумма индивидуальных продаж', '₽'],
      ['expected', 'Ожидаемые оплаты', '₽']
    ],
    'Администраторы': [
      ['anyaSalesCount', 'Продаж Ани', 'шт.'],
      ['anyaSalesAmount', 'Сумма продаж Ани', '₽'],
      ['adelSalesCount', 'Продаж Адель', 'шт.'],
      ['adelSalesAmount', 'Сумма продаж Адель', '₽']
    ],
    'Воронка': [
      ['leads', 'Новых лидов', 'шт.'],
      ['unanswered', 'Лидов без ответа', 'шт.'],
      ['booked', 'Записано на пробную', 'шт.'],
      ['confirmed', 'Пробных подтверждено', 'шт.'],
      ['attended', 'Пробных пришло', 'шт.'],
      ['sold', 'После пробной купило', 'шт.']
    ],
    'Продления и загрузка': [
      ['renewDue', 'Продлений в работе', 'шт.'],
      ['renewDone', 'Продлено', 'шт.'],
      ['unpaidClients', 'Неоплаченных клиентов', 'шт.'],
      ['unpaidAmount', 'Сумма неоплат', '₽'],
      ['occupancy', 'Загрузка групп', '%'],
      ['cleanliness', 'Чистота', '%']
    ]
  };
```

## CONST `MEETING_TEMPLATES`
```javascript
const MEETING_TEMPLATES = {
    week: {
      title: 'Роман + Софа', duration: 60, participants: 'Роман, Софа',
      description: 'Недельное управление: цифры, отклонения, решения, три результата.',
      agenda: ['План и факт выручки', 'Поступления и обязательства ближайших 14 дней', 'Продажи, пробные и продления', 'Загрузка групп', 'Проблемы родителей', 'Команда и дисциплина', 'Риски', 'Три результата недели']
    },
    admins: {
      title: 'Собрание администраторов', duration: 45, participants: 'Софа, Аня, Адель',
      description: 'Рабочая встреча по продажам, клиентам, задачам и качеству коммуникации.',
      agenda: ['План и факт месяца', 'Лиды без следующего шага', 'Пробные сегодня и на неделю', 'Продления', 'Неоплаченные клиенты', 'Ошибки коммуникации', 'Просроченные задачи', 'Мини-обучение', 'Три задачи каждого администратора']
    },
    sales: {
      title: 'Воронка продаж', duration: 20, participants: 'Софа, администраторы',
      description: 'Короткий разбор клиентов, которых нужно довести до решения и оплаты.',
      agenda: ['Новые лиды', 'Пробные без покупки', 'Продления', 'Обещанные оплаты', 'Риск ухода', 'Следующий шаг по каждому клиенту']
    },
    quality: {
      title: 'Качество и дисциплина', duration: 30, participants: 'Софа, ответственные сотрудники',
      description: 'Сервис, чистота, тренировки, безопасность, дисциплина и исправления.',
      agenda: ['Чистота', 'Качество тренировок', 'Безопасность', 'Обратная связь родителям', 'Жалобы', 'Дисциплина', 'Просроченные задачи', 'План исправлений']
    },
    month: {
      title: 'Закрытие месяца', duration: 90, participants: 'Роман, Софа',
      description: 'Полный управленческий разбор месяца и решения на следующий.',
      agenda: ['План / факт выручки', 'ПиУ и ДДС', 'Точка безубыточности', 'Прибыль и свободный поток', 'Продажи и продления', 'Загрузка', 'KPI команды', 'Качество и жалобы', 'Риски', 'Три задачи следующего месяца']
    }
  };
```

## CONST `PAGES`
```javascript
const PAGES = {today:todayPage,tasks:tasksPage,numbers:numbersPage,rhythm:rhythmPage,report:reportPage,meetings:meetingsPage,plans:plansPage,guide:guidePage,archive:archivePage,settings:settingsPage};
```

## FUNCTION `todayPage`
- Exact function name already in Growth: no
```javascript
function todayPage() {
    const s = stats();
    const open = state.tasks.filter((t) => t.status !== 'done' && t.due <= date).sort((a,b) => a.due.localeCompare(b.due)).slice(0,6);
    const overdue = state.tasks.filter((t) => t.status !== 'done' && t.due < date).length;
    const alerts = [];
    if (num(s.day.metrics.unanswered)) alerts.push(`${s.day.metrics.unanswered} лид(а) без ответа`);
    if (num(s.day.metrics.unpaidClients)) alerts.push(`${s.day.metrics.unpaidClients} неоплаченных клиент(а)`);
    if (overdue) alerts.push(`${overdue} просроченных задач`);
    const next = nextRhythm(s.day);
    const readinessText = s.readiness >= 85 ? 'Система под контролем' : s.readiness >= 55 ? 'Нужно закрыть отклонения' : 'Нужен управленческий фокус';
    return pageHead('ОПЕРАЦИОННЫЙ ЦЕНТР', prettyDate(date), 'Один экран: что происходит в клубе, где отклонение и какой следующий шаг.', `<button class="button primary compact" data-act="newTask">+ Задача</button><button class="button ghost compact" data-page="report">Собрать отчёт</button>`) + `
      <section class="card hero-card">
        <div class="hero-main">
          <div>
            <div class="eyebrow">ГОТОВНОСТЬ ДНЯ</div>
            <div class="hero-title">${esc(readinessText)} <span>· ${s.readiness}%</span></div>
            <div class="hero-copy">Сначала безопасность и родители. Затем деньги, которые можно получить сегодня. После — команда, просрочки и улучшение одного процесса.</div>
            <div class="readiness-row"><div class="readiness-ring" style="--p:${s.readiness}"><strong>${s.readiness}</strong></div><div class="readiness-copy"><b>${next ? `Следующая точка — ${next[0]}` : 'Основные точки дня пройдены'}</b><span>${next ? esc(next[1]) : 'Закрой отчёт и зафиксируй три результата на завтра.'}</span></div></div>
            <div class="alert-strip ${alerts.length ? 'warning' : ''}"><i>${alerts.length ? '●' : '●'}</i><div><b>${alerts.length ? 'Есть отклонения, требующие внимания' : 'Критических отклонений не зафиксировано'}</b><small>${alerts.length ? esc(alerts.join(' · ')) : 'Переходи к росту: продажи, качество и улучшение процесса.'}</small></div></div>
          </div>
          <div class="kpi-grid">
            ${kpi('Выручка месяца', money(s.fact), `${pct(s.progress)} от плана`, clamp(s.progress,0,100))}
            ${kpi('Нужно в день', money(s.need), `Осталось ${money(s.remaining)}`)}
            ${kpi('Пробная → продажа', pct(s.conversion), `${num(s.day.metrics.sold)} из ${num(s.day.metrics.attended)} сегодня`)}
            ${kpi('Продления', pct(s.renew), `${num(s.day.metrics.renewDone)} из ${num(s.day.metrics.renewDue)} в работе`)}
          </div>
        </div>
      </section>

      <div class="section-title"><div><h2>Три результата дня</h2><p>Не список из двадцати дел, а то, что должно реально измениться к закрытию.</p></div></div>
      <section class="priority-list">${s.day.priorities.map((v,i) => `<div class="priority-item"><span>${i+1}</span><textarea data-priority="${i}" placeholder="${['Главный результат дня','Второй результат','Третий результат'][i]}">${esc(v)}</textarea></div>`).join('')}</section>

      <div class="grid grid-2" style="margin-top:14px">
        <section class="card">
          <div class="section-title" style="margin:0 0 10px"><div><h2>Задачи в работе</h2><p>Просроченное и назначенное на выбранный день.</p></div><button class="button ghost" data-page="tasks">Все задачи</button></div>
          <div class="task-list">${open.length ? open.map(taskHtml).join('') : empty('Нет активных задач', 'Если всё закрыто — выбери один процесс для улучшения.')}</div>
        </section>
        <section class="card">
          <div class="section-title" style="margin:0 0 10px"><div><h2>${dayOfWeek(date) === 2 ? 'Собрание администраторов' : 'Контрольная точка'}</h2><p>${dayOfWeek(date) === 2 ? 'Вторник · 45 минут · Софа ведёт встречу' : 'Ритм дня не должен держаться в голове.'}</p></div></div>
          ${dayOfWeek(date) === 2 ? `<div class="alert-strip"><i>●</i><div><b>Цифры → клиенты → ошибки → решения → задачи</b><small>Открой шаблон, веди встречу прямо в системе и сразу превращай решения в задачи.</small></div></div><button class="button primary" style="width:100%;margin-top:10px" data-act="openAdminMeeting">Открыть собрание</button>` : next ? `<div class="timeline-item current" style="margin-top:8px"><time>${next[0]}</time><div class="timeline-copy"><b>${esc(next[1])}</b><small>${esc(next[2])}</small></div><button class="timeline-toggle" data-rhythm="${next[3]}">✓</button></div><button class="button ghost" style="width:100%;margin-top:10px" data-page="rhythm">Открыть ритм дня</button>` : `<div class="alert-strip"><i>●</i><div><b>Основные точки дня закрыты</b><small>Проверь отчёт, незакрытые задачи и три результата на завтра.</small></div></div><button class="button primary" style="width:100%;margin-top:10px" data-page="report">Перейти к отчёту</button>`}
        </section>
      </div>`;
  }
```

## FUNCTION `numbersPage`
- Exact function name already in Growth: no
```javascript
function numbersPage() {
    const s = stats();
    return pageHead('ЦИФРЫ КЛУБА', 'Управление по данным', 'Софа должна видеть не просто факт, а отклонение и то, что можно изменить сегодня.', `<button class="button ghost compact" data-act="manualSync">Синхронизировать</button>`) + `
      <div class="numbers-summary">
        ${kpi('План месяца', money(s.plan), `${pct(s.progress)} выполнено`, s.progress)}
        ${kpi('Факт месяца', money(s.fact), `Прогноз ${money(s.forecast)}`)}
        ${kpi('Осталось до плана', money(s.remaining), `Нужно ${money(s.need)} в день`)}
        ${kpi('Загрузка', pct(s.day.metrics.occupancy), `Цель ${pct(state.monthPlans[s.mk].occupancyTarget)}`)}
      </div>
      <div class="grid grid-2">
        <section class="card">
          <h2>Показатели за ${esc(shortDate(date))}</h2>
          ${Object.entries(METRIC_GROUPS).map(([group,items]) => `<div class="metric-section"><div class="metric-section-head"><h3>${esc(group)}</h3><span>сохраняется автоматически</span></div><div class="metric-grid">${items.map(([id,label,unit]) => `<div class="metric-box"><label>${esc(label)}</label><input type="number" inputmode="decimal" data-metric="${id}" value="${num(s.day.metrics[id])}"><small>${esc(unit)}</small></div>`).join('')}</div></div>`).join('')}
        </section>
        <section class="stack">
          <div class="card"><h2>Выручка по дням</h2><p class="card-sub">Накопление за выбранный месяц. Пустые дни не выдумываются — учитывается только внесённый факт.</p>${monthChart(s.mk)}</div>
          <div class="card"><h2>Что означает сегодняшняя воронка</h2>
            <div class="grid grid-2">${kpi('Лиды без ответа', String(num(s.day.metrics.unanswered)), num(s.day.metrics.unanswered) ? 'Сначала закрыть это отклонение' : 'Потерянных лидов не видно')}${kpi('Пробная → продажа', pct(s.conversion), `${num(s.day.metrics.sold)} покупок из ${num(s.day.metrics.attended)} визитов`)}${kpi('Продления', pct(s.renew), `${num(s.day.metrics.renewDone)} из ${num(s.day.metrics.renewDue)}`)}${kpi('Ожидаемые оплаты', money(s.day.metrics.expected), `${num(s.day.metrics.unpaidClients)} клиентов без оплаты`)}</div>
          </div>
        </section>
      </div>`;
  }
```

## FUNCTION `rhythmPage`
- Exact function name already in Growth: no
```javascript
function rhythmPage() {
    const d = ensure(date); const next = nextRhythm(d);
    return pageHead('РИТМ УПРАВЛЕНИЯ', 'День по контрольным точкам', 'Система напоминает, что проверять. Управляющая не должна держать рабочий день в голове.') + `
      <div class="grid grid-2">
        <section class="card"><h2>Контрольные точки</h2><div class="timeline">${RHYTHM.map(([time,title,text],i) => `<div class="timeline-item ${d.rhythm[i] ? 'done' : ''} ${next?.[3] === i ? 'current' : ''}"><time>${time}</time><div class="timeline-copy"><b>${esc(title)}</b><small>${esc(text)}</small></div><button class="timeline-toggle" data-rhythm="${i}">${d.rhythm[i] ? '✓' : '○'}</button></div>`).join('')}</div></section>
        <section class="card"><h2>Ежедневный стандарт</h2>${Object.entries(CHECK_GROUPS).map(([group,items]) => `<div class="check-group"><h3>${esc(group)}</h3>${items.map(([id,title,text]) => `<label class="check-row ${d.checks[id] ? 'done' : ''}"><input type="checkbox" data-check="${id}" ${d.checks[id] ? 'checked' : ''}><span><b>${esc(title)}</b><small>${esc(text)}</small></span></label>`).join('')}</div>`).join('')}</section>
      </div>`;
  }
```

## FUNCTION `plansPage`
- Exact function name already in Growth: no
```javascript
function plansPage() {
    const wk = weekKey(date), mk = monthKey(date), w = state.plans.weeks[wk], m = state.plans.months[mk];
    return pageHead('ПЛАНЫ И РОСТ', 'Не тушить — улучшать', 'Управляющая отвечает не только за отсутствие проблем, но и за улучшение работы клуба каждую неделю.') + `
      <div class="grid grid-2">
        <section class="card"><div class="eyebrow">НЕДЕЛЯ · ${esc(wk)}</div><h2 style="margin-top:8px">Три результата недели</h2><div class="plan-goals">${w.results.map((v,i) => `<div class="goal-row"><span>${i+1}</span><input data-week="results.${i}" value="${esc(v)}" placeholder="Результат недели ${i+1}"></div>`).join('')}</div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Главный риск</label><textarea data-week="risk">${esc(w.risk)}</textarea></div><div class="field"><label>Команда</label><textarea data-week="team">${esc(w.team)}</textarea></div><div class="field"><label>Родители / сервис</label><textarea data-week="parents">${esc(w.parents)}</textarea></div><div class="field"><label>Улучшение одного процесса</label><textarea data-week="improvement">${esc(w.improvement)}</textarea></div><div class="field full"><label>Решение недели</label><textarea data-week="decision">${esc(w.decision)}</textarea></div></div></section>
        <section class="card"><div class="eyebrow">МЕСЯЦ · ${esc(mk)}</div><h2 style="margin-top:8px">Цели месяца</h2><div class="plan-goals">${m.goals.map((v,i) => `<div class="goal-row"><span>${i+1}</span><input data-month="goals.${i}" value="${esc(v)}" placeholder="Цель месяца ${i+1}"></div>`).join('')}</div><div class="form-grid" style="margin-top:12px"><div class="field"><label>Главный фокус</label><textarea data-month="focus">${esc(m.focus)}</textarea></div><div class="field"><label>Управленческий эксперимент</label><textarea data-month="experiment">${esc(m.experiment)}</textarea></div><div class="field full"><label>Вывод месяца</label><textarea data-month="conclusion">${esc(m.conclusion)}</textarea></div></div></section>
      </div>
      <div class="section-title"><div><h2>Пять контуров управления</h2><p>Если один контур провален — клуб начинает зависеть от ручного вмешательства.</p></div></div>
      <section class="contours"><div class="contour"><i>₽</i><b>Финансы</b><p>Выручка, обязательства, резервы, точка безубыточности.</p></div><div class="contour"><i>↗</i><b>Продажи</b><p>Лиды, пробные, конверсия, продления, длинные форматы.</p></div><div class="contour"><i>♡</i><b>Сервис</b><p>Скорость ответа, родители, обратная связь, жалобы.</p></div><div class="contour"><i>◎</i><b>Команда</b><p>Задачи, дисциплина, обучение, ответственность.</p></div><div class="contour"><i>✓</i><b>Качество</b><p>Безопасность, тренировки, чистота и инциденты.</p></div></section>`;
  }
```

## FUNCTION `reportPage`
- Exact function name already in Growth: no
```javascript
function reportPage() {
    const d = ensure(date); const sent = d.report.sentAt;
    return pageHead('ЕЖЕДНЕВНЫЙ ОТЧЁТ', 'Итог собственнику', 'Цифры собираются автоматически. Софа добавляет только то, что невозможно понять из цифр.', `<button class="button ghost compact" data-act="copyReport">Скопировать</button><button class="button primary compact" data-act="markReport">${sent ? 'Обновить отметку' : 'Зафиксировать отправку'}</button>`) + `
      <div class="grid grid-2">
        <section class="card">
          <div class="report-status ${sent ? 'sent' : ''}"><i>●</i><b>${sent ? 'Отчёт зафиксирован' : 'Отчёт ещё не зафиксирован'}</b><span>${sent ? new Date(sent).toLocaleString('ru-RU') : 'до 21:30'}</span></div>
          <div class="form-grid">
            ${noteField('Неоплаченные клиенты / следующий шаг','unpaidNext',d.notes.unpaidNext)}
            ${noteField('Что решено самостоятельно','solved',d.notes.solved)}
            ${noteField('Родители / жалобы','parents',d.notes.parents)}
            ${noteField('Команда / дисциплина','team',d.notes.team)}
            ${noteField('Инциденты','incidents',d.notes.incidents)}
            ${noteField('Риски','risks',d.notes.risks)}
            <div class="field full"><label>Что требует решения Романа</label><textarea data-note="owner" placeholder="Только вопросы, которые нельзя решить в полномочиях управляющей">${esc(d.notes.owner)}</textarea></div>
            <div class="field full"><label>Три результата на завтра</label><div class="plan-goals">${d.report.tomorrow.map((v,i) => `<div class="goal-row"><span>${i+1}</span><input data-tomorrow="${i}" value="${esc(v)}" placeholder="Результат ${i+1}"></div>`).join('')}</div></div>
            <div class="field full"><label>Дополнительный комментарий</label><textarea data-note="tomorrowComment" placeholder="Необязательно">${esc(d.notes.tomorrowComment)}</textarea></div>
          </div>
        </section>
        <section class="card"><div class="section-title" style="margin:0 0 10px"><div><h2>Готовый текст</h2><p>Можно сразу отправить Роману.</p></div><button class="button ghost" data-act="copyReport">Копировать</button></div><pre id="reportPreview" class="report-preview">${esc(reportText())}</pre></section>
      </div>`;
  }
```

## FUNCTION `reportText`
- Exact function name already in Growth: no
```javascript
function reportText() {
    const s = stats(); const d = s.day;
    const taskDone = state.tasks.filter((t) => t.status === 'done' && t.updatedAt?.slice(0,10) === date).length;
    const overdue = state.tasks.filter((t) => t.status !== 'done' && t.due < date).length;
    return `EXTREME KIDS ТРОПАРЁВО — ИТОГ ДНЯ\n${prettyDate(date)}\n\nЦИФРЫ\n• Выручка за день: ${money(d.metrics.revenue)}\n• Выручка за месяц: ${money(s.fact)} / план ${money(s.plan)} (${pct(s.progress)})\n• До плана осталось: ${money(s.remaining)}\n• Необходимый темп: ${money(s.need)} в день\n• Прогноз месяца: ${money(s.forecast)}\n\nПРОДАЖИ И ВОРОНКА\n• Групповые: ${num(d.metrics.groupCount)} на ${money(d.metrics.groupAmount)}\n• Индивидуальные: ${num(d.metrics.individualCount)} на ${money(d.metrics.individualAmount)}\n• Аня: ${num(d.metrics.anyaSalesCount)} продаж / ${money(d.metrics.anyaSalesAmount)}\n• Адель: ${num(d.metrics.adelSalesCount)} продаж / ${money(d.metrics.adelSalesAmount)}\n• Новые лиды: ${num(d.metrics.leads)}, без ответа: ${num(d.metrics.unanswered)}\n• Пробные: записано ${num(d.metrics.booked)}, подтверждено ${num(d.metrics.confirmed)}, пришло ${num(d.metrics.attended)}, купило ${num(d.metrics.sold)}\n• Конверсия пробной в продажу: ${pct(s.conversion)}\n• Продления: ${num(d.metrics.renewDone)} из ${num(d.metrics.renewDue)}\n• Неоплачено: ${num(d.metrics.unpaidClients)} клиентов / ${money(d.metrics.unpaidAmount)}\n• Ожидаемые оплаты: ${money(d.metrics.expected)}\n\nУПРАВЛЕНИЕ\n• Выполнено задач сегодня: ${taskDone}\n• Просрочено задач: ${overdue}\n• Чистота: ${pct(d.metrics.cleanliness)}\n• Загрузка групп: ${pct(d.metrics.occupancy)}\n\nНеоплаченные клиенты / следующий шаг:\n${d.notes.unpaidNext || '—'}\n\nЧто решено Софой без подключения Романа:\n${d.notes.solved || '—'}\n\nПроблемы родителей / жалобы:\n${d.notes.parents || '—'}\n\nКоманда / дисциплина:\n${d.notes.team || '—'}\n\nИнциденты:\n${d.notes.incidents || '—'}\n\nРиски:\n${d.notes.risks || '—'}\n\nТребует решения Романа:\n${d.notes.owner || '—'}\n\nТРИ РЕЗУЛЬТАТА НА ЗАВТРА\n1. ${d.report.tomorrow[0] || '—'}\n2. ${d.report.tomorrow[1] || '—'}\n3. ${d.report.tomorrow[2] || '—'}${d.notes.tomorrowComment ? `\n\nКомментарий:\n${d.notes.tomorrowComment}` : ''}`;
  }
```

## FUNCTION `meetingsPage`
- Exact function name already in Growth: no
```javascript
function meetingsPage() {
    const t = MEETING_TEMPLATES[meetingDraft.type] || MEETING_TEMPLATES.admins;
    const history = state.meetings.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,6);
    return pageHead('СОБРАНИЯ', 'Решения превращаются в задачи', 'Не просто поговорить. Зафиксировать факты, принять решение, назначить ответственного и срок.') + `
      <div class="meeting-templates">${Object.entries(MEETING_TEMPLATES).map(([id,x]) => `<button class="meeting-template ${meetingDraft.type === id ? 'active' : ''}" data-meeting-type="${id}"><b>${esc(x.title)}</b><span>${x.duration} минут · ${esc(x.description)}</span></button>`).join('')}</div>
      <div class="grid grid-2">
        <section class="card">
          <div class="form-grid">
            <div class="field"><label>Дата</label><input type="date" data-meeting-field="date" value="${esc(meetingDraft.date)}"></div>
            <div class="field"><label>Участники</label><input data-meeting-field="participants" value="${esc(meetingDraft.participants)}"></div>
          </div>
          <div class="section-title" style="margin:18px 0 8px"><div><h2>Повестка</h2><p>${esc(t.description)}</p></div></div>
          <div class="agenda-list">${meetingDraft.agenda.map((a,i) => `<div class="agenda-row ${a.done ? 'done' : ''}"><input type="checkbox" data-agenda-toggle="${i}" ${a.done ? 'checked' : ''}><span>${esc(a.text)}</span><button data-agenda-delete="${i}">×</button></div>`).join('')}</div>
          <div class="agenda-add"><input id="agendaInput" placeholder="Добавить пункт"><button class="button ghost compact" data-act="addAgenda">Добавить</button></div>
          <div class="form-grid" style="margin-top:14px">
            <div class="field full"><label>Факты / заметки</label><textarea data-meeting-field="notes" placeholder="Коротко фиксируй факты, цифры и причины">${esc(meetingDraft.notes)}</textarea></div>
            <div class="field full"><label>Принятые решения</label><textarea data-meeting-field="decision" placeholder="Что решили и почему">${esc(meetingDraft.decision)}</textarea></div>
            <div class="field full"><label>Задачи после встречи</label><textarea data-meeting-field="tasks" placeholder="По одной задаче с новой строки. Можно: задача | ответственный | 2026-08-20">${esc(meetingDraft.tasks)}</textarea></div>
          </div>
          <button class="button primary" style="width:100%;margin-top:12px" data-act="saveMeeting">Сохранить протокол и создать задачи</button>
        </section>
        <section class="stack">
          <div class="card meeting-timer"><div class="eyebrow">ТАЙМЕР ВСТРЕЧИ</div><strong id="timerValue">${clock(timer.left)}</strong><p>Шаблон рассчитан на ${meetingDraft.duration} минут.</p><div class="timer-actions"><button class="button primary compact" data-act="timerStart">Старт</button><button class="button ghost compact" data-act="timerPause">Пауза</button><button class="button ghost compact" data-act="timerReset">Сброс</button></div></div>
          <div class="card"><h2>Последние протоколы</h2><div class="meeting-history">${history.length ? history.map((m) => `<div class="history-card"><h3>${esc(m.title)}</h3><small>${esc(m.date)} · ${esc(m.participants || '')}</small>${m.decision ? `<p><b>Решение:</b> ${esc(m.decision)}</p>` : ''}<div class="task-meta"><span class="tag">${m.tasks?.length || 0} задач</span></div></div>`).join('') : empty('Протоколов пока нет','Проведи первую встречу прямо в системе.')}</div></div>
        </section>
      </div>`;
  }
```

## FUNCTION `guidePage`
- Exact function name already in Growth: no
```javascript
function guidePage() {
    return pageHead('СИСТЕМА УПРАВЛЯЮЩЕЙ', 'Софа управляет клубом, а не ресепшеном', 'Если непонятно, что делать дальше — этот раздел возвращает к роли, приоритетам и полномочиям.') + `
      <section class="guide-columns">
        <div class="guide-card"><span class="guide-number">1</span><h3>Не делать всё самой</h3><ul><li>Поставить задачу.</li><li>Назначить ответственного.</li><li>Дать ресурс и срок.</li><li>Проверить результат.</li><li>Разобрать повторную ошибку.</li></ul></div>
        <div class="guide-card"><span class="guide-number">2</span><h3>Знать цифры</h3><ul><li>План и факт месяца.</li><li>Лиды и пробные.</li><li>Конверсия.</li><li>Продления.</li><li>Ожидаемые оплаты.</li><li>Загрузка групп.</li></ul></div>
        <div class="guide-card"><span class="guide-number">3</span><h3>Быть в клубе</h3><ul><li>Общаться с родителями.</li><li>Видеть тренировки.</li><li>Слышать администраторов.</li><li>Ловить проблемы до жалобы.</li><li>Улучшать один процесс в неделю.</li></ul></div>
      </section>
      <div class="grid grid-2" style="margin-top:13px">
        <section class="card"><h2>Порядок приоритетов</h2><div class="decision-table"><div class="decision-row"><b>1. Безопасность</b><span>Травма, ребёнок без присмотра, неисправность, угроза безопасности — немедленно.</span></div><div class="decision-row"><b>2. Родители</b><span>Жалоба, конфликт, возврат, риск негативного отзыва или ухода — быстро признать обращение и довести до решения.</span></div><div class="decision-row"><b>3. Деньги сегодня</b><span>Лиды, пробные, продления, неоплаты, обещанные платежи.</span></div><div class="decision-row"><b>4. Команда</b><span>Смена, задачи, замены, просрочки и дисциплина.</span></div><div class="decision-row"><b>5. Улучшение</b><span>Когда срочное закрыто — улучшить один процесс, а не ждать следующую проблему.</span></div></div></section>
        <section class="card"><h2>Когда подключать Романа</h2><div class="decision-table"><div class="decision-row"><b>Софа решает сама</b><span>Ежедневные задачи, CRM, стандартные вопросы родителей, контроль пробных и продлений, чистота, обучение и организация смен.</span></div><div class="decision-row"><b>Согласовать</b><span>Новые цены, нестандартная скидка, значимая компенсация, зарплата, найм/увольнение, новый постоянный расход.</span></div><div class="decision-row"><b>Подключить сразу</b><span>Серьёзная травма, юридическая претензия, кассовая недостача, конфликт с ТЦ/УК, крупный возврат, публичный репутационный риск.</span></div></div></section>
      </div>
      <div class="section-title"><div><h2>Стандарты сервиса</h2><p>Короткие нормы, которые Софа контролирует у всей команды.</p></div></div>
      <section class="contours"><div class="contour"><i>10</i><b>Ответ</b><p>До 10 минут в рабочее время.</p></div><div class="contour"><i>2ч</i><b>Пробная</b><p>Подтверждение за день и за 2 часа.</p></div><div class="contour"><i>↗</i><b>После пробной</b><p>Обратная связь и предложение в тот же день.</p></div><div class="contour"><i>24</i><b>Жалоба</b><p>Признать быстро, решение — до 24 часов.</p></div><div class="contour"><i>4</i><b>Прогресс</b><p>Обратная связь не реже одного раза в 4 занятия.</p></div></section>`;
  }
```

## FUNCTION `archivePage`
- Exact function name already in Growth: no
```javascript
function archivePage() {
    const dates = Object.keys(state.days).sort().reverse();
    return pageHead('АРХИВ', 'История работы клуба', 'Каждый день остаётся в системе: цифры, готовность, задачи и статус отчёта.') + `<section class="archive-grid">${dates.length ? dates.map((d) => { const s = stats(d); const sent = Boolean(s.day.report.sentAt); return `<button class="archive-card" data-open-date="${d}"><span>${sent ? 'ОТЧЁТ ЗАКРЫТ' : 'ЧЕРНОВИК'}</span><b>${esc(prettyDate(d))}</b><small>Выручка ${money(s.day.metrics.revenue)} · готовность ${s.readiness}% · ${sent ? 'отчёт зафиксирован' : 'отчёт не зафиксирован'}</small><div class="mini-progress"><i style="width:${s.readiness}%"></i></div></button>`; }).join('') : empty('Архив пока пуст','После первого рабочего дня история появится здесь.')}</section>`;
  }
```

## FUNCTION `settingsPage`
- Exact function name already in Growth: no
```javascript
function settingsPage() {
    const mk = monthKey(date), p = state.monthPlans[mk];
    return pageHead('НАСТРОЙКИ', 'Система и синхронизация', 'Проверь облако, план месяца, состав команды и сделай резервную копию.', `<button class="button danger compact" data-act="logout">Выйти</button>`) + `
      <div class="grid grid-2">
        <section class="card"><h2>Общая база</h2><div class="grid grid-3"><div class="status-box ${online ? 'good' : 'warn'}"><span>Статус</span><b>${online ? 'Подключена' : 'Локально'}</b><small>${online ? 'Изменения передаются между устройствами.' : 'Изменения не потеряются и отправятся после восстановления связи.'}</small></div><div class="status-box"><span>Версия базы</span><b>${revision || '—'}</b><small>Серверная ревизия общей рабочей базы.</small></div><div class="status-box"><span>Пользователь</span><b>${esc(session?.user?.name || '—')}</b><small>${esc(session?.user?.title || '')}</small></div></div><div class="settings-actions"><button class="button primary compact" data-act="manualSync">Синхронизировать</button><button class="button ghost compact" data-act="exportData">Резервная копия</button><label class="button ghost compact" style="cursor:pointer">Восстановить<input id="importData" type="file" accept="application/json" hidden></label></div></section>
        <section class="card"><h2>Параметры клуба</h2><div class="form-grid"><div class="field full"><label>Название клуба</label><input data-setting="club.name" value="${esc(state.club.name)}"></div><div class="field"><label>Управляющая</label><input data-setting="club.manager" value="${esc(state.club.manager)}"></div><div class="field"><label>План выручки месяца</label><input type="number" data-setting="month.revenuePlan" value="${num(p.revenuePlan)}"></div><div class="field"><label>Целевая загрузка, %</label><input type="number" data-setting="month.occupancyTarget" value="${num(p.occupancyTarget)}"></div><div class="field full"><label>Команда — через запятую</label><textarea id="staffInput">${esc(state.settings.staff.join(', '))}</textarea></div></div><button class="button primary compact" style="margin-top:10px" data-act="saveStaff">Сохранить команду</button></section>
      </div>
      <section class="card" style="margin-top:13px"><h2>Как работает сохранение</h2><p>Каждое изменение сначала записывается на устройство, затем автоматически отправляется в общую облачную базу. Если два устройства изменили данные одновременно, система загружает последнюю серверную версию, объединяет изменения и повторяет сохранение. При отсутствии интернета можно продолжать работу; после восстановления связи данные отправятся автоматически.</p></section>`;
  }
```

## FUNCTION `stats`
- Exact function name already in Growth: no
```javascript
function stats(d = date) {
    const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.revenuePlan), fact = sumMonth(mk, 'revenue');
    const daysInMonth = new Date(Number(mk.slice(0,4)), Number(mk.slice(5,7)), 0).getDate();
    const dateNumber = Number(d.slice(8,10));
    const remainingDays = Math.max(1, daysInMonth - dateNumber);
    const remaining = Math.max(0, plan - fact);
    const need = remaining / remainingDays;
    const elapsed = Math.max(1, dateNumber);
    const forecast = fact / elapsed * daysInMonth;
    const conversion = num(day.metrics.attended) ? num(day.metrics.sold) / num(day.metrics.attended) * 100 : 0;
    const renew = num(day.metrics.renewDue) ? num(day.metrics.renewDone) / num(day.metrics.renewDue) * 100 : 0;
    const checkDone = Object.values(day.checks).filter(Boolean).length;
    const rhythmDone = Object.values(day.rhythm).filter(Boolean).length;
    const readiness = Math.round((checkDone / Object.keys(day.checks).length * .7 + rhythmDone / RHYTHM.length * .3) * 100);
    const progress = plan ? fact / plan * 100 : 0;
    return {day,mk,plan,fact,remaining,need,forecast,conversion,renew,readiness,progress,daysInMonth,dateNumber};
  }
```

## FUNCTION `ensureRecurring`
- Exact function name already in Growth: no
```javascript
function ensureRecurring(d) {
    const wd = dayOfWeek(d);
    const recurring = [['daily', 'Ежедневный отчёт до 21:30', 'high', 'Отчёт']];
    if (wd === 1) recurring.push(['week', 'Встреча Романа и Софы — 60 минут', 'medium', 'Управление']);
    if (wd === 2) recurring.push(['admins', 'Собрание администраторов — 45 минут', 'high', 'Команда']);
    if (wd === 3) recurring.push(['sales', 'Разбор воронки продаж — 20 минут', 'medium', 'Продажи']);
    if (wd === 5) recurring.push(['quality', 'Контроль качества и дисциплины — 30 минут', 'medium', 'Качество']);
    recurring.forEach(([kind,title,priority,category]) => {
      const sys = `${d}:${kind}`;
      if (!state.tasks.some((t) => t.sys === sys)) {
        state.tasks.push({id:uid('task'), sys, title, owner:state.club.manager, due:d, status:'todo', priority, category, comment:'', createdAt:nowIso(), updatedAt:nowIso()});
      }
    });
  }
```

## FUNCTION `nextRhythm`
- Exact function name already in Growth: no
```javascript
function nextRhythm(d) {
    const current = new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
    for (let i=0;i<RHYTHM.length;i++) if (!d.rhythm[i] && (date !== currentDate() || RHYTHM[i][0] >= current || i === RHYTHM.length-1)) return [...RHYTHM[i], i];
    for (let i=0;i<RHYTHM.length;i++) if (!d.rhythm[i]) return [...RHYTHM[i], i];
    return null;
  }
```

