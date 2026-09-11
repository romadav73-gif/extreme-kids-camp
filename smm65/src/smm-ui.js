// Runs inside the existing 6.5 closure, after all prior production extensions.
const sm65Roles = ['owner', 'manager', 'smm'];
const sm65CanReview = () => ['owner', 'manager'].includes(s65Actor?.role);
const sm65Mine = () => s65Actor?.role === 'smm';
const sm65Icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3z"/></svg>';
ROLES.smm = { name: 'Карина', title: 'SMM-специалист', avatar: 'К', start: 'smm' };
NAV.push({ section: 'Контент и продвижение', items: [{ id: 'smm', label: 'SMM · Карина', icon: 'calendar', roles: sm65Roles }] });
for (const item of NAV.flatMap(s => s.items)) if (['tasks', 'calendar', 'documents'].includes(item.id) && !item.roles.includes('smm')) item.roles.push('smm');
if (typeof h65Roles !== 'undefined') h65Roles.smm = 'SMM-специалист';
const sm65BeforeRoot = s65CanRoot;
s65CanRoot = k => k !== 'smm' && (sm65Mine() ? k === 'tasks' : sm65BeforeRoot(k));
const sm65BeforePersonal = personalTaskOwnerId;
personalTaskOwnerId = () => sm65Mine() ? s65Actor.personId : sm65BeforePersonal();
const sm65PeopleOptions = peopleOptions;
peopleOptions = (selected = '', roles = null) => sm65PeopleOptions(selected, roles && roles.length >= 4 && roles.includes('mentor') ? [...roles, 'smm'] : roles);
const sm65ActivePeople = activeTaskPeople;
activeTaskPeople = () => [...new Map([...sm65ActivePeople(), ...(state?.people || []).filter(p => p.role === 'smm' && p.active !== false && !p.archivedAt && !p.deletedAt)].map(p => [p.id, p])).values()];
let sm65Busy = false, sm65Revision = null;
const sm65Esc = x => esc(String(x ?? ''));
const sm65Money = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n || 0) + ' ₽';
const sm65Label = { draft: 'Черновик', pending: 'На проверке', approved: 'Принято', changes: 'Доработать' };
const sm65Month = () => state.ui.smmMonth || smmDay().slice(0, 7);
const sm65Date = () => state.ui.smmDate?.startsWith(sm65Month()) ? state.ui.smmDate : (smmDay().startsWith(sm65Month()) ? smmDay() : sm65Month() + '-01');
const sm65Tab = () => state.ui.smmTab || 'today';
const sm65Badge = (label, mode = '') => `<span class="sm65-badge ${mode}">${sm65Esc(label)}</span>`;
const sm65Button = (label, action, attributes = '', primary = false) => `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}" data-action="${action}" ${attributes}>${label}</button>`;
function sm65SafeLink(url, label) {
  try { const safe = smmUrl(url); return safe ? `<a href="${sm65Esc(safe)}" target="_blank" rel="noopener noreferrer" class="sm65-link">${sm65Esc(label)} ↗</a>` : ''; }
  catch { return '<span>Ссылка требует проверки</span>'; }
}
const sm65NavBefore = renderNav;
renderNav = function () {
  sm65NavBefore(); if (!s65Actor || !sm65Roles.includes(s65Actor.role)) return;
  const nav = document.getElementById('mainNav'); if (!nav) return;
  nav.querySelectorAll('[data-view="smm"]').forEach(e => e.remove());
  const button = `<button class="nav-btn ${currentView === 'smm' ? 'active' : ''}" data-view="smm"><span class="nav-icon">${sm65Icon}</span><span>${sm65Mine() ? 'Мой SMM-кабинет' : 'SMM · Карина'}</span></button>`;
  if (sm65Mine()) {
    nav.innerHTML = `<div class="nav-section">Личный кабинет · ${sm65Esc(s65Actor.displayName)}</div>${button}`
      + [['tasks', 'Мои задачи'], ['calendar', 'Мероприятия клуба'], ['documents', 'Мои документы']].map(([id, name]) => `<button class="nav-btn ${currentView === id ? 'active' : ''}" data-view="${id}"><span class="nav-icon">${ICONS[id] || ICONS.tasks}</span><span>${name}</span></button>`).join('');
    const mobile = document.getElementById('mobileNav');
    if (mobile) mobile.innerHTML = [['smm', 'SMM'], ['tasks', 'Задачи'], ['calendar', 'Календарь'], ['documents', 'Документы']].map(([id, title]) => `<button data-view="${id}" class="${currentView === id ? 'active' : ''}">${id === 'smm' ? sm65Icon : ICONS[id] || ICONS.tasks}<span>${title}</span></button>`).join('');
  } else nav.insertAdjacentHTML('beforeend', '<div class="nav-section">Продвижение клуба</div>' + button);
};
function sm65EntryCard(entry) {
  const edit = sm65Mine() && entry.status !== 'approved' && !state.smm.payroll?.[entry.date.slice(0, 7)];
  return `<article class="sm65-entry" data-smm-entry="${entry.id}"><div class="sm65-row"><div>${sm65Badge(SMM_KINDS[entry.kind])}<span class="sm65-date">${formatDateShort(entry.date)}</span></div>${sm65Badge(sm65Label[entry.status], entry.status)}</div>
    <h3>${sm65Esc(entry.title)}</h3><div class="sm65-links">${entry.links.map(l => sm65SafeLink(l.url, SMM_PLATFORMS[l.platform]) || sm65Badge(SMM_PLATFORMS[l.platform])).join('')}${sm65SafeLink(entry.archiveUrl, entry.kind === 'shoot' ? 'Исходники' : 'Архив / подтверждение')}</div>
    ${entry.caption ? `<p class="sm65-text">${sm65Esc(entry.caption)}</p>` : ''}
    <div class="sm65-sub">${entry.kind === 'story' ? entry.storyFrames + ' кадров · ' : ''}${entry.links.map(l => SMM_PLATFORMS[l.platform]).join(' / ') || 'Съёмка — не публикация'}${entry.links.some(l => l.views !== null) ? ' · просмотры внесены вручную' : ''}</div>
    ${entry.review ? `<div class="sm65-feedback"><b>${sm65Esc(entry.review.name)}</b>: ${sm65Esc(entry.review.note || 'Материал проверен и принят.')}</div>` : ''}
    <div class="sm65-actions">${edit ? sm65Button('Редактировать', 'sm65Edit', `data-id="${entry.id}"`) : ''}${sm65CanReview() && ['pending', 'approved'].includes(entry.status) && !state.smm.payroll?.[entry.date.slice(0, 7)] ? sm65Button(entry.status === 'approved' ? 'Пересмотреть' : 'Проверить', 'sm65Review', `data-id="${entry.id}"`, entry.status === 'pending') : ''}</div></article>`;
}
function sm65Slots(score, date) {
  const slots = score.slots.filter(s => s.date === date);
  if (!slots.length) return '<div class="sm65-empty">На этот день автоматический план не назначен.</div>';
  const groups = new Map();
  for (const s of slots) { const key = s.kind + '|' + s.label; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(s); }
  return [...groups.values()].map(list => {
    const first = list[0], done = list.filter(s => s.entryId).length, active = list.filter(s => !s.exception).length;
    return `<article class="sm65-plan-row"><div class="sm65-row"><div><h3>${sm65Esc(first.label)}</h3><p>${sm65Esc(SMM_KINDS[first.kind])} · ${first.kind === 'shoot' ? 'Ссылка на исходники' : list.map(s => SMM_PLATFORMS[s.platform]).join(' / ')}</p></div>${sm65Badge(done + '/' + active, active && done >= active ? 'approved' : '')}</div>
      <div class="sm65-tags">${list.map(s => `<span class="sm65-slot ${s.exception ? 'excused' : s.entryId ? 'approved' : ''}">${sm65Esc(s.platform ? SMM_PLATFORMS[s.platform] : 'Съёмка')}${s.exception ? ' · исключено' : s.entryId ? ' ✓' : ''}${sm65CanReview() ? `<button type="button" title="Согласовать исключение из плана" data-action="sm65Exception" data-id="${sm65Esc(s.id)}">${s.exception ? '↶' : '⋯'}</button>` : ''}</span>`).join('')}</div>
      ${sm65Mine() ? sm65Button('Добавить подтверждение', 'sm65New', `data-kind="${first.kind}" data-date="${date}" data-events="${sm65Esc(JSON.stringify([...new Set(list.flatMap(s => s.eventIds))]))}"`, false) : ''}</article>`;
  }).join('');
}
function sm65Motivation(score) {
  const rows = [['Фиксированная часть', score.base, score.base, 'Ставка ' + sm65Money(score.rules.base) + ' за полный месяц'], ['Регулярность публикаций', score.regular.earned, score.regular.max, `${score.regular.done} из ${score.regular.planned} пунктов приняты`], ['Видео и съёмки', score.production.earned, score.production.max, `${score.production.done} из ${score.production.planned} пунктов приняты`]];
  return `<section class="sm65-pay-hero"><div><div class="eyebrow">${score.final ? 'Подтверждено Романом' : 'Предварительный расчёт · не выплата'}</div><strong>${sm65Money(score.final?.amount ?? score.estimate)}</strong><p>Лимит периода месяца: ${sm65Money(score.cap)}. Просмотры пока не влияют на деньги.</p></div>${sm65Badge('Первые два месяца')}</section>
    <section class="sm65-panel"><h3>Как складывается сумма</h3>${rows.map(([label, earned, max, sub]) => `<div class="sm65-pay-row"><div><b>${label}</b><p>${sub}</p></div><strong>${sm65Money(earned)} <small>/ ${sm65Money(max)}</small></strong></div>`).join('')}
    <p class="sm65-note">${score.activeDays} из ${score.daysInMonth} календарных дней месяца попадают в пилот. Неполный месяц считается пропорционально. В бонус попадают только принятые материалы и уникальные пункты плана, не черновики и не сами просмотры.</p>
    <p class="sm65-note">Пилот: ${formatDateShort(score.rules.start)} — ${formatDateShort(score.rules.end)}. После него сумма не повышается автоматически — требуется новая договорённость с Романом.</p>
    ${score.final ? `<div class="sm65-feedback">Комментарий Романа: ${sm65Esc(score.final.note)}</div>` : ''}
    ${s65Actor.role === 'owner' ? `<div class="sm65-actions">${!score.final ? sm65Button('Настроить план и ставки', 'sm65Rules') : ''}${score.canClose && !score.final ? sm65Button('Подтвердить расчёт', 'sm65Close', '', true) : ''}${score.final ? sm65Button('Открыть расчёт заново', 'sm65Reopen') : ''}</div>` : ''}</section>`;
}
function sm65Guide() {
  return `<div class="sm65-grid"><section class="sm65-panel"><h3>Твой рабочий цикл</h3><p>1. Открой «Сегодня» и посмотри автоматический план и задачи руководителей.</p><p>2. Сними материал, смонтируй и опубликуй в нужных соцсетях.</p><p>3. Нажми «Добавить материал», отметь площадки и приложи ссылки.</p><p>4. Отправь на проверку. После принятия Софой или Романом результат попадёт в мотивацию.</p><p>Съёмка и публикация — разные работы. Исходники не подтверждают выкладку. Для сторис сохраняй архив или запись экрана: живая ссылка может перестать открываться.</p></section>
    <section class="sm65-panel"><h3>Стиль EXTREME KIDS</h3><p>Чёрный и тёплый жёлтый. Настоящие дети, наставники, спорт, прогресс и живой юмор. Первые строки цепляют, дальше — конкретика, короткие абзацы и понятный призыв.</p><p>Рубрики: жизнь клуба; прогресс ребёнка; наставник объясняет; дети и родители отвечают; полезное; соревнования; юмор.</p><p>Перед событиями — анонс; в день события — съёмка и сторис; после — итоги. Календарь общий с руководством, вторую копию вести не нужно.</p><p>Не публикуем личные сведения детей и материалы без согласования. Цены, акции, травмы и спорные темы сначала согласуются с руководством.</p></section>
    <section class="sm65-panel"><h3>График 4/3 и контент-банк</h3><p>Четыре рабочих дня в неделю — стартовый ориентир. Съёмки — два дня и мероприятия; дни можно изменить в плане.</p><p>Ежедневная публикация не означает ежедневный приезд: на выходные заранее готовятся материалы. Мини-фильмы можно учитывать отдельно, без бесконечного наращивания числа бонусных публикаций.</p></section>
    <section class="sm65-panel"><h3>Что автоматизировано</h3><p>План по датам, мероприятия, статусы, подсчёт принятого контента и предварительная мотивация.</p><p>Сайт не публикует за тебя в соцсети и не скачивает просмотры автоматически. Ссылки и просмотры вносятся вручную; руководство проверяет подтверждения.</p></section></div>`;
}
function sm65Render() {
  if (!state.smm) return `<div class="page sm65"><section class="sm65-panel"><h2>SMM-кабинет</h2><p>Система готовится к первому запуску. Обновите данные после назначения Карине SMM-роли.</p></section></div>`;
  const score = smmScore(state, sm65Month()), date = sm65Date(), tab = sm65Tab();
  const entries = Object.values(state.smm.entries || {}).filter(e => !e.deletedAt && e.date.startsWith(sm65Month()));
  const due = score.slots.filter(s => !s.exception && s.date <= smmDay()), completed = due.filter(s => s.entryId).length;
  const tabs = [['today', 'Сегодня'], ['plan', 'Контент-план'], ['journal', sm65CanReview() ? 'Проверка публикаций' : 'Мои публикации'], ['pay', 'Мотивация'], ['guide', 'Как работать']];
  let body = '';
  if (tab === 'today' || tab === 'plan') {
    const days = smmMonthDates(sm65Month()).filter(d => d >= score.rules.start);
    const calendar = tab === 'plan' ? `<section class="sm65-panel"><div class="sm65-days">${days.map(d => { const list = score.slots.filter(s => s.date === d && !s.exception), done = list.filter(s => s.entryId).length; return `<button type="button" class="sm65-day ${d === date ? 'selected' : ''}" data-action="sm65Date" data-date="${d}"><b>${Number(d.slice(-2))}</b><span>${new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(d + 'T12:00:00Z'))}</span><small>${done}/${list.length}</small></button>`; }).join('')}</div></section>` : '';
    const events = (state.events || []).filter(e => !e.deletedAt && e.date >= smmDay()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    const ownTasks = (state.tasks || []).filter(t => t.ownerId === state.smm.config.personId && !t.deletedAt && t.status !== 'done');
    body = `${calendar}<div class="sm65-grid"><section><div class="sm65-section-head"><h2>План на ${formatDateShort(date)}</h2><input class="input" type="date" id="sm65DatePicker" value="${date}" min="${score.rules.start}"></div>${sm65Slots(score, date)}</section><aside><section class="sm65-panel"><div class="eyebrow">Общий календарь клуба</div><h3>Ближайшие мероприятия</h3>${events.map(e => `<div class="sm65-event"><b>${sm65Esc(e.title)}</b><p>${formatDateShort(e.date)} · ${sm65Esc(e.time || 'Время уточняется')}<br>${sm65Esc(e.venue || '')}</p></div>`).join('') || '<p>В общем календаре пока нет ближайших мероприятий.</p>'}${sm65Button('Открыть календарь', 'sm65Calendar')}</section><section class="sm65-panel"><h3>Задачи руководителей</h3>${ownTasks.slice(0, 6).map(t => `<button type="button" class="sm65-task" data-action="editTask" data-id="${t.id}"><b>${sm65Esc(t.title)}</b><span>${formatDateShort(t.deadline)} · ${sm65Esc(statusLabel(t.status))}</span></button>`).join('') || '<p>Новых отдельных поручений пока нет. Регулярный план — слева.</p>'}${sm65Button('Открыть задачи', 'sm65Tasks')}</section></aside></div>`;
  } else if (tab === 'journal') {
    const status = state.ui.smmFilter || 'all', channel = state.ui.smmChannel || 'all';
    const filtered = entries.filter(e => (status === 'all' || e.status === status) && (channel === 'all' || e.links.some(l => l.platform === channel))).sort((a, b) => b.date.localeCompare(a.date) || (b.savedAt || '').localeCompare(a.savedAt || ''));
    body = `<section class="sm65-panel sm65-row"><label>Статус<select class="select" id="sm65Filter">${Object.entries({ all: 'Все материалы', ...sm65Label }).map(([v, l]) => `<option value="${v}" ${status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label>Площадка<select class="select" id="sm65Channel">${Object.entries({ all: 'Все площадки', ...SMM_PLATFORMS }).map(([v, l]) => `<option value="${v}" ${channel === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><span>${filtered.length} материалов</span></section><div class="sm65-journal">${filtered.map(sm65EntryCard).join('') || '<div class="sm65-empty">Материалов по этому фильтру пока нет. Это не означает, что план выполнен.</div>'}</div>`;
  } else if (tab === 'pay') body = sm65Motivation(score);
  else body = sm65Guide();
  return `<div class="page sm65"><header class="sm65-hero"><div><div class="eyebrow">EXTREME KIDS · КОНТЕНТ И КОМАНДА</div><h2>${sm65Mine() ? 'Карина, создаём движение.' : 'SMM · кабинет Карины'}</h2><p>Один клуб. Пять площадок. Каждая публикация — с подтверждением.</p></div><div class="sm65-hero-actions"><input class="input" type="month" id="sm65MonthPicker" value="${sm65Month()}">${sm65Mine() ? sm65Button('+ Добавить материал', 'sm65New', '', true) : sm65Button('На проверку · ' + score.pending, 'sm65Tab', 'data-tab="journal"', true)}</div></header>
    <div class="sm65-metrics"><article><span>Принято из плана к сегодня</span><b>${completed}<small> / ${due.length}</small></b></article><article><span>Ожидают проверки</span><b>${score.pending}</b></article><article><span>Материалов за месяц</span><b>${score.units}</b></article><article><span>Расчёт · не выплата</span><b>${sm65Money(score.final?.amount ?? score.estimate)}</b></article></div>
    <nav class="sm65-tabs" aria-label="Разделы SMM">${tabs.map(([id, label]) => sm65Button(label, 'sm65Tab', `data-tab="${id}" aria-current="${tab === id ? 'page' : 'false'}"`, tab === id)).join('')}</nav>
    ${state.ui.smmDraft && sm65Mine() ? `<div class="sm65-draftbar">На устройстве есть черновик. ${sm65Button('Продолжить', 'sm65Resume')}</div>` : ''}${body}
    <section class="sm65-panel sm65-channels"><h3>Все площадки</h3><div>${score.channels.map(c => `<article><b>${SMM_PLATFORMS[c.platform]}</b><span>${c.accepted}/${c.planned} пунктов приняты</span><small>${c.views ? new Intl.NumberFormat('ru-RU').format(c.views) + ' просмотров · вручную' : 'Просмотры ещё не внесены'}</small>${sm65SafeLink(score.rules.accounts?.[c.platform], 'Открыть канал')}</article>`).join('')}</div></section></div>`;
}
const sm65RenderBefore = renderCurrentView;
renderCurrentView = function () {
  if (currentView !== 'smm' || !sm65Roles.includes(s65Actor?.role)) {
    const result = sm65RenderBefore();
    if (sm65Mine()) document.querySelectorAll('[data-action="addTask"],[data-action="quickAdd"]').forEach(b => b.hidden = true);
    return result;
  }
  const host = document.getElementById('pages');
  const signature = typeof ui65Signature === 'function' ? ui65Signature() : '';
  if (signature && signature === sm65Render.lastSignature && host.querySelector('.sm65')) { renderNav(); return; }
  const scroll = { x: window.scrollX, y: window.scrollY };
  document.getElementById('pageTitle').textContent = sm65Mine() ? 'Мой SMM-кабинет' : 'SMM · Карина';
  host.dataset.uiRefresh = 'quiet'; host.innerHTML = sm65Render(); renderNav(); renderProfile();
  sm65Render.lastSignature = signature;
  if (typeof ui65Rendered !== 'undefined') { ui65Rendered = signature; ui65View = currentView; }
  window.scrollTo({ left: scroll.x, top: scroll.y, behavior: 'instant' });
};
function sm65FormContent(form) {
  const v = Object.fromEntries(new FormData(form));
  const links = v.kind === 'shoot' ? [] : Object.keys(SMM_PLATFORMS).filter(p => form.elements['use_' + p].checked).map(platform => ({ platform, url: form.elements['url_' + platform].value, views: form.elements['views_' + platform].value === '' ? null : Number(form.elements['views_' + platform].value) }));
  return { date: v.date, kind: v.kind, title: v.title, caption: v.caption, archiveUrl: v.archiveUrl, storyFrames: Number(v.storyFrames || 0), links, eventIds: Array.from(form.querySelectorAll('[name="eventIds"]:checked')).map(e => e.value), rightsConfirmed: form.elements.rightsConfirmed.checked };
}
function sm65SaveLocal(form) {
  if (!state || !form) return;
  state.ui.smmDraft = { id: form.dataset.id, version: Number(form.dataset.version), content: sm65FormContent(form) }; s65LocalSave();
}
function sm65Edit(entry = null, preset = {}) {
  if (!sm65Mine()) return;
  const current = entry || { id: crypto.randomUUID(), version: 0, date: preset.date || sm65Date(), kind: preset.kind || 'story', title: '', caption: '', links: [], archiveUrl: '', storyFrames: 3, eventIds: preset.eventIds || [], rightsConfirmed: false };
  const rules = smmRules(state, current.date.slice(0, 7));
  const defaults = current.kind === 'post' ? rules.postPlatforms : ['video', 'film'].includes(current.kind) ? rules.videoPlatforms : rules.storyPlatforms;
  openModal({ title: entry?.version ? 'Материал · редакция ' + entry.version : 'Добавить материал', subtitle: 'Сначала публикация в соцсетях, затем ссылка. Принятые материалы учитываются автоматически.', body: `<form id="sm65EntryForm" class="form-grid sm65-form" data-id="${current.id}" data-version="${current.version}">
    <div class="field"><label>Дата публикации / съёмки</label><input class="input" type="date" name="date" required value="${current.date}" min="${state.smm.config.start}"></div><div class="field"><label>Тип материала</label><select class="select" name="kind">${Object.entries(SMM_KINDS).map(([v, l]) => `<option value="${v}" ${current.kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field span-2"><label>Название / тема</label><input class="input" name="title" maxlength="180" required value="${sm65Esc(current.title)}" placeholder="Первый уверенный спуск · тренировка"></div>
    <fieldset class="field span-2 sm65-platform-fields"><legend>Где опубликовано</legend><p>Один материал можно разместить на нескольких площадках. Для каждой — своя ссылка. Для «Съёмки» достаточно исходников ниже.</p>
    ${Object.entries(SMM_PLATFORMS).map(([id, name]) => { const l = current.links.find(l => l.platform === id), checked = current.links.length ? !!l : defaults.includes(id); return `<div class="sm65-platform-field"><label class="sm65-check"><input type="checkbox" name="use_${id}" ${checked ? 'checked' : ''}>${name}</label><input class="input" type="url" name="url_${id}" value="${sm65Esc(l?.url || '')}" placeholder="https://… ссылка на публикацию" maxlength="1600"><label class="sm65-view-input">Просмотры<input class="input" type="number" name="views_${id}" min="0" max="10000000000" value="${l?.views ?? ''}" placeholder="Неизвестно"></label></div>`; }).join('')}</fieldset>
    <div class="field span-2"><label>Исходники / сохранённое подтверждение (HTTPS)</label><input class="input" type="url" name="archiveUrl" maxlength="1600" value="${sm65Esc(current.archiveUrl)}" placeholder="Ссылка на файл, запись экрана или отдельную папку материала"><small>Для сторис и съёмок обязательно. Проверяющим должен быть открыт доступ.</small></div>
    <div class="field"><label>Кадров в серии сторис</label><input class="input" type="number" name="storyFrames" min="0" max="1000" value="${current.storyFrames}"></div>
    <fieldset class="field span-2 sm65-event-fields"><legend>Связано с мероприятием</legend>${(state.events || []).filter(e => !e.deletedAt && e.date >= smmAddDays(current.date, -14) && e.date <= smmAddDays(current.date, 14)).map(e => `<label class="sm65-check"><input type="checkbox" name="eventIds" value="${sm65Esc(e.id)}" ${current.eventIds.includes(e.id) ? 'checked' : ''}>${sm65Esc(e.title)} · ${formatDateShort(e.date)}</label>`).join('') || '<p>Рядом с этой датой нет мероприятий.</p>'}</fieldset>
    <div class="field span-2"><label>Комментарий / что сделано</label><textarea class="textarea" name="caption" maxlength="3000">${sm65Esc(current.caption)}</textarea></div>
    <label class="field span-2 sm65-check"><input type="checkbox" name="rightsConfirmed" ${current.rightsConfirmed ? 'checked' : ''}>Публикация людей и использование материалов согласованы. В открытых ссылках нет лишних личных сведений.</label>
    <p id="sm65FormError" class="span-2 sm65-error" role="alert"></p><div class="form-actions span-2">${sm65Button('Сохранить черновик', 'sm65Draft')}${sm65Button('На проверку', 'sm65Submit', '', true)}${current.version ? sm65Button('Удалить', 'sm65Delete') : ''}</div></form>` });
}
function sm65Adopt(result) {
  if (state && result.smm) { state.smm = S65.clone(result.smm); s65Base.smm = S65.clean(result.smm); sm65Revision = result.revision; }
}
async function sm65Send(payload) {
  const fingerprint = S65.canonical(payload);
  if (!state.ui.smmRequest || state.ui.smmRequest.fingerprint !== fingerprint) state.ui.smmRequest = { fingerprint, requestId: crypto.randomUUID() };
  const id = state.ui.smmRequest.requestId;
  await s65LocalSave();
  const result = await s65Fetch('/api/smm', { method: 'POST', body: JSON.stringify({ ...payload, requestId: id }) });
  sm65Adopt(result); delete state.ui.smmRequest; await s65LocalSave(); return result;
}
const sm65SyncBefore = syncNow;
syncNow = function (options) { return sm65Busy ? Promise.resolve(false) : sm65SyncBefore(options); };
async function sm65Run(fn, element = null) {
  if (sm65Busy) return; sm65Busy = true; if (element) element.disabled = true;
  try { if (s65Promise) await s65Promise; await fn(); }
  catch (e) { const field = document.getElementById('sm65FormError'); if (field) field.textContent = e.message; toast('Изменение не подтверждено', e.message, 'error'); }
  finally { sm65Busy = false; if (element?.isConnected) element.disabled = false; }
}
function sm65Review(entry) {
  openModal({ title: 'Проверка · ' + entry.title, subtitle: 'Откройте ссылки и проверьте площадки, качество, дату и согласование съёмки.', body: `<div class="sm65-review sm65">${sm65EntryCard(entry).replace(/<div class="sm65-actions">[\s\S]*?<\/div>/, '')}<form id="sm65ReviewForm" data-id="${entry.id}" data-version="${entry.version}"><label>Комментарий<textarea class="textarea" name="note" maxlength="2000" placeholder="Что хорошо / что исправить"></textarea></label><div class="sm65-actions">${entry.status === 'pending' ? sm65Button('Принять материал', 'sm65Approve', '', true) : ''}${sm65Button('На доработку', 'sm65Return')}</div><p id="sm65FormError" class="sm65-error" role="alert"></p></form></div>` });
}
const sm65RulesFields = ['base', 'regularBonus', 'productionBonus', 'cap', 'postEvery', 'storyFrames', 'storyPlatforms', 'postPlatforms', 'videoPlatforms', 'videoDays', 'shootDays', 'workDays', 'accounts'];
function sm65RulesModal() {
  if (s65Actor.role !== 'owner') return; const r = smmRules(state, sm65Month());
  const checks = (name, values, labels) => `<fieldset class="field span-2 sm65-inline-checks"><legend>${{ storyPlatforms: 'Ежедневные сторис', postPlatforms: 'Посты', videoPlatforms: 'Куда выкладывать видео', videoDays: 'Дни публикации коротких видео', shootDays: 'Дни съёмок', workDays: 'Рабочие дни · ориентир 4/3' }[name]}</legend>${Object.entries(labels).map(([v, l]) => `<label class="sm65-check"><input type="checkbox" name="${name}" value="${v}" ${values.map(String).includes(v) ? 'checked' : ''}>${l}</label>`).join('')}</fieldset>`;
  const weekdays = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 0: 'Вс' };
  openModal({ title: 'План и мотивация · ' + monthLabel(sm65Month()), subtitle: 'Только Роман. Меняется выбранный месяц; подтверждённый расчёт защищён.', body: `<form id="sm65RulesForm" class="form-grid sm65-form">${[['base', 'Фикс за полный месяц'], ['regularBonus', 'Бонус за регулярность'], ['productionBonus', 'Бонус за видео и съёмки'], ['cap', 'Максимум за полный месяц'], ['postEvery', 'Посты раз в N дней'], ['storyFrames', 'Минимум кадров сторис']].map(([key, label]) => `<div class="field"><label>${label}</label><input class="input" type="number" required name="${key}" min="${['postEvery', 'storyFrames'].includes(key) ? 1 : 0}" max="${key === 'postEvery' ? 7 : key === 'storyFrames' ? 30 : 50000}" value="${r[key]}"></div>`).join('')}${['storyPlatforms', 'postPlatforms', 'videoPlatforms'].map(k => checks(k, r[k], SMM_PLATFORMS)).join('')}${['videoDays', 'shootDays', 'workDays'].map(k => checks(k, r[k], weekdays)).join('')}<div class="field span-2"><h3>Ссылки на аккаунты клуба</h3>${Object.entries(SMM_PLATFORMS).map(([key, label]) => `<label>${label}<input class="input" type="url" name="account_${key}" value="${sm65Esc(r.accounts?.[key] || '')}" placeholder="https://…"></label>`).join('')}</div><div class="field span-2"><label>Причина изменения</label><textarea class="textarea" name="note" required maxlength="1000"></textarea></div><p id="sm65FormError" class="span-2 sm65-error" role="alert"></p>${formActions('Сохранить правила месяца')}</form>` });
}
const sm65BeforeClick = handleClick;
handleClick = function (event) {
  const el = event.target.closest('[data-action]'), action = el?.dataset.action;
  if (!action?.startsWith('sm65')) return sm65BeforeClick(event);
  event.preventDefault(); if (!state?.smm || !sm65Roles.includes(s65Actor?.role)) return;
  if (action === 'sm65Tab') { state.ui.smmTab = el.dataset.tab; if (el.dataset.tab === 'today') { state.ui.smmDate = smmDay(); state.ui.smmMonth = smmDay().slice(0, 7); } s65LocalSave(); renderCurrentView(); return; }
  if (action === 'sm65Date') { state.ui.smmDate = el.dataset.date; s65LocalSave(); renderCurrentView(); return; }
  if (action === 'sm65Calendar') return setView('calendar');
  if (action === 'sm65Tasks') return setView('tasks');
  if (action === 'sm65New') return sm65Edit(null, { kind: el.dataset.kind, date: el.dataset.date, eventIds: JSON.parse(el.dataset.events || '[]') });
  if (action === 'sm65Edit') return sm65Edit(state.smm.entries[el.dataset.id]);
  if (action === 'sm65Resume') { const draft = state.ui.smmDraft; return draft && sm65Edit({ ...draft.content, id: draft.id, version: draft.version }); }
  if (action === 'sm65Review') return sm65Review(state.smm.entries[el.dataset.id]);
  if (action === 'sm65Rules') return sm65RulesModal();
  if (['sm65Draft', 'sm65Submit', 'sm65Delete'].includes(action)) {
    const form = document.getElementById('sm65EntryForm'); if (!form) return;
    if (action !== 'sm65Delete' && !form.reportValidity()) return;
    if (action === 'sm65Delete' && !confirm('Удалить этот непринятый материал?')) return;
    sm65SaveLocal(form);
    return sm65Run(async () => {
      await sm65Send({ action: action === 'sm65Delete' ? 'delete' : 'save', id: form.dataset.id, version: Number(form.dataset.version), content: sm65FormContent(form), submit: action === 'sm65Submit', month: form.elements.date.value.slice(0, 7) });
      delete state.ui.smmDraft; await s65LocalSave(); closeModal(); renderCurrentView(); toast(action === 'sm65Submit' ? 'Отправлено на проверку' : 'Сохранено в общей базе', 'Сервер подтвердил изменение.');
    }, el);
  }
  if (action === 'sm65Approve' || action === 'sm65Return') {
    const form = document.getElementById('sm65ReviewForm');
    return sm65Run(async () => { await sm65Send({ action: 'review', id: form.dataset.id, version: Number(form.dataset.version), decision: action === 'sm65Approve' ? 'approved' : 'changes', note: form.elements.note.value, month: sm65Month() }); closeModal(); renderCurrentView(); toast('Проверка сохранена'); }, el);
  }
  if (action === 'sm65Exception') {
    const old = state.smm.exceptions?.[el.dataset.id], note = prompt(old ? 'Почему возвращаем этот пункт в план?' : 'Почему исключаем пункт из плана? Решение увидит Карина.');
    if (!note?.trim()) return;
    return sm65Run(async () => { await sm65Send({ action: 'exception', month: sm65Month(), slotId: el.dataset.id, version: old?.version || 0, restore: !!old, note }); renderCurrentView(); }, el);
  }
  if (action === 'sm65Close') {
    return sm65Run(async () => { const overview = await s65Fetch('/api/smm', { method: 'POST', body: JSON.stringify({ action: 'overview', month: sm65Month() }) }); sm65Adopt(overview); const score = overview.score; openModal({ title: 'Подтвердить мотивацию Карины', subtitle: 'Это фиксация расчёта, не перевод денег. Дальнейшие правки месяца будут заблокированы.', body: `<form id="sm65CloseForm" class="form-grid sm65-form" data-revision="${overview.revision}"><div class="field"><label>Сумма · не более ${sm65Money(score.cap)}</label><input class="input" name="amount" type="number" min="0" max="${score.cap}" step="0.01" value="${score.estimate}" required></div><div class="field span-2"><label>Комментарий к итоговой сумме</label><textarea class="textarea" name="note" required maxlength="2000"></textarea></div><p id="sm65FormError" class="span-2 sm65-error" role="alert"></p>${formActions('Подтвердить расчёт')}</form>` }); }, el);
  }
  if (action === 'sm65Reopen') {
    const note = prompt('Причина повторного открытия расчёта. Предыдущая редакция сохранится в истории.'); if (!note?.trim()) return;
    return sm65Run(async () => { await sm65Send({ action: 'reopen', month: sm65Month(), note }); renderCurrentView(); }, el);
  }
};
const sm65SubmitBefore = handleSubmit;
handleSubmit = function (event) {
  const form = event.target;
  if (form.id === 'sm65EntryForm') { event.preventDefault(); form.querySelector('[data-action="sm65Draft"]').click(); return; }
  if (form.id === 'sm65RulesForm' || form.id === 'sm65CloseForm') {
    event.preventDefault(); if (!form.reportValidity()) return;
    return sm65Run(async () => {
      if (form.id === 'sm65CloseForm') await sm65Send({ action: 'close', month: sm65Month(), amount: Number(form.elements.amount.value), note: form.elements.note.value, expectedRevision: Number(form.dataset.revision) });
      else {
        const rules = {};
        for (const k of ['base', 'regularBonus', 'productionBonus', 'cap', 'postEvery', 'storyFrames']) rules[k] = Number(form.elements[k].value);
        for (const k of ['storyPlatforms', 'postPlatforms', 'videoPlatforms', 'videoDays', 'shootDays', 'workDays']) rules[k] = [...form.querySelectorAll(`[name="${k}"]:checked`)].map(x => k.endsWith('Days') ? Number(x.value) : x.value);
        rules.accounts = Object.fromEntries(Object.keys(SMM_PLATFORMS).map(p => [p, form.elements['account_' + p].value]));
        await sm65Send({ action: 'rules', month: sm65Month(), version: state.smm.rulesByMonth?.[sm65Month()]?.version || 0, rules, note: form.elements.note.value });
      }
      closeModal(); renderCurrentView(); toast('Сохранено', 'Подтверждено сервером.');
    }, form.querySelector('button[type="submit"]'));
  }
  if (sm65Mine() && form.id === 'taskForm') {
    event.preventDefault(); const item = state.tasks.find(t => t.id === form.dataset.id && t.ownerId === s65Actor.personId); if (!item) return;
    item.status = form.elements.status.value; if (!item.required) item.description = form.elements.description.value; closeModal(); touch('SMM: статус задачи'); return;
  }
  return sm65SubmitBefore(event);
};
document.addEventListener('input', e => { const form = e.target.closest('#sm65EntryForm'); if (form) sm65SaveLocal(form); });
document.addEventListener('change', e => {
  if (!state || currentView !== 'smm') return;
  const ids = { sm65MonthPicker: 'smmMonth', sm65DatePicker: 'smmDate', sm65Filter: 'smmFilter', sm65Channel: 'smmChannel' };
  const key = ids[e.target.id]; if (!key || !e.target.value) return;
  state.ui[key] = e.target.value; if (key === 'smmDate') state.ui.smmMonth = e.target.value.slice(0, 7);
  s65LocalSave(); renderCurrentView();
});
const sm65ModalBefore = openModal;
openModal = function (options) {
  const result = sm65ModalBefore(options);
  for (const selector of ['#s65InviteForm [name="role"]', '#h65AccessForm [name="role"]']) {
    const select = document.querySelector(selector); if (select && !select.querySelector('option[value="smm"]')) { const option = document.createElement('option'); option.value = 'smm'; option.textContent = 'SMM-специалист'; select.appendChild(option); }
  }
  if (sm65Mine() && document.querySelector('#taskForm')) {
    const f = document.querySelector('#taskForm'), item = state.tasks.find(t => t.id === f.dataset.id);
    if (item?.required && f.elements.description) f.elements.description.disabled = true;
  }
  if (sm65Mine()) for (const input of document.querySelectorAll('#taskForm [name="title"],#taskForm [name="deadline"],#taskForm [name="monthKey"],#taskForm [name="priority"]')) input.disabled = true;
  return result;
};
if (window.EK65SecureStatus) window.EK65SecureStatus.smmVersion = '6.5-smm.1';
