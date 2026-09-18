import fs from 'node:fs';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import Core from '../qa/core.mjs';
import { deviceController, revokeRememberedOnLogout } from '../qa/device-server.mjs';
import { installSmm, smmController } from '../qa/smm-server.mjs';
import { smmDefaults } from '../qa/smm-core.mjs';
import { rosterController } from '../roster65/roster-service.mjs';
const require = createRequire(import.meta.url);
const { Service, Model: M, Policy: P, Integrity: I, authenticate } = Core;
installSmm(P, M, I);
class MemoryStore {
  data = { format: 1, users: {}, sessions: {}, invites: {}, workspaces: {}, requests: {}, tombstones: {}, rates: {}, audit: [] };
  queue = Promise.resolve();
  tx(fn) { const p = this.queue.then(async () => { const data = structuredClone(this.data), r = await fn(data); this.data = data; return r; }); this.queue = p.catch(() => {}); return p; }
}
const store = new MemoryStore(), key = randomBytes(32).toString('hex'), password = randomBytes(20).toString('base64url');
const service = new Service(store, { securityKey: key }), fixture = M.clone(require('../qa/tests/fixture.cjs'));
fixture.people.push({ id: 'karina', name: 'Карина', role: 'team', active: true });
fixture.groups[0].name = 'Ролики · БАЗА+ · группа с длинным названием';
fixture.tasks[1].title = 'Проверить состав группы и связаться с родителями по поводу пропусков занятий';
fixture.attendanceChildren.push(...['Иванов Александр Александрович', 'Петрова Елизавета Константиновна'].map((name, i) => ({ id: 'test-long-' + i, name, active: true })));
fixture.attendanceMemberships.push(...[0, 1].map(i => ({ id: 'test-mem-' + i, groupId: 'group-tasya', childId: 'test-long-' + i, startDate: '2026-09-01', status: 'active' })));
fixture.groups[0].students = 3;
await service.bootstrap({ username: 'roman', password, data: fixture });
const owner = await service.login({ username: 'roman', password });
for (const [username, personId, role] of [['stas','stas','stas'],['tasya','tasya','mentor'],['ivan','ivan','mentor'],['sofa','sofia','manager'],['anya','anya','admin'],['karina','karina','smm']]) {
  const i = await service.invite(owner.cookie, owner.csrf, { username, personId, role }); await service.activate({ token: i.token, password });
}
await store.tx(d => { d.workspaces[owner.actor.workspaceId].data.smm = { version: 0, config: smmDefaults(), entries: {}, payroll: {}, exceptions: {}, rulesByMonth: {} }; });
const devices = deviceController(store, authenticate), revoke = revokeRememberedOnLogout(store, authenticate);
const smm = smmController({ store, authenticate, M, P, getSecurityKey: async () => key });
const roster = rosterController({ store, authenticate, M, P, getSecurityKey: async () => key });
fs.writeFileSync('qa/auth.json', JSON.stringify({ password }));
http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/ready') { res.end('{"ok":true}'); return; }
  try {
    let raw = ''; for await (const part of req) raw += part;
    const q = JSON.parse(raw), b = q.body || {}, action = req.url.split('/').at(-1); let r;
    if (action === 'health') r = { ok: true, version: 'isolated-access18' };
    else if (action === 'login') r = await service.login(b, 'qa:' + b.username);
    else if (action === 'session') r = await service.getSession(q.session);
    else if (action === 'state') r = await service.getState(q.session);
    else if (action === 'patch') r = await service.patch(q.session, q.csrf, b);
    else if (action === 'logout') { await revoke(q.session, q.csrf, b.deviceId); r = await service.logout(q.session, q.csrf); }
    else if (action === 'group-roster') r = await roster(q.session, q.csrf, b);
    else if (action === 'smm') r = await smm(q.session, q.csrf, b);
    else if (action === 'migration-status') r = { status: 'imported' };
    else if (action.startsWith('device-')) r = await devices(action, q.session, q.csrf, b);
    else throw Object.assign(Error('Unsupported isolated action: ' + action), { status: 400 });
    if (r.cookie) { r.session = r.cookie; delete r.cookie; }
    res.end(JSON.stringify(r));
  } catch (e) { res.statusCode = e.status || 500; res.end(JSON.stringify({ error: e.code || 'ISOLATED', message: e.message })); }
}).listen(8898, '127.0.0.1', () => console.log('Isolated access fixture ready'));
