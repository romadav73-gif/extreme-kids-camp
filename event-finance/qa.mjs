import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import Core from './qa-files/core.mjs';
import { EF_VERSION, efBlank, efRow, efValidate, efCalculate } from './core.mjs';
import { eventFinanceController } from './server.mjs';
const require = createRequire(import.meta.url);
const fixture = require('./qa-files/fixture.cjs');
const { Service, authenticate, Model: M } = Core;
const checks = [];
const check = (name, fn) => { fn(); checks.push(name); console.log('PASS', name); };
const initial = () => ({ ...efBlank(), title: 'Тестовое мероприятие', date: '2026-10-07', hall: 'Весь зал' });
const row = (section, data) => ({ ...efRow(section, randomUUID()), ...data });
const model = initial();
model.income = [row('income', { label: 'Взносы', plan: 100000, fact: 120000 }), row('income', { label: 'Возвраты', kind: 'refund', plan: 0, fact: 5000 })];
model.risks = [row('risks', { label: 'Повреждение', probability: 25, impact: 12000 })];
model.expenses = [row('expenses', { label: 'Команда', category: 'Персонал', plan: 30000, fact: 35000 }), row('expenses', { label: 'Ремонт', category: 'Реализованный риск', riskId: model.risks[0].id, plan: 0, fact: 5000 })];
model.gifts = [row('gifts', { label: 'Медали', planQty: 10, planPrice: 500, factQty: 20, factPrice: 400 })];
model.closure = [row('closure', { label: 'Вечерние группы', planRevenue: 20000, planRetained: 10000, planSavedCosts: 2000, factRevenue: 24000, factRetained: 12000, factSavedCosts: 2000 })];
const t = efCalculate(efValidate(model));
check('net event revenue subtracts refunds', () => assert.equal(t.fact.revenue, 115000));
check('separate plan and actual procurement quantities', () => { assert.equal(t.plan.gifts, 5000); assert.equal(t.fact.gifts, 8000); });
check('direct costs and profit exact', () => { assert.equal(t.fact.costs, 48000); assert.equal(t.fact.profit, 67000); });
check('hall loss is opportunity contribution not direct cost', () => { assert.equal(t.fact.hallLoss, 10000); assert.equal(t.fact.economicResult, 57000); });
check('prospective risk only reduces risk-adjusted plan', () => { assert.equal(t.risks.reserve, 3000); assert.equal(t.plan.afterRisk, 54000); });
check('realized risk expense never double deducted', () => { assert.equal(t.risks.actualBooked, 5000); assert.equal(t.fact.profit, 67000); });
check('margin and ROI denominators', () => { assert.equal(t.fact.margin, 67000 / 115000 * 100); assert.equal(t.fact.roi, 67000 / 48000 * 100); });
check('unknown is not a fabricated profitable event', () => { const x = efCalculate(initial()); assert.equal(x.fact.known, false); assert.equal(x.fact.margin, null); assert.equal(x.fact.roi, null); });
check('confirmed zero valid and division-safe', () => { const x = efCalculate({ ...initial(), factsChecked: true }); assert(x.fact.known); assert.equal(x.fact.profit, 0); assert.equal(x.fact.roi, null); });
check('full free-slot reschedule produces no opportunity loss', () => { const c = structuredClone(model); c.closure[0].factRetained = 24000; assert.equal(efCalculate(c).fact.hallLoss, 0); });
check('Friday evening warning without invented surcharge', () => { const c = { ...initial(), date: '2026-10-09', start: '17:00', end: '20:00' }; assert(efCalculate(c).warnings.some(x => x.includes('Пятница'))); });
for (const [name, mutate] of [
  ['invalid date rejected', c => c.date = '2026-02-30'],
  ['negative expense rejected', c => c.expenses[0].fact = -1],
  ['probability over 100 rejected', c => c.risks[0].probability = 101],
  ['incomplete gift pair rejected', c => c.gifts[0].factQty = null],
  ['foreign risk link rejected', c => c.expenses[0].riskId = randomUUID()],
  ['duplicate row ids rejected', c => c.expenses[0].id = c.income[0].id],
  ['end before start rejected', c => { c.start = '18:00'; c.end = '17:00'; }],
  ['unknown writable fields rejected', c => c.actor = 'owner']
]) check(name, () => { const c = structuredClone(model); mutate(c); assert.throws(() => efValidate(c), e => e.status === 422); });
class MemoryStore {
  data = { format: 1, users: {}, sessions: {}, invites: {}, workspaces: {}, requests: {}, tombstones: {}, rates: {}, audit: [] };
  queue = Promise.resolve();
  tx(fn) { const p = this.queue.then(async () => { const next = M.clone(this.data), r = await fn(next); this.data = next; return r; }); this.queue = p.catch(() => {}); return p; }
  async read(fn) { const data = M.clone(this.data), before = JSON.stringify(data), r = await fn(data); assert.equal(JSON.stringify(data), before); return r; }
}
const store = new MemoryStore(), key = randomBytes(32).toString('hex'), password = randomBytes(24).toString('base64url');
const svc = new Service(store, { securityKey: key });
await svc.bootstrap({ username: 'roman', password, data: M.clone(fixture) });
const accounts = { roman: await svc.login({ username: 'roman', password }) };
for (const [username, personId, role] of [['tasya', 'tasya', 'mentor'], ['sofa', 'sofia', 'manager'], ['stas', 'stas', 'stas'], ['anya', 'anya', 'admin']]) {
  const invite = await svc.invite(accounts.roman.cookie, accounts.roman.csrf, { username, personId, role });
  await svc.activate({ token: invite.token, password }); accounts[username] = await svc.login({ username, password });
}
const controller = eventFinanceController({ store, authenticate, getSecurityKey: async () => key });
const call = (b, user = 'roman', csrf = accounts[user].csrf) => controller(accounts[user].cookie, csrf, b);
const beforeWorkspace = JSON.stringify(store.data.workspaces);
const id = randomUUID(), create = { action: 'save', id, version: 0, requestId: randomUUID(), content: model };
let e = (await call(create)).entry;
check('save computes totals server-side', () => assert.equal(e.totals.fact.profit, 67000));
let duplicate = await call(create);
check('identical replay creates one event', () => { assert(duplicate.replayed); assert.equal(Object.keys(Object.values(store.data.eventFinance)[0].entries).length, 1); });
await assert.rejects(call({ ...create, content: { ...model, title: 'Changed replay' } }), x => x.code === 'EVENT_IDEMPOTENCY'); checks.push('changed replay rejected');
await assert.rejects(call({ ...create, requestId: randomUUID() }), x => x.code === 'EVENT_CONFLICT'); checks.push('stale version rejected');
for (const u of ['tasya', 'sofa', 'stas', 'anya']) { await assert.rejects(call({ action: 'list' }, u), x => x.status === 403); checks.push(u + ' cannot read event finances'); }
await assert.rejects(controller('', '', { action: 'list' }), x => x.status === 401); checks.push('anonymous denied');
await assert.rejects(call({ action: 'list' }, 'roman', 'wrong'), x => x.code === 'CSRF'); checks.push('csrf checked on reads');
await assert.rejects(call({ action: 'archive', id, version: e.version, requestId: randomUUID() }), x => x.code === 'EVENT_NOT_REVIEWED'); checks.push('incomplete close blocked');
model.factsChecked = true; model.status = 'Проведено';
e = (await call({ action: 'save', id, version: e.version, requestId: randomUUID(), content: model })).entry;
e = (await call({ action: 'archive', id, version: e.version, requestId: randomUUID() })).entry;
const snapshot = structuredClone(e.snapshot);
check('archive stores locked content and totals', () => { assert(e.archived); assert.equal(e.archives.length, 1); assert.equal(e.snapshot.formulaVersion, EF_VERSION); });
await assert.rejects(call({ action: 'save', id, version: e.version, requestId: randomUUID(), content: model }), x => x.code === 'EVENT_ARCHIVED'); checks.push('archived write blocked');
await assert.rejects(call({ action: 'reopen', id, version: e.version, requestId: randomUUID(), reason: '' }), x => x.code === 'EVENT_REASON'); checks.push('reopen reason required');
e = (await call({ action: 'reopen', id, version: e.version, requestId: randomUUID(), reason: 'Исправление чека' })).entry;
check('reopening retains old immutable snapshot', () => { assert.equal(e.archived, false); assert.deepEqual(e.archives[0], snapshot); assert.equal(e.content.factsChecked, false); });
const updated = structuredClone(e.content); updated.expenses[0].fact = 36000;
e = (await call({ action: 'save', id, version: e.version, requestId: randomUUID(), content: updated })).entry;
check('new edit does not rewrite previous close', () => { assert.equal(e.totals.fact.profit, 66000); assert.equal(e.archives[0].totals.fact.profit, 67000); });
const exported = await call({ action: 'export' });
check('dedicated export contains all cards and close history but no sessions', () => { assert.equal(exported.entries[id].archives.length, 1); assert(!('sessions' in exported)); assert(exported.sha256); });
check('ordinary club data untouched', () => assert.equal(JSON.stringify(store.data.workspaces), beforeWorkspace));
check('private ledger absent from generic mentor projection', () => { const w = Object.values(store.data.workspaces)[0]; assert(!JSON.stringify(Core.Policy.projection(w.data, { role: 'mentor', personId: 'tasya', scopes: [] })).includes('eventFinance')); });
await Promise.all(['Concurrent A', 'Concurrent B'].map(title => call({ action: 'save', id: randomUUID(), version: 0, requestId: randomUUID(), content: { ...initial(), title } })));
check('independent concurrent creates retained', () => assert.equal(Object.keys(Object.values(store.data.eventFinance)[0].entries).length, 3));
fs.mkdirSync('evidence', { recursive: true });
fs.writeFileSync('evidence/event-unit.json', JSON.stringify({ passed: checks.length, checks, scope: 'Isolated synthetic in-memory accounts. No customer writes.' }, null, 2));
console.log('EVENT_UNIT_PASS', checks.length);
if (process.env.EF_SERVE === '1') {
  await store.tx(d => { d.eventFinance = {}; });
  fs.writeFileSync('event-finance/qa-files/auth.json', JSON.stringify({ password, accounts }));
  http.createServer(async (req, res) => {
    if (req.url === '/ready') { res.end('ready'); return; }
    if (req.url !== '/qa/api' || req.method !== 'POST') { res.statusCode = 404; res.end(); return; }
    res.setHeader('Content-Type', 'application/json');
    try {
      let raw = ''; for await (const part of req) raw += part;
      const q = JSON.parse(raw), b = q.body || {}; let r;
      if (q.action === 'login') { r = await svc.login(b); r.session = r.cookie; delete r.cookie; }
      else if (q.action === 'session') r = await svc.getSession(q.session);
      else if (q.action === 'state') r = await svc.getState(q.session);
      else if (q.action === 'patch') r = await svc.patch(q.session, q.csrf, b);
      else if (q.action === 'event-finance') r = await controller(q.session, q.csrf, b);
      else if (q.action === 'health') r = { ok: true };
      else if (q.action === 'migration-status') r = { status: 'imported' };
      else if (q.action === 'device-forget') r = { ok: true };
      else if (q.action === 'logout') r = await svc.logout(q.session, q.csrf);
      else throw Object.assign(Error('Unsupported isolated test action: ' + q.action), { status: 400 });
      res.end(JSON.stringify(r));
    } catch (e) { res.statusCode = e.status || 500; res.end(JSON.stringify({ error: e.code, message: e.message })); }
  }).listen(8898, '127.0.0.1', () => console.log('EVENT_ISOLATED_SERVER_READY'));
}
