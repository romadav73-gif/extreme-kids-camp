'use strict';
module.exports = function repairEntry(source) {
  const replaceOnce = (from, to) => {
    if (source.split(from).length !== 2) throw new Error('Reliability patch: source anchor changed.');
    source = source.replace(from, to);
  };
  const from = source.indexOf('async function send(action,body={}){');
  const to = source.indexOf('const device=trustedDevice(send);', from);
  if (from < 0 || to < 0) throw new Error('Verified entry transport anchor missing.');
  source = source.slice(0, from) + `
const reliableTransport = requestControl((url, body) => api.post(url, body), {
  report: event => window.EK65Boot?.record(event)
});
async function send(action, body = {}) {
  return reliableTransport.send(action, { session: login?.session || '', csrf: login?.csrf || '', body });
}
` + source.slice(to);
  source = "import { requestControl } from './request-control.js';\n" + source;
  replaceOnce("const retryable=new Set(['health','session','state','migration-status','users','audit','backup','patch']),attempts=retryable.has(action)?3:1;", 'const attempts=1;');
  const start = source.indexOf('async function app(){');
  const end = source.indexOf('async function health(){', start);
  if (start < 0 || end < 0) throw new Error('Verified app loader anchor missing.');
  source = source.slice(0, start) + `
async function app() {
  if (started) return;
  started = true;
  const previousNodes = [...document.body.childNodes];
  try {
    document.body.className = 'club-mode';
    document.body.innerHTML = shell;
    await import('./club-app.js');
    window.addEventListener('online', () => {
      Promise.resolve(window.EKGrowthOS?.sync()).catch(() => window.EK65Boot?.record({ code: 'SYNC_ONLINE_FAILED' }));
    });
  } catch {
    started = false;
    document.body.replaceChildren(...previousNodes);
    document.body.className = 'login-mode';
    window.__ek65ModuleFailed = true;
    window.EK65Boot?.record({ code: 'APP_MODULE_FAILED' });
    throw new Error('Не удалось загрузить кабинет. Вход сохранён. Нажмите «Проверить связь»; кэш не очищайте.');
  }
}
` + source.slice(end);
  replaceOnce("else document.body.textContent='Не удалось открыть интерфейс. Обновите страницу.'", "else window.EK65Boot?.fail('Не удалось открыть интерфейс. Данные не удалены. Сохраните диагностику и обновите страницу.')");
  return source;
};
