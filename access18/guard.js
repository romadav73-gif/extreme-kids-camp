// Inserted into the existing safe-entry module before init(). Uses its established SDK transport.
const ACCESS18_RELEASE = '2026.09.18-access.1';
const access18EventKey = 'EK65_ACCOUNT_EVENT:' + location.pathname;
const access18StopKey = 'EK65_NO_AUTO_RESUME:' + location.pathname;
let access18Closing = false, access18Generation = 0, access18ExitFlight = null;
const access18Timeout = (promise, ms = 2000) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);
const access18Read = name => { try { return JSON.parse(localStorage.getItem(name) || 'null'); } catch { return null; } };
function access18Signal(actorId) {
  if (!actorId) return;
  const event = { actorId, at: Date.now(), nonce: crypto.randomUUID() };
  try { localStorage.setItem(access18EventKey, JSON.stringify(event)); } catch { /* Channel also works when storage is unavailable. */ }
  try { access18Channel?.postMessage(event); } catch { /* No cross-tab capability. */ }
}
let access18Channel = null;
try { access18Channel = new BroadcastChannel('EK65_EXIT:' + location.pathname); } catch { /* storage event fallback */ }
function access18MarkStopped() {
  try { localStorage.setItem(access18StopKey, 'true'); } catch { /* gate still never enters a remembered account automatically */ }
}
function access18Unstop() { try { localStorage.removeItem(access18StopKey); } catch { /* optional device sign-in may remain unavailable */ } }
function access18HasStopped() { try { return localStorage.getItem(access18StopKey) === 'true'; } catch { return false; } }
function access18HidePrivate() {
  for (const id of ['appShell', 'mobileNav', 'modal', 'rolePopover']) document.getElementById(id)?.classList.add('hidden');
}
async function access18ExternalExit(event) {
  if (!event?.actorId || event.actorId !== login?.actorId || event.at < Number(login?.signedAt || 0)) return;
  access18Closing = true; access18Generation++; access18HidePrivate(); access18MarkStopped();
  try { await access18Timeout(Promise.resolve(window.EK65Exit?.preserveDraft?.()), 3000); } catch { /* No unencrypted draft export. */ }
  clearLogin();
  location.replace(base() + '#login');
}
if (access18Channel) access18Channel.onmessage = e => { void access18ExternalExit(e.data); };
window.addEventListener('storage', e => { if (e.key === access18EventKey && e.newValue) { try { void access18ExternalExit(JSON.parse(e.newValue)); } catch { /* malformed local event */ } } });
window.addEventListener('pageshow', () => { void access18ExternalExit(access18Read(access18EventKey)); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) void access18ExternalExit(access18Read(access18EventKey)); });
const access18StoreBefore = storeLogin;
storeLogin = function (result) {
  if (access18Closing) return;
  const prior = login;
  access18StoreBefore(result);
  login.signedAt = prior?.session === login.session ? prior.signedAt || Date.now() : Date.now();
  persistLogin();
};
const access18RestoreBefore = restore;
restore = async function () {
  if (access18Closing || access18HasStopped()) return false;
  const generation = access18Generation;
  const result = await access18RestoreBefore();
  return generation === access18Generation && !access18Closing && result;
};
const access18RequestBefore = request;
// Revoke only this browser's current session/device. Never change a user's role or other devices.
async function access18Logout(localOnly = false, navigate = true) {
  if (access18ExitFlight) return access18ExitFlight;
  access18ExitFlight = (async () => {
    const previous = login, actorId = previous?.actorId;
    access18Closing = true; access18Generation++;
    try {
      if (!localOnly && previous?.session) {
        const deviceId = await access18Timeout(device.id()) || '';
        try { await send('logout', { deviceId }); }
        catch (e) { if (!(e.status === 401 && e.code === 'AUTH_REQUIRED')) throw e; }
      }
      access18MarkStopped();
      await access18Timeout(device.forget());
      clearLogin(); access18Signal(actorId); access18HidePrivate();
      if (navigate) location.replace(base() + (localOnly ? '#login-local' : '#login'));
      return { ok: true, localOnly };
    } catch (e) { access18Closing = false; throw e; }
  })().finally(() => { access18ExitFlight = null; });
  return access18ExitFlight;
}
request = async function (url, options = {}) {
  const action = url.replace(/^\/api\//, '');
  if (action === 'logout') return access18Logout(false, false);
  if (['login', 'activate'].includes(action)) {
    // A password submission is an explicit account switch, not an implicit role selection.
    if (login?.session) await access18Logout(false, false);
    else { access18MarkStopped(); await access18Timeout(device.forget()); }
    access18Closing = false;
    const result = await access18RequestBefore(url, options);
    access18Unstop(); return result;
  }
  if (access18Closing && action !== 'health') throw Object.assign(Error('Выход из кабинета. Войдите заново.'), { status: 401, code: 'AUTH_REQUIRED' });
  const generation = access18Generation, result = await access18RequestBefore(url, options);
  if (generation !== access18Generation && action !== 'health') throw Object.assign(Error('Учётная запись в этом окне изменилась.'), { status: 409, code: 'ACCOUNT_CHANGED' });
  return result;
};
window.EK65Transport.request = request;
window.EK65Transport.logout = access18Logout;
window.EK65Transport.sharedLogin = () => base() + '#login';
window.EK65Transport.release = ACCESS18_RELEASE;
rememberChoice = function (form) {
  if (form.elements.rememberDevice) return;
  const label = document.createElement('label'); label.className = 'remember-choice';
  label.innerHTML = '<input type="checkbox" name="rememberDevice"><span>Запомнить на личном устройстве<small>Не включайте на общем телефоне или компьютере клуба.</small></span>';
  form.querySelector('button[type=submit]').before(label);
};
async function access18SavedAccount() {
  let session;
  if (login?.session) session = await request('/api/session');
  else {
    if (!await restore()) { document.getElementById('access18Saved')?.remove(); message('Сохранённый вход недоступен. Введите личный логин и пароль.'); return; }
    session = await request('/api/session');
  }
  const actor = session.actor;
  if (!actor?.id) throw Error('Сервер не подтвердил учётную запись.');
  let panel = document.getElementById('access18Saved');
  if (!panel) { panel = document.createElement('section'); panel.id = 'access18Saved'; document.getElementById('login').before(panel); }
  panel.replaceChildren();
  const text = document.createElement('p'); text.textContent = 'На этом устройстве сохранён вход: ' + (actor.displayName || actor.username) + '.';
  const open = document.createElement('button'); open.type = 'button'; open.id = 'access18Continue'; open.textContent = 'Продолжить как ' + (actor.displayName || actor.username);
  const other = document.createElement('button'); other.type = 'button'; other.id = 'access18Other'; other.textContent = 'Войти под другим логином';
  panel.append(text, open, other);
  open.addEventListener('click', async () => {
    if (formBusy) return; formBusy = true; open.disabled = true;
    try {
      const confirmed = await request('/api/session');
      if (confirmed.actor?.id !== actor.id) throw Error('Учётная запись изменилась. Выберите вход заново.');
      await app();
    } catch (e) { message(e.message); } finally { formBusy = false; open.disabled = false; }
  });
  other.addEventListener('click', async () => {
    if (formBusy) return; formBusy = true; other.disabled = true;
    try { await access18Logout(false, false); access18Closing = false; panel.remove(); document.querySelector('#login [name=username]')?.focus(); }
    catch (e) { message('Не удалось завершить прежний сеанс: ' + e.message); }
    finally { formBusy = false; other.disabled = false; }
  });
}
init = async function () {
  document.body.className = 'login-mode';
  attachForms(); enableForms();
  document.querySelector('#retry')?.addEventListener('click', () => { if (moduleFailed) location.reload(); else void health(); });
  if (invite) {
    document.getElementById('login').hidden = true; document.getElementById('activate').hidden = false;
    document.getElementById('heading').textContent = 'Ваш кабинет готов.';
    document.getElementById('intro').textContent = 'Задайте личный пароль. Приглашение не передавайте другим.';
  } else {
    const force = /^#login(?:$|-|[?&])/.test(location.hash);
    if (force) {
      document.getElementById('heading').textContent = 'Вход в свой кабинет';
      document.getElementById('intro').textContent = 'Общая ссылка не выбирает сотрудника. Введите свой личный логин и пароль.';
      if (location.hash === '#login-local') message('Вы вышли на этом устройстве. Отзыв сеанса на сервере не был подтверждён.');
    } else if (login?.session) {
      try { await access18SavedAccount(); }
      catch (e) { if (e.status === 401) clearLogin(); else message(e.message); }
    } else if (!access18HasStopped() && await device.has()) {
      const panel = document.createElement('section'); panel.id = 'access18Saved';
      const button = document.createElement('button'); button.type = 'button'; button.id = 'access18Recover'; button.textContent = 'Проверить сохранённый вход'; panel.append(button);
      document.getElementById('login').before(panel);
      button.addEventListener('click', async () => { button.disabled = true; try { await access18SavedAccount(); } catch (e) { message(e.message); } finally { button.disabled = false; } });
    }
  }
  // No state request and no cabinet rendering happens until the employee explicitly chooses an account.
  void health();
};
const access18GateStyle = document.createElement('style');
access18GateStyle.textContent = '#access18Saved{margin:16px 0;padding:16px;border:1px solid #6b5723;border-radius:16px;background:#211c0e}#access18Saved p{margin:0 0 12px;line-height:1.5;overflow-wrap:anywhere}#access18Saved button{display:block;width:100%;min-height:44px;margin:8px 0;white-space:normal;line-height:1.4}#access18Other{background:#15130e;color:#eee7d4;border:1px solid #6b5723}.login-mode fieldset{min-width:0}.login-mode input,.login-mode button{box-sizing:border-box;max-width:100%}.login-mode input{font-size:16px!important}.login-mode .remember-choice{display:flex;gap:10px;align-items:flex-start}.login-mode .remember-choice input{flex:0 0 20px;width:20px;height:20px}.login-mode .remember-choice span{min-width:0}.login-mode #message{overflow-wrap:anywhere}';
document.head.appendChild(access18GateStyle);
