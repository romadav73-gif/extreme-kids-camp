import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import Core from '../qa/core.mjs';
import { rosterApply, rosterController } from './roster-service.mjs';
const require = createRequire(import.meta.url);
const { rg65StudentStats } = require('./roster-math.js');
const { Service, Model: M, Policy: P, Integrity: I, authenticate } = Core;
const fixture = require('../qa/tests/fixture.cjs');
const mentor = { id: 'test-tasya', workspaceId: 'test', role: 'mentor', personId: 'tasya', scopes: [], displayName: 'Тася' };
const clean = () => { const s = M.clone(fixture); s.groups.push({ ...s.groups[0], id: 'qa-roster', name: 'QA состав', students: 0, rosterManaged: true, capacity: 12 }); return s; };
const add = name => ({ action: 'add', requestId: randomUUID(), groupId: 'qa-roster', name, startDate: '2026-09-01' });
let tests = 0;
function check(name, fn) { fn(); tests++; console.log('PASS', name); }
let s = clean(), results = [];
for (const name of ['Иванов Иван Иванович', 'Петров Пётр Петрович', 'Сидорова Анна Ивановна']) {
  const before = JSON.stringify(s); const r = rosterApply(s, mentor, add(name), P, '2026-09-16');
  check('immutable atomic add ' + (results.length + 1), () => assert.equal(JSON.stringify(s), before)); s = r.data; results.push(r);
}
check('three distinct children retained', () => assert.equal(s.attendanceMemberships.filter(m => m.groupId === 'qa-roster').length, 3));
check('official group count three', () => assert.equal(s.groups.find(g => g.id === 'qa-roster').students, 3));
check('mentor projection sees all three without foreign pupils', () => { const p = P.projection(s, mentor); assert(results.every(r => p.attendanceChildren.some(c => c.id === r.childId))); assert(!JSON.stringify(p).includes('IVAN_CHILD_SECRET')); });
check('old generic policy does not secretly broaden rights', () => assert.equal(P.permission(s, mentor, { path: ['attendanceChildren', '@x'], op: 'set', value: { id: 'x', name: 'x' } }), false));
check('another mentor cannot modify this group', () => assert.throws(() => rosterApply(s, { ...mentor, personId: 'ivan' }, add('Новый'), P), e => e.status === 403));
check('team cannot modify rosters', () => assert.throws(() => rosterApply(s, { ...mentor, role: 'team' }, add('Новый'), P), e => e.status === 403));
check('duplicate FIO blocked', () => assert.throws(() => rosterApply(s, mentor, add('Иванов Иван Иванович'), P), e => e.code === 'ROSTER_DUPLICATE'));
check('blank FIO blocked', () => assert.throws(() => rosterApply(s, mentor, add('  '), P), e => e.code === 'ROSTER_NAME'));
check('future start blocked', () => assert.throws(() => rosterApply(s, mentor, { ...add('Новый'), startDate: '2099-01-01' }, P), e => e.code === 'ROSTER_DATE'));
check('capacity respected atomically', () => { const x = M.clone(s); x.groups.find(g => g.id === 'qa-roster').capacity = 3; assert.throws(() => rosterApply(x, mentor, add('Четвёртый'), P), e => e.code === 'ROSTER_CAPACITY'); assert.equal(x.attendanceChildren.length, s.attendanceChildren.length); });
const first = results[0], other = results[1];
s.attendanceSessions.push({ id: 'qa-session', groupId: 'qa-roster', date: '2026-09-08', mode: 'actual', status: 'completed', records: [{ childId: first.childId, status: 'present', nameSnapshot: 'Иванов Иван Иванович' }, { childId: other.childId, status: 'sick', nameSnapshot: 'Петров Пётр Петрович' }] });
const history = JSON.stringify(s.attendanceSessions);
let r = rosterApply(s, mentor, { action: 'rename', requestId: randomUUID(), groupId: 'qa-roster', childId: first.childId, membershipId: first.membershipId, previousName: 'Иванов Иван Иванович', name: 'Иванов Иван Сергеевич' }, P); s = r.data;
check('rename retains identity and historical marks', () => { assert.equal(JSON.stringify(s.attendanceSessions), history); assert.equal(s.attendanceChildren.find(c => c.id === first.childId).name, 'Иванов Иван Сергеевич'); });
check('stale rename blocked', () => assert.throws(() => rosterApply(s, mentor, { action: 'rename', requestId: randomUUID(), groupId: 'qa-roster', childId: first.childId, membershipId: first.membershipId, previousName: 'Иванов Иван Иванович', name: 'Перезапись' }, P), e => e.code === 'ROSTER_CONFLICT'));
const m = s.attendanceMemberships.find(m => m.id === first.membershipId);
r = rosterApply(s, mentor, { action: 'remove', requestId: randomUUID(), groupId: 'qa-roster', childId: first.childId, membershipId: first.membershipId, previousMembership: [m.startDate || '', m.endDate || '', m.status || ''], reason: 'Переезд' }, P, '2026-09-16'); s = r.data;
check('remove preserves membership reference and sessions', () => { assert.equal(JSON.stringify(s.attendanceSessions), history); assert(!s.attendanceMemberships.find(m => m.id === first.membershipId).deletedAt); assert.equal(r.count, 2); assert(I.validate(s)); });
check('removed pupil still has visit history', () => assert.equal(rg65StudentStats(s, 'qa-roster', first.childId, '2026-09-16').present, 1));
const statsData = { attendanceChildren: [{ id: 'c', name: 'Тест' }], attendanceMemberships: [{ childId: 'c', groupId: 'g', startDate: '2026-09-01' }], attendanceSessions: ['present', 'sick', 'warned', 'noShow', 'vacation', 'freeze', 'unknown'].map((status, i) => ({ id: 's' + i, groupId: 'g', date: '2026-09-0' + (i + 1), records: [{ childId: 'c', status }] })) };
statsData.attendanceSessions.push({ id: 'planned', groupId: 'g', date: '2026-09-08', mode: 'planned', records: [{ childId: 'c', status: 'noShow' }] }, { id: 'cancel', groupId: 'g', date: '2026-09-09', status: 'cancelled', records: [{ childId: 'c', status: 'noShow' }] }, { id: 'future', groupId: 'g', date: '2099-01-01', records: [{ childId: 'c', status: 'noShow' }] });
check('statistics separate absence, breaks, unknown, planned and future', () => { const x = rg65StudentStats(statsData, 'g', 'c', '2026-09-16'); assert.equal(x.present, 1); assert.equal(x.misses, 3); assert.equal(x.pauses, 2); assert.equal(x.unknown, 1); assert.equal(x.percent, 25); assert.equal(x.recentPercent, 25); assert.equal(x.rows.length, 7); });
check('empty history is not zero percent attendance', () => assert.equal(rg65StudentStats({ attendanceSessions: [] }, 'g', 'c', '2026-09-16').percent, null));
class MemoryStore {
  data = { format: 1, users: {}, sessions: {}, invites: {}, workspaces: {}, requests: {}, tombstones: {}, rates: {}, audit: [] };
  queue = Promise.resolve();
  tx(fn) { const promise = this.queue.then(async () => { const next = M.clone(this.data), result = await fn(next); this.data = next; return result; }); this.queue = promise.catch(() => {}); return promise; }
}
const store = new MemoryStore(), key = randomBytes(32).toString('hex'), password = randomBytes(20).toString('base64url');
const service = new Service(store, { securityKey: key });
await service.bootstrap({ username: 'roman', password, data: clean() });
const owner = await service.login({ username: 'roman', password });
const accounts = { roman: owner };
for (const [username, personId, role] of [['tasya', 'tasya', 'mentor'], ['sofa', 'sofia', 'manager'], ['ivan', 'ivan', 'mentor']]) {
  const invite = await service.invite(owner.cookie, owner.csrf, { username, personId, role }); await service.activate({ token: invite.token, password }); accounts[username] = await service.login({ username, password });
}
const controller = rosterController({ store, authenticate, M, P, getSecurityKey: async () => key });
const body = add('Повторяемый ученик'), acc = accounts.tasya;
const once = await controller(acc.cookie, acc.csrf, body), twice = await controller(acc.cookie, acc.csrf, body);
check('request replay is idempotent', () => { assert.equal(once.count, 1); assert.equal(twice.count, 1); assert(twice.replayed); });
await assert.rejects(controller(acc.cookie, acc.csrf, { ...body, name: 'Другие данные' }), e => e.code === 'IDEMPOTENCY'); tests++; console.log('PASS changed replay rejected');
await assert.rejects(controller(acc.cookie, 'wrong', add('Ошибка')), e => e.code === 'CSRF'); tests++; console.log('PASS CSRF checked');
await assert.rejects(controller('', '', add('Ошибка')), e => e.status === 401); tests++; console.log('PASS anonymous denied');
await Promise.all(['Параллельный А', 'Параллельный Б'].map(name => controller(acc.cookie, acc.csrf, add(name))));
check('concurrent adds retain both pupils', () => assert.equal(Object.values(store.data.workspaces)[0].data.attendanceMemberships.filter(m => m.groupId === 'qa-roster').length, 3));
// Reset only this isolated in-memory fixture for browser assertions.
await store.tx(d => { const w = Object.values(d.workspaces)[0]; w.data = clean(); w.data.meta = { revision: ++w.revision }; });
fs.writeFileSync('qa/auth.json', JSON.stringify({ password, accounts }));
fs.writeFileSync('qa/unit-results.json', JSON.stringify({ passed: tests, scope: 'isolated fixture only; production untouched' }, null, 2));
console.log('ROSTER_UNIT_PASS', tests);
const source = fs.readFileSync('qa/base-app.js', 'utf8');
const marker = "document.addEventListener('click',handleClick);";
assert.equal(source.split(marker).length, 2);
const patch = fs.readFileSync('roster65/roster-math.js', 'utf8') + '\n' + fs.readFileSync('roster65/roster-ui.js', 'utf8').replace("${rg65Busy ? 'disabled' : ''}", '');
const adapter = `s65Fetch=async function(url, options={}){ const action=url.replace(/^\\/api\\//,'')==='state'&&options.method==='PATCH'?'patch':url.replace(/^\\/api\\//,''); const q={action,session:window.__QA_AUTH.cookie,csrf:window.__QA_AUTH.csrf,body:options.body?JSON.parse(options.body):{}}; const r=await fetch('/qa/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q)}), value=await r.json(); if(!r.ok)throw Object.assign(Error(value.message),{status:r.status,code:value.error}); return value; }; window.EK65Transport={request:s65Fetch};`;
fs.writeFileSync('qa/app.js', source.replace(marker, patch + '\n' + adapter + '\n' + marker));
let html = fs.readFileSync('qa/app.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
html = html.replace('</head>', '<link rel="stylesheet" href="/app.css"></head>').replace('</body>', '<script src="/model.js"></script><script src="/app.js"></script></body>');
fs.writeFileSync('qa/index.html', html);
http.createServer(async (req, res) => {
  if (req.url === '/ready') { res.end('ready'); return; }
  if (req.method === 'POST' && req.url === '/qa/api') {
    res.setHeader('content-type', 'application/json');
    try {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const q = JSON.parse(raw), b = q.body || {}; let result;
      if (q.action === 'session') result = await service.getSession(q.session);
      else if (q.action === 'state') result = await service.getState(q.session);
      else if (q.action === 'patch') result = await service.patch(q.session, q.csrf, b);
      else if (q.action === 'group-roster') result = await controller(q.session, q.csrf, b);
      else if (q.action === 'health') result = { ok: true };
      else if (q.action === 'login') { result = await service.login(b); result.session = result.cookie; delete result.cookie; }
      else if (q.action === 'migration-status') result = { status: 'imported' };
      else throw Object.assign(Error('Unsupported isolated action: ' + q.action), { status: 400 });
      res.end(JSON.stringify(result));
    } catch (e) { res.statusCode = e.status || 500; res.end(JSON.stringify({ error: e.code, message: e.message })); }
    return;
  }
  const files = { '/': ['qa/index.html', 'text/html'], '/app.js': ['qa/app.js', 'text/javascript'], '/model.js': ['qa/lib/model.cjs', 'text/javascript'], '/app.css': ['qa/app.css', 'text/css'] };
  const file = files[req.url.split('?')[0]];
  if (!file) { res.statusCode = 404; res.end('not found'); return; }
  res.setHeader('content-type', file[1]); res.end(fs.readFileSync(file[0]));
}).listen(8898, '127.0.0.1', () => console.log('ROSTER_ISOLATED_SERVER_READY'));
