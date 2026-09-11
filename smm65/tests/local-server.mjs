import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { installSmm, smmController } from '../src/smm-server.mjs';
import { smmDefaults, smmDay } from '../src/smm-core.mjs';
const require = createRequire(import.meta.url), { Service, authenticate } = require('../base/lib/service.cjs');
const { MemoryStore } = require('../base/lib/store.cjs'), { handler } = require('../base/lib/http.cjs');
const P = require('../base/lib/policy.cjs'), M = require('../base/lib/model.cjs');
installSmm(P, M, require('../base/lib/integrity.cjs'));
const secret = randomBytes(32).toString('hex'), password = randomBytes(20).toString('base64url'), store = new MemoryStore(), service = new Service(store, { securityKey: secret });
const smm = smmController({ store, authenticate, M, P, getSecurityKey: async () => secret });
const data = M.clone(require('../base/tests/fixture.cjs'));
data.people.push({ id: 'karina', name: 'Карина', role: 'mentor', title: 'SMM-специалист', active: true });
data.tasks.push({ id: 'smm-task', title: 'Снять знакомство с наставником', ownerId: 'karina', description: 'Короткое интервью', status: 'todo', monthKey: smmDay().slice(0, 7), deadline: smmDay() });
await service.bootstrap({ username: 'roman', password, data });
const owner = await service.login({ username: 'roman', password });
for (const [username, personId, role] of [['karina', 'karina', 'smm'], ['sofa', 'sofia', 'manager'], ['tasya', 'tasya', 'mentor']]) {
  const invitation = await service.invite(owner.cookie, owner.csrf, { username, personId, role });
  await service.activate({ token: invitation.token, password });
}
await store.tx(d => { const w = d.workspaces[owner.actor.workspaceId]; w.data.people.find(p => p.id === 'karina').role = 'smm'; w.data.smm = { version: 0, config: smmDefaults(smmDay()), entries: {}, payroll: {}, exceptions: {}, rulesByMonth: {} }; });
fs.writeFileSync(new URL('../.qa-auth.json', import.meta.url), JSON.stringify({ password }));
const base = handler(service, { origin: 'http://127.0.0.1:8894', secure: false });
const bundle = fs.readFileSync(new URL('../base/build/app.js', import.meta.url), 'utf8');
const core = fs.readFileSync(new URL('../src/smm-core.mjs', import.meta.url), 'utf8').replace(/^export /gm, '');
const ui = fs.readFileSync(new URL('../src/smm-ui.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/smm-ui.css', import.meta.url), 'utf8');
const script = bundle.replace("document.addEventListener('click',handleClick);", core + '\n' + ui + '\n' + `const cssSmm = document.createElement('style');cssSmm.textContent=${JSON.stringify(css)};document.head.append(cssSmm);\n` + "document.addEventListener('click',handleClick);");
fs.mkdirSync(new URL('../evidence/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../evidence/tested-app.js', import.meta.url), script);
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/app') { res.setHeader('Content-Type', 'text/javascript'); res.end(script); return; }
  if (req.url === '/api/smm') {
    try {
      const sid = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('ek65_dev='))?.slice(9) || '';
      let bytes = ''; for await (const chunk of req) bytes += chunk;
      const result = await smm(sid, req.headers['x-csrf-token'], JSON.parse(bytes));
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result));
    } catch (e) { res.statusCode = e.status || 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: e.code, message: e.message })); }
    return;
  }
  return base(req, res);
});
server.listen(8894, '127.0.0.1', () => console.log('Isolated SMM browser server ready'));
