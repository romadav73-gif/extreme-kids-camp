import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID, randomBytes } from 'node:crypto';
import { installSmm, smmController } from '../src/smm-server.mjs';
import { smmDefaults, smmScore, smmPlan, smmDay } from '../src/smm-core.mjs';
const require = createRequire(import.meta.url);
const { Service, authenticate } = require('../base/lib/service.cjs');
const { MemoryStore } = require('../base/lib/store.cjs');
const M = require('../base/lib/model.cjs'), P = require('../base/lib/policy.cjs');
installSmm(P, M, require('../base/lib/integrity.cjs'));
const store = new MemoryStore(), key = randomBytes(32).toString('hex'), service = new Service(store, { securityKey: key });
const controller = smmController({ store, authenticate, M, P, getSecurityKey: async () => key });
const password = randomBytes(20).toString('base64url');
let owner, manager, smm, mentor, entry, submission;
const date = smmDay(), month = date.slice(0, 7);
const rejects = (p, status) => assert.rejects(p, e => e.status === status);
const request = (a, b) => controller(a.cookie, a.csrf, { month, requestId: randomUUID(), ...b });
const content = (extra = {}) => ({ date, kind: 'post', title: 'Тренировка: результат', caption: 'QA synthetic only', links: [{ platform: 'telegram', url: 'https://t.me/qa_club/123', views: 100 }], archiveUrl: '', storyFrames: 0, eventIds: [], rightsConfirmed: true, ...extra });
const patch = (actor, changes) => service.patch(actor.cookie, actor.csrf, { requestId: randomUUID(), changes });
test.before(async () => {
  const data = M.clone(require('../base/tests/fixture.cjs'));
  data.people.push({ id: 'karina', name: 'Карина', role: 'mentor', title: 'SMM', active: true });
  data.tasks.push({ id: 'smm-task', title: 'Снять интервью', ownerId: 'karina', status: 'todo', description: 'Исходник', monthKey: month, deadline: date });
  await service.bootstrap({ username: 'roman', password, data });
  owner = await service.login({ username: 'roman', password });
  for (const [username, personId, role] of [['karina', 'karina', 'smm'], ['sofa', 'sofia', 'manager'], ['tasya', 'tasya', 'mentor']]) {
    const i = await service.invite(owner.cookie, owner.csrf, { username, personId, role });
    const a = await service.activate({ token: i.token, password });
    if (role === 'smm') smm = a; else if (role === 'manager') manager = a; else mentor = a;
  }
  await store.tx(d => { const w = d.workspaces[owner.actor.workspaceId]; w.data.people.find(p => p.id === 'karina').role = 'smm'; w.data.smm = { version: 0, config: smmDefaults('2026-08-01'), entries: {}, exceptions: {}, rulesByMonth: {}, payroll: {} }; });
});
test('SMM actor is a distinct role with its own views', async () => { const r = await service.getSession(smm.cookie); assert.equal(r.actor.role, 'smm'); assert.deepEqual(r.views, ['smm', 'tasks', 'calendar', 'documents']); });
test('SMM projection has shared events and assigned tasks but no children or club finances', async () => {
  const r = await service.getState(smm.cookie), text = JSON.stringify(r.state);
  for (const secret of ['OWNER_FINANCE_SECRET', 'PARENT_CONTACT_SECRET', 'TASYA_SALARY_SECRET', 'IVAN_SALARY_SECRET', 'EVENT_INTERNAL_SECRET', 'OWNER_PRIVATE_TASK']) assert(!text.includes(secret), secret);
  assert.equal(r.state.events[0].id, 'event-test'); assert.equal(r.state.tasks.length, 1); assert(r.state.smm);
  assert.equal(r.state.groups.length, 0); assert.equal(r.state.attendanceChildren.length, 0);
});
test('SMM cannot write protected namespace through generic state patches', async () => {
  for (const actor of [smm, manager, owner]) await rejects(patch(actor, [{ op: 'set', path: ['smm', 'config', 'base'], previous: { exists: true, value: 25000 }, value: 50000 }]), 403);
});
test('Mentor cannot read SMM reports or call its endpoints', async () => { assert.equal((await service.getState(mentor.cookie)).state.smm, undefined); await rejects(request(mentor, { action: 'overview' }), 403); });
test('SMM may finish own general task without touching someone else', async () => {
  await patch(smm, [{ op: 'set', path: ['tasks', '@smm-task', 'status'], previous: { exists: true, value: 'todo' }, value: 'done' }]);
  await rejects(patch(smm, [{ op: 'set', path: ['tasks', '@task-owner', 'status'], previous: { exists: true, value: 'todo' }, value: 'done' }]), 403);
});
test('CSRF and anonymous access rejected', async () => { await rejects(controller('', '', { action: 'overview' }), 401); await rejects(controller(smm.cookie, 'wrong', { action: 'overview' }), 403); });
test('Author creates a durable draft', async () => { entry = randomUUID(); const r = await request(smm, { action: 'save', id: entry, version: 0, content: content(), submit: false }); assert.equal(r.smm.entries[entry].status, 'draft'); assert.equal((await service.getState(owner.cookie)).state.smm.entries[entry].version, 1); });
test('Owner and manager cannot impersonate the content author', async () => { for (const a of [owner, manager]) await rejects(request(a, { action: 'save', id: randomUUID(), version: 0, content: content(), submit: true }), 403); });
test('Submit is idempotent and arrives in manager cabinet', async () => {
  submission = { action: 'save', id: entry, version: 1, content: content(), submit: true, requestId: randomUUID() };
  const a = await request(smm, submission), b = await request(smm, submission);
  assert.equal(a.smm.entries[entry].status, 'pending'); assert(b.replayed); assert.equal(b.smm.entries[entry].version, 2);
  assert.equal((await service.getState(manager.cookie)).state.smm.entries[entry].status, 'pending');
});
test('No self-approval or self-assigned bonuses', async () => { await rejects(request(smm, { action: 'review', id: entry, version: 2, decision: 'approved', note: '' }), 403); await rejects(request(smm, { action: 'rules' }), 403); await rejects(request(manager, { action: 'close' }), 403); });
test('Manager approves with version check and author sees receipt', async () => {
  const r = await request(manager, { action: 'review', id: entry, version: 2, decision: 'approved', note: 'Проверено по ссылке' }); assert.equal(r.smm.entries[entry].status, 'approved');
  assert.equal((await service.getState(smm.cookie)).state.smm.entries[entry].review.name, 'Софа');
  await rejects(request(owner, { action: 'review', id: entry, version: 2, decision: 'changes', note: 'Старая версия' }), 409);
});
test('Approved edition cannot be silently modified or deleted', async () => { await rejects(request(smm, { action: 'save', id: entry, version: 3, content: content({ title: 'Подмена' }), submit: true }), 409); await rejects(request(smm, { action: 'delete', id: entry, version: 3 }), 409); });
test('Rework has a reason and can be resubmitted', async () => {
  await rejects(request(manager, { action: 'review', id: entry, version: 3, decision: 'changes', note: '' }), 422);
  await request(manager, { action: 'review', id: entry, version: 3, decision: 'changes', note: 'Поправить описание' });
  await request(smm, { action: 'save', id: entry, version: 4, content: content({ caption: 'Исправлено' }), submit: true });
  await request(owner, { action: 'review', id: entry, version: 5, decision: 'approved', note: '' });
});
test('Duplicate same post URL rejected even with tracking parameter', async () => { await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ links: [{ platform: 'telegram', url: 'https://t.me/qa_club/123?utm_source=again', views: null }] }), submit: true }), 409); });
test('Stories need archived proof and are different from shooting', async () => {
  const story = content({ kind: 'story', title: 'Сторис', links: [{ platform: 'instagram', url: '', views: null }], storyFrames: 3 });
  await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: story, submit: true }), 422);
  const r = await request(smm, { action: 'save', id: randomUUID(), version: 0, content: { ...story, archiveUrl: 'https://drive.google.com/file/d/qa-stories' }, submit: true }); assert(r.ok);
  await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ kind: 'shoot', links: [], archiveUrl: '' }), submit: true }), 422);
});
test('Future post cannot be marked published', async () => { await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ date: '2027-01-01' }), submit: true }), 422); });
test('Unsafe links, mismatched platform links and invalid metrics rejected', async () => {
  for (const url of ['javascript:alert(1)', 'https://user:pass@example.com/a', 'https://127.0.0.1/a', 'https://evil.example/post']) await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ links: [{ platform: 'telegram', url, views: 0 }] }), submit: true }), 422);
  await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ links: [{ platform: 'telegram', url: 'https://t.me/qa_club/999', views: -1 }] }), submit: true }), 422);
});
test('Consent confirmation required and unknown event references rejected', async () => {
  await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ rightsConfirmed: false }), submit: true }), 422);
  await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ eventIds: ['nonexistent'] }), submit: true }), 422);
});
test('Shared calendar drives announcement, event shoot and recap without creating duplicate task records', async () => {
  const data = (await service.getState(owner.cookie)).state, plan = smmPlan(data, '2026-09');
  assert(plan.some(s => s.date === '2026-09-09' && s.kind === 'post' && s.eventIds.includes('event-test')));
  assert(plan.some(s => s.date === '2026-09-12' && s.kind === 'shoot'));
  assert(plan.some(s => s.date === '2026-09-13' && s.kind === 'post'));
  assert.equal(new Set(plan.map(s => s.id)).size, plan.length);
  const before = data.tasks.length; await request(smm, { action: 'overview' }); assert.equal((await service.getState(owner.cookie)).state.tasks.length, before);
});
test('Calendar edits synchronize to SMM and immediately rebuild plan', async () => {
  await patch(owner, [{ op: 'set', path: ['events', '@event-test', 'date'], previous: { exists: true, value: '2026-09-12' }, value: '2026-09-15' }]);
  const data = (await service.getState(smm.cookie)).state; assert.equal(data.events[0].date, '2026-09-15'); assert(smmPlan(data, '2026-09').some(s => s.date === '2026-09-16' && s.eventIds.includes('event-test')));
});
test('Manager may agree an exception, author cannot, reason and CAS required', async () => {
  const data = (await service.getState(smm.cookie)).state, slot = smmPlan(data, month)[0];
  await rejects(request(smm, { action: 'exception', slotId: slot.id, note: 'Отмена', version: 0 }), 403);
  await request(manager, { action: 'exception', slotId: slot.id, note: 'Площадка временно недоступна', version: 0 });
  assert((await request(smm, { action: 'overview' })).score.slots.find(s => s.id === slot.id).exception);
});
test('Salary coefficients editable only by owner and total cap enforced', async () => {
  const cfg = smmDefaults('2026-08-01'), fields = ['base', 'storyBonus', 'postBonus', 'productionBonus', 'cap', 'postEvery', 'storyFrames', 'storyPlatforms', 'postPlatforms', 'videoPlatforms', 'videoDays', 'shootDays', 'workDays', 'accounts'];
  const rules = Object.fromEntries(fields.map(k => [k, cfg[k]]));
  await rejects(request(manager, { action: 'rules', rules, version: 0, note: 'Новые правила' }), 403);
  await rejects(request(owner, { action: 'rules', rules: { ...rules, cap: 90000 }, version: 0, note: 'Превышение' }), 422);
  await request(owner, { action: 'rules', rules, version: 0, note: 'Подтверждены стартовые нормативы' });
});
test('Full approved plan reaches but never exceeds 50,000; views do not affect pay', async () => {
  const data = (await service.getState(owner.cookie)).state; data.smm.exceptions = {};
  const groups = new Map();
  for (const s of smmPlan(data, '2026-09')) { const k = s.date + '/' + s.kind; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
  data.smm.entries = Object.fromEntries([...groups.values()].map((slots, i) => [String(i), { id: String(i), date: slots[0].date, kind: slots[0].kind, status: 'approved', links: slots.filter(s => s.platform).map(s => ({ platform: s.platform, url: 'https://example.com/' + i + s.platform, views: 0 })), eventIds: [...new Set(slots.flatMap(s => s.eventIds))], storyFrames: 3 }]));
  assert.equal(smmScore(data, '2026-09').estimate, 50000);
  for (const e of Object.values(data.smm.entries)) for (const l of e.links) l.views = 99999999;
  assert.equal(smmScore(data, '2026-09').estimate, 50000);
  for (const e of Object.values(data.smm.entries)) e.status = 'pending';
  assert.equal(smmScore(data, '2026-09').estimate, 25000);
});
test('Partial month and two-month window do not silently pay a full month', () => {
  const data = { smm: { config: smmDefaults('2026-09-11'), entries: {} }, events: [] };
  assert.equal(smmScore(data, '2026-09').activeDays, 20); assert.equal(smmScore(data, '2026-09').cap, 33333);
  assert.equal(smmScore(data, '2026-12').estimate, 0);
});
test('Close is owner-only, disallows unfinished period and preserves immutable snapshot', async () => {
  await rejects(request(owner, { action: 'close', month, amount: 0, note: 'Рано', expectedRevision: (await service.getState(owner.cookie)).revision }), 409);
  const rev = (await service.getState(owner.cookie)).revision;
  const r = await request(owner, { action: 'close', month: '2026-08', amount: 25000, note: 'Итог месяца по тестовым данным', expectedRevision: rev });
  assert.equal(r.smm.payroll['2026-08'].amount, 25000);
  await rejects(request(smm, { action: 'save', id: randomUUID(), version: 0, content: content({ date: '2026-08-15' }), submit: false }), 409);
  await request(owner, { action: 'reopen', month: '2026-08', note: 'Контрольный пересмотр' }); assert.equal((await request(owner, { action: 'overview' })).smm.payrollHistory.length, 1);
});
test('Journal records author/reviewer actions but not passwords', async () => { const log = await service.auditLog(owner.cookie); assert(log.some(e => e.action === 'smm.save')); assert(log.some(e => e.action === 'smm.review')); assert(!JSON.stringify(log).includes(password)); });
