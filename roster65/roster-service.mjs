import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

const ROLES = ['owner', 'manager', 'stas', 'mentor', 'admin'];
const fail = (status, code, message) => { throw Object.assign(Error(message), { status, code }); };
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const dateValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().startsWith(value);
export const rosterToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const normalizedName = value => String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ');
const live = item => item && !item.deletedAt && item.active !== false;
const enrolled = item => live(item) && !['inactive', 'archived'].includes(item.status);
const secretEqual = (a, b) => typeof a === 'string' && typeof b === 'string'
  && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function rosterGroup(data, actor, groupId, P) {
  if (!ROLES.includes(actor.role)) fail(403, 'FORBIDDEN', 'Состав группы недоступен для этой роли.');
  const group = (data.groups || []).find(g => g.id === groupId && live(g) && g.status !== 'archived');
  const visible = (P.projection(data, actor).groups || []).some(g => g.id === groupId);
  if (!group || !visible) fail(403, 'FORBIDDEN', 'Можно работать только с доступными вам группами.');
  return group;
}
export function rosterApply(data, actor, body, P, now = rosterToday()) {
  if (!body || !uuid(body.requestId) || !['add', 'rename', 'remove', 'complete'].includes(body.action)) {
    fail(422, 'ROSTER_INPUT', 'Некорректная операция с составом.');
  }
  const group = rosterGroup(data, actor, body.groupId, P);
  const out = structuredClone(data), at = new Date().toISOString();
  out.attendanceChildren ||= []; out.attendanceMemberships ||= [];
  const targetGroup = out.groups.find(g => g.id === group.id);
  let childId = body.childId || '', membershipId = body.membershipId || '';
  const currentMembers = () => out.attendanceMemberships.filter(m => m.groupId === group.id && enrolled(m)
    && out.attendanceChildren.some(c => c.id === m.childId && live(c)));
  if (body.action === 'add') {
    const name = normalizedName(body.name);
    if (!name || name.length > 180 || /[\u0000-\u001f<>]/.test(name)) fail(422, 'ROSTER_NAME', 'Укажите ФИО ученика (до 180 символов).');
    if (!dateValid(body.startDate) || body.startDate > now) fail(422, 'ROSTER_DATE', 'Укажите фактическую дату начала занятий, не в будущем.');
    if (currentMembers().some(m => normalizedName(out.attendanceChildren.find(c => c.id === m.childId)?.name).toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU')) && body.namesake !== true) {
      fail(409, 'ROSTER_DUPLICATE', 'Такое ФИО уже есть в составе. Для другого ребёнка с тем же ФИО отметьте «Это тёзка».');
    }
    if (body.existingChildId) {
      const visible = P.projection(data, actor).attendanceChildren || [];
      const child = out.attendanceChildren.find(c => c.id === body.existingChildId && live(c));
      if (!child || !visible.some(c => c.id === child.id)) fail(403, 'FORBIDDEN', 'Карточка ученика недоступна.');
      if (normalizedName(child.name) !== name) fail(409, 'ROSTER_CONFLICT', 'ФИО в карточке изменилось. Обновите состав.');
      childId = child.id;
      if (currentMembers().some(m => m.childId === childId)) fail(409, 'ROSTER_DUPLICATE', 'Этот ученик уже состоит в группе.');
      if (out.attendanceMemberships.some(m => live(m) && m.childId === childId && m.groupId === group.id
          && (!m.endDate || m.endDate >= body.startDate))) fail(409, 'ROSTER_DATES', 'Дата пересекается с прежним периодом в группе. Выберите более позднюю дату.');
    } else {
      childId = 'child:' + body.requestId;
      if (out.attendanceChildren.some(c => c.id === childId)) fail(409, 'ROSTER_EXISTS', 'Операция уже учтена. Обновите состав.');
      out.attendanceChildren.push({ id: childId, name, active: true, createdAt: at, updatedAt: at });
    }
    membershipId = 'membership:' + body.requestId;
    out.attendanceMemberships.push({ id: membershipId, childId, groupId: group.id, startDate: body.startDate,
      status: 'active', createdAt: at, updatedAt: at });
  } else if (body.action === 'complete') {
    if (typeof body.complete !== 'boolean') fail(422, 'ROSTER_INPUT', 'Некорректный статус состава.');
    if (Boolean(group.rosterManaged) !== body.expectedComplete) fail(409, 'ROSTER_CONFLICT', 'Статус состава уже изменили. Обновите группу.');
    targetGroup.rosterManaged = body.complete;
  } else {
    const member = out.attendanceMemberships.find(m => m.id === membershipId && m.groupId === group.id && live(m));
    const child = out.attendanceChildren.find(c => c.id === member?.childId && live(c));
    if (!member || !child || child.id !== childId) fail(404, 'ROSTER_MISSING', 'Ученик не найден в этой группе.');
    if (body.action === 'rename') {
      const name = normalizedName(body.name);
      if (!name || name.length > 180 || /[\u0000-\u001f<>]/.test(name)) fail(422, 'ROSTER_NAME', 'Укажите ФИО ученика (до 180 символов).');
      if (child.name !== body.previousName) fail(409, 'ROSTER_CONFLICT', 'ФИО уже исправили на другом устройстве. Обновите состав.');
      if (currentMembers().some(m => m.childId !== childId && normalizedName(out.attendanceChildren.find(c => c.id === m.childId)?.name).toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU')) && body.namesake !== true) fail(409, 'ROSTER_DUPLICATE', 'В составе уже есть это ФИО. Для другого ребёнка отметьте «Это тёзка».');
      child.name = name; child.updatedAt = at;
    } else {
      if (!enrolled(member)) fail(409, 'ROSTER_CONFLICT', 'Ученик уже убран из действующего состава.');
      if (JSON.stringify([member.startDate || '', member.endDate || '', member.status || '']) !== JSON.stringify(body.previousMembership)) fail(409, 'ROSTER_CONFLICT', 'Привязка ученика изменилась. Обновите состав.');
      if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500) fail(422, 'ROSTER_REASON', 'Укажите причину удаления из состава.');
      const recordedDates = (out.attendanceSessions || []).filter(s => !s.deletedAt && s.groupId === group.id
        && (s.records || []).some(r => r.childId === childId)).map(s => s.date);
      // Preserve the membership reference and every historical/planned record.
      member.status = 'inactive'; member.endDate = [now, member.startDate || now, ...recordedDates].sort().at(-1);
      member.notes = body.reason.trim(); member.updatedAt = at;
    }
  }
  const count = new Set(currentMembers().map(m => m.childId)).size;
  if (count > Number(group.capacity || 0)) fail(422, 'ROSTER_CAPACITY', `Вместимость группы — ${group.capacity || 0}. Попросите Романа или Софу проверить вместимость; состав не изменён.`);
  targetGroup.students = targetGroup.rosterManaged ? count : Math.max(Number(group.students) || 0, count);
  targetGroup.updatedAt = at;
  P.validateState(out, ['groups', 'attendanceChildren', 'attendanceMemberships'].map(root => ({ path: [root] })));
  return { data: out, childId, membershipId, count };
}

export function rosterController({ store, authenticate, M, P, getSecurityKey }) {
  return async (sid, csrf, body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) fail(422, 'ROSTER_INPUT', 'Некорректный запрос.');
    const key = await getSecurityKey();
    return store.tx(d => {
      const { user, sess } = authenticate(d, sid);
      if (!secretEqual(sess.csrf, csrf)) fail(403, 'CSRF', 'Обновите страницу и повторите действие.');
      if (!uuid(body.requestId)) fail(422, 'ROSTER_INPUT', 'Некорректный номер операции.');
      const w = d.workspaces[user.workspaceId]; if (!w) fail(404, 'WORKSPACE', 'Рабочая база не найдена.');
      rosterGroup(w.data, user, body.groupId, P);
      const rid = 'roster65:' + user.id + ':' + body.requestId;
      const digest = createHash('sha256').update(M.canonical(body)).digest('hex');
      d.requests ||= {};
      if (d.requests[rid]) {
        if (d.requests[rid].hash !== digest) fail(409, 'IDEMPOTENCY', 'Повторный запрос содержит другие данные.');
        return { ok: true, replayed: true, revision: w.revision, ...d.requests[rid].result };
      }
      const result = rosterApply(w.data, user, body, P), at = new Date().toISOString();
      w.revision++; result.data.meta = { ...(result.data.meta || {}), revision: w.revision, updatedAt: at }; w.data = result.data;
      const reply = { groupId: body.groupId, childId: result.childId, membershipId: result.membershipId, count: result.count };
      d.audit ||= [];
      const audit = { at, actorId: user.id, workspaceId: w.id, action: 'group_roster.' + body.action,
        details: { ...reply, reason: body.action === 'remove' ? body.reason.trim() : undefined }, previous: d.audit.at(-1)?.hash || '' };
      audit.hash = createHmac('sha256', key).update(JSON.stringify(audit)).digest('hex'); d.audit.push(audit);
      d.requests[rid] = { hash: digest, revision: w.revision, result: reply, expiresAt: Date.now() + 7 * 86400000 };
      return { ok: true, revision: w.revision, ...reply };
    });
  };
}
