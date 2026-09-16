// Incremental roster usability update. Existing scoped server writes stay unchanged.
const RG66_RELEASE = '2026.09.16-roster-board.2';
const rg66Norm = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');
const rg66Days = (from, to) => from ? Math.max(0, Math.floor((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000)) : null;
function rg66Observation(data, groupId, childId, now) {
  const all = rg65StudentStats(data, groupId, childId, now);
  const cutoff = new Date(now + 'T12:00:00Z'); cutoff.setUTCDate(cutoff.getUTCDate() - 27);
  const recent = rg65StudentStats(data, groupId, childId, now, cutoff.toISOString().slice(0, 10));
  const latest = all.rows.find(r => r.recorded && r.status !== 'unknown') || null;
  const latestNamed = all.rows.find(r => r.recorded) || null;
  const gap = rg66Days(all.lastVisit, now), latestAge = rg66Days(latest?.date, now);
  const paused = ['vacation', 'freeze'].includes(latest?.status);
  const frequent = recent.misses >= 3;
  const consecutive = all.streak >= 2;
  const long = !paused && gap !== null && gap >= 14 && latest && ['sick', 'warned', 'noShow'].includes(latest.status);
  const noData = !all.counted || !latest || latestAge >= 14;
  const steady = !paused && !noData && recent.counted >= 4 && recent.percent >= 80 && !consecutive;
  const attention = !paused && (frequent || consecutive || long);
  return { all, recent, latest, latestNamed, gap, latestAge, paused, frequent, consecutive, long, noData, steady, attention };
}
function rg66CollectDrafts(cache) {
  if (!cache?.state || !cache?.base) return [];
  const baseChildren = new Set((cache.base.attendanceChildren || []).map(c => c.id));
  const baseMembers = new Set((cache.base.attendanceMemberships || []).map(m => m.id));
  const children = new Map((cache.state.attendanceChildren || []).map(c => [c.id, c]));
  return (cache.state.attendanceMemberships || []).filter(m => !m.deletedAt && !baseMembers.has(m.id)
    && !['inactive', 'archived'].includes(m.status)).map(m => {
    const c = children.get(m.childId);
    if (!c || c.deletedAt || c.active === false || baseChildren.has(c.id) || !String(c.name || '').trim()) return null;
    return { key: m.id, oldChildId: c.id, groupId: m.groupId, name: c.name, startDate: m.startDate || '', detectedAt: new Date().toISOString() };
  }).filter(Boolean);
}
// Save ignored named additions before the legacy synchronizer discards unsupported roots.
// This runs only on the signed-in user's decryptable cache. Nothing is auto-imported.
const rg66ReadCacheBefore = s65ReadCache;
s65ReadCache = async function (raw) {
  const cache = await rg66ReadCacheBefore(raw); if (!cache) return cache;
  const previous = cache.ui?.roster66Drafts || [], found = rg66CollectDrafts(cache);
  const byKey = new Map(previous.map(x => [x.key, x]));
  for (const draft of found) if (!byKey.has(draft.key)) byKey.set(draft.key, draft);
  cache.ui = { ...(cache.ui || {}), roster66Drafts: [...byKey.values()] };
  return cache;
};
function rg66Drafts() {
  return (state?.ui?.roster66Drafts || []).filter(d => rg65Group(d.groupId));
}
function rg66Recovery() {
  const drafts = rg66Drafts();
  openModal({ title: 'Проверка ФИО на этом устройстве', subtitle: 'Проверяется только локальный черновик текущей учётной записи. Рабочая база не заменяется.', body: `<div class="rg65-roster rg66-recovery"><p>Найдено несохранённых именных привязок: <b>${drafts.length}</b>.</p>${drafts.length ? drafts.map(d => {
    const exists = rg65Members(d.groupId).some(x => rg66Norm(x.child.name) === rg66Norm(d.name));
    return `<article class="rg65-child"><h3>${esc(d.name)}</h3><p>${esc(rg65Group(d.groupId).name)} · ${esc(rg65Group(d.groupId).day)} ${esc(rg65Group(d.groupId).time)}</p>${exists ? '<p>В базе уже есть такое ФИО. Сначала проверьте карточку; повторную запись автоматически не создаём.</p>' : rg65Button('Проверить и сохранить', 'rg66RecoverOne', `data-key="${esc(d.key)}"`, true)}</article>`;
  }).join('') : '<p>Доступных ФИО в сохранившемся черновике не найдено. Это не подтверждает, что имена никогда не вводились: прежняя синхронизация могла уже заменить черновик. Не создавайте имена по общим числам посещений.</p>'}<p>Проверку нужно открыть в том же браузере и под тем же логином, где вводили учеников. Сохранение каждого найденного ученика требует подтверждения.</p>${drafts.length ? rg65Button('Сохранить копию найденных ФИО', 'rg66Export') : ''}</div>` });
}
function rg66Status(x) {
  const labels = [];
  if (x.paused) labels.push(ATTENDANCE_STATUS[x.latest.status]);
  if (x.long) labels.push('14+ дней с последнего посещения');
  if (x.frequent) labels.push(`${x.recent.misses} пропуска за 28 дней`);
  if (x.consecutive) labels.push(`${x.all.streak} пропуска подряд`);
  if (x.steady) labels.push('Регулярно по журналу');
  if (x.noData) labels.push(x.all.counted ? 'Нужны свежие отметки' : 'Нет именной истории');
  return labels.length ? labels.join(' · ') : 'Есть отметки — смотрите историю';
}
const RG66_FILTERS = [['all', 'Все ученики'], ['attention', 'Проверить пропуски'], ['long', 'Давно не был'], ['frequent', 'Часто пропускает'], ['steady', 'Ходит регулярно'], ['noData', 'Не хватает данных']];
let rg66Selected = '', rg66Filter = 'all';
rg65Roster = function (groupId, archived = false) {
  const group = rg65Group(groupId); if (!group) return;
  if (rg66Selected !== groupId) rg66Filter = 'all'; rg66Selected = groupId;
  rg65Modal = { type: 'roster', groupId, archived };
  const today = rg65Day(), members = rg65Members(groupId, archived), active = rg65Members(groupId);
  const all = members.map(item => ({ ...item, observation: rg66Observation(state, groupId, item.child.id, today) }));
  const shown = all.filter(x => archived || rg66Filter === 'all' || x.observation[rg66Filter]);
  shown.sort((a, b) => Number(b.observation.attention) - Number(a.observation.attention)
    || b.observation.recent.misses - a.observation.recent.misses || a.child.name.localeCompare(b.child.name, 'ru'));
  const aggregateSessions = (state.attendanceSessions || []).filter(s => !s.deletedAt && s.groupId === groupId && s.mode !== 'planned' && s.status !== 'cancelled' && s.date <= today && !(s.records || []).length).length;
  const needs = all.filter(x => x.observation.attention).length;
  openModal({ title: group.name, subtitle: `${person(group.mentorId).name} · ${group.day} ${group.time}`, body: `<div class="rg65-roster rg66-board" data-roster66="${RG66_RELEASE}">
    ${rg65PendingHtml()}<div class="rg65-summary"><div><span>ФИО в действующей группе</span><b>${active.length}</b></div><div><span>Проверить пропуски</span><b>${needs}</b></div><div><span>Вместимость</span><b>${group.capacity || 0}</b></div></div>
    <div class="rg65-actions">${rg65Button('В группе', 'rg65Roster', `data-group="${esc(groupId)}"`, !archived)}${rg65Button('Выбывшие', 'rg65Archived', `data-group="${esc(groupId)}"`, archived)}${rg65Button('Обновить', 'rg65Refresh', `data-group="${esc(groupId)}"`)}${rg65Button('+ Добавить ученика', 'rg65Add', `data-group="${esc(groupId)}"`, true)}</div>
    ${!archived ? `<div class="rg66-filter"><label>Показать <select class="select" data-rg66-filter>${RG66_FILTERS.map(([v, text]) => `<option value="${v}" ${rg66Filter === v ? 'selected' : ''}>${text}</option>`).join('')}</select></label><label>Поиск по ФИО<input class="input" data-rg66-search placeholder="Начните вводить фамилию"></label></div>` : ''}
    ${!active.length ? `<section class="rg65-warning"><b>В базе пока нет именного состава этой группы.</b><p>Число детей в карточке: ${Number(group.students) || 0}. Записей занятий без ФИО: ${aggregateSessions}. Эти цифры не являются карточками учеников.</p>${rg65Button('Проверить локальный черновик', 'rg66Recovery')}</section>` : ''}
    <div class="rg66-head"><span>Ученик / последнее посещение</span><span>За 28 дней</span><span>Наблюдение и действия</span></div>
    <div class="rg65-list rg66-pupils">${shown.map(({ child, membership, active: isActive, observation: x }) => `<article class="rg65-child rg66-pupil ${x.attention ? 'rg66-attention' : ''}" data-roster-child="${esc(child.id)}" data-rg66-name="${esc(rg66Norm(child.name))}"><div><h3>${esc(child.name)}</h3><p>${isActive ? 'В группе с ' + formatDateShort(membership.startDate) : 'Выбыл · история сохранена'}</p><small>Последнее посещение: <b>${x.all.lastVisit ? formatDate(x.all.lastVisit) : 'не отмечено'}</b>${x.gap !== null ? ` · ${x.gap} дн. назад` : ''}</small></div><div class="rg66-counts"><span>Пришёл <b>${x.recent.present}</b></span><span>Пропустил <b>${x.recent.misses}</b></span><span>Посещаемость <b>${rg65Percent(x.recent.percent)}</b></span><small>Всего: ${x.all.present} посещений, ${x.all.misses} пропусков</small></div><div><p class="rg66-status">${esc(rg66Status(x))}</p><div class="rg65-actions">${rg65Button('Статистика', 'rg65Student', `data-group="${esc(groupId)}" data-child="${esc(child.id)}"`)}${isActive ? rg65Button('Исправить ФИО', 'rg65Rename', `data-group="${esc(groupId)}" data-child="${esc(child.id)}" data-member="${esc(membership.id)}"`) + rg65Button('Убрать из группы', 'rg65Remove', `data-group="${esc(groupId)}" data-child="${esc(child.id)}" data-member="${esc(membership.id)}"`) : ''}</div></div></article>`).join('') || '<div class="empty">По этому фильтру учеников нет.</div>'}</div><p class="rg66-search-empty" hidden>По этому ФИО ничего не найдено.</p>
    <details class="rg66-explain"><summary>Как читать показатели</summary><p>Частые пропуски: 3 и более отмеченных пропуска за 28 дней. Давно не был: с последнего подтверждённого визита прошло 14 дней и более, после него отмечен пропуск; последняя отметка не отпуск и не заморозка. Это повод проверить ситуацию, а не диагноз или штраф.</p><p>«Регулярно»: минимум 4 учтённых занятия за 28 дней, посещаемость от 80%, без двух пропусков подряд и с отметками не старше 14 дней. Если журнал не заполняли, показываем нехватку данных, а не выдуманный пропуск. Болезнь, предупреждение и неявка входят в число пропусков; отпуск, заморозка и неизвестные отметки — отдельно.</p></details>
    <label class="rg65-complete"><input type="checkbox" data-rg65-complete="${esc(groupId)}" ${group.rosterManaged ? 'checked' : ''}> Именной список полный — считать по нему количество детей</label><div class="form-actions">${rg65Button('Закрыть', 'closeModal')}</div></div>` });
};
attendanceRosterModal = rg65Roster;
const rg66MiniBefore = groupsMiniTable;
groupsMiniTable = function (list) { return rg66MiniBefore(list).replace(/data-action="editGroup"/g, 'data-action="rg66Open" tabindex="0" role="button" title="Открыть учеников и посещаемость"'); };
function rg66Panel() {
  let groups = rg65Groups();
  if (currentView === 'mentor') groups = groups.filter(g => g.mentorId === mentorViewerId());
  const q = state.ui?.roster66GroupSearch || '';
  return `<div class="rg66-groups-title"><h3>${currentView === 'mentor' ? 'Мои группы и ученики' : 'Группы и ученики'}</h3><p>Нажмите на нужную группу — сразу откроются ФИО и пропуски.</p></div>${rg65PendingHtml()}${rg66Drafts().length ? `<section class="rg65-warning">На этом устройстве найдены несохранённые ФИО: ${rg66Drafts().length}. ${rg65Button('Проверить', 'rg66Recovery')}</section>` : ''}<input class="input rg66-group-search" data-rg66-group-search aria-label="Найти группу по дню или времени" placeholder="Найти группу: день, время, направление" value="${esc(q)}"><div class="rg66-group-grid">${groups.map(g => {
    const list = rg65Members(g.id), alertCount = list.filter(x => rg66Observation(state, g.id, x.child.id, rg65Day()).attention).length;
    const signature = rg66Norm(`${g.name} ${g.day} ${g.time} ${person(g.mentorId).name}`);
    return `<button class="rg66-group-card" type="button" data-action="rg66Open" data-id="${esc(g.id)}" data-rg66-group-name="${esc(signature)}" ${q && !signature.includes(rg66Norm(q)) ? 'hidden' : ''}><span>${esc(g.day)} · ${esc(g.time)}</span><b>${esc(g.name)}</b><small>${esc(person(g.mentorId).name)} · ${list.length} ФИО${alertCount ? ` · проверить пропуски: ${alertCount}` : !list.length ? ' · список не заполнен' : ''}</small><em>Открыть учеников →</em></button>`;
  }).join('') || '<p>Нет доступных групп. Проверьте назначенного наставника.</p>'}</div><p class="readable-note">${rg65Button('Проверить несохранённые ФИО на устройстве', 'rg66Recovery')}</p>`;
}
const rg66RenderBefore = renderCurrentView;
renderCurrentView = function () {
  rg66RenderBefore(); if (!state || !rg65Allowed()) return;
  const host = document.querySelector('[data-roster65-entry]');
  if (host) { host.dataset.roster66Entry = RG66_RELEASE; host.innerHTML = rg66Panel(); }
  const pages = document.getElementById('pages'); if (!pages) return;
  for (const edit of pages.querySelectorAll('button[data-action="editGroup"]')) {
    const group = rg65Group(edit.dataset.id), row = edit.closest('tr'); if (!group || !row || row.querySelector('[data-rg66-direct]')) continue;
    const name = row.querySelector('.table-title b');
    if (name) { const button = document.createElement('button'); button.type = 'button'; button.className = 'rg66-name-link'; button.dataset.action = 'rg66Open'; button.dataset.id = group.id; button.dataset.rg66Direct = 'true'; button.textContent = group.name; name.replaceWith(button); }
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-small btn-primary'; button.dataset.action = 'rg66Open'; button.dataset.id = group.id; button.dataset.rg66Direct = 'true'; button.textContent = 'Ученики'; edit.before(button);
  }
};
const rg66ClickBefore = handleClick;
handleClick = function (event) {
  const el = event.target.closest('[data-action]'), a = el?.dataset.action;
  if (!a?.startsWith('rg66')) return rg66ClickBefore(event);
  event.preventDefault(); if (!rg65Allowed()) return;
  if (a === 'rg66Open') rg65Roster(el.dataset.id || el.dataset.group);
  if (a === 'rg66Recovery') rg66Recovery();
  if (a === 'rg66Export') s65Download('ek65-unsaved-pupil-names.json', { format: 'ek65-local-roster-draft', candidates: rg66Drafts() });
  if (a === 'rg66RecoverOne') {
    const draft = rg66Drafts().find(d => d.key === el.dataset.key); if (!draft) return;
    rg65Form(draft.groupId);
    const form = document.getElementById('rg65Form'); if (!form) return;
    form.elements.studentName.value = draft.name;
    if (/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) && draft.startDate <= rg65Day()) form.elements.startDate.value = draft.startDate;
    document.getElementById('rg65FormError').textContent = 'Проверьте ФИО, группу и дату. Это только найденный черновик; для записи на сервер нажмите «Добавить ученика».';
  }
};
const rg66ChangeBefore = handleChange;
handleChange = function (event) {
  if (event.target.hasAttribute('data-rg66-filter')) { rg66Filter = event.target.value; rg65Roster(rg66Selected); return; }
  return rg66ChangeBefore(event);
};
const rg66InputBefore = handleInput;
handleInput = function (event) {
  const el = event.target;
  if (el.hasAttribute('data-rg66-search')) {
    const q = rg66Norm(el.value), rows = document.querySelectorAll('.rg66-pupil'); let visible = 0;
    for (const row of rows) { row.hidden = !row.dataset.rg66Name.includes(q); if (!row.hidden) visible++; }
    const empty = document.querySelector('.rg66-search-empty'); if (empty) empty.hidden = visible > 0; return;
  }
  if (el.hasAttribute('data-rg66-group-search')) {
    state.ui.roster66GroupSearch = el.value;
    for (const card of document.querySelectorAll('[data-rg66-group-name]')) card.hidden = !card.dataset.rg66GroupName.includes(rg66Norm(el.value));
    void persistLocal(); return;
  }
  return rg66InputBefore(event);
};
document.addEventListener('keydown', event => { const row = event.target.closest('tr[data-action="rg66Open"]'); if (row && event.target === row && ['Enter', ' '].includes(event.key)) { event.preventDefault(); rg65Roster(row.dataset.id); } });
const rg66Style = document.createElement('style'); rg66Style.id = 'ek65-roster-board';
rg66Style.textContent = `
  #modal:has(.rg66-board) .modal-card{width:min(1080px,calc(100vw - 32px));max-width:1080px;background:#15130d}
  .rg66-filter{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.rg66-filter label{display:grid;gap:6px;font-size:13px;color:var(--muted)}
  .rg66-head,.rg66-pupil{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(140px,.7fr) minmax(0,1.3fr);gap:18px}.rg66-head{font-size:12px;color:var(--muted);margin:22px 15px 0}
  .rg66-pupil{margin:0!important;align-items:start;background:#19160f}.rg66-pupil[hidden],.rg66-group-card[hidden]{display:none!important}.rg66-pupil h3{font-size:17px}.rg66-attention{border-color:#a17839!important}
  .rg66-counts{display:grid;gap:6px;font-size:13px}.rg66-counts span{display:flex;justify-content:space-between;gap:12px}.rg66-counts b{color:var(--yellow)}.rg66-status{font-size:13px;margin-top:0!important;color:#ead390}
  .rg66-explain{margin:16px 0;font-size:13px;color:var(--muted)}.rg66-explain summary{cursor:pointer;color:var(--text)}
  .rg66-group-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-height:460px;overflow:auto;padding:3px}.rg66-group-card{border:1px solid var(--line);border-radius:14px;padding:15px;text-align:left;background:#19160f;color:var(--text);cursor:pointer;display:grid;gap:7px}.rg66-group-card:hover{border-color:var(--yellow)}.rg66-group-card span{font-size:13px;color:var(--yellow)}.rg66-group-card b{font-size:16px;overflow-wrap:anywhere}.rg66-group-card small{color:var(--muted);line-height:1.45}.rg66-group-card em{font-size:12px;font-style:normal;color:#e7c958}.rg66-group-search{margin:0 0 14px;width:100%}.rg66-name-link{background:transparent;border:0;text-align:left;padding:0;color:var(--yellow);font-weight:800;cursor:pointer;font-size:inherit}
  @media(max-width:900px){.rg66-group-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rg66-head{display:none}.rg66-pupil{grid-template-columns:1fr 1fr}.rg66-pupil>div:last-child{grid-column:1/-1}}
  @media(max-width:560px){.rg66-filter,.rg66-pupil,.rg66-group-grid{grid-template-columns:1fr}.rg66-group-grid{max-height:430px}.rg66-pupil>div:last-child{grid-column:auto}.rg66-counts{background:#211c10;border-radius:10px;padding:12px}#modal:has(.rg66-board) .modal-card{width:calc(100vw - 20px)}}
`;
document.head.appendChild(rg66Style);
window.EK65RosterBoard = { release: RG66_RELEASE };
