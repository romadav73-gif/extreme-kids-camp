// Appended inside the existing authenticated application closure after account controls.
const efView = 'event_finance';
const efOwner = () => s65Actor?.role === 'owner';
const efUi = { entries: null, loading: false, error: '', current: null, dirty: false, busy: false, tab: 'event', filter: 'active', search: '' };
const efTabs = { event: 'Событие', income: 'Доходы', expenses: 'Расходы', gifts: 'Подарки', closure: 'Закрытие зала', risks: 'Риски', result: 'Итоги' };
const efMoney = n => n === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' ₽';
const efPercent = n => n === null ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n) + '%';
const efButton = (text, action, extra = '', primary = false) => `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}" data-ef-action="${action}" ${extra}>${text}</button>`;
const efReq = body => s65Fetch('/api/event-finance', { method: 'POST', body: JSON.stringify(body) });
function efPersist() {
  if (!efOwner() || !state) return Promise.resolve(false);
  if (efUi.current && !efUi.current.archived) state.ui.eventFinanceDraft = { entry: structuredClone(efUi.current), dirty: efUi.dirty, tab: efUi.tab };
  return persistLocal();
}
function efWriteError(message) {
  efUi.error = message;
  const node = document.getElementById('efMessage');
  if (node) { node.textContent = message; node.hidden = !message; }
}
async function efLoad() {
  if (!efOwner() || efUi.loading) return;
  efUi.loading = true; efUi.error = '';
  try { const r = await efReq({ action: 'list' }); if (!efOwner()) return; efUi.entries = r.entries; }
  catch (e) { efUi.error = e.message; }
  finally { efUi.loading = false; if (currentView === efView && !efUi.current) efDraw(true); }
}
function efCards() {
  const all = efUi.entries || [], list = all.filter(e => (efUi.filter === 'all' || (efUi.filter === 'archive' ? e.archived : !e.archived)) && (e.title + ' ' + e.date + ' ' + e.type).toLocaleLowerCase('ru').includes(efUi.search.toLocaleLowerCase('ru')));
  const final = all.filter(e => e.archived), revenue = final.reduce((n, e) => n + e.totals.fact.revenue, 0), profit = final.reduce((n, e) => n + e.totals.fact.profit, 0), economic = final.reduce((n, e) => n + e.totals.fact.economicResult, 0);
  const draft = state.ui.eventFinanceDraft;
  return `<div class="ef-page-head"><div><div class="eyebrow">Кабинет Романа · финансы событий</div><h2>Мероприятия</h2><p>Планируйте, считайте результат и сохраняйте историю. Только ваши подтверждённые цифры.</p></div><div class="ef-actions">${efButton('+ Мероприятие', 'new', '', true)}${efButton('Обновить', 'refresh')}${efButton('Резервная копия', 'export')}</div></div>
    <div class="ef-kpis">${efKpi('В работе', all.filter(e => !e.archived).length, 'карточек')}${efKpi('Выручка архива', efMoney(revenue), final.length + ' закрытых событий')}${efKpi('Прибыль архива', efMoney(profit), 'после внесённых расходов', profit)}${efKpi('С учётом зала', efMoney(economic), 'после упущенной маржи', economic)}</div>
    ${draft?.dirty ? `<div class="ef-notice"><b>Есть несохранённый черновик: ${esc(draft.entry.content.title || 'Новое мероприятие')}</b><div class="ef-actions">${efButton('Продолжить черновик', 'resume', '', true)}${efButton('Скачать черновик', 'draft-export')}${efButton('Удалить черновик', 'draft-remove')}</div></div>` : ''}
    <div class="ef-toolbar"><div class="ef-actions">${['active', 'archive', 'all'].map((f, i) => efButton(['В работе', 'Архив', 'Все'][i], 'filter', `data-value="${f}" aria-pressed="${efUi.filter === f}"`, efUi.filter === f)).join('')}</div><label>Поиск<input class="input" id="efSearch" type="search" value="${esc(efUi.search)}" placeholder="Название или дата"></label></div>
    <div id="efEventList">${efUi.loading ? '<p>Загружаем сохранённые мероприятия…</p>' : list.length ? `<div class="ef-event-grid">${list.map(e => `<article class="ef-event"><div class="ef-event-meta"><span>${esc(formatDate(e.date))}</span><span>${e.archived ? 'Архив · зафиксировано' : esc(e.status)}</span></div><h3>${esc(e.title)}</h3><p>${esc(e.type)} · ${esc(e.hall)}</p><div class="ef-event-values"><div><small>План: с залом и рисками</small><b>${e.totals.plan.known ? efMoney(e.totals.plan.afterRisk) : 'Не заполнен'}</b></div><div><small>Факт: прибыль мероприятия</small><b class="${e.totals.fact.profit < 0 ? 'ef-negative' : ''}">${e.totals.fact.known ? efMoney(e.totals.fact.profit) : 'Нет факта'}</b></div></div><p class="ef-muted">${e.factsChecked ? 'Фактические цифры проверены' : 'Предварительно · факт не подтверждён'}</p>${efButton(e.archived ? 'Открыть результат' : 'Открыть карточку', 'open', `data-id="${e.id}"`, true)}</article>`).join('')}</div>` : `<div class="ef-empty"><h3>${efUi.filter === 'archive' ? 'Архив пока пуст' : 'Нет мероприятий в этом списке'}</h3><p>Создайте карточку и внесите цифры. Завершённые события появятся в архиве после проверки и закрытия.</p>${!all.length ? efButton('Соревнования · 7 октября 2026', 'competition', '', true) : ''}</div>`}</div>
    <div class="ef-footnote">Этот раздел — отдельный управленческий учёт мероприятий. Сохранение здесь не начисляет зарплату и не добавляет повторно выручку в общий кассовый журнал. Резервная копия раздела скачивается отдельно.</div>`;
}
function efKpi(label, value, note, sign = 0) { return `<div class="ef-kpi"><small>${label}</small><b class="${sign < 0 ? 'ef-negative' : ''}">${value}</b><span>${note}</span></div>`; }
function efInput(label, field, value, { type = 'text', section = '', index = -1, options = null, rows = false } = {}) {
  const attrs = `data-ef-field="${field}" ${section ? `data-section="${section}" data-index="${index}"` : ''}`;
  let control;
  if (options) control = `<select class="select" ${attrs}>${options.map(o => { const v = typeof o === 'string' ? o : o.value, t = typeof o === 'string' ? o : o.label; return `<option value="${esc(v)}" ${value === v ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select>`;
  else if (rows) control = `<textarea class="input" rows="3" ${attrs}>${esc(value)}</textarea>`;
  else control = `<input class="input" ${attrs} type="${type === 'money' || type === 'number' ? 'text' : type}" ${['money', 'number'].includes(type) ? 'inputmode="decimal" data-number="true"' : ''} value="${esc(value ?? '')}" ${type === 'money' ? 'placeholder="Не заполнено"' : ''}>`;
  return `<label class="ef-field">${label}${control}</label>`;
}
function efEventFields(c) {
  return `<div class="ef-form-grid">${efInput('Название мероприятия *', 'title', c.title)}${efInput('Дата *', 'date', c.date, { type: 'date' })}${efInput('Тип', 'type', c.type, { options: EF_TYPES })}${efInput('Статус', 'status', c.status, { options: EF_STATUSES })}${efInput('Использование зала', 'hall', c.hall, { options: EF_HALLS })}${efInput('Ответственный', 'responsible', c.responsible)}${efInput('Начало', 'start', c.start, { type: 'time' })}${efInput('Окончание', 'end', c.end, { type: 'time' })}${efInput('Участников · план', 'participantsPlan', c.participantsPlan, { type: 'number' })}${efInput('Участников · факт', 'participantsFact', c.participantsFact, { type: 'number' })}</div>${efInput('Комментарий / решение', 'notes', c.notes, { rows: true })}
    <div class="ef-note">Утро и свободные дневные окна предпочтительны. Полное закрытие в часы плотных тренировок сначала оцениваем в разделе «Закрытие зала». Дата мероприятия не зависит от рабочего месяца в верхней панели сайта.</div>`;
}
const efDescriptions = {
  income: 'Каждый источник — отдельной строкой: взносы, билеты, товары, партнёры. Возврат взноса выберите отдельным видом — он уменьшит выручку. Суммы указываются в рублях.',
  expenses: 'Все обычные затраты: персонал, реклама, комиссии, налоги, роялти и доля постоянных расходов, если относите их на событие. Подарки сюда не дублируйте. Ущерб по риску вносите здесь и привязывайте к риску — сумма вычтется только один раз.',
  gifts: 'Медали, кубки и подарки: количество × цена. План и факт количества могут отличаться. Вся указанная закупка относится к этому событию; не учитывайте её второй раз в обычных расходах.',
  closure: 'Одна строка — затронутая тренировка или временной блок. Потеря = исходный доход − сохранённый переносом доход − сэкономленные переменные затраты, не меньше нуля. Полный перенос в свободное окно без потерь: сохранённый доход равен исходному. Не считайте стоимость всех перенесённых занятий потерей. Компенсации и дополнительные затраты заносите в «Расходы».',
  risks: 'Вероятность указывается числом от 0 до 100. Резерв = вероятность / 100 × ущерб. Это оценка для плана, а не фактический расход. Для реализованного риска внесите связанный расход (или 0) в «Расходах».'
};
function efRows(section, c) {
  return `<p class="ef-note">${efDescriptions[section]}</p><div class="ef-line-list">${c[section].map((r, i) => {
    const f = (label, key, options = {}) => efInput(label, key, r[key], { section, index: i, ...options });
    let fields = f(section === 'closure' ? 'Группа / дата и время тренировки' : section === 'risks' ? 'Описание риска' : 'Наименование *', 'label');
    if (section === 'income') fields += f('Вид', 'kind', { options: [{ value: 'income', label: 'Доход' }, { value: 'refund', label: 'Возврат взноса' }] });
    if (section === 'expenses') fields += f('Категория', 'category', { options: EF_CATEGORIES }) + f('Связанный риск', 'riskId', { options: [{ value: '', label: 'Нет / обычный расход' }, ...c.risks.map(x => ({ value: x.id, label: x.label || 'Риск без названия' }))] });
    if (['income', 'expenses'].includes(section)) fields += f('План, ₽', 'plan', { type: 'money' }) + f('Факт, ₽', 'fact', { type: 'money' });
    if (section === 'gifts') fields += f('Кому / за что', 'recipient') + ['plan', 'fact'].map((m, j) => f(['План: количество', 'Факт: количество'][j], m + 'Qty', { type: 'number' }) + f(['План: цена, ₽', 'Факт: цена, ₽'][j], m + 'Price', { type: 'money' })).join('');
    if (section === 'closure') fields += ['plan', 'fact'].map((m, j) => f((j ? 'Факт' : 'План') + ': исходный доход, ₽', m + 'Revenue', { type: 'money' }) + f((j ? 'Факт' : 'План') + ': сохранено переносом, ₽', m + 'Retained', { type: 'money' }) + f((j ? 'Факт' : 'План') + ': сэкономлено затрат, ₽', m + 'SavedCosts', { type: 'money' })).join('');
    if (section === 'risks') fields += f('Вероятность, % (например 25)', 'probability', { type: 'number' }) + f('Возможный ущерб, ₽', 'impact', { type: 'money' }) + f('Статус риска', 'status', { options: EF_RISK_STATUSES }) + f('Ответственный', 'responsible') + f('Как снижаем риск', 'mitigation', { rows: true });
    else fields += f('Комментарий / поставщик / подтверждение', 'note');
    return `<article class="ef-line"><div class="ef-line-head"><b>Статья ${i + 1}</b>${efUi.current.archived ? '' : efButton('Убрать строку', 'remove-row', `data-section="${section}" data-index="${i}"`)}</div><div class="ef-form-grid">${fields}</div>${['gifts', 'closure', 'risks'].includes(section) ? `<div class="ef-row-total" data-ef-row-total="${section}:${i}"></div>` : ''}</article>`;
  }).join('') || '<p class="ef-empty-small">Статей пока нет. Добавьте только то, что относится к этому мероприятию.</p>'}</div>${efUi.current.archived ? '' : efButton('+ Добавить статью', 'add-row', `data-section="${section}"`, true)}`;
}
function efSummary(c, entry) {
  const t = entry.archived ? entry.snapshot.totals : efCalculate(c), plan = t.plan, fact = t.fact;
  const rows = [['Выручка за вычетом возвратов', 'revenue'], ['Обычные расходы', 'expenses'], ['Закупка подарков', 'gifts'], ['Все расходы мероприятия', 'costs'], ['Прибыль мероприятия', 'profit'], ['Упущенная маржа тренировок', 'hallLoss'], ['Результат с учётом зала', 'economicResult']];
  return `<div class="ef-summary-top"><b>${entry.archived ? 'Зафиксированный результат' : 'Расчёт по введённым цифрам'}</b><span>${c.factsChecked ? 'Факт проверен' : 'Факт предварительный'}</span></div><div class="ef-table-wrap"><table class="ef-results"><thead><tr><th>Показатель</th><th>План</th><th>Факт</th></tr></thead><tbody>${rows.map(([label, k]) => `<tr class="${['profit', 'economicResult'].includes(k) ? 'ef-result-line' : ''}"><td>${label}</td><td>${plan.known ? efMoney(plan[k]) : '—'}</td><td class="${fact[k] < 0 ? 'ef-negative' : ''}">${fact.known ? efMoney(fact[k]) : '—'}</td></tr>`).join('')}<tr><td>Маржа мероприятия</td><td>${efPercent(plan.margin)}</td><td>${efPercent(fact.margin)}</td></tr><tr><td>Рентабельность затрат (ROI)</td><td>${efPercent(plan.roi)}</td><td>${efPercent(fact.roi)}</td></tr><tr><td>Прибыль на участника</td><td>${efMoney(plan.perParticipant)}</td><td>${efMoney(fact.perParticipant)}</td></tr><tr><td>Резерв открытых рисков</td><td>${efMoney(t.risks.reserve)}</td><td>Не расход</td></tr><tr class="ef-result-line"><td>План с залом и резервом</td><td>${plan.known ? efMoney(plan.afterRisk) : '—'}</td><td>—</td></tr></tbody></table></div><p class="ef-muted">Расходы по реализованным рискам: ${efMoney(t.risks.actualBooked)} — уже включены в обычные расходы, повторно не вычитаются.</p>
    <div class="ef-warnings">${t.warnings.map(w => `<p>${esc(w)}</p>`).join('')}</div><div class="ef-note"><b>Как считаем.</b> Прибыль = выручка после возвратов − расходы − подарки. Маржа = прибыль / выручка. Рентабельность затрат = прибыль / расходы. Упущенная маржа зала уменьшает отдельный экономический результат, не является кассовым расходом. Это управленческий расчёт по внесённым статьям, не бухгалтерская отчётность. Налоги, роялти и постоянные расходы не назначаются автоматически.</div>`;
}
function efResultTab(c, e) {
  return `<div id="efFullSummary">${efSummary(c, e)}</div><label class="ef-review"><input type="checkbox" data-ef-field="factsChecked" ${c.factsChecked ? 'checked' : ''}> Факт проверен: учтены возвраты, все затраты, подарки, налоги / роялти и потери зала. Пустые статьи заполнены или удалены.</label>
    <div class="ef-note">Для закрытия выберите статус «Проведено» или «Отменено», сохраните проверенные цифры и нажмите «Закрыть в архив». Дата в прошлом сама по себе не закрывает карточку. В архиве хранится снимок цифр и формул на момент закрытия.</div>
    ${e.history?.length ? `<details><summary>История действий (${e.history.length})</summary><div class="ef-history">${[...e.history].reverse().slice(0, 50).map(h => `<p>${esc(new Date(h.at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }))} · ${esc(h.name)} · ${esc(({ save: 'Сохранение', archive: 'Закрытие', reopen: 'Повторное открытие' })[h.action])} · версия ${h.version}${h.reason ? ' · ' + esc(h.reason) : ''}</p>`).join('')}</div></details>` : ''}
    ${e.archives?.length ? `<details><summary>Снимки закрытия (${e.archives.length})</summary><div class="ef-history">${e.archives.map((a, i) => `<p>${esc(new Date(a.at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }))} · ${efMoney(a.totals.fact.profit)} ${efButton('Скачать снимок', 'snapshot', `data-index="${i}"`)}</p>`).join('')}</div></details>` : ''}`;
}
function efEditor() {
  const e = efUi.current, c = e.content, pending = state.ui.eventFinancePending;
  return `<div class="ef-editor-head"><div>${efButton('← Все мероприятия', 'back')}<h2>${esc(c.title || 'Новое мероприятие')}</h2><span id="efSaveState">${e.archived ? 'Архив · редактирование закрыто' : efUi.dirty ? 'Есть несохранённые изменения' : e.version ? 'Сохранено на сервере · версия ' + e.version : 'Новый черновик'}</span></div><div class="ef-actions">${efButton('Скачать карточку', 'card-export')}${e.archived ? efButton('Открыть для исправления', 'reopen') : efButton('Сохранить', 'save', '', true)}${!e.archived && e.version ? efButton('Закрыть в архив', 'archive') : ''}</div></div>
    ${pending ? `<div class="ef-notice"><b>Предыдущее сохранение не подтверждено.</b><p>Не создавайте вторую карточку. Повтор использует тот же номер операции.</p>${efButton('Повторить сохранение', 'retry', '', true)}</div>` : ''}
    <nav class="ef-tabs" aria-label="Разделы мероприятия">${Object.entries(efTabs).map(([k, title]) => efButton(title, 'tab', `data-tab="${k}" aria-pressed="${efUi.tab === k}"`, efUi.tab === k)).join('')}</nav>
    <form id="efForm" novalidate><fieldset ${e.archived || efUi.busy || pending ? 'disabled' : ''}><div class="ef-editor-columns"><section class="ef-form-main">${efUi.tab === 'event' ? efEventFields(c) : efUi.tab === 'result' ? efResultTab(c, e) : efRows(efUi.tab, c)}</section><aside class="ef-live"><h3>Результат</h3><div id="efLiveSummary"></div></aside></div></fieldset></form>
    <div class="ef-bottom-actions">${efButton('← К списку', 'back')}${e.archived ? '' : efButton('Сохранить изменения', 'save', '', true)}</div>`;
}
function efLiveUpdate() {
  const e = efUi.current; if (!e || !document.getElementById('efRoot')) return;
  const t = e.archived ? e.snapshot.totals : efCalculate(e.content), fact = t.fact;
  const live = document.getElementById('efLiveSummary');
  if (live) live.innerHTML = `<small>Факт · ${e.content.factsChecked ? 'проверен' : 'предварительно'}</small><b class="ef-big ${fact.profit < 0 ? 'ef-negative' : ''}">${fact.known ? efMoney(fact.profit) : 'Нет цифр'}</b><p>Прибыль мероприятия</p><dl><dt>Выручка</dt><dd>${fact.known ? efMoney(fact.revenue) : '—'}</dd><dt>Все расходы</dt><dd>${fact.known ? efMoney(fact.costs) : '—'}</dd><dt>Маржа</dt><dd>${efPercent(fact.margin)}</dd><dt>Потеря зала</dt><dd>${fact.known ? efMoney(fact.hallLoss) : '—'}</dd><dt>Итог с залом</dt><dd>${fact.known ? efMoney(fact.economicResult) : '—'}</dd></dl><hr><small>План: после зала и резерва</small><b>${t.plan.known ? efMoney(t.plan.afterRisk) : 'Не заполнен'}</b><p class="ef-muted">Резерв рисков: ${efMoney(t.risks.reserve)}</p>`;
  const full = document.getElementById('efFullSummary'); if (full) full.innerHTML = efSummary(e.content, e);
  for (const node of document.querySelectorAll('[data-ef-row-total]')) {
    const [s, i] = node.dataset.efRowTotal.split(':'), row = e.content[s][+i];
    if (s === 'gifts') node.textContent = 'Сумма · план: ' + efMoney(row.planQty === null || row.planPrice === null ? null : efRound(row.planQty * row.planPrice)) + ' · факт: ' + efMoney(row.factQty === null || row.factPrice === null ? null : efRound(row.factQty * row.factPrice));
    if (s === 'closure') node.textContent = 'Потеря маржи · план: ' + efMoney(row.planRevenue === null ? null : Math.max(0, row.planRevenue - (row.planRetained || 0) - (row.planSavedCosts || 0))) + ' · факт: ' + efMoney(row.factRevenue === null ? null : Math.max(0, row.factRevenue - (row.factRetained || 0) - (row.factSavedCosts || 0)));
    if (s === 'risks') node.textContent = 'Ожидаемый ущерб: ' + efMoney(row.probability === null || row.impact === null ? null : efRound(row.probability / 100 * row.impact));
  }
  const status = document.getElementById('efSaveState'); if (status && efUi.dirty) status.textContent = 'Есть несохранённые изменения';
}
function efDraw(force = false) {
  if (!efOwner() || currentView !== efView) return;
  document.getElementById('pageTitle').textContent = 'Мероприятия';
  const host = document.getElementById('pages'); if (!host) return;
  if (!force && efUi.current && host.querySelector('#efForm')) return;
  host.innerHTML = `<div id="efRoot"><div id="efMessage" role="alert" ${efUi.error ? '' : 'hidden'}>${esc(efUi.error)}</div>${efUi.current ? efEditor() : efCards()}</div>`;
  renderNav(); efLiveUpdate();
  if (!efUi.current && efUi.entries === null && !efUi.loading && !efUi.error) void efLoad();
}
async function efOpen(id) {
  if (efUi.busy) return;
  try { const r = await efReq({ action: 'get', id }); efUi.current = r.entry; efUi.dirty = false; efUi.tab = r.entry.archived ? 'result' : 'event'; efUi.error = ''; efDraw(true); }
  catch (e) { efWriteError(e.message); }
}
function efNew(competition = false) {
  if (state.ui.eventFinanceDraft?.dirty && !confirm('Есть несохранённый черновик. Продолжить его? Отмена оставит список без создания новой карточки.')) return;
  if (state.ui.eventFinanceDraft?.dirty) { efResume(); return; }
  const c = efBlank(); c.responsible = s65Actor.displayName || 'Роман';
  if (competition) { c.title = 'Соревнования EXTREME KIDS — 7 октября'; c.date = '2026-10-07'; }
  efUi.current = { id: crypto.randomUUID(), version: 0, archived: false, content: c, history: [], archives: [] }; efUi.dirty = true; efUi.tab = 'event'; efUi.error = ''; void efPersist(); efDraw(true);
}
function efResume() { const d = state.ui.eventFinanceDraft; if (!d) return; efUi.current = structuredClone(d.entry); efUi.dirty = d.dirty; efUi.tab = d.tab || 'event'; efDraw(true); }
async function efSend(action, reason = '') {
  if (efUi.busy || !efOwner() || !efUi.current) return;
  let body = state.ui.eventFinancePending;
  try {
    if (!body) {
      if (action === 'save') efValidate(efUi.current.content);
      if (action !== 'save' && efUi.dirty) { efWriteError('Сначала сохраните изменения карточки.'); return; }
      body = { action, id: efUi.current.id, version: efUi.current.version, requestId: crypto.randomUUID() };
      if (action === 'save') body.content = structuredClone(efUi.current.content);
      if (action === 'reopen') body.reason = reason;
      state.ui.eventFinancePending = body;
    }
    efUi.busy = true; efWriteError('');
    if (!await efPersist()) { delete state.ui.eventFinancePending; throw Error('Не удалось сохранить защищённый черновик на устройстве. Запрос не отправлен; не закрывайте форму.'); }
    efDraw(true);
    const r = await efReq(body);
    if (!efOwner()) return;
    delete state.ui.eventFinancePending; delete state.ui.eventFinanceDraft;
    efUi.current = r.entry; efUi.dirty = false; efUi.entries = null;
    await persistLocal(); efUi.error = '';
    if (r.entry.archived) efUi.tab = 'result';
    toast(r.entry.archived ? 'Мероприятие в архиве' : 'Сохранено', 'Сервер подтвердил версию ' + r.entry.version + '.');
  } catch (e) {
    if (e.status >= 400 && e.status < 500) { delete state.ui.eventFinancePending; await efPersist(); }
    efUi.error = e.message;
  } finally { efUi.busy = false; efDraw(true); }
}
const efAllowedBefore = allowedView;
allowedView = view => view === efView ? efOwner() : efAllowedBefore(view);
NAV.find(s => s.section === 'Работа')?.items.push({ id: efView, label: 'Мероприятия', icon: 'event', roles: ['owner'] });
const efRenderBefore = renderCurrentView;
renderCurrentView = function () { if (currentView === efView && efOwner()) { efDraw(); return; } return efRenderBefore(); };
const efClickBefore = handleClick;
handleClick = function (event) {
  const node = event.target.closest('[data-ef-action]');
  if (!node) return efClickBefore(event);
  event.preventDefault(); if (!efOwner() || efUi.busy) return;
  const a = node.dataset.efAction;
  if (a === 'new' || a === 'competition') return efNew(a === 'competition');
  if (a === 'refresh') return void efLoad();
  if (a === 'open') return void efOpen(node.dataset.id);
  if (a === 'resume') return efResume();
  if (a === 'back') { void efPersist(); efUi.current = null; efUi.error = ''; efDraw(true); return; }
  if (a === 'filter') { efUi.filter = node.dataset.value; efDraw(true); return; }
  if (a === 'draft-export') return s65Download('event-unsaved-draft.json', state.ui.eventFinanceDraft);
  if (a === 'draft-remove') { if (state.ui.eventFinancePending) { efWriteError('Сначала подтвердите результат ожидающего сохранения.'); return; } if (confirm('Удалить только несохранённый черновик на этом устройстве? Сохранённые мероприятия останутся.')) { delete state.ui.eventFinanceDraft; void persistLocal(); efUi.dirty = false; efDraw(true); } return; }
  if (a === 'export') { void efReq({ action: 'export' }).then(r => s65Download('extreme-kids-event-archive-' + today() + '.json', r)).catch(e => efWriteError(e.message)); return; }
  if (!efUi.current) return;
  if (a === 'card-export') return s65Download('event-' + efUi.current.content.date + '.json', { format: 'ek-event-card-v1', unsaved: efUi.dirty, entry: efUi.current, totals: efUi.current.archived ? efUi.current.snapshot.totals : efCalculate(efUi.current.content) });
  if (a === 'snapshot') return s65Download('event-close-snapshot.json', efUi.current.archives[+node.dataset.index]);
  if (a === 'tab') { efUi.tab = node.dataset.tab; void efPersist(); efDraw(true); return; }
  if (a === 'save' || a === 'retry') return void efSend('save');
  if (a === 'archive') { if (confirm('Зафиксировать текущие сохранённые цифры и закрыть мероприятие в архив?')) void efSend('archive'); return; }
  if (a === 'reopen') { const reason = prompt('Почему нужно изменить закрытое мероприятие? Старый снимок сохранится.'); if (reason?.trim()) void efSend('reopen', reason.trim()); return; }
  if (efUi.current.archived || state.ui.eventFinancePending) return;
  const s = node.dataset.section;
  if (a === 'add-row') { efUi.current.content[s].push(efRow(s, crypto.randomUUID())); }
  else if (a === 'remove-row') {
    if (!confirm('Убрать статью из текущего расчёта? Изменение вступит в силу после сохранения. Архивные снимки не меняются.')) return;
    const row = efUi.current.content[s][+node.dataset.index];
    if (s === 'risks' && efUi.current.content.expenses.some(r => r.riskId === row.id)) { efWriteError('Сначала снимите привязку риска в связанных расходах.'); return; }
    efUi.current.content[s].splice(+node.dataset.index, 1);
  } else return;
  efUi.dirty = true; efUi.current.content.factsChecked = false; void efPersist(); efDraw(true);
};
document.addEventListener('input', event => {
  const node = event.target;
  if (!efOwner()) return;
  if (node.id === 'efSearch') { efUi.search = node.value; const start = node.selectionStart; efDraw(true); const next = document.getElementById('efSearch'); next.focus(); try { next.setSelectionRange(start, start); } catch {} return; }
  if (!node.hasAttribute('data-ef-field') || !efUi.current || efUi.current.archived || efUi.busy || state.ui.eventFinancePending) return;
  const c = efUi.current.content, field = node.dataset.efField;
  const target = node.dataset.section ? c[node.dataset.section][+node.dataset.index] : c;
  let value = node.type === 'checkbox' ? node.checked : node.value;
  if (node.dataset.number) { const clean = value.trim().replace(/\s/g, '').replace(',', '.'); value = clean === '' ? null : /^\d+(\.\d{0,2})?$/.test(clean) ? Number(clean) : value; }
  target[field] = value; efUi.dirty = true;
  if (field !== 'factsChecked') { c.factsChecked = false; const checkbox = document.querySelector('[data-ef-field=factsChecked]'); if (checkbox) checkbox.checked = false; }
  void efPersist(); efLiveUpdate();
});
document.addEventListener('submit', event => { if (event.target.id === 'efForm') { event.preventDefault(); void efSend('save'); } });
const efPendingBefore = ax18HasPending;
ax18HasPending = function () { return efPendingBefore() || Boolean(efOwner() && (state?.ui?.eventFinancePending || state?.ui?.eventFinanceDraft?.dirty)); };
window.addEventListener('beforeunload', event => { if (efOwner() && efUi.dirty && !ax18Busy) { event.preventDefault(); event.returnValue = ''; } });
window.EK65EventFinance = { release: EF_VERSION };
