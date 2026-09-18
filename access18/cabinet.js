// Inserted in the authenticated application closure, after all existing feature modules.
let ax18Busy = false;
const ax18RoleNames = { owner: 'Собственник', manager: 'Управляющая', stas: 'Руководитель направления', mentor: 'Наставник', admin: 'Администратор', smm: 'Продвижение клуба', team: 'Команда' };
function ax18Draw() {
  if (!state || !s65Actor) return;
  const main = document.querySelector('#appShell > .main'); if (!main) return;
  let bar = document.getElementById('ax18Account');
  if (!bar) {
    bar = document.createElement('section'); bar.id = 'ax18Account'; bar.className = 'ax18-account';
    bar.setAttribute('aria-label', 'Текущий сотрудник и выход'); main.prepend(bar);
  }
  const name = s65Actor.displayName || s65Actor.username;
  bar.innerHTML = `<div class="ax18-person"><span>Вы вошли как</span><b>${esc(name)}</b><small>${esc(ax18RoleNames[s65Actor.role] || 'Сотрудник')}</small></div><button type="button" class="btn ax18-exit" data-action="ax18Logout" ${ax18Busy ? 'disabled' : ''}>Выйти</button>`;
  const footer = document.querySelector('.sidebar-footer');
  if (footer && !footer.querySelector('[data-action=ax18Logout]')) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn ax18-side-exit'; button.dataset.action = 'ax18Logout'; button.textContent = 'Выйти'; footer.append(button);
  }
  const sync = document.querySelector('.top-actions [data-action=syncNow]');
  if (sync) { sync.setAttribute('aria-label', 'Синхронизировать данные'); const label = sync.querySelector('.desktop-only'); if (label) { label.classList.remove('desktop-only'); label.textContent = 'Синхронизировать'; } }
  const nav = document.getElementById('mainNav'), mobile = document.getElementById('mobileNav');
  if (!nav || !mobile) return;
  const preferences = { mentor: ['mentor','groups','attendance','tasks'], stas: ['stas','groups','attendance','tasks'], admin: ['admin','sales_daily','tasks','calendar'], manager: ['manager','groups','tasks','calendar'], owner: ['dashboard','manager','groups','tasks'], smm: ['smm','tasks','calendar'], team: ['team','calendar'] };
  const short = { mentor:'Кабинет',stas:'Кабинет',admin:'Кабинет',manager:'Главная',dashboard:'Главная',groups:'Группы',attendance:'Журнал',tasks:'Задачи',calendar:'Календарь',sales_daily:'Продажи',smm:'SMM',team:'Команда' };
  const items = (preferences[s65Actor.role] || []).filter(view => allowedView(view) && nav.querySelector(`[data-view="${view}"]`));
  mobile.innerHTML = items.map(view => {
    const source = nav.querySelector(`[data-view="${view}"]`), icon = source.querySelector('svg')?.outerHTML || ICONS.tasks;
    return `<button type="button" data-view="${view}" class="${currentView === view ? 'active' : ''}" aria-label="${esc(source.innerText || short[view])}">${icon}<span>${short[view]}</span></button>`;
  }).join('') + '<button type="button" data-action="toggleSidebar" class="ax18-all-menu" aria-label="Открыть все разделы"><span class="ax18-menu-symbol" aria-hidden="true">☰</span><span>Меню</span></button>';
  mobile.style.setProperty('--ax18-nav-count', String(items.length + 1));
}
function ax18HasPending() {
  return Boolean(s65Flight || s65Conflict || s65Changes().length || state?.ui?.sales65Pending || state?.ui?.roster65Pending);
}
async function ax18PreserveDraft() {
  clearInterval(s65Polling); clearTimeout(saveTimer);
  if (state) await persistLocal();
  await s65CacheSave;
}
window.EK65Exit = { preserveDraft: ax18PreserveDraft };
function ax18Failure(message) {
  openModal({ title: 'Выход не подтверждён', subtitle: 'Данные клуба не удалены. Черновики остаются в защищённом хранилище этого сотрудника.', body: `<p role="alert">${esc(message)}</p><p>Можно повторить попытку или закрыть доступ только на этом устройстве. Во втором случае отзыв сеанса на сервере не будет подтверждён.</p><div class="form-actions"><button type="button" class="btn btn-ghost" data-action="closeModal">Остаться</button><button type="button" class="btn btn-ghost" data-action="ax18LocalExit">Выйти на устройстве</button><button type="button" class="btn btn-primary" data-action="ax18RetryExit">Повторить выход</button></div>` });
}
async function ax18Exit(localOnly = false) {
  if (ax18Busy || !s65Actor) return;
  ax18Busy = true; ax18Draw();
  try {
    await ax18PreserveDraft();
    if (!localOnly) {
      const settled = await syncNow({ quiet: true });
      if (!settled || ax18HasPending()) throw Error('Остались неподтверждённые изменения или конфликт. Сначала завершите сохранение.');
      await ax18PreserveDraft();
    }
    await window.EK65Transport.logout(localOnly, true);
  } catch (e) {
    ax18Busy = false; setupAutoSync(); ax18Draw(); ax18Failure(e.message || 'Нет ответа от сервера.');
  }
}
const ax18ClickBefore = handleClick;
handleClick = function (event) {
  const el = event.target.closest('[data-action]'), action = el?.dataset.action;
  if (action === 'ax18Logout' || action === 's65Logout') {
    event.preventDefault();
    if (ax18Busy) return;
    const form = document.querySelector('#modal:not(.hidden) form');
    if (form && !confirm('Открытая форма ещё не отправлена. Закрыть её и выйти? Введённые только в форму значения не сохранятся.')) return;
    if (form) closeModal();
    void ax18Exit(); return;
  }
  if (action === 'ax18RetryExit') { event.preventDefault(); void ax18Exit(); return; }
  if (action === 'ax18LocalExit') {
    event.preventDefault();
    if (confirm('Выйти только на этом устройстве? Сохранённый вход будет отключён, зашифрованные черновики останутся. Серверный выход пока не подтверждён.')) void ax18Exit(true);
    return;
  }
  return ax18ClickBefore(event);
};
const ax18NavBefore = renderNav;
renderNav = function () { ax18NavBefore(); ax18Draw(); };
const ax18RenderBefore = renderCurrentView;
renderCurrentView = function () { ax18RenderBefore(); ax18Draw(); };
const ax18BootBefore = boot;
boot = async function () { await ax18BootBefore(); ax18Draw(); };
window.EK65AccountUI = { release: '2026.09.18-access.1' };
