const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');
const { MemoryStore } = require('./base/lib/store.cjs');
const { Service } = require('./base/lib/service.cjs');
const { handler } = require('./base/lib/http.cjs');
const fixture = require('./base/tests/fixture.cjs');
(async () => {
  const password = crypto.randomBytes(24).toString('base64url');
  fs.writeFileSync(__dirname + '/.qa-login.json', JSON.stringify({ password }), { mode: 0o600 });
  fixture.people.push({ id: 'archived-qa', name: 'Archived QA', role: 'mentor', active: false });
  fixture.groups[0].monthlyPrice = 12345;
  const service = new Service(new MemoryStore(), { securityKey: crypto.randomBytes(32).toString('hex') });
  await service.bootstrap({ username: 'qaowner', data: fixture, password });
  const owner = await service.login({ username: 'qaowner', password });
  for (const [username, role, personId, management] of [
    ['qasofa', 'manager', 'sofia', false], ['qatasya', 'mentor', 'tasya', false],
    ['qaivan', 'mentor', 'ivan', true], ['qastas', 'stas', 'stas', false],
    ['qaanya', 'admin', 'anya', false]
  ]) {
    const invitation = await service.invite(owner.cookie, owner.csrf, { username, role, personId, management });
    await service.activate({ token: invitation.token, password });
  }
  http.createServer(handler(service, { origin: 'http://127.0.0.1:8886', secure: false }))
    .listen(8886, '127.0.0.1', () => console.log('Isolated QA server ready'));
})();
