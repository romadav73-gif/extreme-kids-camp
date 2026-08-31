import { mkdirSync, writeFileSync } from 'node:fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Page {
  constructor(port) { this.port = port; this.seq = 0; this.pending = new Map(); this.errors = []; }
  async open(url) {
    const target = await fetch(`http://127.0.0.1:${this.port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then(r => r.json());
    this.ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id); this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result || {});
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') this.errors.push(msg.params?.exceptionDetails?.text || 'runtime exception');
      if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') this.errors.push(msg.params.entry.text);
    };
    await this.send('Page.enable'); await this.send('Runtime.enable'); await this.send('Log.enable');
    await this.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await this.send('Page.navigate', { url });
    await this.wait(`Boolean(window.EKGrowthOS && window.EKGrowthOS.version === '6.1.0')`, 20000);
    return this;
  }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`CDP timeout ${method}`)); } }, 25000);
    });
  }
  async evaluate(expression, awaitPromise = false) {
    const out = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise, userGesture: true });
    if (out.exceptionDetails) throw new Error(out.exceptionDetails.text || 'evaluation failed');
    return out.result?.value;
  }
  async wait(expression, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try { if (await this.evaluate(expression, true)) return; } catch {}
      await sleep(120);
    }
    throw new Error(`wait timeout: ${expression}`);
  }
  async screenshot(path) { const s = await this.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path, Buffer.from(s.data, 'base64')); }
  close() { try { this.ws?.close(); } catch {} }
}

async function waitChrome(port) {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return; } catch {}
    await sleep(150);
  }
  throw new Error(`Chrome ${port} not ready`);
}

await waitChrome(9222); await waitChrome(9223);
const workspace = `ek-growth61-ci-${Date.now()}`;
const key = '0123456789abcdef'.repeat(4);
const root = `http://127.0.0.1:8765/v6.1.html#w=${workspace}&k=${key}`;
const owner = await new Page(9222).open(`${root}&r=owner&t=ci-owner`);
const report = { version: '6.1.0', workspace, checks: {}, sync: {}, errors: [] };

const theme = await owner.evaluate(`(() => ({
  title: document.title,
  yellow: getComputedStyle(document.documentElement).getPropertyValue('--yellow').trim(),
  font: parseFloat(getComputedStyle(document.body).fontSize),
  managerRole: Boolean(document.querySelector('[data-role="manager"]')),
  nav: document.querySelectorAll('.nav-btn').length
}))()`);
assert(theme.title.includes('Growth OS 6.0'), 'document title changed unexpectedly');
assert(theme.yellow.toLowerCase() === '#f0c72f', `wrong yellow ${theme.yellow}`);
assert(theme.font >= 16, `font too small ${theme.font}`);
assert(theme.managerRole, 'manager role missing');
report.checks.theme = theme;

await owner.evaluate(`(() => {
  const s=window.EKGrowthOS.getState(),now=new Date().toISOString();
  s.settings.currentMonth='2026-09';s.ui.taskMonthMode='selected';
  s.tasks=s.tasks.filter(t=>!String(t.id).startsWith('ci_'));
  s.tasks.push({id:'ci_sep',title:'CI сентябрь',description:'month test',ownerId:'anya',monthKey:'2026-09',deadline:'2026-09-18',priority:'high',status:'todo',createdBy:'owner',updatedAt:now});
  s.tasks.push({id:'ci_oct',title:'CI октябрь',description:'month test',ownerId:'adel',monthKey:'2026-10',deadline:'2026-10-18',priority:'medium',status:'todo',createdBy:'owner',updatedAt:now});
  const g=s.groups.find(x=>x.mentorId==='ivan');if(g){g.capacity=10;g.students=5;g.updatedAt=now}
  const goal=s.goals.find(x=>/загруз/i.test(x.metric||x.title));if(goal){goal.metric='Загрузка';goal.target=85;goal.updatedAt=now}
  s.meta.updatedAt=now;s.meta.revision=(s.meta.revision||0)+1;
  window.EKGrowthOS.setView('tasks');return true;
})()`);
await sleep(200);
const september = await owner.evaluate(`(() => ({text:document.getElementById('pages').innerText,deleteButtons:document.querySelectorAll('.task-delete').length,canDelete:window.EKGrowthOS.canDeleteTask()}))()`);
assert(september.text.includes('CI сентябрь'), 'September task not visible');
assert(!september.text.includes('CI октябрь'), 'October task leaked into September');
assert(september.deleteButtons > 0 && september.canDelete, 'owner delete permission broken');
report.checks.septemberFilter = true;

await owner.evaluate(`(() => {const select=document.getElementById('monthSelect');select.value='2026-10';select.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
await sleep(200);
const octoberText = await owner.evaluate(`document.getElementById('pages').innerText`);
assert(octoberText.includes('CI октябрь'), 'October task not visible after month switch');
assert(!octoberText.includes('CI сентябрь'), 'September task leaked into October');
report.checks.octoberFilter = true;

const derived = await owner.evaluate(`window.EKGrowthOS.derived()`);
assert(derived.monthKey === '2026-10', 'derived month did not follow selector');
assert(Array.isArray(derived.mentors) && derived.mentors.length >= 8, 'mentor aggregation missing');
assert(derived.goals.some(g => g.derivedSource === 'groups'), 'automatic group goal missing');
report.checks.derived = { mentors: derived.mentors.length, groupGoal: true };

await owner.evaluate(`window.EKGrowthOS.sync()`, true);
await owner.wait(`document.getElementById('workspaceStatus')?.textContent.includes('Синхронизировано')`, 15000);
report.sync.ownerPush = true;

const manager = await new Page(9223).open(`${root}&r=manager&t=ci-manager`);
await manager.evaluate(`window.EKGrowthOS.sync()`, true);
await manager.wait(`window.EKGrowthOS.getState().tasks.some(t=>t.id==='ci_sep')`, 15000);
assert(await manager.evaluate(`window.EKGrowthOS.canDeleteTask()`), 'manager cannot delete tasks');
await manager.evaluate(`window.EKGrowthOS.setView('manager');true`);
await manager.wait(`document.getElementById('pageTitle')?.textContent.includes('Софа')`);
const managerView = await manager.evaluate(`(() => ({text:document.getElementById('pages').innerText,rows:document.querySelectorAll('.data-table tbody tr').length}))()`);
assert(managerView.text.includes('Операционный индекс') || managerView.text.includes('ОПЕРАЦИОННЫЙ ИНДЕКС'), 'manager dashboard missing');
assert(managerView.rows >= 8, 'mentor matrix missing in manager dashboard');
report.checks.manager = managerView;
report.sync.managerPulled = true;

await manager.evaluate(`(() => {window.confirm=()=>true;const s=window.EKGrowthOS.getState();s.settings.currentMonth='2026-09';s.ui.taskMonthMode='selected';window.EKGrowthOS.setView('tasks');return true})()`);
await sleep(250);
await manager.evaluate(`document.querySelector('[data-action="deleteTask"][data-id="ci_sep"]')?.click();true`);
await manager.wait(`window.EKGrowthOS.getState().tasks.find(t=>t.id==='ci_sep')?.deletedAt`, 5000);
await manager.evaluate(`window.EKGrowthOS.sync()`, true);
report.checks.managerDelete = true;

const mentor = await new Page(9222).open(`${root}&r=mentor&t=ci-mentor`);
await mentor.evaluate(`window.EKGrowthOS.sync()`, true);
await mentor.evaluate(`window.EKGrowthOS.setView('tasks');true`);
await sleep(200);
assert(!(await mentor.evaluate(`window.EKGrowthOS.canDeleteTask()`)), 'mentor unexpectedly has delete permission');
assert((await mentor.evaluate(`document.querySelectorAll('.task-delete').length`)) === 0, 'mentor sees task delete buttons');
report.checks.mentorDeleteDenied = true;

await owner.evaluate(`window.EKGrowthOS.sync()`, true);
await owner.wait(`Boolean(window.EKGrowthOS.getState().tasks.find(t=>t.id==='ci_sep')?.deletedAt)`, 15000);
report.sync.deleteTombstone = true;

mkdirSync('diagnostics', { recursive: true });
await manager.screenshot('diagnostics/growth61-manager.png');
report.errors = [...owner.errors, ...manager.errors, ...mentor.errors].filter(Boolean);
assert(report.errors.length === 0, `browser errors: ${report.errors.join(' | ')}`);
writeFileSync('diagnostics/growth61-smoke-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
owner.close(); manager.close(); mentor.close();
