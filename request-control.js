// The SDK has no documented AbortSignal option. Retain one underlying call per
// exact operation after a waiting timeout; never fork retries of pending calls.
export function requestControl(post, options = {}) {
  const timeoutMs = options.timeoutMs || 25000;
  const report = options.report || (() => {});
  const flights = new Map();
  const code = value => /^[A-Z][A-Z0-9_]{0,47}$/.test(value || '') ? value : 'NETWORK';
  const fingerprint = async value => Array.from(new Uint8Array(await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(value)
  )), n => n.toString(16).padStart(2, '0')).join('');
  function errorFrom(e) {
    const d = e?.response?.data || e?.data || {};
    const status = Number(e?.response?.status || e?.status || 0);
    const c = code(d.error || e?.code);
    const known = {
      TIMEOUT: 'Ответ задерживается. Запрос ещё проверяется; повтор не создаст вторую операцию.',
      OFFLINE: 'Нет связи. Не закрывайте вкладку с несохранёнными изменениями.',
      GATEWAY: 'Сервер временно недоступен. Вход и локальные изменения не удалены.',
      UPSTREAM_TIMEOUT: 'База не ответила вовремя. Повторите синхронизацию позже.',
      UPSTREAM_NETWORK: 'Нет соединения между сервером и базой. Локальные изменения не удалены.',
      UPSTREAM_FORMAT: 'Получен некорректный ответ сервера. Повторите позже.',
      DATABASE_BUSY: 'База занята другой операцией. Повторите сохранение позже.',
      SERVER_ERROR: 'Сервис временно недоступен. Локальные изменения не удалены.',
      NETWORK: 'Не удалось получить ответ сервера. Проверьте соединение.',
      CLIENT_BUSY: 'Предыдущие запросы ещё не завершены. Сохраните вкладку открытой.'
    };
    const message = known[c] || (status >= 400 && status < 500 && typeof d.message === 'string'
      ? d.message.slice(0, 1000) : 'Не удалось выполнить запрос. Повторите позже.');
    return Object.assign(new Error(message), {
      status, code: c, requestId: /^[0-9a-f-]{36}$/.test(d.requestId || '') ? d.requestId : ''
    });
  }
  async function send(action, envelope) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw errorFrom({ code: 'OFFLINE' });
    const id = await fingerprint(action + ':' + JSON.stringify(envelope));
    let f = flights.get(id);
    if (!f) {
      if (flights.size >= 32) throw errorFrom({ code: 'CLIENT_BUSY' });
      f = { pending: true, timedOut: false, observed: false, started: Date.now(), promise: null };
      flights.set(id, f);
      f.promise = Promise.resolve().then(() => post('/api/club/' + action, envelope)).then(
        r => ({ ok: true, data: r.data }), e => ({ ok: false, error: errorFrom(e) })
      ).then(outcome => {
        f.pending = false;
        report({ action, status: outcome.ok ? 200 : outcome.error.status,
          code: outcome.ok ? 'OK' : outcome.error.code,
          requestId: outcome.ok ? '' : outcome.error.requestId,
          ms: Date.now() - f.started, late: f.timedOut });
        if (f.timedOut && !f.observed) {
          const timer = setTimeout(() => { if (flights.get(id) === f) flights.delete(id); }, 120000);
          timer.unref?.();
        }
        return outcome;
      });
    }
    let timer;
    try {
      const result = await Promise.race([f.promise, new Promise((_, reject) => {
        timer = setTimeout(() => {
          f.timedOut = true;
          report({ action, status: 0, code: 'TIMEOUT', ms: Date.now() - f.started });
          reject(errorFrom({ code: 'TIMEOUT' }));
        }, timeoutMs);
      })]);
      f.observed = true;
      if (flights.get(id) === f) flights.delete(id);
      if (!result.ok) throw result.error;
      return result.data;
    } finally { clearTimeout(timer); }
  }
  return { send, pending: () => [...flights.values()].filter(f => f.pending).length };
}
