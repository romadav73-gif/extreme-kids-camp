// Inside the existing club closure. Password input never enters club state.
let p65Busy = false;
const p65UsersBefore = s65Users;
s65Users = async function () {
  await p65UsersBefore();
  if (s65Actor?.role !== 'owner') return;
  const modal = document.getElementById('modalBody');
  if (!modal) return;
  const help = document.createElement('p');
  help.className = 'p65-help';
  help.textContent = 'Пароли сотрудников не отображаются. Для восстановления доступа используйте «Задать пароль». Новый пароль можно показать и скопировать при вводе.';
  modal.prepend(help);
  for (const user of h65Users) {
    if (!user.active || !user.activated || user.role === 'owner' || user.id === s65Actor.id) continue;
    const anchor = Array.from(modal.querySelectorAll('[data-action="h65Access"]'))
      .find(button => button.dataset.id === user.id);
    if (!anchor) continue;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-ghost';
    button.dataset.action = 'p65Reset'; button.dataset.id = user.id;
    button.textContent = 'Задать пароль'; anchor.after(button);
  }
};
function p65ResetForm(id) {
  if (s65Actor?.role !== 'owner') return;
  const user = h65Users.find(item => item.id === id);
  if (!user?.active || !user.activated || user.role === 'owner') return;
  openModal({
    title: 'Новый пароль · ' + user.displayName,
    subtitle: 'Логин: ' + user.username + '. Пароль сотрудника изменится только после подтверждения.',
    body: `<form id="p65ResetForm" class="form-grid" autocomplete="off" data-user-id="${esc(user.id)}" data-request-id="${crypto.randomUUID()}">
      <p class="full p65-help">Текущий пароль хранится как необратимый хеш. Показать можно только новый пароль, который вы задаёте сейчас.</p>
      <div class="field full"><label for="p65New">Новый пароль сотрудника</label>
        <input id="p65New" class="input" type="password" name="password" required minlength="12" maxlength="128" autocomplete="new-password" spellcheck="false" autocapitalize="none">
        <div class="p65-tools">
          <button type="button" class="btn btn-small btn-ghost" data-action="p65Reveal" aria-controls="p65New p65Confirm" aria-pressed="false">Показать</button>
          <button type="button" class="btn btn-small btn-ghost" data-action="p65Generate">Сгенерировать</button>
          <button type="button" class="btn btn-small btn-ghost" data-action="p65Copy">Скопировать</button>
        </div>
      </div>
      <div class="field full"><label for="p65Confirm">Повторите новый пароль</label>
        <input id="p65Confirm" class="input" type="password" name="confirmation" required minlength="12" maxlength="128" autocomplete="new-password" spellcheck="false" autocapitalize="none">
      </div>
      <div class="field full"><label for="p65Owner">Ваш текущий пароль собственника</label>
        <input id="p65Owner" class="input" type="password" name="ownerPassword" required maxlength="128" autocomplete="off">
      </div>
      <label class="check full"><input type="checkbox" name="confirmed" required>
        Сотрудник сохранил работу. Я подтверждаю выход из всех его сеансов и отмену сохранённого входа на устройствах.
      </label>
      <p class="full p65-help">Передайте новый пароль лично сотруднику. После закрытия формы показать его повторно нельзя. Сотрудник сможет сменить его на свой в личном кабинете.</p>
      <p class="full p65-feedback" role="status" aria-live="polite"></p>
      ${formActions('Сохранить новый пароль')}
    </form>`
  });
}
function p65Wipe() {
  const form = document.getElementById('p65ResetForm');
  if (!form) return;
  for (const field of form.querySelectorAll('input:not([type="checkbox"])')) field.value = '';
  form.reset();
}
const p65CloseBefore = closeModal;
closeModal = function () { p65Wipe(); return p65CloseBefore(); };
window.addEventListener('pagehide', p65Wipe);
const p65ClickBefore = handleClick;
handleClick = function (event) {
  const button = event.target.closest('[data-action]');
  if (!button?.dataset.action?.startsWith('p65')) return p65ClickBefore(event);
  event.preventDefault();
  if (s65Actor?.role !== 'owner' || p65Busy) return;
  if (button.dataset.action === 'p65Reset') return p65ResetForm(button.dataset.id);
  const form = document.getElementById('p65ResetForm');
  if (!form) return;
  const password = form.elements.password, confirmation = form.elements.confirmation;
  const feedback = form.querySelector('.p65-feedback');
  if (button.dataset.action === 'p65Reveal') {
    const show = password.type === 'password';
    password.type = confirmation.type = show ? 'text' : 'password';
    button.textContent = show ? 'Скрыть' : 'Показать';
    button.setAttribute('aria-pressed', String(show));
  } else if (button.dataset.action === 'p65Generate') {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const value = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => alphabet[byte & 63]).join('');
    password.value = confirmation.value = value;
    form.dataset.requestId = crypto.randomUUID();
    feedback.textContent = 'Новый пароль подготовлен. Пока не сохранён.';
  } else if (button.dataset.action === 'p65Copy') {
    if (password.value.length < 12) { feedback.textContent = 'Сначала введите или сгенерируйте новый пароль.'; return; }
    if (!navigator.clipboard?.writeText) { feedback.textContent = 'Нажмите «Показать» и скопируйте новый пароль вручную.'; return; }
    navigator.clipboard.writeText(password.value)
      .then(() => { feedback.textContent = 'Скопирован только новый пароль. Передайте его лично.'; })
      .catch(() => { feedback.textContent = 'Копирование недоступно. Нажмите «Показать» и скопируйте вручную.'; });
  }
};
document.addEventListener('input', event => {
  if (event.target.closest('#p65ResetForm') && event.target.name === 'password' && !p65Busy) {
    event.target.form.dataset.requestId = crypto.randomUUID();
  }
});
const p65SubmitBefore = handleSubmit;
handleSubmit = function (event) {
  const form = event.target;
  if (form.id !== 'p65ResetForm') return p65SubmitBefore(event);
  event.preventDefault();
  if (p65Busy || s65Actor?.role !== 'owner') return;
  const feedback = form.querySelector('.p65-feedback');
  if (!form.reportValidity()) return;
  if (form.elements.password.value !== form.elements.confirmation.value) {
    feedback.textContent = 'Новые пароли не совпадают. Ничего не изменено.'; return;
  }
  p65Busy = true;
  const controls = Array.from(form.querySelectorAll('button,input'));
  const body = JSON.stringify({
    userId: form.dataset.userId, requestId: form.dataset.requestId,
    password: form.elements.password.value, ownerPassword: form.elements.ownerPassword.value,
    confirm: form.elements.confirmed.checked
  });
  controls.forEach(control => { control.disabled = true; });
  feedback.textContent = 'Проверяем подтверждение и сохраняем новый пароль…';
  s65Fetch('/api/owner-password', { method: 'POST', body })
    .then(result => {
      if (!result?.ok) throw Error('Сервер не подтвердил изменение пароля.');
      if (form.isConnected) { p65Wipe(); closeModal(); }
      toast('Новый пароль сохранён', 'Сотруднику нужно войти заново. Прежние сеансы и сохранённые устройства отозваны.');
    })
    .catch(error => {
      if (form.isConnected) {
        form.elements.ownerPassword.value = '';
        feedback.textContent = error.status >= 500 || !error.status
          ? 'Ответ не получен. Смена могла завершиться: повторите с тем же новым паролем для проверки. ' + error.message
          : error.message;
      } else { toast('Смена пароля не подтверждена', 'Откройте управление доступами и проверьте результат.', 'error'); }
    })
    .finally(() => { p65Busy = false; controls.forEach(control => { control.disabled = false; }); });
};
const p65Style = document.createElement('style');
p65Style.textContent = '.p65-help{color:var(--muted);font-size:14px;line-height:1.6;overflow-wrap:anywhere}.p65-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.p65-feedback{color:#eac774;min-height:24px;margin:0;overflow-wrap:anywhere}#p65ResetForm .full{grid-column:1/-1}#p65ResetForm input{min-width:0;max-width:100%}#p65ResetForm .check{align-items:flex-start;line-height:1.5}';
document.head.appendChild(p65Style);
