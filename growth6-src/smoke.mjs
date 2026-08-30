import { writeFileSync, mkdirSync } from 'node:fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class CDPPage {
  constructor(port) {
    this.port = port;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
  }
  async open(url) {
    const target = await fetch(`http://127.0.0.1:${this.port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then(r => r.json());
    this.ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result || {});
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params?.exceptionDetails?.text || 'Runtime exception');
      }
      if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') {
        this.errors.push(msg.params.entry.text);
      }
    };
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await this.send('Page.navigate', { url });
    await this.waitFor('Boolean(window.EKGrowthOS && document.querySelectorAll(".nav-btn").length >= 10)', 15000);
    return this;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 20000);
    });
  }
  async evaluate(expression, awaitPromise = false) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Evaluation failed');
    return result.result?.value;
  }
  async waitFor(expression, timeout = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try { if (await this.evaluate(expression, true)) return true; } catch {}
      await sleep(120);
    }
    throw new Error(`Timeout waiting for: ${expression}`);
  }
  async screenshot(path) {
    const shot = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(path, Buffer.from(shot.data, 'base64'));
  }
  close() { try { this.ws?.close(); } catch {} }
}

async function waitChrome(port) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`Chrome on port ${port} did not start`);
}

const workspace = `growth6-ci-${Date.now()}`;
const key = '0123456789abcdef'.repeat(4);
const baseUrl = `http://127.0.0.1:8765/#w=${workspace}&k=${key}&r=owner&t=ci-owner`;
const views = ['dashboard','year','groups','goals','tasks','calendar','analytics','archive','stas','mentor','admin','team','settings'];
const report = { version: '6.0.0', workspace, views: {}, checks: {}, sync: {}, errors: [] };

await waitChrome(9222);
await waitChrome(9223);
const first = await new CDPPage(9222).open(baseUrl);

const theme = await first.evaluate(`(() => {
  const root = getComputedStyle(document.documentElement);
  return {
    title: document.title,
    navCount: document.querySelectorAll('.nav-btn').length,
    bg: root.getPropertyValue('--bg').trim(),
    yellow: root.getPropertyValue('--yellow').trim(),
    bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
    bootHidden: document.getElementById('boot').classList.contains('hidden') || document.getElementById('boot').classList.contains('fade')
  };
})()`);
report.checks.theme = theme;
assert(theme.title.includes('Growth OS 6.0'), 'Wrong document title');
assert(theme.navCount >= 10, 'Navigation did not render');
assert(theme.bg.toLowerCase() === '#080806', `Unexpected background ${theme.bg}`);
assert(theme.yellow.toLowerCase() === '#f0c72f', `Unexpected yellow ${theme.yellow}`);
assert(theme.bodyFont >= 15, `Body font is too small: ${theme.bodyFont}px`);
assert(theme.bootHidden, 'Boot screen did not close');

for (const view of views) {
  await first.evaluate(`document.querySelector('[data-view="${view}"]')?.click(); true`);
  await first.waitFor(`Boolean(document.querySelector('.page') && document.getElementById('pageTitle')?.textContent.trim())`);
  await sleep(120);
  const snapshot = await first.evaluate(`(() => ({
    title: document.getElementById('pageTitle')?.textContent.trim(),
    text: document.getElementById('pages')?.innerText.slice(0, 180),
    cards: document.querySelectorAll('#pages .card').length,
    charts: document.querySelectorAll('#pages .chart-panel').length,
    tableRows: document.querySelectorAll('#pages .data-table tbody tr').length,
    kanban: document.querySelectorAll('#pages .kanban-col').length,
    calendarDays: document.querySelectorAll('#pages .calendar-day').length
  }))()`);
  report.views[view] = snapshot;
  assert(snapshot.title, `${view}: page title is empty`);
  assert(snapshot.text, `${view}: page content is empty`);
  if (view === 'groups') assert(snapshot.tableRows > 0, 'Groups table is empty');
  if (view === 'tasks') assert(snapshot.kanban === 4, 'Tasks kanban is broken');
  if (view === 'calendar') assert(snapshot.calendarDays >= 35, 'Calendar did not render');
  if (view === 'analytics') assert(snapshot.charts >= 3, 'Analytics charts did not render');
}

await first.evaluate(`document.querySelector('[data-view="tasks"]')?.click(); true`);
await first.waitFor(`Boolean(document.querySelector('.kanban'))`);
const beforeTasks = await first.evaluate(`window.EKGrowthOS.getState().tasks.filter(x => !x.deletedAt).length`);
await first.evaluate(`document.querySelector('[data-action="quickAdd"]')?.click(); true`);
await first.waitFor(`!document.getElementById('modal').classList.contains('hidden')`);
await first.evaluate(`document.querySelector('.quick-card[data-action="addTask"]')?.click(); true`);
await first.waitFor(`Boolean(document.getElementById('taskForm'))`);
await first.evaluate(`(() => {
  const form = document.getElementById('taskForm');
  form.elements.title.value = 'CI: проверка рабочей задачи';
  form.elements.description.value = 'Создано автоматическим smoke-тестом Growth OS 6.0';
  form.elements.ownerId.value = 'roman';
  form.elements.priority.value = 'high';
  form.elements.status.value = 'todo';
  form.elements.deadline.value = '2026-09-07';
  form.requestSubmit();
  return true;
})()`);
await first.waitFor(`window.EKGrowthOS.getState().tasks.filter(x => !x.deletedAt).length === ${beforeTasks + 1}`);
report.checks.taskCrud = true;

let synced = false;
for (let i = 0; i < 3 && !synced; i++) {
  await first.evaluate(`window.EKGrowthOS.sync()`, true);
  await sleep(500);
  synced = await first.evaluate(`document.getElementById('workspaceStatus')?.textContent.includes('Синхронизировано')`);
}
report.sync.firstDevice = synced;
assert(synced, 'First device did not synchronize');

const second = await new CDPPage(9223).open(baseUrl.replace('ci-owner','ci-second-device'));
let pulled = false;
for (let i = 0; i < 3 && !pulled; i++) {
  await second.evaluate(`window.EKGrowthOS.sync()`, true);
  await sleep(600);
  pulled = await second.evaluate(`window.EKGrowthOS.getState().tasks.some(x => !x.deletedAt && x.title === 'CI: проверка рабочей задачи')`);
}
report.sync.secondDeviceReceivedTask = pulled;
assert(pulled, 'Second isolated browser did not receive synchronized task');

await first.evaluate(`document.querySelector('[data-view="dashboard"]')?.click(); true`);
await first.waitFor(`document.getElementById('pageTitle')?.textContent.includes('Главная')`);
mkdirSync('diagnostics', { recursive: true });
await first.screenshot('diagnostics/growth6-dashboard.png');
report.errors = [...first.errors, ...second.errors];
assert(report.errors.length === 0, `Runtime errors: ${report.errors.join(' | ')}`);
writeFileSync('diagnostics/growth6-smoke-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
first.close();
second.close();
