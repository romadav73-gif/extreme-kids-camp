import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { smmDefaults, smmDay, smmValidDate, smmRules, smmPlan, smmScore, smmUrl, smmPlatformUrl, SMM_KINDS, SMM_PLATFORMS } from './smm-core.mjs';
const fail = (status, code, message) => { throw Object.assign(Error(message), { status, code }); };
const hash = s => createHash('sha256').update(s).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const management = a => ['owner', 'manager'].includes(a.role);
const live = p => p && p.active !== false && !p.archivedAt && !p.deletedAt;
const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const monthValid = x => typeof x === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(x);
const keysOnly = (x, list) => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).every(k => list.includes(k));

// This adds a distinct account role. Directory labels never grant permissions.
export function installSmm(P, M, I = null) {
  if (!P.ROLES.includes('smm')) P.ROLES.push('smm');
  P.VIEWS.smm = ['smm', 'tasks', 'calendar', 'documents'];
  for (const role of ['owner', 'manager']) if (!P.VIEWS[role].includes('smm')) P.VIEWS[role].push('smm');
  const projection = P.projection, permission = P.permission, validate = P.validateState;
  P.projection = (data, actor) => {
    if (actor.role === 'smm') {
      const out = M.emptyState(smmDay().slice(0, 7));
      out.settings = { clubName: data.settings?.clubName || 'EXTREME KIDS Тропарёво', currentMonth: smmDay().slice(0, 7) };
      out.people = (data.people || []).filter(live).map(({ id, name, role, title, avatar, active }) => ({ id, name, role, title: title || '', avatar: avatar || '', active: active !== false }));
      out.tasks = M.clone((data.tasks || []).filter(t => t.ownerId === actor.personId));
      out.events = (data.events || []).filter(e => !e.deletedAt).map(e => Object.fromEntries(['id', 'title', 'type', 'date', 'time', 'venue', 'status'].filter(k => Object.hasOwn(e, k)).map(k => [k, M.clone(e[k])])));
      out.staffDocuments = M.clone((data.staffDocuments || []).filter(e => e.personId === actor.personId));
      out.staffDuties = M.clone((data.staffDuties || []).filter(e => e.personId === actor.personId));
      if (data.smm?.config?.personId === actor.personId) out.smm = M.clone(data.smm);
      out.meta = M.clone(data.meta || {});
      return M.clean(out);
    }
    const out = projection(data, actor);
    if (management(actor) && data.smm) out.smm = M.clone(data.smm);
    else delete out.smm;
    return out;
  };
  P.permission = (data, actor, change) => {
    if (change.path?.[0] === 'smm') return false;
    if (actor.role !== 'smm') return permission(data, actor, change);
    const p = change.path, record = (data.tasks || []).find(t => t.id === p[1]?.slice(1));
    // No access to attendance, pupils, revenue, salaries, reports or other users.
    return p[0] === 'tasks' && p.length === 3 && record?.ownerId === actor.personId
      && !record.deletedAt && change.op === 'set' && ['status', 'description'].includes(p[2])
      && !(record.required && p[2] === 'description');
  };
  if (I) {
    const integrity = I.validate;
    I.validate = data => {
      const copy = M.clone(data);
      for (const p of copy.people || []) if (p.role === 'smm') p.role = 'team';
      return integrity(copy);
    };
  }
  P.validateState = (data, changes) => {
    // The old integrity checker recognises six directory roles. Treat a validated
    // SMM directory card as team only within that checker, never for auth.
    const copy = M.clone(data);
    for (const person of copy.people || []) if (person.role === 'smm') person.role = 'team';
    validate(copy, changes);
  };
}

export function smmController({ store, authenticate, M, P, getSecurityKey }) {
  function access(d, sid, csrf) {
    const { user, sess } = authenticate(d, sid);
    if (!same(sess.csrf, csrf)) fail(403, 'CSRF', 'Обновите страницу и повторите действие.');
    if (!['smm', 'owner', 'manager'].includes(user.role)) fail(403, 'FORBIDDEN', 'SMM-кабинет доступен Карине, Софе и Роману.');
    const w = d.workspaces[user.workspaceId];
    if (!w) fail(404, 'WORKSPACE', 'Рабочая база не найдена.');
    if (!w.data.smm) fail(409, 'SMM_SETUP', 'SMM-кабинет ещё не настроен.');
    if (user.role === 'smm' && w.data.smm.config.personId !== user.personId) fail(403, 'FORBIDDEN', 'Этот кабинет принадлежит другому сотруднику.');
    return { user, w };
  }
  function locked(smm, month) { if (smm.payroll?.[month]) fail(409, 'SMM_CLOSED', 'Месяц подтверждён Романом. Сначала нужно открыть расчёт заново.'); }
  function version(prior, requested) {
    if (!Number.isInteger(requested) || requested !== (prior?.version || 0)) fail(409, 'SMM_CONFLICT', 'Запись изменили на другом устройстве. Черновик сохранён; обновите запись перед отправкой.');
  }
  function entryInput(b, data, submitting) {
    if (!keysOnly(b, ['date', 'kind', 'title', 'caption', 'links', 'archiveUrl', 'storyFrames', 'eventIds', 'rightsConfirmed'])) fail(422, 'SMM_INPUT', 'Некорректные поля публикации.');
    if (!smmValidDate(b.date) || !Object.hasOwn(SMM_KINDS, b.kind) || b.date < data.smm.config.start) fail(422, 'SMM_INPUT', 'Проверьте дату и тип материала.');
    if (submitting && b.date > smmDay()) fail(422, 'SMM_FUTURE', 'Будущая публикация может быть только черновиком.');
    for (const k of ['title', 'caption']) if (typeof b[k] !== 'string' || b[k].length > (k === 'title' ? 180 : 3000)) fail(422, 'SMM_INPUT', 'Название: до 180 символов, комментарий: до 3000.');
    if (!b.title.trim()) fail(422, 'SMM_REQUIRED', 'Укажите название материала.');
    if (!Array.isArray(b.links) || b.links.length > 5 || new Set(b.links.map(l => l.platform)).size !== b.links.length) fail(422, 'SMM_LINKS', 'У каждой площадки должна быть одна строка со ссылкой.');
    if (!Array.isArray(b.eventIds) || b.eventIds.length > 10 || new Set(b.eventIds).size !== b.eventIds.length) fail(422, 'SMM_EVENT', 'Проверьте выбранные мероприятия.');
    for (const id of b.eventIds) if (!(data.events || []).some(e => e.id === id && !e.deletedAt)) fail(422, 'SMM_EVENT', 'Мероприятие не найдено в общем календаре.');
    let archiveUrl, links;
    try {
      archiveUrl = smmUrl(b.archiveUrl || '');
      links = b.links.map(l => {
        if (!keysOnly(l, ['platform', 'url', 'views']) || !Object.hasOwn(SMM_PLATFORMS, l.platform) || !(l.views === null || Number.isInteger(l.views) && number(l.views, 0, 1e10))) throw Error('Проверьте площадку и просмотры.');
        return { platform: l.platform, url: smmPlatformUrl(l.platform, l.url), views: l.views };
      });
    } catch (e) { fail(422, 'SMM_LINKS', e.message); }
    if (!Number.isInteger(b.storyFrames) || !number(b.storyFrames, 0, 1000)) fail(422, 'SMM_INPUT', 'Количество сторис должно быть целым числом от 0 до 1000.');
    if (submitting) {
      if (b.rightsConfirmed !== true) fail(422, 'SMM_CONSENT', 'Подтвердите, что публикация людей и использование материалов согласованы.');
      if (b.kind === 'shoot') {
        if (!archiveUrl) fail(422, 'SMM_PROOF', 'Для съёмки нужна ссылка на исходники. Съёмка не считается публикацией.');
        if (links.length) fail(422, 'SMM_INPUT', 'Съёмка учитывается отдельно; ссылки на публикации добавьте другим материалом.');
      } else {
        if (!links.length || links.some(l => !l.url && !(b.kind === 'story' && archiveUrl))) fail(422, 'SMM_PROOF', 'Добавьте ссылку на опубликованный материал для каждой выбранной площадки.');
        if (b.kind === 'story' && (!archiveUrl || b.storyFrames < 1)) fail(422, 'SMM_PROOF', 'Для исчезающих сторис нужны число кадров и ссылка на сохранённое подтверждение.');
      }
    }
    return { date: b.date, kind: b.kind, title: b.title.trim(), caption: b.caption.trim(), links, archiveUrl, storyFrames: b.storyFrames, eventIds: b.eventIds, rightsConfirmed: b.rightsConfirmed === true };
  }
  function duplicate(smm, candidate, id) {
    const urls = new Set(candidate.links.map(l => l.url).filter(Boolean));
    if (candidate.kind === 'shoot' && candidate.archiveUrl) urls.add(candidate.archiveUrl);
    for (const e of Object.values(smm.entries || {})) {
      if (e.id === id || e.deletedAt || e.status === 'draft') continue;
      const other = e.links.map(l => l.url).filter(Boolean);
      if (e.kind === 'shoot') other.push(e.archiveUrl);
      if (other.some(u => urls.has(u))) fail(409, 'SMM_DUPLICATE', 'Эта ссылка уже есть в отчёте. Откройте исходный материал вместо повторного начисления.');
    }
  }
  function rulesInput(raw) {
    const fields = ['base', 'regularBonus', 'productionBonus', 'cap', 'postEvery', 'storyFrames', 'storyPlatforms', 'postPlatforms', 'videoPlatforms', 'videoDays', 'shootDays', 'workDays', 'accounts'];
    if (!keysOnly(raw, fields) || fields.some(k => !Object.hasOwn(raw, k))) fail(422, 'SMM_RULES', 'Нужно передать полные настройки месяца.');
    for (const k of ['base', 'regularBonus', 'productionBonus', 'cap']) if (!Number.isInteger(raw[k]) || !number(raw[k], 0, 50000)) fail(422, 'SMM_CAP', 'Пилотная мотивация ограничена 50 000 ₽ за полный месяц.');
    if (raw.base + raw.regularBonus + raw.productionBonus > raw.cap) fail(422, 'SMM_CAP', 'Сумма частей не должна превышать месячный потолок.');
    if (!Number.isInteger(raw.postEvery) || !number(raw.postEvery, 1, 7) || !Number.isInteger(raw.storyFrames) || !number(raw.storyFrames, 1, 30)) fail(422, 'SMM_RULES', 'Проверьте периодичность постов и количество сторис.');
    for (const k of ['storyPlatforms', 'postPlatforms', 'videoPlatforms']) if (!Array.isArray(raw[k]) || raw[k].length > 5 || raw[k].some(p => !Object.hasOwn(SMM_PLATFORMS, p)) || new Set(raw[k]).size !== raw[k].length) fail(422, 'SMM_RULES', 'Некорректные площадки.');
    for (const k of ['videoDays', 'shootDays', 'workDays']) if (!Array.isArray(raw[k]) || raw[k].length > 7 || raw[k].some(n => !Number.isInteger(n) || !number(n, 0, 6)) || new Set(raw[k]).size !== raw[k].length) fail(422, 'SMM_RULES', 'Некорректные дни недели.');
    if (!keysOnly(raw.accounts, Object.keys(SMM_PLATFORMS))) fail(422, 'SMM_RULES', 'Некорректные ссылки каналов.');
    const accounts = {};
    try { for (const [p, url] of Object.entries(raw.accounts)) accounts[p] = smmPlatformUrl(p, url); }
    catch (e) { fail(422, 'SMM_LINKS', e.message); }
    return { ...raw, accounts };
  }
  return async (sid, csrf, body) => {
    const key = await getSecurityKey();
    return store.tx(d => {
      const { user, w } = access(d, sid, csrf);
      if (!body || !['overview', 'save', 'delete', 'review', 'exception', 'rules', 'close', 'reopen'].includes(body.action)) fail(422, 'SMM_ACTION', 'Неизвестное действие.');
      const month = body.month || body.content?.date?.slice(0, 7) || smmDay().slice(0, 7);
      if (!monthValid(month)) fail(422, 'SMM_MONTH', 'Проверьте выбранный месяц.');
      if (body.action === 'overview') return { ok: true, revision: w.revision, smm: M.clone(w.data.smm), score: smmScore(w.data, month) };
      if (!uuid(body.requestId)) fail(422, 'SMM_REQUEST', 'У операции нет корректного идентификатора.');
      const rid = 'smm:' + user.id + ':' + body.requestId, digest = hash(M.canonical(body));
      d.requests ||= {};
      if (d.requests[rid]) {
        if (d.requests[rid].hash !== digest) fail(409, 'IDEMPOTENCY', 'Один идентификатор нельзя использовать для разных изменений.');
        return { ok: true, replayed: true, revision: w.revision, smm: M.clone(w.data.smm), score: smmScore(w.data, month) };
      }
      const next = M.clone(w.data.smm), at = new Date().toISOString();
      next.entries ||= {}; next.exceptions ||= {}; next.payroll ||= {}; next.rulesByMonth ||= {};
      if (body.action === 'save' || body.action === 'delete') {
        if (user.role !== 'smm' || user.personId !== next.config.personId) fail(403, 'FORBIDDEN', 'Материал добавляет Карина из своего кабинета; руководители проверяют.');
        if (!uuid(body.id)) fail(422, 'SMM_ID', 'Некорректный идентификатор материала.');
        const previous = next.entries[body.id]; version(previous, body.version);
        if (previous?.personId && previous.personId !== user.personId) fail(403, 'FORBIDDEN', 'Чужая запись.');
        if (previous) locked(next, previous.date.slice(0, 7));
        if (body.action === 'delete') {
          if (!previous || previous.status === 'approved') fail(409, 'SMM_APPROVED', 'Принятый материал нельзя удалить. Попросите вернуть его на доработку.');
          next.entries[body.id] = { ...previous, version: previous.version + 1, deletedAt: at };
        } else {
          if (previous?.status === 'approved') fail(409, 'SMM_APPROVED', 'Принятая редакция защищена. Софа или Роман могут вернуть её на доработку.');
          const content = entryInput(body.content, w.data, body.submit === true); locked(next, content.date.slice(0, 7));
          if (body.submit) duplicate(next, content, body.id);
          next.entries[body.id] = { ...content, id: body.id, personId: user.personId, version: (previous?.version || 0) + 1,
            status: body.submit ? 'pending' : 'draft', authorId: user.id, savedAt: at, submittedAt: body.submit ? at : null,
            review: null, deletedAt: null, history: [...(previous?.history || []), ...(previous ? [{ at, status: previous.status, review: previous.review, version: previous.version }] : [])].slice(-30) };
        }
      } else if (body.action === 'review') {
        if (!management(user)) fail(403, 'FORBIDDEN', 'Свою публикацию нельзя принять самостоятельно.');
        const previous = next.entries[body.id];
        if (!previous || previous.deletedAt) fail(404, 'SMM_NOT_FOUND', 'Материал не найден.');
        version(previous, body.version); locked(next, previous.date.slice(0, 7));
        if (previous.authorId === user.id || !['pending', 'approved'].includes(previous.status)) fail(409, 'SMM_REVIEW', 'Принимать можно только отправленный материал другого сотрудника.');
        if (!['approved', 'changes'].includes(body.decision) || typeof body.note !== 'string' || body.note.length > 2000 || body.decision === 'changes' && !body.note.trim()) fail(422, 'SMM_REVIEW', 'При возврате на доработку укажите причину.');
        next.entries[body.id] = { ...previous, version: previous.version + 1, status: body.decision,
          review: { by: user.id, name: user.displayName, at, note: body.note.trim() } };
      } else if (body.action === 'exception') {
        if (!management(user)) fail(403, 'FORBIDDEN', 'План согласуют Роман или Софа.');
        locked(next, month);
        if (typeof body.note !== 'string' || !body.note.trim() || body.note.length > 1000 || !smmPlan(w.data, month).some(s => s.id === body.slotId)) fail(422, 'SMM_PLAN', 'Нужно указать пункт плана и причину изменения.');
        version(next.exceptions[body.slotId], body.version);
        if (body.restore) delete next.exceptions[body.slotId];
        else next.exceptions[body.slotId] = { note: body.note.trim(), by: user.id, at, version: (next.exceptions[body.slotId]?.version || 0) + 1 };
      } else if (body.action === 'rules') {
        if (user.role !== 'owner') fail(403, 'FORBIDDEN', 'Ставки и нормативы меняет только Роман.');
        locked(next, month); version(next.rulesByMonth[month], body.version);
        if (typeof body.note !== 'string' || !body.note.trim() || body.note.length > 1000) fail(422, 'SMM_RULES', 'Укажите причину изменения плана и мотивации.');
        next.rulesByMonth[month] = { ...rulesInput(body.rules), version: (next.rulesByMonth[month]?.version || 0) + 1, note: body.note.trim(), by: user.id, at };
      } else if (body.action === 'close') {
        if (user.role !== 'owner') fail(403, 'FORBIDDEN', 'Расчёт подтверждает только Роман.');
        locked(next, month); const score = smmScore(w.data, month);
        if (!score.canClose) fail(409, 'SMM_PERIOD', 'Расчёт можно подтвердить после окончания периода месяца.');
        if (body.expectedRevision !== w.revision) fail(409, 'SMM_CONFLICT', 'Данные изменились. Обновите расчёт перед подтверждением.');
        if (!number(body.amount, 0, score.cap) || Math.abs(Math.round(body.amount * 100) - body.amount * 100) > 0.000001 || typeof body.note !== 'string' || !body.note.trim() || body.note.length > 2000) fail(422, 'SMM_CAP', 'Проверьте сумму, лимит и комментарий к подтверждению.');
        next.payroll[month] = { amount: body.amount, note: body.note.trim(), by: user.id, at, score: { ...score, final: null }, stateRevision: w.revision };
      } else if (body.action === 'reopen') {
        if (user.role !== 'owner') fail(403, 'FORBIDDEN', 'Расчёт открывает только Роман.');
        if (!next.payroll[month] || typeof body.note !== 'string' || !body.note.trim() || body.note.length > 1000) fail(422, 'SMM_PERIOD', 'Укажите причину повторного открытия расчёта.');
        next.payrollHistory ||= []; next.payrollHistory.push({ ...next.payroll[month], month, reopenedAt: at, reopenedBy: user.id, reopenReason: body.note.trim() });
        delete next.payroll[month];
      }
      next.version = (w.data.smm.version || 0) + 1;
      M.validateJson(next);
      const data = { ...w.data, smm: next };
      P.validateState(data, []);
      w.revision++; data.meta = { ...(data.meta || {}), revision: w.revision, updatedAt: at }; w.data = data;
      const audit = { at, actorId: user.id, workspaceId: w.id, action: 'smm.' + body.action,
        detail: { id: body.id || null, month, revision: w.revision }, prev: d.audit.at(-1)?.hash || 'genesis' };
      audit.hash = createHmac('sha256', key).update(JSON.stringify(audit)).digest('hex'); d.audit.push(audit);
      d.requests[rid] = { hash: digest, revision: w.revision, expiresAt: Date.now() + 7 * 86400000 };
      return { ok: true, revision: w.revision, smm: M.clone(next), score: smmScore(data, month) };
    });
  };
}
