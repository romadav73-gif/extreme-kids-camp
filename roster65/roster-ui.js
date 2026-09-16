// Installed after existing extensions, before the application's event listeners.
// All writes use a narrowly scoped, authenticated server transaction.
const RG65_RELEASE = '2026.09.16-roster.1';
let rg65Busy = false, rg65Modal = null;
const rg65Allowed = () => ['owner', 'manager', 'stas', 'mentor', 'admin'].includes(s65Actor?.role);
const rg65Day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const rg65Groups = () => rg65Allowed() ? activeGroups().filter(g => canSeeAllGroups() || s65Actor.role === 'admin' || g.mentorId === s65Actor.personId) : [];
const rg65Group = id => rg65Groups().find(g => g.id === id);
const rg65Percent = value => value === null ? 'Нет данных' : Math.round(value) + '%';
function rg65Button(text, action, attributes = '', primary = false) {
  return `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}" data-action="${action}" ${attributes}>${text}</button>`;
}
function rg65Members(groupId, archived = false) {
  const names = new Map((state.attendanceChildren || []).map(c => [c.id, c])), grouped = new Map();
  for (const m of state.attendanceMemberships || []) {
    if (m.groupId !== groupId) continue;
    const child = names.get(m.childId); if (!child) continue;
    const active = !m.deletedAt && m.active !== false && !['inactive', 'archived'].includes(m.status) && child.active !== false && !child.deletedAt;
    const previous = grouped.get(child.id);
    if (!previous || active || (!previous.active && String(m.startDate || '') > String(previous.membership.startDate || ''))) grouped.set(child.id, { child, membership: m, active });
  }
  return [...grouped.values()].filter(x => archived ? !x.active : x.active).sort((a, b) => a.child.name.localeCompare(b.child.name, 'ru'));
}
function rg65PendingHtml() {
  return state.ui.roster65Pending ? `<section class="rg65-warning" role="alert"><b>Сохранение состава ещё не подтверждено.</b><p>Не вводите этого ученика повторно. Повторите тот же запрос — это не создаст дубль.</p>${rg65Button('Проверить сохранение', 'rg65Retry', '', true)}</section>` : '';
}
function rg65Roster(groupId, archived = false) {
  const group = rg65Group(groupId); if (!group) { toast('Группа недоступна', 'Откройте свою группу.', 'error'); return; }
  rg65Modal = { type: 'roster', groupId, archived };
  const list = rg65Members(groupId, archived), count = rg65Members(groupId).length;
  openModal({ title: `Состав · ${group.name}`, subtitle: `${person(group.mentorId).name} · ${group.day} ${group.time}`, body: `
    <div class="rg65-roster" data-roster65="${RG65_RELEASE}">
      ${rg65PendingHtml()}
      <div class="rg65-summary"><div><span>В действующем списке</span><b>${count}</b></div><div><span>Вместимость</span><b>${group.capacity || 0}</b></div><div><span>Состав</span><b>${group.rosterManaged ? 'Полный' : 'Заполняется'}</b></div></div>
      <div class="rg65-actions">${rg65Button('В группе', 'rg65Roster', `data-group="${esc(groupId)}"`, !archived)}${rg65Button('Выбывшие', 'rg65Archived', `data-group="${esc(groupId)}"`, archived)}${rg65Button('Обновить', 'rg65Refresh', `data-group="${esc(groupId)}"`)}</div>
      <div class="rg65-list">${list.map(({ child, membership, active }) => {
        const s = rg65StudentStats(state, groupId, child.id, rg65Day());
        return `<article class="rg65-child" data-roster-child="${esc(child.id)}"><div><h3>${esc(child.name)}</h3><p>${active ? 'В группе с ' + formatDateShort(membership.startDate) : 'Выбыл из состава · история сохранена'}</p><small>Пришёл: ${s.present} · пропустил: ${s.misses} · посещаемость: ${rg65Percent(s.percent)}</small>${s.streak >= 2 ? `<p class="rg65-warning-text">Последние отмеченные тренировки: ${s.streak} пропуска подряд</p>` : ''}</div><div class="rg65-actions">${rg65Button('Статистика', 'rg65Student', `data-group="${esc(groupId)}" data-child="${esc(child.id)}"`)}${active ? rg65Button('Исправить ФИО', 'rg65Rename', `data-group="${esc(groupId)}" data-child="${esc(child.id)}" data-member="${esc(membership.id)}"`) + rg65Button('Убрать из группы', 'rg65Remove', `data-group="${esc(groupId)}" data-child="${esc(child.id)}" data-member="${esc(membership.id)}"`) : ''}</div></article>`;
      }).join('') || '<div class="empty">В этом списке пока нет учеников.</div>'}</div>
      <label class="rg65-complete"><input type="checkbox" data-rg65-complete="${esc(groupId)}" ${group.rosterManaged ? 'checked' : ''} > Именной список полный — считать по нему количество детей</label>
      <p class="readable-note">Пока список неполный, прежнее количество в карточке группы (${group.students || 0}) не уменьшается. Удаление из состава не удаляет ученика и прошлые занятия.</p>
      <div class="form-actions">${rg65Button('Закрыть', 'closeModal')}${rg65Button('+ Добавить ученика', 'rg65Add', `data-group="${esc(groupId)}"`, true)}</div>
    </div>` });
}
function rg65Student(groupId, childId, range = 'all') {
  if (!rg65Group(groupId)) return;
  const child = (state.attendanceChildren || []).find(c => c.id === childId);
  if (!child || !(state.attendanceMemberships || []).some(m => m.groupId === groupId && m.childId === childId)) return;
  const now = rg65Day(), month = state.settings.currentMonth, from = range === 'month' ? month + '-01' : '';
  const monthEnd = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12);
  const end = `${month}-${String(monthEnd.getDate()).padStart(2, '0')}`;
  const s = rg65StudentStats(state, groupId, childId, now, from, range === 'month' && end < now ? end : now);
  const recent = rg65StudentStats(state, groupId, childId, now);
  rg65Modal = { type: 'student', groupId, childId, range };
  openModal({ title: child.name, subtitle: `Посещаемость · ${rg65Group(groupId).name}`, body: `
    <div class="rg65-student"><div class="rg65-actions">${rg65Button('Весь период', 'rg65Student', `data-group="${esc(groupId)}" data-child="${esc(childId)}"`, range === 'all')}${rg65Button(esc(monthLabel(month)), 'rg65Student', `data-group="${esc(groupId)}" data-child="${esc(childId)}" data-range="month"`, range === 'month')}</div>
    <div class="rg65-summary"><div><span>Посетил</span><b data-stat="present">${s.present}</b></div><div><span>Пропустил</span><b data-stat="misses">${s.misses}</b></div><div><span>Посещаемость</span><b data-stat="percent">${rg65Percent(s.percent)}</b></div></div>
    <p><b>${s.present} из ${s.counted}</b> тренировок с известным результатом. Болезнь: ${s.sick}; предупредили: ${s.warned}; неявка: ${s.noShow}.</p>
    <p>Отпуск и заморозка: ${s.pauses}. Не отмечено поимённо: ${s.unknown}. Эти записи не входят в процент.</p>
    <section class="rg65-recent"><h3>Регулярность за последние 28 дней</h3><b>${rg65Percent(recent.recentPercent)}</b><p>${recent.recentPresent} посещений из ${recent.recentCounted} отмеченных тренировок без отпусков и заморозок.${recent.recentCounted < 4 ? ' Пока мало данных для вывода об устойчивой регулярности.' : ''}</p><p>Последнее посещение: ${recent.lastVisit ? formatDate(recent.lastVisit) : 'пока не отмечено'}. ${recent.streak >= 2 ? `Последние ${recent.streak} отметки — пропуски; проверьте причину.` : ''}</p></section>
    <h3>История занятий</h3><div class="rg65-history">${s.rows.map(r => `<div class="rg65-history-row"><b>${formatDate(r.date)}</b><span>${esc(ATTENDANCE_STATUS[r.status] || 'Не отмечен')}${!r.recorded ? ' · нет именной отметки' : ''}</span></div>`).join('') || '<p>За выбранный период нет записей. Неотмеченные посещения не считаются пропусками.</p>'}</div>
    <p class="readable-note">Плановые, будущие и отменённые занятия не учитываются. Общие числа тренировки без ФИО не распределяются по ученикам. Это статистика ученика, а не штраф или оценка наставника.</p>
    <div class="form-actions">${rg65Button('Назад к группе', 'rg65Roster', `data-group="${esc(groupId)}"`)}</div></div>` });
}
function rg65Form(groupId, childId = '', membershipId = '') {
  if (rg65Busy || !rg65Group(groupId)) return;
  if (state.ui.roster65Pending) { rg65Roster(groupId); return; }
  const child = childId ? (state.attendanceChildren || []).find(c => c.id === childId) : null;
  const current = new Set(rg65Members(groupId).map(x => x.child.id));
  const existing = (state.attendanceChildren || []).filter(c => !c.deletedAt && c.active !== false && !current.has(c.id));
  rg65Modal = { type: 'form', groupId };
  openModal({ title: child ? 'Исправить ФИО' : 'Добавить ученика', subtitle: rg65Group(groupId).name, body: `
    <form id="rg65Form" class="form-grid" data-group="${esc(groupId)}" data-child="${esc(childId)}" data-member="${esc(membershipId)}">
      ${!child && existing.length ? `<div class="field full"><label>Карточка ученика</label><select class="select" name="existingChildId" data-rg65-existing><option value="">Новый ученик</option>${existing.map(c => `<option value="${esc(c.id)}">${esc(c.name)} · уже есть в доступной базе</option>`).join('')}</select><small>При выборе существующей карточки сохраняется тот же ученик; новая привязка к группе не объединяет чужие истории.</small></div>` : ''}
      <div class="field full"><label>ФИО ученика</label><input class="input" name="studentName" maxlength="180" value="${esc(child?.name || '')}" required autocomplete="off" placeholder="Фамилия Имя Отчество"></div>
      ${!child ? `<div class="field full"><label>В группе с</label><input class="input" type="date" name="startDate" value="${rg65Day()}" max="${rg65Day()}" required></div>` : `<input type="hidden" name="previousName" value="${esc(child.name)}"><p class="full">Исправление меняет ФИО в карточке. Идентификатор ученика и его история занятий сохраняются.</p>`}
      <label class="full"><input type="checkbox" name="namesake"> Это другой ребёнок с таким же ФИО (тёзка)</label>
      <p class="full rg65-warning-text" id="rg65FormError" role="alert"></p>${formActions(child ? 'Сохранить ФИО' : 'Добавить ученика')}
    </form>` });
}
async function rg65Refresh(groupId) {
  const ok = await syncNow({ quiet: true });
  if (ok) rg65Roster(groupId); else toast('Нет подтверждения обновления', 'Не очищайте данные браузера. Повторите синхронизацию.', 'error');
}
async function rg65Save(body, form = null) {
  if (rg65Busy) return;
  rg65Busy = true; let sent = false, confirmed = false;
  const button = form?.querySelector('button[type=submit]'); if (button) button.disabled = true;
  try {
    if (!(await syncNow({ quiet: true })) || s65Conflict || s65Flight || s65Changes().length) throw Object.assign(Error('Сначала синхронизируйте остальные изменения или разберите конфликт. Состав ещё не изменён.'), { status: 422 });
    state.ui.roster65Pending = body;
    if (!(await persistLocal())) throw Error('Не удалось сохранить номер операции на устройстве. Запрос не отправлен. Не закрывайте форму.');
    sent = true;
    const result = await s65Fetch('/api/group-roster', { method: 'POST', body: JSON.stringify(body) });
    confirmed = result.ok === true;
    if (!confirmed) throw Error('Сервер не подтвердил изменение состава.');
    delete state.ui.roster65Pending; await persistLocal();
    const refreshed = await syncNow({ quiet: true });
    if (refreshed) rg65Roster(body.groupId);
    else openModal({ title: 'Состав сохранён на сервере', body: `<p>Изменение подтверждено. В составе ${Number(result.count)} учеников. Не добавляйте запись повторно: осталось обновить экран.</p>${rg65Button('Обновить состав', 'rg65Refresh', `data-group="${esc(body.groupId)}"`, true)}` });
    toast('Состав сохранён', body.action === 'remove' ? 'Ученик убран из группы. История посещений сохранена.' : 'Изменение подтверждено сервером.');
  } catch (e) {
    if (!sent || (!confirmed && e.status >= 400 && e.status < 500)) { delete state.ui.roster65Pending; await persistLocal(); }
    const error = document.getElementById('rg65FormError'); if (error) error.textContent = e.message;
    toast(confirmed ? 'Сохранено, экран не обновлён' : 'Сохранение не подтверждено', e.message, 'error');
    if (!form && state.ui.roster65Pending) rg65Roster(body.groupId);
  } finally {
    rg65Busy = false; if (button) button.disabled = false;
    if (form?.isConnected && state.ui.roster65Pending) {
      for (const field of form.querySelectorAll('input, select')) field.disabled = true;
      if (button) button.textContent = 'Повторить тот же запрос';
    }
  }
}
const rg65SubmitBefore = handleSubmit;
handleSubmit = function (event) {
  const form = event.target;
  if (form.id !== 'rg65Form') return rg65SubmitBefore(event);
  event.preventDefault(); if (rg65Busy) return;
  if (state.ui.roster65Pending) { void rg65Save(state.ui.roster65Pending, form); return; }
  if (!form.reportValidity()) return;
  const name = form.elements.studentName.value.trim().replace(/\s+/g, ' ');
  if (!name) { document.getElementById('rg65FormError').textContent = 'Укажите ФИО ученика.'; return; }
  const body = { action: form.dataset.child ? 'rename' : 'add', groupId: form.dataset.group, childId: form.dataset.child,
    membershipId: form.dataset.member, name, namesake: form.elements.namesake.checked, requestId: crypto.randomUUID() };
  if (body.action === 'add') { body.startDate = form.elements.startDate.value; body.existingChildId = form.elements.existingChildId?.value || ''; }
  else body.previousName = form.elements.previousName.value;
  void rg65Save(body, form);
};
const rg65ClickBefore = handleClick;
handleClick = function (event) {
  const el = event.target.closest('[data-action]'), action = el?.dataset.action;
  if (['attendanceRoster', 'attendanceAddChild', 'attendanceRemoveMember'].includes(action) && rg65Allowed()) {
    event.preventDefault();
    if (action === 'attendanceRoster') return rg65Roster(el.dataset.id);
    if (action === 'attendanceAddChild') return rg65Form(el.dataset.group || rg65Groups()[0]?.id);
    const m = (state.attendanceMemberships || []).find(x => x.id === el.dataset.id);
    if (m) return rg65Remove(m.groupId, m.childId, m.id);
    return;
  }
  if (!action?.startsWith('rg65')) return rg65ClickBefore(event);
  event.preventDefault(); if (!rg65Allowed() || rg65Busy) return;
  const groupId = el.dataset.group || document.getElementById('rg65GroupPick')?.value;
  if (action === 'rg65Roster') rg65Roster(groupId);
  if (action === 'rg65Archived') rg65Roster(groupId, true);
  if (action === 'rg65Add') rg65Form(groupId);
  if (action === 'rg65Rename') rg65Form(groupId, el.dataset.child, el.dataset.member);
  if (action === 'rg65Student') rg65Student(groupId, el.dataset.child, el.dataset.range || 'all');
  if (action === 'rg65Refresh') void rg65Refresh(groupId);
  if (action === 'rg65Retry' && state.ui.roster65Pending) void rg65Save(state.ui.roster65Pending);
  if (action === 'rg65Remove') rg65Remove(groupId, el.dataset.child, el.dataset.member);
};
function rg65Remove(groupId, childId, membershipId) {
  if (!rg65Group(groupId) || rg65Busy || state.ui.roster65Pending) { if (state.ui.roster65Pending) rg65Roster(groupId); return; }
  const member = (state.attendanceMemberships || []).find(m => m.id === membershipId && m.groupId === groupId);
  const child = (state.attendanceChildren || []).find(c => c.id === childId); if (!member || !child) return;
  const reason = prompt(`Убрать «${child.name}» из действующего состава? Прошлые занятия и статистика сохранятся.\nПричина:`);
  if (!reason?.trim()) return;
  void rg65Save({ action: 'remove', groupId, childId, membershipId, reason: reason.trim(), previousMembership: [member.startDate || '', member.endDate || '', member.status || ''], requestId: crypto.randomUUID() });
}
const rg65ChangeBefore = handleChange;
handleChange = function (event) {
  const el = event.target;
  if (el.hasAttribute('data-rg65-existing')) {
    const child = (state.attendanceChildren || []).find(c => c.id === el.value), field = document.querySelector('#rg65Form [name=studentName]');
    if (field) { field.value = child?.name || ''; field.readOnly = Boolean(child); } return;
  }
  if (el.hasAttribute('data-rg65-complete')) {
    const group = rg65Group(el.dataset.rg65Complete); if (!group || rg65Busy || state.ui.roster65Pending) return;
    const requested = el.checked; el.checked = Boolean(group.rosterManaged);
    if (!confirm(requested ? 'Подтвердить полный именной состав? Количество детей станет равно числу ФИО в списке.' : 'Отметить список как неполный?')) return;
    void rg65Save({ action: 'complete', groupId: group.id, complete: requested, expectedComplete: Boolean(group.rosterManaged), requestId: crypto.randomUUID() }); return;
  }
  return rg65ChangeBefore(event);
};
// Keep past records when a pupil has left, and do not add later enrolments to an old lesson.
const rg65SessionBefore = attendanceSessionModal;
attendanceSessionModal = function (item = null, groupId = '', dateValue = '') {
  const group = rg65Group(item?.groupId || groupId) || rg65Groups()[0]; if (!group) return;
  const date = dateValue || item?.date || attendanceWeekDateForGroup(group);
  const originalMembers = attendanceMembers;
  const names = new Map((state.attendanceChildren || []).map(c => [c.id, c]));
  const selected = new Map();
  for (const m of state.attendanceMemberships || []) {
    if (m.deletedAt || m.groupId !== group.id || (m.startDate && m.startDate > date) || (m.endDate && m.endDate < date)) continue;
    if (!item && date >= rg65Day() && ['inactive', 'archived'].includes(m.status)) continue;
    const child = names.get(m.childId); if (child && !child.deletedAt) selected.set(child.id, { child, membership: m });
  }
  for (const rec of item?.records || []) {
    const child = names.get(rec.childId) || { id: rec.childId, name: rec.nameSnapshot || 'Ученик из истории' };
    if (!selected.has(child.id)) selected.set(child.id, { child, membership: {} });
  }
  // An old aggregate-only entry must not be silently converted into named zeroes.
  const aggregateOnly = item && !(item.records || []).length;
  attendanceMembers = id => id === group.id ? (aggregateOnly ? [] : [...selected.values()]) : originalMembers(id);
  try { return rg65SessionBefore(item, group.id, dateValue); }
  finally { attendanceMembers = originalMembers; }
};
attendanceRosterModal = rg65Roster;
attendanceChildModal = groupId => rg65Form(groupId || rg65Groups()[0]?.id);
const rg65RenderBefore = renderCurrentView;
renderCurrentView = function () {
  rg65RenderBefore(); if (!state || !rg65Allowed()) return;
  const pages = document.getElementById('pages');
  if (!pages || !['mentor', 'groups', 'attendance'].includes(currentView) || pages.querySelector('[data-roster65-entry]')) return;
  const groups = rg65Groups();
  const panel = document.createElement('section'); panel.className = 'card pad rg65-entry'; panel.dataset.roster65Entry = RG65_RELEASE;
  panel.innerHTML = `<div><h3>Состав групп и ученики</h3><p>ФИО, редактирование состава и личная посещаемость.</p></div>${rg65PendingHtml()}${groups.length ? `<div class="rg65-actions"><select class="select" id="rg65GroupPick" aria-label="Выбрать группу">${groups.map(g => `<option value="${esc(g.id)}">${esc(g.name)} · ${esc(g.day)} ${esc(g.time)} · ${rg65Members(g.id).length} ФИО</option>`).join('')}</select>${rg65Button('Открыть группу', 'rg65Roster', '', true)}${rg65Button('+ Ученик', 'rg65Add')}</div>` : '<p>Пока нет доступных групп.</p>'}`;
  pages.prepend(panel);
};
const rg65Style = document.createElement('style'); rg65Style.id = 'ek65-roster';
rg65Style.textContent = `
  .rg65-entry{margin-bottom:16px}.rg65-entry h3{margin:0}.rg65-entry p{margin:7px 0 12px;color:var(--muted)}
  .rg65-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.rg65-actions .select{flex:1;min-width:150px;max-width:100%}
  .rg65-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:12px 0}
  .rg65-summary>div,.rg65-recent{background:rgba(240,199,47,.06);border:1px solid var(--line);padding:14px;border-radius:14px}
  .rg65-summary span{display:block;font-size:12px;color:var(--muted)}.rg65-summary b{display:block;font-size:25px;margin-top:5px;color:var(--yellow)}
  .rg65-list{display:grid;gap:12px;margin:16px 0}.rg65-child{border:1px solid var(--line);border-radius:16px;padding:15px}
  .rg65-child h3{font-size:17px;margin:0;overflow-wrap:anywhere}.rg65-child p{margin:7px 0}.rg65-child small{color:var(--muted);font-size:13px}.rg65-child .rg65-actions{margin-top:12px}
  .rg65-child .btn{font-size:12px;padding:8px 11px;min-height:38px}.rg65-complete{display:flex;gap:10px;align-items:flex-start;margin:14px 0;font-size:14px}.rg65-complete input{width:18px;height:18px;accent-color:var(--yellow)}
  .rg65-warning{padding:14px;border:1px solid #b18b32;border-radius:12px;background:rgba(240,199,47,.1);margin:12px 0}.rg65-warning-text{color:#edb37e}
  .rg65-recent{margin:15px 0}.rg65-recent h3{font-size:16px;margin:0 0 9px}.rg65-recent>b{font-size:26px;color:var(--yellow)}
  .rg65-history{max-height:360px;overflow:auto}.rg65-history-row{display:flex;gap:15px;justify-content:space-between;border-bottom:1px solid var(--line);padding:11px 0;font-size:14px}.rg65-history-row span{text-align:right;color:var(--muted)}
  #rg65Form .full{grid-column:1/-1}#rg65Form label{font-size:14px}#rg65Form [type=checkbox]{width:18px;height:18px;accent-color:var(--yellow)}
  @media(max-width:560px){.rg65-summary{grid-template-columns:1fr}.rg65-summary b{font-size:23px}.rg65-entry .rg65-actions{display:grid;grid-template-columns:1fr}.rg65-entry .select{min-width:0;width:100%}.rg65-child .rg65-actions .btn{flex:1}.rg65-history-row{align-items:flex-start}}
`;
document.head.appendChild(rg65Style);
window.EK65Roster = { release: RG65_RELEASE };
