import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { EF_VERSION, efUuid, efValidate, efCalculate } from './core.mjs';
const fail = (status, code, message) => { throw Object.assign(Error(message), { status, code }); };
const copy = x => structuredClone(x);
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const full = e => ({ ...copy(e), totals: e.archived ? copy(e.snapshot.totals) : efCalculate(e.content) });
const brief = e => ({ id: e.id, version: e.version, archived: e.archived, title: e.content.title, date: e.content.date, type: e.content.type, status: e.content.status, hall: e.content.hall, responsible: e.content.responsible, factsChecked: e.content.factsChecked, updatedAt: e.updatedAt, totals: e.archived ? copy(e.snapshot.totals) : efCalculate(e.content) });
export function eventFinanceController({ store, authenticate, getSecurityKey }) {
  return async (sid, csrf, b) => {
    if (!b || typeof b !== 'object' || Array.isArray(b) || !['list', 'get', 'save', 'archive', 'reopen', 'export'].includes(b.action)) fail(422, 'EVENT_ACTION', 'Некорректное действие с мероприятием.');
    const read = ['list', 'get', 'export'].includes(b.action);
    const key = read ? null : await getSecurityKey();
    return (read ? store.read : store.tx)(d => {
      const { user, sess } = authenticate(d, sid);
      if (!same(sess.csrf, csrf)) fail(403, 'CSRF', 'Обновите страницу и повторите действие.');
      if (user.role !== 'owner') fail(403, 'FORBIDDEN', 'Финансы мероприятий пока доступны только Роману.');
      if (!d.workspaces?.[user.workspaceId]) fail(404, 'WORKSPACE', 'Рабочая база не найдена.');
      // Separate from workspace.data: generic club sync/import cannot overwrite or project this private ledger.
      const ledger = d.eventFinance?.[user.workspaceId] || { entries: {}, revision: 0 };
      if (b.action === 'list') return { ok: true, revision: ledger.revision, entries: Object.values(ledger.entries).map(brief).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)) };
      if (b.action === 'export') return { ok: true, format: 'ek-event-finance-v1', exportedAt: new Date().toISOString(), formulaVersion: EF_VERSION, revision: ledger.revision, entries: copy(ledger.entries), sha256: hash(ledger.entries) };
      if (!efUuid(b.id)) fail(422, 'EVENT_ID', 'Некорректный идентификатор мероприятия.');
      const prior = ledger.entries[b.id];
      if (b.action === 'get') { if (!prior) fail(404, 'EVENT_MISSING', 'Мероприятие не найдено.'); return { ok: true, entry: full(prior) }; }
      if (!efUuid(b.requestId) || !Number.isInteger(b.version) || b.version < 0) fail(422, 'EVENT_VERSION', 'Не указана корректная версия сохранения.');
      const rid = 'event-finance:' + user.id + ':' + b.requestId, digest = hash(b);
      const previousRequest = d.requests?.[rid];
      if (previousRequest) {
        if (previousRequest.hash !== digest) fail(409, 'EVENT_IDEMPOTENCY', 'Один номер сохранения содержит разные данные.');
        return { ok: true, replayed: true, savedVersion: previousRequest.version, entry: full(ledger.entries[b.id]) };
      }
      if ((prior?.version || 0) !== b.version) fail(409, 'EVENT_CONFLICT', 'Карточку уже изменили в другой вкладке. Ваш черновик не затёрт: скачайте его или откройте версию сервера.');
      if (!prior && b.action !== 'save') fail(404, 'EVENT_MISSING', 'Сначала сохраните карточку мероприятия.');
      if (prior?.archived && b.action !== 'reopen') fail(409, 'EVENT_ARCHIVED', 'Мероприятие в архиве. Сначала откройте его для исправления с указанием причины.');
      if (b.action === 'reopen' && !prior.archived) fail(409, 'EVENT_OPEN', 'Карточка уже открыта.');
      const at = new Date().toISOString();
      let entry = prior ? copy(prior) : { id: b.id, version: 0, archived: false, createdAt: at, createdBy: user.id, history: [], archives: [] };
      if (b.action === 'save') {
        if (!prior && Object.keys(ledger.entries).length >= 1000) fail(422, 'EVENT_LIMIT', 'В реестре уже 1000 мероприятий. Нужна настройка расширенного архива.');
        const c = efValidate(b.content);
        if (!prior && Object.values(ledger.entries).some(e => e.content.title.toLocaleLowerCase('ru') === c.title.toLocaleLowerCase('ru') && e.content.date === c.date)) fail(409, 'EVENT_DUPLICATE', 'Мероприятие с таким названием и датой уже сохранено. Откройте его в реестре.');
        if (prior && JSON.stringify(prior.content) !== JSON.stringify(c)) c.factsChecked = false;
        // A submitted check is meaningful only for the submitted revision; retaining it must be explicit in this same request.
        if (b.content.factsChecked === true) c.factsChecked = true;
        entry.content = c;
      } else if (b.action === 'archive') {
        const c = entry.content;
        if (!c.factsChecked || !['Проведено', 'Отменено'].includes(c.status)) fail(422, 'EVENT_NOT_REVIEWED', 'Для архива укажите «Проведено» или «Отменено» и подтвердите проверку фактических цифр.');
        if (c.hall === 'Не определено' || c.income.some(r => r.fact === null) || c.expenses.some(r => r.fact === null) || c.gifts.some(r => r.factQty === null || r.factPrice === null) || c.closure.some(r => r.factRevenue === null)) fail(422, 'EVENT_INCOMPLETE', 'Заполните факт добавленных статей. Если расходов или доходов не было, укажите 0. Определите формат зала.');
        if (['Половина зала', 'Весь зал'].includes(c.hall) && !c.closure.length) fail(422, 'EVENT_HALL', 'Добавьте оценку закрытия зала, даже если потери равны 0.');
        if (c.risks.some(r => r.status === 'Реализовался' && !c.expenses.some(e => e.riskId === r.id && e.fact !== null))) fail(422, 'EVENT_RISK', 'Привяжите фактический расход к каждому реализованному риску (0, если ущерба нет).');
        const snapshot = { at, by: user.id, formulaVersion: EF_VERSION, content: copy(c), totals: efCalculate(c), sha256: hash(c) };
        entry.archived = true; entry.snapshot = snapshot; entry.archives.push(copy(snapshot));
      } else {
        if (typeof b.reason !== 'string' || !b.reason.trim() || b.reason.length > 500) fail(422, 'EVENT_REASON', 'Укажите причину открытия архива.');
        entry.archived = false; entry.content.factsChecked = false;
      }
      entry.version++; entry.updatedAt = at; entry.updatedBy = user.id;
      entry.history.push({ at, by: user.id, name: user.displayName, action: b.action, version: entry.version, reason: b.action === 'reopen' ? b.reason.trim() : '', contentHash: hash(entry.content) });
      d.eventFinance ||= {}; d.eventFinance[user.workspaceId] ||= { entries: {}, revision: 0 };
      const target = d.eventFinance[user.workspaceId]; target.entries[b.id] = entry; target.revision++;
      d.audit ||= [];
      const audit = { at, actorId: user.id, workspaceId: user.workspaceId, action: 'event_finance.' + b.action, details: { id: b.id, version: entry.version }, previous: d.audit.at(-1)?.hash || '' };
      audit.hash = createHmac('sha256', key).update(JSON.stringify(audit)).digest('hex'); d.audit.push(audit);
      d.requests ||= {};
      for (const [k, r] of Object.entries(d.requests)) if (k.startsWith('event-finance:') && r.expiresAt <= Date.now()) delete d.requests[k];
      d.requests[rid] = { hash: digest, version: entry.version, expiresAt: Date.now() + 7 * 86400000 };
      return { ok: true, savedVersion: entry.version, entry: full(entry) };
    });
  };
}
