# Sofa 3.0 → Growth OS functional gap audit

- Sofa live source commit: `32408ad6b5c6c0af052167a180ebd7fcc8ccd121`
- Current Growth OS title marker: `EXTREME KIDS · Growth OS 6.4 Management Board`
- Sofa named functions: **76**
- Growth named functions: **264**
- Function names only in Sofa: **71**

## Sofa navigation/page candidates
- `report` — Собрать отчёт
- `tasks` — Все задачи
- `rhythm` — Открыть ритм дня
- `report` — Перейти к отчёту
- `plans` — Подробнее

## Growth navigation/page candidates
- `dashboard` — Главная Романа
- `year` — Учебный год
- `groups` — Группы и загрузка
- `goals` — План развития
- `tasks` — Задачи
- `calendar` — Календарь
- `analytics` — Аналитика и прогноз
- `archive` — Архив
- `manager` — Софа · управляющая
- `stas` — Стас · роллер-школа
- `mentor` — Наставник
- `admin` — Администратор
- `team` — Командный экран
- `settings` — Настройки
- `roman` — Роман
- `sofia` — Софа
- `stas` — Станислав
- `ivan` — Иван
- `tasya` — Тася
- `karina` — Карина
- `artem` — Артём
- `denis` — Денис
- `evgeny` — Евгений
- `dominik` — Доминик
- `anya` — Аня
- `adel` — Адель
- `watermelon` — Арбузные зарубы
- `base` — до 2,5 млн ₽
- `target` — 2,5–3,5 млн ₽
- `strong` — от 3,5 млн ₽
- `payroll` — ЗП и мотивация
- `attendance` — Посещаемость
- `staff` — Команда и кабинеты
- `documents` — Документы и обязанности
- `meeting` — Собрание УП

## Function names present in Sofa but absent by name in Growth
- `api`
- `archivePage`
- `baseState`
- `checkHealth`
- `clock`
- `closeMore`
- `closeTaskModal`
- `dayBase`
- `download`
- `empty`
- `ensure`
- `ensureRecurring`
- `guidePage`
- `kpi`
- `login`
- `logout`
- `makeMeetingDraft`
- `meetingsPage`
- `monthChart`
- `nextRhythm`
- `normalize`
- `normalizeDay`
- `noteField`
- `numbersPage`
- `openMore`
- `openTaskModal`
- `parseMeetingTasks`
- `pathSet`
- `persist`
- `plansPage`
- `pullState`
- `pushState`
- `refreshReportPreview`
- `render`
- `reportPage`
- `reportText`
- `rhythmPage`
- `safeJson`
- `saveLocal`
- `saveMeeting`
- `saveTaskFromForm`
- `saveTimerLocal`
- `setPage`
- `setSyncUi`
- `settingsPage`
- `stamp`
- `startPolling`
- `stats`
- `sumMonth`
- `taskHtml`
- `tasksFor`
- `tasksPage`
- `tickTimer`
- `todayPage`
- `updateBadges`
- `v8archive`
- `v8close`
- `v8closeCard`
- `v8coef`
- `v8goal`
- `v8gp`
- `v8period`
- `v8plans`
- `v8prep`
- `v8salary`
- `v8st`
- `v8task`
- `v8tasks`
- `v8tier`
- `v8today`
- `v8weekSum`

## Sofa unique function source openings
### `api`
```text
function api(path, options = {}) { const headers = {'Content-Type':'application/json', ...(options.headers || {})}; if (session?.token) headers.Authorization = `Bearer ${session.token}`; const response = await fetch(`${API}${path}`, {...options, headers, cache:'no-store'}); const text = await response.text(); let data = null; try { data = text ? JSON.parse(text) : {}; } catch { data = {message:text}; } if (!response.ok) { const err = new Error(data?.message || `Ошибка сервера ${response.status}`); err.status = response.status; err.data = data; throw err; } return data; } async function checkHea
```
### `archivePage`
```text
function archivePage() { const dates = Object.keys(state.days).sort().reverse(); return pageHead('АРХИВ', 'История работы клуба', 'Каждый день остаётся в системе: цифры, готовность, задачи и статус отчёта.') + `<section class="archive-grid">${dates.length ? dates.map((d) => { const s = stats(d); const sent = Boolean(s.day.report.sentAt); return `<button class="archive-card" data-open-date="${d}"><span>${sent ? 'ОТЧЁТ ЗАКРЫТ' : 'ЧЕРНОВИК'}</span><b>${esc(prettyDate(d))}</b><small>Выручка ${money(s.day.metrics.revenue)} · готовность ${s.readiness}% · ${sent ? 'отчёт зафиксирован' : 'отчёт не зафиксирован'}</small><div class="mini-progre
```
### `baseState`
```text
function baseState() { return { version: APP_VERSION, club: {name:'EXTREME KIDS Тропарёво', manager:'Софа'}, monthPlans: {}, days: {}, tasks: [], meetings: [], plans: {weeks:{}, months:{}}, settings: {staff:['Софа','Аня','Адель','Роман']}, meta: {updatedAt:null, createdAt:nowIso()} }; } function dayBase() { const checks = {}; Object.values(CHECK_GROUPS).flat().forEach(([id]) => checks[id] = false); const rhythm = {}; RHYTHM.forEach((_, i) => rhythm[i] = false); const metrics = {}; Object.values(METRIC_GROUPS).flat().forEach(([id]) => metrics[id] = 0); return {
```
### `checkHealth`
```text
function checkHealth() { const el = $('#authCloud'); try { const h = await api('/health'); online = Boolean(h?.ok); if (el) { el.classList.toggle('online', online); el.classList.toggle('error', !online); $('b', el).textContent = online ? 'Облако подключено' : 'Облако недоступно'; } return h; } catch { online = false; if (el) { el.classList.remove('online'); el.classList.add('error'); $('b', el).textContent = navigator.onLine ? 'Нет связи с сервером' : 'Нет интернета'; } return null; } } async function login(role, code) { const result = await api('/session', {method:'POST', bod
```
### `clock`
```text
function clock(seconds) { const s = Math.max(0, num(seconds)); return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; } function plansPage() { const wk = weekKey(date), mk = monthKey(date), w = state.plans.weeks[wk], m = state.plans.months[mk]; return pageHead('ПЛАНЫ И РОСТ', 'Не тушить — улучшать', 'Управляющая отвечает не только за отсутствие проблем, но и за улучшение работы клуба каждую неделю.') + ` <div class="grid grid-2"> <section class="card"><div class="eyebrow">НЕДЕЛЯ · ${esc(wk)}</div><h2 style="margin-top:8px">Три результата недели</h2><div class="plan-goals">${w.results.map
```
### `closeMore`
```text
function closeMore() { $('#moreSheet').classList.add('hidden'); $('#moreSheet').setAttribute('aria-hidden','true'); } function saveTaskFromForm() { const id = $('#taskId').value, title = $('#taskTitle').value.trim(); if (!title) return; const payload = {title, owner:$('#taskOwner').value, due:$('#taskDue').value || date, priority:$('#taskPriority').value, category:$('#taskCategory').value, comment:$('#taskComment').value.trim(), updatedAt:nowIso()}; if (id) { const t = state.tasks.find((x) => x.id === id); if (t) Object.assign(t, payload); } else state.tasks.push({id:uid('task'), status:'todo', createdAt:nowIso(), sys:null,
```
### `closeTaskModal`
```text
function closeTaskModal() { $('#taskModal').classList.add('hidden'); $('#taskModal').setAttribute('aria-hidden','true'); } function openMore() { $('#moreSheet').classList.remove('hidden'); $('#moreSheet').setAttribute('aria-hidden','false'); } function closeMore() { $('#moreSheet').classList.add('hidden'); $('#moreSheet').setAttribute('aria-hidden','true'); } function saveTaskFromForm() { const id = $('#taskId').value, title = $('#taskTitle').value.trim(); if (!title) return; const payload = {title, owner:$('#taskOwner').value, due:$('#taskDue').value || date, priority:$('#taskPriority').value, category:$('#taskCategory').value
```
### `dayBase`
```text
function dayBase() { const checks = {}; Object.values(CHECK_GROUPS).flat().forEach(([id]) => checks[id] = false); const rhythm = {}; RHYTHM.forEach((_, i) => rhythm[i] = false); const metrics = {}; Object.values(METRIC_GROUPS).flat().forEach(([id]) => metrics[id] = 0); return { priorities:['','',''], checks, rhythm, metrics, notes:{parents:'', team:'', incidents:'', risks:'', solved:'', owner:'', unpaidNext:'', tomorrowComment:''}, report:{tomorrow:['','',''], sentAt:null}, updatedAt:nowIso() }; } function normalize(raw) { const b = baseState(); const x = raw && typeof raw =
```
### `download`
```text
function download(name, content, type='application/json') { const url = URL.createObjectURL(new Blob([content], {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } // Auth $('#loginForm').addEventListener('submit', async (e) => { e.preventDefault(); const btn = $('#loginBtn'); btn.disabled = true; $('#loginErr').textContent = ''; try { await login($('#role').value, $('#code').value); $('#auth').classList.add('hidden'); $('#app').classList.remove('hidden'); $('#mobileNav').classList.remove('hidden'); await pullState
```
### `empty`
```text
function empty(title, text) { return `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`; } function taskHtml(t) { const overdue = t.status !== 'done' && t.due < date; const p = t.priority || 'medium'; return `<article class="task-card ${t.status === 'done' ? 'done' : ''}"> <button class="task-check" data-toggle-task="${esc(t.id)}" aria-label="Изменить статус">${t.status === 'done' ? '✓' : ''}</button> <div class="task-main"><b>${esc(t.title)}</b><div class="task-meta"><span class="tag ${p}">${p === 'high' ? 'Высокий' : p === 'low' ? 'Низкий' : 'Средний'}</span><span class="tag">${esc(t.owner)}</span><span c
```
### `ensure`
```text
function ensure(d) { const mk = monthKey(d), wk = weekKey(d); if (!state.monthPlans[mk]) state.monthPlans[mk] = {revenuePlan:2500000, occupancyTarget:75, updatedAt:nowIso()}; if (!state.plans.weeks[wk]) state.plans.weeks[wk] = {results:['','',''], risk:'', team:'', parents:'', improvement:'', decision:'', updatedAt:nowIso()}; if (!state.plans.months[mk]) state.plans.months[mk] = {goals:['','',''], focus:'', experiment:'', conclusion:'', updatedAt:nowIso()}; if (!state.days[d]) state.days[d] = dayBase(); normalizeDay(state.days[d]); ensureRecurring(d); return state.days[d]; } function ensureRecurring(d) {
```
### `ensureRecurring`
```text
function ensureRecurring(d) { const wd = dayOfWeek(d); const recurring = [['daily', 'Ежедневный отчёт до 21:30', 'high', 'Отчёт']]; if (wd === 1) recurring.push(['week', 'Встреча Романа и Софы — 60 минут', 'medium', 'Управление']); if (wd === 2) recurring.push(['admins', 'Собрание администраторов — 45 минут', 'high', 'Команда']); if (wd === 3) recurring.push(['sales', 'Разбор воронки продаж — 20 минут', 'medium', 'Продажи']); if (wd === 5) recurring.push(['quality', 'Контроль качества и дисциплины — 30 минут', 'medium', 'Качество']); recurring.forEach(([kind,title,priority,category]) => { const sys = `${d}:${
```
### `guidePage`
```text
function guidePage() { return pageHead('СИСТЕМА УПРАВЛЯЮЩЕЙ', 'Софа управляет клубом, а не ресепшеном', 'Если непонятно, что делать дальше — этот раздел возвращает к роли, приоритетам и полномочиям.') + ` <section class="guide-columns"> <div class="guide-card"><span class="guide-number">1</span><h3>Не делать всё самой</h3><ul><li>Поставить задачу.</li><li>Назначить ответственного.</li><li>Дать ресурс и срок.</li><li>Проверить результат.</li><li>Разобрать повторную ошибку.</li></ul></div> <div class="guide-card"><span class="guide-number">2</span><h3>Знать цифры</h3><ul><li>План и факт месяца.</li><li>Лиды и пробные.<
```
### `kpi`
```text
function kpi(label, value, small, progress = null) { return `<div class="kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(small)}</small>${progress === null ? '' : `<div class="mini-progress"><i style="width:${clamp(progress,0,100)}%"></i></div>`}</div>`; } function empty(title, text) { return `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`; } function taskHtml(t) { const overdue = t.status !== 'done' && t.due < date; const p = t.priority || 'medium'; return `<article class="task-card ${t.status === 'done' ? 'done' : ''}"> <button class="task-check" data-toggle-task="${esc(t.i
```
### `login`
```text
function login(role, code) { const result = await api('/session', {method:'POST', body:JSON.stringify({role, code:String(code || '').trim().toUpperCase()})}); if (!result?.token || !result?.user) throw new Error('Сервер не вернул рабочую сессию'); session = result; localStorage.setItem(LS_SESSION, JSON.stringify(session)); return result; } async function pullState(force = false) { if (!session?.token || busy || (!force && dirty)) return; busy = true; try { const result = await api('/state'); online = true; if (result?.exists && result?.state && (force || num(result.revision) > revision))
```
### `logout`
```text
function logout(message = '') { session = null; localStorage.removeItem(LS_SESSION); clearInterval(pollTimer); $('#app')?.classList.add('hidden'); $('#mobileNav')?.classList.add('hidden'); $('#auth')?.classList.remove('hidden'); $('#code').value = ''; $('#loginErr').textContent = message; checkHealth(); } function startPolling() { clearInterval(pollTimer); pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && !dirty) pullState(); }, 12000); } function stats(d = date) { const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.revenuePlan), fact = sumMonth(mk, 'revenue')
```
### `makeMeetingDraft`
```text
function makeMeetingDraft(type) { const t = MEETING_TEMPLATES[type] || MEETING_TEMPLATES.admins; return {type, date:date || currentDate(), participants:t.participants, duration:t.duration, agenda:t.agenda.map((text) => ({text,done:false})), notes:'', decision:'', tasks:''}; } function meetingsPage() { const t = MEETING_TEMPLATES[meetingDraft.type] || MEETING_TEMPLATES.admins; const history = state.meetings.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,6); return pageHead('СОБРАНИЯ', 'Решения превращаются в задачи', 'Не просто поговорить. Зафиксировать факты, принять решение, назначить ответственного и ср
```
### `meetingsPage`
```text
function meetingsPage() { const t = MEETING_TEMPLATES[meetingDraft.type] || MEETING_TEMPLATES.admins; const history = state.meetings.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,6); return pageHead('СОБРАНИЯ', 'Решения превращаются в задачи', 'Не просто поговорить. Зафиксировать факты, принять решение, назначить ответственного и срок.') + ` <div class="meeting-templates">${Object.entries(MEETING_TEMPLATES).map(([id,x]) => `<button class="meeting-template ${meetingDraft.type === id ? 'active' : ''}" data-meeting-type="${id}"><b>${esc(x.title)}</b><span>${x.duration} минут · ${esc(x.description)}</span></button>
```
### `monthChart`
```text
function monthChart(mk) { const points = Object.entries(state.days).filter(([d]) => monthKey(d) === mk).map(([d,v]) => ({d, value:num(v.metrics?.revenue)})).filter((x) => x.value || x.d === date).sort((a,b) => a.d.localeCompare(b.d)); if (points.length < 2) return `<div class="empty" style="margin-top:14px"><b>График появится автоматически</b>Нужно хотя бы два дня с внесённой выручкой.</div>`; const w = 640, h = 160, pad = 12, max = Math.max(...points.map((p) => p.value), 1); const coords = points.map((p,i) => ({...p, x:pad + i * (w - pad*2) / Math.max(1, points.length-1), y:h-pad - p.value/max*(h-pad*2)})); const line = c
```
### `nextRhythm`
```text
function nextRhythm(d) { const current = new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()); for (let i=0;i<RHYTHM.length;i++) if (!d.rhythm[i] && (date !== currentDate() || RHYTHM[i][0] >= current || i === RHYTHM.length-1)) return [...RHYTHM[i], i]; for (let i=0;i<RHYTHM.length;i++) if (!d.rhythm[i]) return [...RHYTHM[i], i]; return null; } function reportText() { const s = stats(); const d = s.day; const taskDone = state.tasks.filter((t) => t.status === 'done' && t.updatedAt?.slice(0,10) === date).length; const overdue = state.tasks.filter((t) => t.
```
### `normalize`
```text
function normalize(raw) { const b = baseState(); const x = raw && typeof raw === 'object' ? raw : {}; const s = { ...b, ...x, version: APP_VERSION, club:{...b.club, ...(x.club || {})}, monthPlans:x.monthPlans && typeof x.monthPlans === 'object' ? x.monthPlans : {}, days:x.days && typeof x.days === 'object' ? x.days : {}, tasks:Array.isArray(x.tasks) ? x.tasks : [], meetings:Array.isArray(x.meetings) ? x.meetings : [], plans:{weeks:x.plans?.weeks || {}, months:x.plans?.months || {}}, settings:{...b.settings, ...(x.settings || {}), staff:Array.isArray(x.settings?.staff) ? x.setti
```
### `normalizeDay`
```text
function normalizeDay(day) { const b = dayBase(); day.priorities = Array.isArray(day.priorities) ? [...day.priorities.slice(0,3), '', '', ''].slice(0,3) : b.priorities; day.checks = {...b.checks, ...(day.checks || {})}; day.rhythm = {...b.rhythm, ...(day.rhythm || {})}; day.metrics = {...b.metrics, ...(day.metrics || {})}; day.notes = {...b.notes, ...(day.notes || {})}; day.report = {...b.report, ...(day.report || {}), tomorrow:Array.isArray(day.report?.tomorrow) ? [...day.report.tomorrow.slice(0,3),'','',''].slice(0,3) : b.report.tomorrow}; day.updatedAt = day.updatedAt || nowIso(); return day; } let
```
### `noteField`
```text
function noteField(label, key, value) { return `<div class="field"><label>${esc(label)}</label><textarea data-note="${key}" placeholder="Если ничего нет — можно оставить пустым">${esc(value)}</textarea></div>`; } function makeMeetingDraft(type) { const t = MEETING_TEMPLATES[type] || MEETING_TEMPLATES.admins; return {type, date:date || currentDate(), participants:t.participants, duration:t.duration, agenda:t.agenda.map((text) => ({text,done:false})), notes:'', decision:'', tasks:''}; } function meetingsPage() { const t = MEETING_TEMPLATES[meetingDraft.type] || MEETING_TEMPLATES.admins; const history = state.meetings.sli
```
### `numbersPage`
```text
function numbersPage() { const s = stats(); return pageHead('ЦИФРЫ КЛУБА', 'Управление по данным', 'Софа должна видеть не просто факт, а отклонение и то, что можно изменить сегодня.', `<button class="button ghost compact" data-act="manualSync">Синхронизировать</button>`) + ` <div class="numbers-summary"> ${kpi('План месяца', money(s.plan), `${pct(s.progress)} выполнено`, s.progress)} ${kpi('Факт месяца', money(s.fact), `Прогноз ${money(s.forecast)}`)} ${kpi('Осталось до плана', money(s.remaining), `Нужно ${money(s.need)} в день`)} ${kpi('Загрузка', pct(s.day.metrics.occupancy), `Цель ${pct(state.m
```
### `openMore`
```text
function openMore() { $('#moreSheet').classList.remove('hidden'); $('#moreSheet').setAttribute('aria-hidden','false'); } function closeMore() { $('#moreSheet').classList.add('hidden'); $('#moreSheet').setAttribute('aria-hidden','true'); } function saveTaskFromForm() { const id = $('#taskId').value, title = $('#taskTitle').value.trim(); if (!title) return; const payload = {title, owner:$('#taskOwner').value, due:$('#taskDue').value || date, priority:$('#taskPriority').value, category:$('#taskCategory').value, comment:$('#taskComment').value.trim(), updatedAt:nowIso()}; if (id) { const t = state.tasks.find((x) => x.id === id);
```
### `openTaskModal`
```text
function openTaskModal(task = null) { const modal = $('#taskModal'); $('#taskId').value = task?.id || ''; $('#taskModalTitle').textContent = task ? 'Редактировать задачу' : 'Новая задача'; $('#taskTitle').value = task?.title || ''; $('#taskDue').value = task?.due || date; $('#taskPriority').value = task?.priority || 'medium'; $('#taskCategory').value = task?.category || 'Операционка'; $('#taskComment').value = task?.comment || ''; $('#taskOwner').innerHTML = state.settings.staff.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join(''); $('#taskOwner').value = task?.owner || state.club.manager
```
### `parseMeetingTasks`
```text
function parseMeetingTasks(text, meetingId) { return String(text || '').split('\n').map((x) => x.trim()).filter(Boolean).map((line) => { const [titleRaw, ownerRaw, dueRaw] = line.split('|').map((x) => x?.trim()); return {id:uid('task'), title:titleRaw, owner:ownerRaw || state.club.manager, due:/^\d{4}-\d{2}-\d{2}$/.test(dueRaw || '') ? dueRaw : addDays(meetingDraft.date, 7), status:'todo', priority:'high', category:'Управление', comment:`Из встречи: ${MEETING_TEMPLATES[meetingDraft.type]?.title || 'рабочая встреча'}`, sourceMeeting:meetingId, createdAt:nowIso(), updatedAt:nowIso()}; }); } function saveMeeting() {
```
### `pathSet`
```text
function pathSet(obj, path, value) { const parts = path.split('.'); let cur = obj; parts.slice(0,-1).forEach((part,i) => { if (cur[part] == null) cur[part] = /^\d+$/.test(parts[i+1]) ? [] : {}; cur = cur[part]; }); cur[parts.at(-1)] = value; } function saveTimerLocal() { localStorage.setItem(LS_TIMER, JSON.stringify(timer)); } function tickTimer() { $('#sideClock') && ($('#sideClock').textContent = clockFmt.format(new Date())); if (timer.running && timer.end) { timer.left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000)); if (timer.left <= 0) { timer.running = false; timer.end = null; toast('Врем
```
### `persist`
```text
function persist({renderNow=false} = {}) { saveLocal(); dirty = true; setSyncUi('saving'); updateBadges(); if (bc) bc.postMessage({type:'local-change', at:Date.now()}); clearTimeout(saveTimer); saveTimer = setTimeout(pushState, 700); if (renderNow) render(); } async function api(path, options = {}) { const headers = {'Content-Type':'application/json', ...(options.headers || {})}; if (session?.token) headers.Authorization = `Bearer ${session.token}`; const response = await fetch(`${API}${path}`, {...options, headers, cache:'no-store'}); const text = await response.text(); let data = null; try { data = t
```
### `plansPage`
```text
function plansPage() { const wk = weekKey(date), mk = monthKey(date), w = state.plans.weeks[wk], m = state.plans.months[mk]; return pageHead('ПЛАНЫ И РОСТ', 'Не тушить — улучшать', 'Управляющая отвечает не только за отсутствие проблем, но и за улучшение работы клуба каждую неделю.') + ` <div class="grid grid-2"> <section class="card"><div class="eyebrow">НЕДЕЛЯ · ${esc(wk)}</div><h2 style="margin-top:8px">Три результата недели</h2><div class="plan-goals">${w.results.map((v,i) => `<div class="goal-row"><span>${i+1}</span><input data-week="results.${i}" value="${esc(v)}" placeholder="Результат недели ${i+1}"></div>`).join(
```
### `pullState`
```text
function pullState(force = false) { if (!session?.token || busy || (!force && dirty)) return; busy = true; try { const result = await api('/state'); online = true; if (result?.exists && result?.state && (force || num(result.revision) > revision)) { state = normalize(result.state); revision = num(result.revision); ensure(date); saveLocal(); if (force || document.visibilityState === 'visible') render(); } else if (!result?.exists) { await pushState(true); } else { revision = Math.max(revision, num(result?.revision)); } setSyncUi('online', resul
```
### `pushState`
```text
function pushState(first = false, retry = true) { if ((!dirty && !first) || !session?.token) return; if (!navigator.onLine) { online = false; setSyncUi('error', 'Офлайн · изменения сохранены на устройстве'); return; } setSyncUi('saving'); try { const result = await api('/state', {method:'PUT', body:JSON.stringify({baseRevision: first ? 0 : revision, fullState:state, deviceId:navigator.userAgent.slice(0,120)})}); if (result?.state) state = normalize(result.state); revision = num(result?.revision) || Math.max(1, revision + 1); dirty = false; online = true; saveLocal(); setSyncUi('online', result?.la
```
### `refreshReportPreview`
```text
function refreshReportPreview() { const p = $('#reportPreview'); if (p) p.textContent = reportText(); } function openTaskModal(task = null) { const modal = $('#taskModal'); $('#taskId').value = task?.id || ''; $('#taskModalTitle').textContent = task ? 'Редактировать задачу' : 'Новая задача'; $('#taskTitle').value = task?.title || ''; $('#taskDue').value = task?.due || date; $('#taskPriority').value = task?.priority || 'medium'; $('#taskCategory').value = task?.category || 'Операционка'; $('#taskComment').value = task?.comment || ''; $('#taskOwner').innerHTML = state.settings.staff.map((x) => `<option val
```
### `render`
```text
function render() { ensure(date); const content = $('#content'); if (!content) return; $('#dateInput').value = date; $('#sideDate').textContent = prettyDate(date); $('#mobileDateText').textContent = shortDate(date); $('#avatar').textContent = (session?.user?.name || '—').slice(0,1).toUpperCase(); $('#userName').textContent = session?.user?.name || '—'; $('#userRole').textContent = session?.user?.title || '—'; content.innerHTML = (PAGES[page] || PAGES.today)(); $$('[data-page]').forEach((el) => el.classList.toggle('active', el.dataset.page === page)); updateBadges(); tickTimer(); if (page === 're
```
### `reportPage`
```text
function reportPage() { const d = ensure(date); const sent = d.report.sentAt; return pageHead('ЕЖЕДНЕВНЫЙ ОТЧЁТ', 'Итог собственнику', 'Цифры собираются автоматически. Софа добавляет только то, что невозможно понять из цифр.', `<button class="button ghost compact" data-act="copyReport">Скопировать</button><button class="button primary compact" data-act="markReport">${sent ? 'Обновить отметку' : 'Зафиксировать отправку'}</button>`) + ` <div class="grid grid-2"> <section class="card"> <div class="report-status ${sent ? 'sent' : ''}"><i>●</i><b>${sent ? 'Отчёт зафиксирован' : 'Отчёт ещё не зафиксирован'}</b><span>
```
### `reportText`
```text
function reportText() { const s = stats(); const d = s.day; const taskDone = state.tasks.filter((t) => t.status === 'done' && t.updatedAt?.slice(0,10) === date).length; const overdue = state.tasks.filter((t) => t.status !== 'done' && t.due < date).length; return `EXTREME KIDS ТРОПАРЁВО — ИТОГ ДНЯ\n${prettyDate(date)}\n\nЦИФРЫ\n• Выручка за день: ${money(d.metrics.revenue)}\n• Выручка за месяц: ${money(s.fact)} / план ${money(s.plan)} (${pct(s.progress)})\n• До плана осталось: ${money(s.remaining)}\n• Необходимый темп: ${money(s.need)} в день\n• Прогноз месяца: ${money(s.forecast)}\n\nПРОДАЖИ И ВОРОНКА\n• Групповые: ${num(d.met
```
### `rhythmPage`
```text
function rhythmPage() { const d = ensure(date); const next = nextRhythm(d); return pageHead('РИТМ УПРАВЛЕНИЯ', 'День по контрольным точкам', 'Система напоминает, что проверять. Управляющая не должна держать рабочий день в голове.') + ` <div class="grid grid-2"> <section class="card"><h2>Контрольные точки</h2><div class="timeline">${RHYTHM.map(([time,title,text],i) => `<div class="timeline-item ${d.rhythm[i] ? 'done' : ''} ${next?.[3] === i ? 'current' : ''}"><time>${time}</time><div class="timeline-copy"><b>${esc(title)}</b><small>${esc(text)}</small></div><button class="timeline-toggle" data-rhythm="${i}">${d.rhythm[i]
```
### `safeJson`
```text
function safeJson(value) { try { return value ? JSON.parse(value) : null; } catch { return null; } } function stamp() { state.meta.updatedAt = nowIso(); } function ensure(d) { const mk = monthKey(d), wk = weekKey(d); if (!state.monthPlans[mk]) state.monthPlans[mk] = {revenuePlan:2500000, occupancyTarget:75, updatedAt:nowIso()}; if (!state.plans.weeks[wk]) state.plans.weeks[wk] = {results:['','',''], risk:'', team:'', parents:'', improvement:'', decision:'', updatedAt:nowIso()}; if (!state.plans.months[mk]) state.plans.months[mk] = {goals:['','',''], focus:'', experiment:'', conclusion:'', updatedAt:nowIso()}; if (!stat
```
### `saveLocal`
```text
function saveLocal() { stamp(); localStorage.setItem(LS_STATE, JSON.stringify(state)); } function persist({renderNow=false} = {}) { saveLocal(); dirty = true; setSyncUi('saving'); updateBadges(); if (bc) bc.postMessage({type:'local-change', at:Date.now()}); clearTimeout(saveTimer); saveTimer = setTimeout(pushState, 700); if (renderNow) render(); } async function api(path, options = {}) { const headers = {'Content-Type':'application/json', ...(options.headers || {})}; if (session?.token) headers.Authorization = `Bearer ${session.token}`; const response = await fetch(`${API}${path}`, {...options, he
```
### `saveMeeting`
```text
function saveMeeting() { const meetingId = uid('meet'); const m = {id:meetingId, type:meetingDraft.type, title:MEETING_TEMPLATES[meetingDraft.type]?.title || 'Рабочая встреча', date:meetingDraft.date, participants:meetingDraft.participants, duration:meetingDraft.duration, agenda:meetingDraft.agenda.map((x) => ({...x})), notes:meetingDraft.notes, decision:meetingDraft.decision, tasks:parseMeetingTasks(meetingDraft.tasks, meetingId).map((x) => x.title), updatedAt:nowIso()}; state.meetings.push(m); const tasks = parseMeetingTasks(meetingDraft.tasks, meetingId); state.tasks.push(...tasks); meetingDraft = makeMeetingDraft(meeti
```
### `saveTaskFromForm`
```text
function saveTaskFromForm() { const id = $('#taskId').value, title = $('#taskTitle').value.trim(); if (!title) return; const payload = {title, owner:$('#taskOwner').value, due:$('#taskDue').value || date, priority:$('#taskPriority').value, category:$('#taskCategory').value, comment:$('#taskComment').value.trim(), updatedAt:nowIso()}; if (id) { const t = state.tasks.find((x) => x.id === id); if (t) Object.assign(t, payload); } else state.tasks.push({id:uid('task'), status:'todo', createdAt:nowIso(), sys:null, sourceMeeting:null, ...payload}); persist(); closeTaskModal(); render(); toast(id ? 'Задача обновлена' : 'Задача доб
```
### `saveTimerLocal`
```text
function saveTimerLocal() { localStorage.setItem(LS_TIMER, JSON.stringify(timer)); } function tickTimer() { $('#sideClock') && ($('#sideClock').textContent = clockFmt.format(new Date())); if (timer.running && timer.end) { timer.left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000)); if (timer.left <= 0) { timer.running = false; timer.end = null; toast('Время встречи завершено'); } saveTimerLocal(); } const el = $('#timerValue'); if (el) el.textContent = clock(timer.left); } function toast(message) { clearTimeout(toastTimer); const el = $('#toast'); el.textContent = message; el.classList.add('sh
```
### `setPage`
```text
function setPage(next) { const allowed = ['today','tasks','numbers','rhythm','report','meetings','plans','guide','archive','settings']; page = allowed.includes(next) ? next : 'today'; location.hash = page; closeMore(); render(); } function pageHead(kicker, title, subtitle, actions = '') { return `<header class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></header>`; } function todayPage() { const s = stats(); const open = state.tasks.filter((t) => t.status !== 'done' && t.due <= date).sort((a,b) => a.
```
### `setSyncUi`
```text
function setSyncUi(mode, sub = '') { const panel = $('#syncPanel'), save = $('.save-state'); if (!panel) return; panel.classList.toggle('online', mode === 'online'); panel.classList.toggle('error', mode === 'error'); save?.classList.toggle('saving', mode === 'saving'); save?.classList.toggle('error', mode === 'error'); $('#syncText').textContent = mode === 'online' ? 'Синхронизировано' : mode === 'saving' ? 'Сохраняем…' : 'Локальный режим'; $('#syncSub').textContent = sub || (mode === 'online' ? `Общая база · версия ${revision || '—'}` : mode === 'saving' ? 'Отправляем изменения в облако' : 'Изменения сохранены на устр
```
### `settingsPage`
```text
function settingsPage() { const mk = monthKey(date), p = state.monthPlans[mk]; return pageHead('НАСТРОЙКИ', 'Система и синхронизация', 'Проверь облако, план месяца, состав команды и сделай резервную копию.', `<button class="button danger compact" data-act="logout">Выйти</button>`) + ` <div class="grid grid-2"> <section class="card"><h2>Общая база</h2><div class="grid grid-3"><div class="status-box ${online ? 'good' : 'warn'}"><span>Статус</span><b>${online ? 'Подключена' : 'Локально'}</b><small>${online ? 'Изменения передаются между устройствами.' : 'Изменения не потеряются и отправятся после восстановления связи.'}</sma
```
### `stamp`
```text
function stamp() { state.meta.updatedAt = nowIso(); } function ensure(d) { const mk = monthKey(d), wk = weekKey(d); if (!state.monthPlans[mk]) state.monthPlans[mk] = {revenuePlan:2500000, occupancyTarget:75, updatedAt:nowIso()}; if (!state.plans.weeks[wk]) state.plans.weeks[wk] = {results:['','',''], risk:'', team:'', parents:'', improvement:'', decision:'', updatedAt:nowIso()}; if (!state.plans.months[mk]) state.plans.months[mk] = {goals:['','',''], focus:'', experiment:'', conclusion:'', updatedAt:nowIso()}; if (!state.days[d]) state.days[d] = dayBase(); normalizeDay(state.days[d]); ensureRecurring(d); retu
```
### `startPolling`
```text
function startPolling() { clearInterval(pollTimer); pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && !dirty) pullState(); }, 12000); } function stats(d = date) { const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.revenuePlan), fact = sumMonth(mk, 'revenue'); const daysInMonth = new Date(Number(mk.slice(0,4)), Number(mk.slice(5,7)), 0).getDate(); const dateNumber = Number(d.slice(8,10)); const remainingDays = Math.max(1, daysInMonth - dateNumber); const remaining = Math.max(0, plan - fact); const need = remaining / remainingDays; const elapsed = Math.m
```
### `stats`
```text
function stats(d = date) { const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.revenuePlan), fact = sumMonth(mk, 'revenue'); const daysInMonth = new Date(Number(mk.slice(0,4)), Number(mk.slice(5,7)), 0).getDate(); const dateNumber = Number(d.slice(8,10)); const remainingDays = Math.max(1, daysInMonth - dateNumber); const remaining = Math.max(0, plan - fact); const need = remaining / remainingDays; const elapsed = Math.max(1, dateNumber); const forecast = fact / elapsed * daysInMonth; const conversion = num(day.metrics.attended) ? num(day.metrics.sold) / num(day.metrics.attended) * 100
```
### `sumMonth`
```text
function sumMonth(mk, key) { return Object.entries(state.days).filter(([d]) => monthKey(d) === mk).reduce((sum,[,v]) => sum + num(v.metrics?.[key]), 0); } function tasksFor(filter = taskFilter) { let list = state.tasks.slice(); if (taskOwnerFilter !== 'all') list = list.filter((t) => t.owner === taskOwnerFilter); if (filter === 'today') list = list.filter((t) => t.status !== 'done' && t.due <= date); if (filter === 'overdue') list = list.filter((t) => t.status !== 'done' && t.due < date); if (filter === 'done') list = list.filter((t) => t.status === 'done'); if (filter === 'all') list = list.filter((t) => t.status !=
```
### `taskHtml`
```text
function taskHtml(t) { const overdue = t.status !== 'done' && t.due < date; const p = t.priority || 'medium'; return `<article class="task-card ${t.status === 'done' ? 'done' : ''}"> <button class="task-check" data-toggle-task="${esc(t.id)}" aria-label="Изменить статус">${t.status === 'done' ? '✓' : ''}</button> <div class="task-main"><b>${esc(t.title)}</b><div class="task-meta"><span class="tag ${p}">${p === 'high' ? 'Высокий' : p === 'low' ? 'Низкий' : 'Средний'}</span><span class="tag">${esc(t.owner)}</span><span class="tag ${overdue ? 'high' : ''}">${overdue ? 'Просрочено · ' : ''}${esc(t.due)}</span><span class="t
```
### `tasksFor`
```text
function tasksFor(filter = taskFilter) { let list = state.tasks.slice(); if (taskOwnerFilter !== 'all') list = list.filter((t) => t.owner === taskOwnerFilter); if (filter === 'today') list = list.filter((t) => t.status !== 'done' && t.due <= date); if (filter === 'overdue') list = list.filter((t) => t.status !== 'done' && t.due < date); if (filter === 'done') list = list.filter((t) => t.status === 'done'); if (filter === 'all') list = list.filter((t) => t.status !== 'done'); return list.sort((a,b) => (a.status === b.status ? (a.due || '').localeCompare(b.due || '') : a.status === 'done' ? 1 : -1)); } function
```
### `tasksPage`
```text
function tasksPage() { const list = tasksFor(); const open = state.tasks.filter((t) => t.status !== 'done').length; const todayCount = state.tasks.filter((t) => t.status !== 'done' && t.due === date).length; const overdue = state.tasks.filter((t) => t.status !== 'done' && t.due < date).length; const done = state.tasks.filter((t) => t.status === 'done').length; return pageHead('РАБОТА КАЖДЫЙ ДЕНЬ', 'Задачи', 'У каждой задачи есть результат, ответственный, срок и понятный следующий шаг.', `<button class="button primary compact" data-act="newTask">+ Новая задача</button>`) + ` <div class="task-summary"><div class="s
```
### `tickTimer`
```text
function tickTimer() { $('#sideClock') && ($('#sideClock').textContent = clockFmt.format(new Date())); if (timer.running && timer.end) { timer.left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000)); if (timer.left <= 0) { timer.running = false; timer.end = null; toast('Время встречи завершено'); } saveTimerLocal(); } const el = $('#timerValue'); if (el) el.textContent = clock(timer.left); } function toast(message) { clearTimeout(toastTimer); const el = $('#toast'); el.textContent = message; el.classList.add('show'); toastTimer = setTimeout(() => el.classList.remove('show'), 2300); } function d
```
### `todayPage`
```text
function todayPage() { const s = stats(); const open = state.tasks.filter((t) => t.status !== 'done' && t.due <= date).sort((a,b) => a.due.localeCompare(b.due)).slice(0,6); const overdue = state.tasks.filter((t) => t.status !== 'done' && t.due < date).length; const alerts = []; if (num(s.day.metrics.unanswered)) alerts.push(`${s.day.metrics.unanswered} лид(а) без ответа`); if (num(s.day.metrics.unpaidClients)) alerts.push(`${s.day.metrics.unpaidClients} неоплаченных клиент(а)`); if (overdue) alerts.push(`${overdue} просроченных задач`); const next = nextRhythm(s.day); const readinessText = s.readiness >= 85
```
### `updateBadges`
```text
function updateBadges() { if (!$('#navTasks')) return; const d = ensure(date); const open = state.tasks.filter((t) => t.status !== 'done' && t.due <= date).length; const overdue = state.tasks.filter((t) => t.status !== 'done' && t.due < date).length; const alerts = num(d.metrics.unanswered) + (num(d.metrics.unpaidClients) > 0 ? 1 : 0) + (overdue ? 1 : 0); $('#navTasks').textContent = open; $('#navAlert').textContent = alerts; } function setPage(next) { const allowed = ['today','tasks','numbers','rhythm','report','meetings','plans','guide','archive','settings']; page = allowed.includes(next) ? next : 't
```
### `v8archive`
```text
function v8archive(){const months=Object.entries(state.plans.months).filter(([,m])=>m.closedAt&&m.snapshot).sort((a,b)=>b[0].localeCompare(a[0])),weeks=Object.entries(state.plans.weeks).filter(([,w])=>w.closedAt&&w.snapshot).sort((a,b)=>b[0].localeCompare(a[0]));const extra=pageHead('АРХИВ','История результатов','Закрытые недели и месяцы сохраняются снимком.')+`<div class="section-title"><div><h2>Месяцы</h2></div></div><div class="v8hist">${months.length?months.map(([k,m])=>`<div><b>${esc(k)} · ${esc(m.snapshot.status)}</b><small>${money(m.snapshot.fact)} / ${money(m.snapshot.target)} · задачи ${m.snapshot.done}/${m.snapshot.total}${state.mon
```
### `v8close`
```text
function v8close(scope){const p=v8period(scope),o=p.x;o.closedAt=nowIso();o.snapshot={key:p.key,monthKey:monthKey(date),score:Math.round(p.score),status:v8st(p.score,1).sh,target:p.target,fact:p.fact,gp:Math.round(p.gp),done:p.ts.done,total:p.ts.total,closedAt:o.closedAt};o.updatedAt=nowIso();if(scope==='month'){const{mk,mp}=v8prep(),s=v8salary(mk);mp.salary.closedAt=o.closedAt;mp.salary.snapshot={amount:Math.round(s.total),base:V8_BASE,kpi:s.k,scale:s.scale,fact:s.fact,plan:s.plan,closedAt:o.closedAt}}persist();render();toast(scope==='week'?'Неделя закрыта':'Месяц и зарплата зафиксированы')} function v8closeCard(scope,p){const c=!!p.x.clos
```
### `v8closeCard`
```text
function v8closeCard(scope,p){const c=!!p.x.closedAt,st=v8st(p.score,c);return`<div class="v8close"><div class="v8closeTop"><div><div class="eyebrow">${scope==='week'?'ИТОГ НЕДЕЛИ':'ИТОГ МЕСЯЦА'}</div><h3>${c?'Результат зафиксирован':'Предварительный результат'}</h3></div><span class="v8pill ${st.cl}">${c?st.sh:`${Math.round(p.score)}% · ${st.sh}`}</span></div><div class="v8closeGrid"><div><span>Выручка</span><b>${p.target?`${money(p.fact)} / ${money(p.target)}`:'План не задан'}</b></div><div><span>Результаты</span><b>${Math.round(p.gp)}%</b></div><div><span>Задачи</span><b>${p.ts.done}/${p.ts.total}</b></div></div><button class="button ${c?'
```
### `v8coef`
```text
function v8coef(p){return p>=100?1:p>=95?.75:p>=90?.5:0} function v8salary(mk){const mp=state.monthPlans[mk],s=mp.salary,fact=sumMonth(mk,'revenue'),plan=num(mp.revenuePlan),pr=plan?fact/plan*100:0,k=V8_KPIS.filter(([x])=>s.checks[x]).length*5000,raw=v8tier(fact),scale=raw*v8coef(pr);return{fact,plan,pr,k,raw,scale,total:V8_BASE+k+scale,final:s.snapshot?.amount??null}} function v8task(scope,key){const cat=scope==='week'?`План недели ${key}`:`План месяца ${key}`,list=state.tasks.filter(t=>t.category===cat),done=list.filter(t=>t.status==='done').length;return{cat,list,done,total:list.length,pct:list.length?done/list.length*100:0}} functio
```
### `v8goal`
```text
function v8goal(scope,i,v){v=num(v);return`<button class="v8goal ${v>=1?'done':v>=.5?'part':''}" data-v8-${scope}="${i}">${v>=1?'✓':v>=.5?'◐':'○'}</button>`} function v8tasks(scope,key){const t=v8task(scope,key);return t.list.length?t.list.map(x=>`<div class="v8task ${x.status==='done'?'done':''}"><button class="task-check" data-toggle-task="${esc(x.id)}">${x.status==='done'?'✓':''}</button><div><b>${esc(x.title)}</b><small>${esc(x.owner)} · ${esc(x.due)}</small></div><button data-edit-task="${esc(x.id)}">✎</button></div>`).join(''):`<div class="card-sub">Связанных задач пока нет.</div>`} function v8close(scope){const p=v8period(scope),o=
```
### `v8gp`
```text
function v8gp(values,status){const ix=values.map((v,i)=>String(v||'').trim()?i:-1).filter(i=>i>=0);return ix.length?ix.reduce((s,i)=>s+num(status[i]||0),0)/ix.length*100:0} function v8st(score,closed){const sh=score>=90?'Выполнено':score>=70?'Частично':'Не выполнено',cl=score>=90?'good':score>=70?'warn':'danger';return{sh,cl,label:closed?sh:`В работе · ${Math.round(score)}%`}} function v8period(scope){const{mk,wk,mp,w,m}=v8prep(),isW=scope==='week',x=isW?w:m,key=isW?wk:mk,target=isW?num(w.revenueTarget):num(mp.revenuePlan),fact=isW?v8weekSum(wk):sumMonth(mk,'revenue'),rp=target?fact/target*100:0,gp=v8gp(isW?w.results:m.goals,isW?w.resultS
```
### `v8period`
```text
function v8period(scope){const{mk,wk,mp,w,m}=v8prep(),isW=scope==='week',x=isW?w:m,key=isW?wk:mk,target=isW?num(w.revenueTarget):num(mp.revenuePlan),fact=isW?v8weekSum(wk):sumMonth(mk,'revenue'),rp=target?fact/target*100:0,gp=v8gp(isW?w.results:m.goals,isW?w.resultStatus:m.goalStatus),ts=v8task(scope,key);let a=[],tw=0;if(target){a.push([rp,50]);tw+=50}if((isW?w.results:m.goals).some(v=>String(v||'').trim())){a.push([gp,30]);tw+=30}if(ts.total){a.push([ts.pct,20]);tw+=20}const score=tw?a.reduce((s,[v,z])=>s+clamp(v,0,100)*z,0)/tw:0;return{x,key,target,fact,rp,gp,ts,score,st:v8st(score,!!x.closedAt)}} function v8goal(scope,i,v){v=num(v);retu
```
### `v8plans`
```text
function v8plans(){const{mk,wk,mp,w,m}=v8prep(),ws=v8period('week'),ms=v8period('month'),s=v8salary(mk),z=s.final??s.total;return pageHead('ПЛАНЫ · РЕЗУЛЬТАТ · МОТИВАЦИЯ','План и рост','Неделя и месяц считаются по выручке, результатам и задачам. Зарплата Софы рассчитывается автоматически.')+`<div class="v8sum"><div class="${ms.st.cl}"><span>Месяц</span><b>${Math.round(ms.score)}%</b><small>${ms.st.label}</small></div><div class="${ws.st.cl}"><span>Неделя</span><b>${Math.round(ws.score)}%</b><small>${ws.st.label}</small></div><div><span>Задачи планов</span><b>${ws.ts.done+ms.ts.done}/${ws.ts.total+ms.ts.total}</b><small>Выполнено</small></div>
```
### `v8prep`
```text
function v8prep(){const mk=monthKey(date),wk=weekKey(date),mp=state.monthPlans[mk],w=state.plans.weeks[wk],m=state.plans.months[mk];if(!mp.salary)mp.salary={checks:{},closedAt:null,snapshot:null};V8_KPIS.forEach(([k])=>{if(typeof mp.salary.checks[k]!=='boolean')mp.salary.checks[k]=false});if(!Array.isArray(w.resultStatus))w.resultStatus=[0,0,0];if(!('revenueTarget'in w))w.revenueTarget=0;if(!('closedAt'in w)){w.closedAt=null;w.snapshot=null}if(!Array.isArray(m.goalStatus))m.goalStatus=[0,0,0];if(!('closedAt'in m)){m.closedAt=null;m.snapshot=null}return{mk,wk,mp,w,m}} function v8weekSum(wk){return Object.entries(state.days).filter(([d])=>wee
```
### `v8salary`
```text
function v8salary(mk){const mp=state.monthPlans[mk],s=mp.salary,fact=sumMonth(mk,'revenue'),plan=num(mp.revenuePlan),pr=plan?fact/plan*100:0,k=V8_KPIS.filter(([x])=>s.checks[x]).length*5000,raw=v8tier(fact),scale=raw*v8coef(pr);return{fact,plan,pr,k,raw,scale,total:V8_BASE+k+scale,final:s.snapshot?.amount??null}} function v8task(scope,key){const cat=scope==='week'?`План недели ${key}`:`План месяца ${key}`,list=state.tasks.filter(t=>t.category===cat),done=list.filter(t=>t.status==='done').length;return{cat,list,done,total:list.length,pct:list.length?done/list.length*100:0}} function v8gp(values,status){const ix=values.map((v,i)=>String(v||
```
### `v8st`
```text
function v8st(score,closed){const sh=score>=90?'Выполнено':score>=70?'Частично':'Не выполнено',cl=score>=90?'good':score>=70?'warn':'danger';return{sh,cl,label:closed?sh:`В работе · ${Math.round(score)}%`}} function v8period(scope){const{mk,wk,mp,w,m}=v8prep(),isW=scope==='week',x=isW?w:m,key=isW?wk:mk,target=isW?num(w.revenueTarget):num(mp.revenuePlan),fact=isW?v8weekSum(wk):sumMonth(mk,'revenue'),rp=target?fact/target*100:0,gp=v8gp(isW?w.results:m.goals,isW?w.resultStatus:m.goalStatus),ts=v8task(scope,key);let a=[],tw=0;if(target){a.push([rp,50]);tw+=50}if((isW?w.results:m.goals).some(v=>String(v||'').trim())){a.push([gp,30]);tw+=30}if(ts
```
### `v8task`
```text
function v8task(scope,key){const cat=scope==='week'?`План недели ${key}`:`План месяца ${key}`,list=state.tasks.filter(t=>t.category===cat),done=list.filter(t=>t.status==='done').length;return{cat,list,done,total:list.length,pct:list.length?done/list.length*100:0}} function v8gp(values,status){const ix=values.map((v,i)=>String(v||'').trim()?i:-1).filter(i=>i>=0);return ix.length?ix.reduce((s,i)=>s+num(status[i]||0),0)/ix.length*100:0} function v8st(score,closed){const sh=score>=90?'Выполнено':score>=70?'Частично':'Не выполнено',cl=score>=90?'good':score>=70?'warn':'danger';return{sh,cl,label:closed?sh:`В работе · ${Math.round(score)}%`}}
```
### `v8tasks`
```text
function v8tasks(scope,key){const t=v8task(scope,key);return t.list.length?t.list.map(x=>`<div class="v8task ${x.status==='done'?'done':''}"><button class="task-check" data-toggle-task="${esc(x.id)}">${x.status==='done'?'✓':''}</button><div><b>${esc(x.title)}</b><small>${esc(x.owner)} · ${esc(x.due)}</small></div><button data-edit-task="${esc(x.id)}">✎</button></div>`).join(''):`<div class="card-sub">Связанных задач пока нет.</div>`} function v8close(scope){const p=v8period(scope),o=p.x;o.closedAt=nowIso();o.snapshot={key:p.key,monthKey:monthKey(date),score:Math.round(p.score),status:v8st(p.score,1).sh,target:p.target,fact:p.fact,gp:Math.ro
```
### `v8tier`
```text
function v8tier(f){for(const[t,b]of V8_TIERS)if(f>=t)return b;return 0}function v8coef(p){return p>=100?1:p>=95?.75:p>=90?.5:0} function v8salary(mk){const mp=state.monthPlans[mk],s=mp.salary,fact=sumMonth(mk,'revenue'),plan=num(mp.revenuePlan),pr=plan?fact/plan*100:0,k=V8_KPIS.filter(([x])=>s.checks[x]).length*5000,raw=v8tier(fact),scale=raw*v8coef(pr);return{fact,plan,pr,k,raw,scale,total:V8_BASE+k+scale,final:s.snapshot?.amount??null}} function v8task(scope,key){const cat=scope==='week'?`План недели ${key}`:`План месяца ${key}`,list=state.tasks.filter(t=>t.category===cat),done=list.filter(t=>t.status==='done').length;return{cat,list,do
```
### `v8today`
```text
function v8today(){const{mk}=v8prep(),s=v8salary(mk),z=s.final??s.total,card=`<section class="card v8salary"><div><div class="eyebrow">МОЯ МОТИВАЦИЯ · ${esc(mk)}</div><strong>${money(z)}</strong><small>${s.final!=null?'Зафиксированная зарплата':`Расчёт сейчас · KPI ${money(s.k)} · план ${pct(s.pr)}`}</small></div><button class="button ghost compact" data-page="plans">Подробнее</button></section>`;return v7Today().replace('<div class="section-title"><div><h2>Три результата дня</h2>',card+'<div class="section-title"><div><h2>Три результата дня</h2>')} function v8plans(){const{mk,wk,mp,w,m}=v8prep(),ws=v8period('week'),ms=v8period('month'),s=v
```
### `v8weekSum`
```text
function v8weekSum(wk){return Object.entries(state.days).filter(([d])=>weekKey(d)===wk).reduce((s,[,v])=>s+num(v.metrics?.revenue),0)} function v8tier(f){for(const[t,b]of V8_TIERS)if(f>=t)return b;return 0}function v8coef(p){return p>=100?1:p>=95?.75:p>=90?.5:0} function v8salary(mk){const mp=state.monthPlans[mk],s=mp.salary,fact=sumMonth(mk,'revenue'),plan=num(mp.revenuePlan),pr=plan?fact/plan*100:0,k=V8_KPIS.filter(([x])=>s.checks[x]).length*5000,raw=v8tier(fact),scale=raw*v8coef(pr);return{fact,plan,pr,k,raw,scale,total:V8_BASE+k+scale,final:s.snapshot?.amount??null}} function v8task(scope,key){const cat=scope==='week'?`План недели $
```

## Keyword evidence
### `today` — Growth contains keyword: yes
- small id="sideClock">—</small> </div> <nav class="side-nav" id="sideNav"> <div class="nav-caption">ОПЕРАЦИОНКА</div> <button class="active" data-page="today"><i>⌂</i><span>Сегодня</span><em id="navAlert">0</em></button> <button data-page="tasks"><i>✓</i><span>Задачи</span><em id="navTasks">0</em></button> <button data-
- ia-label="Рабочая дата"> <button class="icon-button" data-act="nextDay" aria-label="Следующий день">→</button> <button class="button ghost compact" data-act="goToday">Сегодня</button> </div> <div class="top-actions"> <div class="save-state"><span id="saveDot"></span><b id="savedText">Всё сохранено</b></div>
- > </header> <main id="content" class="content"></main> </section> </div> <nav id="mobileNav" class="mobile-nav hidden"> <button class="active" data-page="today"><i>⌂</i><span>Сегодня</span></button> <button data-page="tasks"><i>✓</i><span>Задачи</span></button> <button data-page="numbers"><i>⌁</i><span>Цифры</span></button> <
- e(safeJson(localStorage.getItem(LS_STATE))); let session = safeJson(localStorage.getItem(LS_SESSION)); let date = currentDate(); let page = location.hash.replace('#','') || 'today'; let revision = 0; let dirty = false; let busy = false; let online = navigator.onLine; let saveTimer = null; let pollTimer = null; let toastTimer = null; let task
### `report` — Growth contains keyword: no
- check-row small{display:block;color:#7e8379;font-size:7px;margin-top:3px;line-height:1.45}.check-row.done{border-color:rgba(103,216,154,.16);background:rgba(103,216,154,.035)} /* Report */ .report-preview{white-space:pre-wrap;border:1px solid var(--line);border-radius:16px;padding:16px;background:#090b08;color:#e7e9e4;line-height:1.62;font-size:10px;min-height:51
- mall{display:block;color:#7e8379;font-size:7px;margin-top:3px;line-height:1.45}.check-row.done{border-color:rgba(103,216,154,.16);background:rgba(103,216,154,.035)} /* Report */ .report-preview{white-space:pre-wrap;border:1px solid var(--line);border-radius:16px;padding:16px;background:#090b08;color:#e7e9e4;line-height:1.62;font-size:10px;min-height:510px;overflo
- {white-space:pre-wrap;border:1px solid var(--line);border-radius:16px;padding:16px;background:#090b08;color:#e7e9e4;line-height:1.62;font-size:10px;min-height:510px;overflow:auto}.report-status{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:13px;padding:10px 11px;margin-bottom:11px;background:rgba(255,255,255,.018)}.report-statu
- auto}.report-status{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:13px;padding:10px 11px;margin-bottom:11px;background:rgba(255,255,255,.018)}.report-status i{font-style:normal;color:var(--orange)}.report-status.sent i{color:var(--green)}.report-status b{font-size:9px}.report-status span{margin-left:auto;color:#777c73;font-size
### `sales` — Growth contains keyword: yes
- пробные, индивидуальные тренировки.'], ['open_safe', 'Инвентарь и безопасность проверены', 'Аптечка, неисправности, опасные зоны.'] ], 'Продажи и клиенты': [ ['sales_leads', 'Новые лиды обработаны', 'В рабочее время ответ — до 10 минут.'], ['sales_trials', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.
- верены', 'Аптечка, неисправности, опасные зоны.'] ], 'Продажи и клиенты': [ ['sales_leads', 'Новые лиды обработаны', 'В рабочее время ответ — до 10 минут.'], ['sales_trials', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.'], ['sales_renew', 'Продления в работе', 'Начинать за 7 дней до окончания.'],
- вые лиды обработаны', 'В рабочее время ответ — до 10 минут.'], ['sales_trials', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.'], ['sales_renew', 'Продления в работе', 'Начинать за 7 дней до окончания.'], ['sales_unpaid', 'Неоплаты разобраны', 'У каждого клиента есть следующий шаг и дата контакта.'] ],
- ls', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.'], ['sales_renew', 'Продления в работе', 'Начинать за 7 дней до окончания.'], ['sales_unpaid', 'Неоплаты разобраны', 'У каждого клиента есть следующий шаг и дата контакта.'] ], 'Команда и сервис': [ ['team_tasks', 'Команда понимает задачи', 'У каждой
### `lead` — Growth contains keyword: no
- е, индивидуальные тренировки.'], ['open_safe', 'Инвентарь и безопасность проверены', 'Аптечка, неисправности, опасные зоны.'] ], 'Продажи и клиенты': [ ['sales_leads', 'Новые лиды обработаны', 'В рабочее время ответ — до 10 минут.'], ['sales_trials', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.'],
- ['anyaSalesAmount', 'Сумма продаж Ани', '₽'], ['adelSalesCount', 'Продаж Адель', 'шт.'], ['adelSalesAmount', 'Сумма продаж Адель', '₽'] ], 'Воронка': [ ['leads', 'Новых лидов', 'шт.'], ['unanswered', 'Лидов без ответа', 'шт.'], ['booked', 'Записано на пробную', 'шт.'], ['confirmed', 'Пробных подтверждено', 'шт.'],
- nyaSalesCount)} продаж / ${money(d.metrics.anyaSalesAmount)}\n• Адель: ${num(d.metrics.adelSalesCount)} продаж / ${money(d.metrics.adelSalesAmount)}\n• Новые лиды: ${num(d.metrics.leads)}, без ответа: ${num(d.metrics.unanswered)}\n• Пробные: записано ${num(d.metrics.booked)}, подтверждено ${num(d.metrics.confirmed)}, пришло ${num(d.metrics.attended)}, купило ${n
### `trial` — Growth contains keyword: yes
- ', 'Аптечка, неисправности, опасные зоны.'] ], 'Продажи и клиенты': [ ['sales_leads', 'Новые лиды обработаны', 'В рабочее время ответ — до 10 минут.'], ['sales_trials', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.'], ['sales_renew', 'Продления в работе', 'Начинать за 7 дней до окончания.'], ['s
### `renew` — Growth contains keyword: yes
- ды обработаны', 'В рабочее время ответ — до 10 минут.'], ['sales_trials', 'Пробные доведены до решения', 'Подтверждение, визит, обратная связь, предложение.'], ['sales_renew', 'Продления в работе', 'Начинать за 7 дней до окончания.'], ['sales_unpaid', 'Неоплаты разобраны', 'У каждого клиента есть следующий шаг и дата контакта.'] ], 'Кома
- confirmed', 'Пробных подтверждено', 'шт.'], ['attended', 'Пробных пришло', 'шт.'], ['sold', 'После пробной купило', 'шт.'] ], 'Продления и загрузка': [ ['renewDue', 'Продлений в работе', 'шт.'], ['renewDone', 'Продлено', 'шт.'], ['unpaidClients', 'Неоплаченных клиентов', 'шт.'], ['unpaidAmount', 'Сумма неоплат', '₽'],
- ['attended', 'Пробных пришло', 'шт.'], ['sold', 'После пробной купило', 'шт.'] ], 'Продления и загрузка': [ ['renewDue', 'Продлений в работе', 'шт.'], ['renewDone', 'Продлено', 'шт.'], ['unpaidClients', 'Неоплаченных клиентов', 'шт.'], ['unpaidAmount', 'Сумма неоплат', '₽'], ['occupancy', 'Загрузка групп', '%'],
- mber); const forecast = fact / elapsed * daysInMonth; const conversion = num(day.metrics.attended) ? num(day.metrics.sold) / num(day.metrics.attended) * 100 : 0; const renew = num(day.metrics.renewDue) ? num(day.metrics.renewDone) / num(day.metrics.renewDue) * 100 : 0; const checkDone = Object.values(day.checks).filter(Boolean).length; const r
### `client` — Growth contains keyword: yes
- ['sold', 'После пробной купило', 'шт.'] ], 'Продления и загрузка': [ ['renewDue', 'Продлений в работе', 'шт.'], ['renewDone', 'Продлено', 'шт.'], ['unpaidClients', 'Неоплаченных клиентов', 'шт.'], ['unpaidAmount', 'Сумма неоплат', '₽'], ['occupancy', 'Загрузка групп', '%'], ['cleanliness', 'Чистота', '%'] ] }; c
- due <= date).length; const overdue = state.tasks.filter((t) => t.status !== 'done' && t.due < date).length; const alerts = num(d.metrics.unanswered) + (num(d.metrics.unpaidClients) > 0 ? 1 : 0) + (overdue ? 1 : 0); $('#navTasks').textContent = open; $('#navAlert').textContent = alerts; } function setPage(next) { const allowed = ['today','t
- & t.due < date).length; const alerts = []; if (num(s.day.metrics.unanswered)) alerts.push(`${s.day.metrics.unanswered} лид(а) без ответа`); if (num(s.day.metrics.unpaidClients)) alerts.push(`${s.day.metrics.unpaidClients} неоплаченных клиент(а)`); if (overdue) alerts.push(`${overdue} просроченных задач`); const next = nextRhythm(s.day); con
- ; if (num(s.day.metrics.unanswered)) alerts.push(`${s.day.metrics.unanswered} лид(а) без ответа`); if (num(s.day.metrics.unpaidClients)) alerts.push(`${s.day.metrics.unpaidClients} неоплаченных клиент(а)`); if (overdue) alerts.push(`${overdue} просроченных задач`); const next = nextRhythm(s.day); const readinessText = s.readiness >= 85 ? 'Систе
### `quality` — Growth contains keyword: no
- но довести до решения и оплаты.', agenda: ['Новые лиды', 'Пробные без покупки', 'Продления', 'Обещанные оплаты', 'Риск ухода', 'Следующий шаг по каждому клиенту'] }, quality: { title: 'Качество и дисциплина', duration: 30, participants: 'Софа, ответственные сотрудники', description: 'Сервис, чистота, тренировки, безопасность, дисциплина и
- траторов — 45 минут', 'high', 'Команда']); if (wd === 3) recurring.push(['sales', 'Разбор воронки продаж — 20 минут', 'medium', 'Продажи']); if (wd === 5) recurring.push(['quality', 'Контроль качества и дисциплины — 30 минут', 'medium', 'Качество']); recurring.forEach(([kind,title,priority,category]) => { const sys = `${d}:${kind}`; if (!sta
- т.'],['team','Команда','Задачи, сроки, смены, просрочки и обучение под контролем.'],['service','Родители и сервис','Обращения, жалобы, обратная связь и риски ухода отработаны.'],['quality','Качество управления','Отчёты, чистота, аудиты, инциденты и планы ведутся системно.']]; function v8prep(){const mk=monthKey(date),wk=weekKey(date),mp=state.monthPlans[mk],w=sta
### `incident` — Growth contains keyword: no
- я бы одна тренировка или зона клуба проверена.'] ], 'Закрытие дня': [ ['close_cash', 'Касса и CRM закрыты', 'Оплаты, лиды и следующий шаг актуальны.'], ['close_incidents', 'Инциденты и жалобы зафиксированы', 'Нет ситуации, которая существует только в переписке.'], ['close_tasks', 'Задачи обновлены', 'Просрочки разобраны, завтра определено.'
- }; Object.values(METRIC_GROUPS).flat().forEach(([id]) => metrics[id] = 0); return { priorities:['','',''], checks, rhythm, metrics, notes:{parents:'', team:'', incidents:'', risks:'', solved:'', owner:'', unpaidNext:'', tomorrowComment:''}, report:{tomorrow:['','',''], sentAt:null}, updatedAt:nowIso() }; } function normalize(
- подключения Романа:\n${d.notes.solved || '—'}\n\nПроблемы родителей / жалобы:\n${d.notes.parents || '—'}\n\nКоманда / дисциплина:\n${d.notes.team || '—'}\n\nИнциденты:\n${d.notes.incidents || '—'}\n\nРиски:\n${d.notes.risks || '—'}\n\nТребует решения Романа:\n${d.notes.owner || '—'}\n\nТРИ РЕЗУЛЬТАТА НА ЗАВТРА\n1. ${d.report.tomorrow[0] || '—'}\n2. ${d.report.tomor
- } ${noteField('Родители / жалобы','parents',d.notes.parents)} ${noteField('Команда / дисциплина','team',d.notes.team)} ${noteField('Инциденты','incidents',d.notes.incidents)} ${noteField('Риски','risks',d.notes.risks)} <div class="field full"><label>Что требует решения Романа</label><textarea data-note="own
### `audit` — Growth contains keyword: yes
- 'Сложные ситуации не зависают у администраторов.'], ['team_feedback', 'Дана обратная связь родителям', 'Родитель понимает прогресс ребёнка и следующий этап.'], ['team_audit', 'Проверено качество', 'Хотя бы одна тренировка или зона клуба проверена.'] ], 'Закрытие дня': [ ['close_cash', 'Касса и CRM закрыты', 'Оплаты, лиды и следующий шаг
### `cash` — Growth contains keyword: no
- 0Z`).getUTCDay(); const CHECK_GROUPS = { 'Открытие смены': [ ['open_clean', 'Клуб готов и чист', 'Ресепшен, раздевалки, зал, туалет, зона сотрудников.'], ['open_cash', 'Касса и остатки сверены', 'Нет необъяснимых расхождений, оплаты видны.'], ['open_schedule', 'Расписание и команда подтверждены', 'Смены, замены, пробные, индивидуальные т
- ет прогресс ребёнка и следующий этап.'], ['team_audit', 'Проверено качество', 'Хотя бы одна тренировка или зона клуба проверена.'] ], 'Закрытие дня': [ ['close_cash', 'Касса и CRM закрыты', 'Оплаты, лиды и следующий шаг актуальны.'], ['close_incidents', 'Инциденты и жалобы зафиксированы', 'Нет ситуации, которая существует только в переп
### `revenue` — Growth contains keyword: yes
- черновик отчёта.'], ['21:30', 'Отчёт Роману', 'Только итог, исключения, решения и три результата на завтра.'] ]; const METRIC_GROUPS = { 'Деньги и продажи': [ ['revenue', 'Выручка за день', '₽'], ['groupCount', 'Групповых продаж', 'шт.'], ['groupAmount', 'Сумма групповых продаж', '₽'], ['individualCount', 'Индивидуальных продаж'
- function stamp() { state.meta.updatedAt = nowIso(); } function ensure(d) { const mk = monthKey(d), wk = weekKey(d); if (!state.monthPlans[mk]) state.monthPlans[mk] = {revenuePlan:2500000, occupancyTarget:75, updatedAt:nowIso()}; if (!state.plans.weeks[wk]) state.plans.weeks[wk] = {results:['','',''], risk:'', team:'', parents:'', improvement:'', de
- nt.visibilityState === 'visible' && !dirty) pullState(); }, 12000); } function stats(d = date) { const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.revenuePlan), fact = sumMonth(mk, 'revenue'); const daysInMonth = new Date(Number(mk.slice(0,4)), Number(mk.slice(5,7)), 0).getDate(); const dateNumber = Number(d.slice(8,10));
- !dirty) pullState(); }, 12000); } function stats(d = date) { const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.revenuePlan), fact = sumMonth(mk, 'revenue'); const daysInMonth = new Date(Number(mk.slice(0,4)), Number(mk.slice(5,7)), 0).getDate(); const dateNumber = Number(d.slice(8,10)); const remainingDays = Math.max(1,
### `plan` — Growth contains keyword: yes
- nt-size:10px}.history-card small{display:block;color:#797e75;font-size:7px;margin-top:4px}.history-card p{font-size:9px;margin:8px 0 0}.history-card .task-meta{margin-top:8px} /* Plans & Guide */ .plan-goals{display:grid;gap:8px}.goal-row{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center}.goal-row span{width:28px;height:28px;border-radius:9
- ory-card small{display:block;color:#797e75;font-size:7px;margin-top:4px}.history-card p{font-size:9px;margin:8px 0 0}.history-card .task-meta{margin-top:8px} /* Plans & Guide */ .plan-goals{display:grid;gap:8px}.goal-row{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center}.goal-row span{width:28px;height:28px;border-radius:9px;background:rgba
- вный отчёт</span></button> <div class="nav-caption">УПРАВЛЕНИЕ</div> <button data-page="meetings"><i>◎</i><span>Собрания</span></button> <button data-page="plans"><i>◆</i><span>Планы и рост</span></button> <button data-page="guide"><i>✦</i><span>Система управляющей</span></button> <button data-page="archive"><i>□</i><span>
- "> <button data-page="rhythm"><i>◷</i><span>Ритм дня</span></button> <button data-page="meetings"><i>◎</i><span>Собрания</span></button> <button data-page="plans"><i>◆</i><span>Планы и рост</span></button> <button data-page="guide"><i>✦</i><span>Система управляющей</span></button> <button data-page="archive"><i>□</i><span>
### `fact` — Growth contains keyword: yes
- tate === 'visible' && !dirty) pullState(); }, 12000); } function stats(d = date) { const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.revenuePlan), fact = sumMonth(mk, 'revenue'); const daysInMonth = new Date(Number(mk.slice(0,4)), Number(mk.slice(5,7)), 0).getDate(); const dateNumber = Number(d.slice(8,10)); const rem
- .slice(5,7)), 0).getDate(); const dateNumber = Number(d.slice(8,10)); const remainingDays = Math.max(1, daysInMonth - dateNumber); const remaining = Math.max(0, plan - fact); const need = remaining / remainingDays; const elapsed = Math.max(1, dateNumber); const forecast = fact / elapsed * daysInMonth; const conversion = num(day.metric
- nMonth - dateNumber); const remaining = Math.max(0, plan - fact); const need = remaining / remainingDays; const elapsed = Math.max(1, dateNumber); const forecast = fact / elapsed * daysInMonth; const conversion = num(day.metrics.attended) ? num(day.metrics.sold) / num(day.metrics.attended) * 100 : 0; const renew = num(day.metrics.renewDue
- m).filter(Boolean).length; const readiness = Math.round((checkDone / Object.keys(day.checks).length * .7 + rhythmDone / RHYTHM.length * .3) * 100); const progress = plan ? fact / plan * 100 : 0; return {day,mk,plan,fact,remaining,need,forecast,conversion,renew,readiness,progress,daysInMonth,dateNumber}; } function sumMonth(mk, key) { return Obje
### `salary` — Growth contains keyword: yes
- нциденты и планы ведутся системно.']]; function v8prep(){const mk=monthKey(date),wk=weekKey(date),mp=state.monthPlans[mk],w=state.plans.weeks[wk],m=state.plans.months[mk];if(!mp.salary)mp.salary={checks:{},closedAt:null,snapshot:null};V8_KPIS.forEach(([k])=>{if(typeof mp.salary.checks[k]!=='boolean')mp.salary.checks[k]=false});if(!Array.isArray(w.resultStatus))w
- планы ведутся системно.']]; function v8prep(){const mk=monthKey(date),wk=weekKey(date),mp=state.monthPlans[mk],w=state.plans.weeks[wk],m=state.plans.months[mk];if(!mp.salary)mp.salary={checks:{},closedAt:null,snapshot:null};V8_KPIS.forEach(([k])=>{if(typeof mp.salary.checks[k]!=='boolean')mp.salary.checks[k]=false});if(!Array.isArray(w.resultStatus))w.resultSta
- date),mp=state.monthPlans[mk],w=state.plans.weeks[wk],m=state.plans.months[mk];if(!mp.salary)mp.salary={checks:{},closedAt:null,snapshot:null};V8_KPIS.forEach(([k])=>{if(typeof mp.salary.checks[k]!=='boolean')mp.salary.checks[k]=false});if(!Array.isArray(w.resultStatus))w.resultStatus=[0,0,0];if(!('revenueTarget'in w))w.revenueTarget=0;if(!('closedAt'in w)){w.clos
- state.plans.weeks[wk],m=state.plans.months[mk];if(!mp.salary)mp.salary={checks:{},closedAt:null,snapshot:null};V8_KPIS.forEach(([k])=>{if(typeof mp.salary.checks[k]!=='boolean')mp.salary.checks[k]=false});if(!Array.isArray(w.resultStatus))w.resultStatus=[0,0,0];if(!('revenueTarget'in w))w.revenueTarget=0;if(!('closedAt'in w)){w.closedAt=null;w.snapshot=null}if(!Ar
### `motivation` — Growth contains keyword: yes
- sList.add('hidden'); $('#app').classList.remove('hidden'); $('#mobileNav').classList.remove('hidden'); await pullState(true); render(); startPolling(); } // V8 compact: motivation + weekly/monthly result tracking const V8_BASE=100000,V8_KPI=20000,V8_TIERS=[[5000000,80000],[4500000,70000],[4000000,60000],[3500000,45000],[3000000,30000],[2700000,20000],[240
### `meeting` — Growth contains keyword: yes
- font-style:normal;color:var(--orange)}.report-status.sent i{color:var(--green)}.report-status b{font-size:9px}.report-status span{margin-left:auto;color:#777c73;font-size:8px} /* Meetings */ .meeting-templates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:13px}.meeting-template{border:1px solid var(--line);border-radius:15px;padd
- rmal;color:var(--orange)}.report-status.sent i{color:var(--green)}.report-status b{font-size:9px}.report-status span{margin-left:auto;color:#777c73;font-size:8px} /* Meetings */ .meeting-templates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:13px}.meeting-template{border:1px solid var(--line);border-radius:15px;padding:12px;text
- status span{margin-left:auto;color:#777c73;font-size:8px} /* Meetings */ .meeting-templates{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:13px}.meeting-template{border:1px solid var(--line);border-radius:15px;padding:12px;text-align:left;background:rgba(255,255,255,.018);color:#fff;transition:.18s ease}.meeting-template:hover,.me
- argin-bottom:13px}.meeting-template{border:1px solid var(--line);border-radius:15px;padding:12px;text-align:left;background:rgba(255,255,255,.018);color:#fff;transition:.18s ease}.meeting-template:hover,.meeting-template.active{border-color:rgba(254,235,0,.3);background:rgba(254,235,0,.05)}.meeting-template b{display:block;font-size:10px}.meeting-template span{disp
### `document` — Growth contains keyword: yes
- _v6_state'; const LS_SESSION = 'ek_ops_v6_session'; const LS_TIMER = 'ek_ops_v6_timer'; const CHANNEL = 'ek_ops_v6_channel'; const APP_VERSION = 6; const $ = (s, root = document) => root.querySelector(s); const $$ = (s, root = document) => [...root.querySelectorAll(s)]; const num = (v) => Number(v) || 0; const clamp = (v, min, max) => Math.max(min,
- t LS_TIMER = 'ek_ops_v6_timer'; const CHANNEL = 'ek_ops_v6_channel'; const APP_VERSION = 6; const $ = (s, root = document) => root.querySelector(s); const $$ = (s, root = document) => [...root.querySelectorAll(s)]; const num = (v) => Number(v) || 0; const clamp = (v, min, max) => Math.max(min, Math.min(max, v)); const esc = (v) => String(v ?? '').repl
- ce || num(result.revision) > revision)) { state = normalize(result.state); revision = num(result.revision); ensure(date); saveLocal(); if (force || document.visibilityState === 'visible') render(); } else if (!result?.exists) { await pushState(true); } else { revision = Math.max(revision, num(result?.revisi
- $('#code').value = ''; $('#loginErr').textContent = message; checkHealth(); } function startPolling() { clearInterval(pollTimer); pollTimer = setInterval(() => { if (document.visibilityState === 'visible' && !dirty) pullState(); }, 12000); } function stats(d = date) { const day = ensure(d), mk = monthKey(d), plan = num(state.monthPlans[mk]?.re
### `role` — Growth contains keyword: yes
- dow:0 0 14px rgba(255,180,91,.35)}.cloud-indicator.online span{background:var(--green);box-shadow:0 0 14px rgba(103,216,154,.5)}.cloud-indicator.error span{background:var(--red)} .role-switch{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px} .role-card{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;text-align:l
- );box-shadow:0 0 14px rgba(103,216,154,.5)}.cloud-indicator.error span{background:var(--red)} .role-switch{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px} .role-card{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;text-align:left;padding:13px;border:1px solid var(--line);border-radius:16px;background:rgba(255,
- fr auto;gap:11px;align-items:center;text-align:left;padding:13px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.024);color:#fff;transition:.22s ease}.role-card:hover{border-color:var(--line-strong);transform:translateY(-1px)}.role-card.active{background:rgba(254,235,0,.07);border-color:rgba(254,235,0,.35);box-shadow:inset 0 0 0 1px
- solid var(--line);border-radius:16px;background:rgba(255,255,255,.024);color:#fff;transition:.22s ease}.role-card:hover{border-color:var(--line-strong);transform:translateY(-1px)}.role-card.active{background:rgba(254,235,0,.07);border-color:rgba(254,235,0,.35);box-shadow:inset 0 0 0 1px rgba(254,235,0,.06)}.role-card i{font-style:normal;color:var(--yellow);opaci
### `review` — Growth contains keyword: yes
- play:block;color:#7e8379;font-size:7px;margin-top:3px;line-height:1.45}.check-row.done{border-color:rgba(103,216,154,.16);background:rgba(103,216,154,.035)} /* Report */ .report-preview{white-space:pre-wrap;border:1px solid var(--line);border-radius:16px;padding:16px;background:#090b08;color:#e7e9e4;line-height:1.62;font-size:10px;min-height:510px;overflow:auto}.
- x}.form-grid{grid-template-columns:1fr}.full{grid-column:auto}.timeline:before{left:28px}.timeline-item{grid-template-columns:54px minmax(0,1fr) auto;gap:9px;padding:11px}.report-preview{min-height:380px}.meeting-templates{grid-template-columns:repeat(2,minmax(0,1fr))}.meeting-timer strong{font-size:48px}.decision-row{grid-template-columns:1fr;gap:5px}.toolbar{ali
- x}.timeline-copy small{font-size:10.5px;line-height:1.55} .check-group>h3{font-size:10.5px}.check-row b{font-size:11.5px}.check-row small{font-size:10px;line-height:1.55} .report-preview{font-size:12.5px;line-height:1.7}.report-status b{font-size:11px}.report-status span{font-size:9.5px} .meeting-template b{font-size:11.5px}.meeting-template span{font-size:10px;li
- ="margin:0 0 10px"><div><h2>Готовый текст</h2><p>Можно сразу отправить Роману.</p></div><button class="button ghost" data-act="copyReport">Копировать</button></div><pre id="reportPreview" class="report-preview">${esc(reportText())}</pre></section> </div>`; } function noteField(label, key, value) { return `<div class="field"><label>${esc(label)}</label><
### `feedback` — Growth contains keyword: no
- онимает задачи', 'У каждой задачи есть ответственный и срок.'], ['team_parents', 'Нет родителей без ответа', 'Сложные ситуации не зависают у администраторов.'], ['team_feedback', 'Дана обратная связь родителям', 'Родитель понимает прогресс ребёнка и следующий этап.'], ['team_audit', 'Проверено качество', 'Хотя бы одна тренировка или зона клуба пров
### `clean` — Growth contains keyword: no
- lYear()}-W${String(week).padStart(2, '0')}`; }; const dayOfWeek = (d) => new Date(`${d}T12:00:00Z`).getUTCDay(); const CHECK_GROUPS = { 'Открытие смены': [ ['open_clean', 'Клуб готов и чист', 'Ресепшен, раздевалки, зал, туалет, зона сотрудников.'], ['open_cash', 'Касса и остатки сверены', 'Нет необъяснимых расхождений, оплаты видны.'],
- ne', 'Продлено', 'шт.'], ['unpaidClients', 'Неоплаченных клиентов', 'шт.'], ['unpaidAmount', 'Сумма неоплат', '₽'], ['occupancy', 'Загрузка групп', '%'], ['cleanliness', 'Чистота', '%'] ] }; const MEETING_TEMPLATES = { week: { title: 'Роман + Софа', duration: 60, participants: 'Роман, Софа', description: 'Недельное
- .unpaidAmount)}\n• Ожидаемые оплаты: ${money(d.metrics.expected)}\n\nУПРАВЛЕНИЕ\n• Выполнено задач сегодня: ${taskDone}\n• Просрочено задач: ${overdue}\n• Чистота: ${pct(d.metrics.cleanliness)}\n• Загрузка групп: ${pct(d.metrics.occupancy)}\n\nНеоплаченные клиенты / следующий шаг:\n${d.notes.unpaidNext || '—'}\n\nЧто решено Софой без подключения Романа:\n${d.note
### `conversion` — Growth contains keyword: yes
- g = Math.max(0, plan - fact); const need = remaining / remainingDays; const elapsed = Math.max(1, dateNumber); const forecast = fact / elapsed * daysInMonth; const conversion = num(day.metrics.attended) ? num(day.metrics.sold) / num(day.metrics.attended) * 100 : 0; const renew = num(day.metrics.renewDue) ? num(day.metrics.renewDone) / num(day.metri
- ect.keys(day.checks).length * .7 + rhythmDone / RHYTHM.length * .3) * 100); const progress = plan ? fact / plan * 100 : 0; return {day,mk,plan,fact,remaining,need,forecast,conversion,renew,readiness,progress,daysInMonth,dateNumber}; } function sumMonth(mk, key) { return Object.entries(state.days).filter(([d]) => monthKey(d) === mk).reduce((sum,[,v]) => su
- (s.progress)} от плана`, clamp(s.progress,0,100))} ${kpi('Нужно в день', money(s.need), `Осталось ${money(s.remaining)}`)} ${kpi('Пробная → продажа', pct(s.conversion), `${num(s.day.metrics.sold)} из ${num(s.day.metrics.attended)} сегодня`)} ${kpi('Продления', pct(s.renew), `${num(s.day.metrics.renewDone)} из ${num(s.day.metrics.ren
- ез ответа', String(num(s.day.metrics.unanswered)), num(s.day.metrics.unanswered) ? 'Сначала закрыть это отклонение' : 'Потерянных лидов не видно')}${kpi('Пробная → продажа', pct(s.conversion), `${num(s.day.metrics.sold)} покупок из ${num(s.day.metrics.attended)} визитов`)}${kpi('Продления', pct(s.renew), `${num(s.day.metrics.renewDone)} из ${num(s.day.metrics.renewDue
### `crm` — Growth contains keyword: yes
- нка и следующий этап.'], ['team_audit', 'Проверено качество', 'Хотя бы одна тренировка или зона клуба проверена.'] ], 'Закрытие дня': [ ['close_cash', 'Касса и CRM закрыты', 'Оплаты, лиды и следующий шаг актуальны.'], ['close_incidents', 'Инциденты и жалобы зафиксированы', 'Нет ситуации, которая существует только в переписке.'],
- ы после пробной, обещанные платежи.'], ['19:00', 'Качество и родители', 'Тренировки, обратная связь, сложные ситуации, риск ухода.'], ['21:15', 'Закрытие системы', 'Касса, CRM, задачи, инциденты и черновик отчёта.'], ['21:30', 'Отчёт Роману', 'Только итог, исключения, решения и три результата на завтра.'] ]; const METRIC_GROUPS = { 'Деньги
- /div></section> <section class="card"><h2>Когда подключать Романа</h2><div class="decision-table"><div class="decision-row"><b>Софа решает сама</b><span>Ежедневные задачи, CRM, стандартные вопросы родителей, контроль пробных и продлений, чистота, обучение и организация смен.</span></div><div class="decision-row"><b>Согласовать</b><span>Новые цены, неста
- V8_KPI=20000,V8_TIERS=[[5000000,80000],[4500000,70000],[4000000,60000],[3500000,45000],[3000000,30000],[2700000,20000],[2400000,10000],[0,0]]; const V8_KPIS=[['sales','Продажи и CRM','Нет потерянных лидов, пробных, продлений и неоплат.'],['team','Команда','Задачи, сроки, смены, просрочки и обучение под контролем.'],['service','Родители и сервис','Обращения, ж
### `message` — Growth contains keyword: yes
- .setItem(LS_STATE, JSON.stringify(state)); } function persist({renderNow=false} = {}) { saveLocal(); dirty = true; setSyncUi('saving'); updateBadges(); if (bc) bc.postMessage({type:'local-change', at:Date.now()}); clearTimeout(saveTimer); saveTimer = setTimeout(pushState, 700); if (renderNow) render(); } async function api(path, options =
- ${API}${path}`, {...options, headers, cache:'no-store'}); const text = await response.text(); let data = null; try { data = text ? JSON.parse(text) : {}; } catch { data = {message:text}; } if (!response.ok) { const err = new Error(data?.message || `Ошибка сервера ${response.status}`); err.status = response.status; err.data = data; throw err;
- await response.text(); let data = null; try { data = text ? JSON.parse(text) : {}; } catch { data = {message:text}; } if (!response.ok) { const err = new Error(data?.message || `Ошибка сервера ${response.status}`); err.status = response.status; err.data = data; throw err; } return data; } async function checkHealth() { const el
- online = true; saveLocal(); setSyncUi('online', result?.lastEditor?.name ? `Сохранено · ${result.lastEditor.name}` : `Общая база · версия ${revision}`); if (bc) bc.postMessage({type:'synced', revision, at:Date.now()}); } catch (err) { if ((err.status === 409 || err.status === 412) && retry) { try { const remote = await api('/
### `parent` — Growth contains keyword: yes
- w;left:-18vw;bottom:-22vw;background:#fff;opacity:.05;animation-delay:-5s} .ambient-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.85),transparent 72%);opacity:.36}
- lay:-5s} .ambient-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.85),transparent 72%);opacity:.36} .ambient-noise{position:absolute;inset:0;opacity:.025;background-
- 55,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:42px 42px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.85),transparent 72%);opacity:.36} .ambient-noise{position:absolute;inset:0;opacity:.025;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E
- py{position:relative;padding:40px 46px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;background:linear-gradient(145deg,rgba(254,235,0,.105),transparent 42%)} .auth-copy:after{content:"";position:absolute;width:440px;height:440px;border:1px solid rgba(254,235,0,.12);border-radius:50%;right:-220px;bottom:-220px;box-shadow:0 0 0 70p
### `service` — Growth contains keyword: yes
- ; const V8_KPIS=[['sales','Продажи и CRM','Нет потерянных лидов, пробных, продлений и неоплат.'],['team','Команда','Задачи, сроки, смены, просрочки и обучение под контролем.'],['service','Родители и сервис','Обращения, жалобы, обратная связь и риски ухода отработаны.'],['quality','Качество управления','Отчёты, чистота, аудиты, инциденты и планы ведутся системно.'
### `admin` — Growth contains keyword: yes
- ия и обязательства ближайших 14 дней', 'Продажи, пробные и продления', 'Загрузка групп', 'Проблемы родителей', 'Команда и дисциплина', 'Риски', 'Три результата недели'] }, admins: { title: 'Собрание администраторов', duration: 45, participants: 'Софа, Аня, Адель', description: 'Рабочая встреча по продажам, клиентам, задачам и качеству коммуник
- updatedAt || nowIso(), updatedAt:t.updatedAt || s.meta.updatedAt || nowIso() })); s.meetings = s.meetings.map((m) => ({ ...m, id:m.id || uid('meet'), type:m.type || 'admins', title:m.title || MEETING_TEMPLATES[m.type]?.title || 'Рабочая встреча', date:m.date || currentDate(), participants:m.participants || '', agenda:Array.isArray(m.agenda) ?
- .onLine; let saveTimer = null; let pollTimer = null; let toastTimer = null; let taskFilter = 'today'; let taskOwnerFilter = 'all'; let meetingDraft = makeMeetingDraft('admins'); let timer = safeJson(localStorage.getItem(LS_TIMER)) || {total:2700,left:2700,running:false,end:null}; const bc = 'BroadcastChannel' in window ? new BroadcastChannel(CHANN
- вный отчёт до 21:30', 'high', 'Отчёт']]; if (wd === 1) recurring.push(['week', 'Встреча Романа и Софы — 60 минут', 'medium', 'Управление']); if (wd === 2) recurring.push(['admins', 'Собрание администраторов — 45 минут', 'high', 'Команда']); if (wd === 3) recurring.push(['sales', 'Разбор воронки продаж — 20 минут', 'medium', 'Продажи']); if (wd ===
### `manager` — Growth contains keyword: yes
- ество и жалобы', 'Риски', 'Три задачи следующего месяца'] } }; function baseState() { return { version: APP_VERSION, club: {name:'EXTREME KIDS Тропарёво', manager:'Софа'}, monthPlans: {}, days: {}, tasks: [], meetings: [], plans: {weeks:{}, months:{}}, settings: {staff:['Софа','Аня','Адель','Роман']}, meta: {updatedA
- ct.keys(s.days).forEach((d) => normalizeDay(s.days[d])); s.tasks = s.tasks.map((t) => ({ id:t.id || uid('task'), title:t.title || 'Без названия', owner:t.owner || s.club.manager, due:t.due || currentDate(), status:t.status === 'done' ? 'done' : 'todo', priority:t.priority || 'medium', category:t.category || 'Операционка', comment:t.comment ||
- ority,category]) => { const sys = `${d}:${kind}`; if (!state.tasks.some((t) => t.sys === sys)) { state.tasks.push({id:uid('task'), sys, title, owner:state.club.manager, due:d, status:'todo', priority, category, comment:'', createdAt:nowIso(), updatedAt:nowIso()}); } }); } function saveLocal() { stamp(); localStorage.setIte
- eld full"><label>Название клуба</label><input data-setting="club.name" value="${esc(state.club.name)}"></div><div class="field"><label>Управляющая</label><input data-setting="club.manager" value="${esc(state.club.manager)}"></div><div class="field"><label>План выручки месяца</label><input type="number" data-setting="month.revenuePlan" value="${num(p.revenuePlan)}">
### `schedule` — Growth contains keyword: yes
- готов и чист', 'Ресепшен, раздевалки, зал, туалет, зона сотрудников.'], ['open_cash', 'Касса и остатки сверены', 'Нет необъяснимых расхождений, оплаты видны.'], ['open_schedule', 'Расписание и команда подтверждены', 'Смены, замены, пробные, индивидуальные тренировки.'], ['open_safe', 'Инвентарь и безопасность проверены', 'Аптечка, неисправности, оп
### `task` — Growth contains keyword: yes
- r;background:var(--yellow);color:#050505;font-size:11px;font-weight:900}.priority-item textarea{min-height:82px;background:rgba(255,255,255,.018);font-size:11px;line-height:1.45} .task-list{display:grid;gap:8px}.task-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-r
- :#050505;font-size:11px;font-weight:900}.priority-item textarea{min-height:82px;background:rgba(255,255,255,.018);font-size:11px;line-height:1.45} .task-list{display:grid;gap:8px}.task-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,2
- lumns:auto minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.018);transition:.18s ease}.task-card:hover{background:rgba(255,255,255,.028);border-color:var(--line-strong)}.task-card.done{opacity:.52}.task-card.done .task-main b{text-decoration:line-through}.task-check{widt
- 1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.018);transition:.18s ease}.task-card:hover{background:rgba(255,255,255,.028);border-color:var(--line-strong)}.task-card.done{opacity:.52}.task-card.done .task-main b{text-decoration:line-through}.task-check{width:23px;height:23px;border-radius:8px;border:1px solid var(--line-strong);background
### `goal` — Growth contains keyword: yes
- ard small{display:block;color:#797e75;font-size:7px;margin-top:4px}.history-card p{font-size:9px;margin:8px 0 0}.history-card .task-meta{margin-top:8px} /* Plans & Guide */ .plan-goals{display:grid;gap:8px}.goal-row{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center}.goal-row span{width:28px;height:28px;border-radius:9px;background:rgba(254,
- r:#797e75;font-size:7px;margin-top:4px}.history-card p{font-size:9px;margin:8px 0 0}.history-card .task-meta{margin-top:8px} /* Plans & Guide */ .plan-goals{display:grid;gap:8px}.goal-row{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center}.goal-row span{width:28px;height:28px;border-radius:9px;background:rgba(254,235,0,.1);color:var(--yellow
- 0}.history-card .task-meta{margin-top:8px} /* Plans & Guide */ .plan-goals{display:grid;gap:8px}.goal-row{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center}.goal-row span{width:28px;height:28px;border-radius:9px;background:rgba(254,235,0,.1);color:var(--yellow);display:grid;place-items:center;font-size:9px;font-weight:900}.goal-row input{f
- ems:center}.goal-row span{width:28px;height:28px;border-radius:9px;background:rgba(254,235,0,.1);color:var(--yellow);display:grid;place-items:center;font-size:9px;font-weight:900}.goal-row input{font-size:10px} .contours{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.contour{border:1px solid var(--line);border-radius:14px;padding:12px;backgr
### `event` — Growth contains keyword: yes
- osition:fixed;inset:0;z-index:999;background:#000;color:#fff;display:grid;place-items:center;padding:30px;text-align:center} /* Ambient */ .ambient{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0;background:#070806} .ambient-orb{position:absolute;border-radius:999px;filter:blur(100px);opacity:.19;animation:orbFloat 14s ease-in-out infinite a
- a(254,235,0,.2);border-radius:14px;background:#20231d;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.38);font-size:9px;line-height:1.45;opacity:0;transform:translateY(12px);pointer-events:none;transition:.22s ease}.toast.show{opacity:1;transform:none} /* Responsive */ @media(max-width:1180px){:root{--sidebar:230px}.grid-4{grid-template-columns:repeat(2,minmax(0,1
- {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } // Auth $('#loginForm').addEventListener('submit', async (e) => { e.preventDefault(); const btn = $('#loginBtn'); btn.disabled = true; $('#loginErr').textContent = ''; try { await login($('#role').v
- ); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } // Auth $('#loginForm').addEventListener('submit', async (e) => { e.preventDefault(); const btn = $('#loginBtn'); btn.disabled = true; $('#loginErr').textContent = ''; try { await login($('#role').value, $('#code').value); $('#auth').class
### `camp` — Growth contains keyword: yes
- eapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"> <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/romadav73-gif/extreme-kids-camp@management-v6/management-v6/readability-v63.css?v=20260813-3"> <style> :root{ --yellow:#feeb00; --yellow-soft:rgba(254,235,0,.12); --black:#070806; --panel:#11130f; --pa

## Top-level-like state/data keys in Sofa
- `club`
- `days`
- `error`
- `meetings`
- `meta`
- `monthPlans`
- `plans`
- `saving`
- `settings`
- `tasks`

## API routes in Sofa
- `/api`

## Local/session storage keys in Sofa
