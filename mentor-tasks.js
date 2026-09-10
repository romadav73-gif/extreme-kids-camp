// Growth OS 6.5: one task form, multiple independent recipients.
// Uses existing authenticated atomic state patches; no schema or role changes.
const mt65CanAssign = () => !!s65Actor && canSeeAllTasks();
const mt65People = () => (state?.people || []).filter(p => p.active !== false
  && !p.archivedAt && !p.deletedAt
  && ['owner', 'manager', 'stas', 'mentor', 'admin'].includes(p.role));

function mt65Selection(form) {
  return Array.from(form.querySelectorAll('[name="taskRecipients"]:checked'))
    .map(input => input.value);
}
function mt65UpdateCount(form) {
  const count = mt65Selection(form).length;
  const text = form.querySelector('[data-mt65-count]');
  if (text) text.textContent = `Выбрано сотрудников: ${count}`;
  const error = form.querySelector('[data-mt65-error]');
  if (error) error.textContent = '';
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.textContent = count > 1 ? `Поставить задачу ${count} сотрудникам` : 'Поставить задачу';
}

const mt65TaskModal = taskModal;
taskModal = function (item = null, owner = '') {
  mt65TaskModal(item, owner);
  if (item || !mt65CanAssign()) return;
  const form = document.getElementById('taskForm');
  const select = form?.querySelector('select[name="ownerId"]');
  const field = select?.closest('.field');
  if (!form || !field) return;
  form.dataset.mt65Multi = 'true';
  const initial = owner || s65Actor.personId;
  const choices = document.createElement('fieldset');
  choices.className = 'field span-2 mt65-recipients';
  choices.innerHTML = `<legend>Кому поставить задачу</legend>
    <p>Отметь одного или нескольких сотрудников. У каждого будет своя задача и свой статус выполнения.</p>
    <div class="mt65-tools">
      <button type="button" class="btn btn-small btn-ghost" data-action="mt65Select" data-mode="mentors">Все наставники</button>
      <button type="button" class="btn btn-small btn-ghost" data-action="mt65Select" data-mode="all">Вся команда</button>
      <button type="button" class="btn btn-small btn-ghost" data-action="mt65Select" data-mode="none">Снять выбор</button>
    </div>
    <div class="mt65-people">${mt65People().map(p => `<label class="mt65-person">
      <input type="checkbox" name="taskRecipients" value="${esc(p.id)}"
        data-staff-role="${esc(p.role)}" ${p.id === initial ? 'checked' : ''}>
      <span><b>${esc(p.name)}</b><small>${esc(p.title || p.role)}</small></span>
    </label>`).join('')}</div>
    <small data-mt65-count role="status"></small>
    <p data-mt65-error class="mt65-error" role="alert"></p>`;
  field.replaceWith(choices);
  choices.addEventListener('change', () => mt65UpdateCount(form));
  const subtitle = document.getElementById('modalSubtitle');
  if (subtitle) subtitle.textContent = 'Одно описание и дедлайн — отдельное выполнение каждым сотрудником';
  mt65UpdateCount(form);
};

const mt65Click = handleClick;
handleClick = function (event) {
  const control = event.target.closest('[data-action="mt65Select"]');
  if (!control) return mt65Click(event);
  event.preventDefault();
  const form = control.closest('#taskForm');
  if (!form || !mt65CanAssign()) return;
  for (const input of form.querySelectorAll('[name="taskRecipients"]')) {
    input.checked = control.dataset.mode === 'all'
      || control.dataset.mode === 'mentors' && ['mentor', 'stas'].includes(input.dataset.staffRole);
  }
  mt65UpdateCount(form);
};

const mt65Submit = handleSubmit;
handleSubmit = function (event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return mt65Submit(event);
  if (form.id !== 'taskForm' || form.dataset.mt65Multi !== 'true') return mt65Submit(event);
  event.preventDefault();
  if (form.dataset.mt65Saving === 'true') return;
  const showError = message => {
    const box = form.querySelector('[data-mt65-error]');
    if (box) box.textContent = message;
  };
  if (!mt65CanAssign()) { showError('Нет прав назначать задачи другим сотрудникам.'); return; }
  if (!form.reportValidity()) return;
  const owners = Array.from(new Set(mt65Selection(form)));
  const allowed = new Set(mt65People().map(person => person.id));
  if (!owners.length) { showError('Выбери хотя бы одного сотрудника.'); return; }
  if (owners.some(id => !allowed.has(id))) {
    showError('Состав команды изменился. Открой форму заново и проверь получателей.'); return;
  }
  if (owners.length > 100) { showError('За один раз можно выбрать не больше 100 сотрудников.'); return; }
  const values = formValues(form);
  const title = String(values.title || '').trim();
  if (!title) { showError('Укажи название задачи, а не только пробелы.'); return; }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.monthKey || '')
      || !state.months[values.monthKey]) { showError('Выбери месяц задачи.'); return; }
  if (values.deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(values.deadline)
      || !Number.isFinite(Date.parse(values.deadline + 'T12:00:00Z'))
      || !new Date(values.deadline + 'T12:00:00Z').toISOString().startsWith(values.deadline))) {
    showError('Проверь дату дедлайна.'); return;
  }
  if (!TASK_COLUMNS.some(([status]) => status === values.status)
      || !['high', 'medium', 'low'].includes(values.priority)) {
    showError('Проверь статус и приоритет.'); return;
  }
  if (s65Conflict) { showError('Сначала разреши конфликт синхронизации текущих данных.'); return; }
  if (s65Changes().length + owners.length > 300) {
    showError('Сначала синхронизируй накопленные изменения, затем сохрани задачи.'); return;
  }
  const stamp = nowIso();
  const tasks = owners.map(ownerId => ({
    id: 'task_' + crypto.randomUUID(), title, description: String(values.description || ''),
    ownerId, monthKey: values.monthKey, deadline: values.deadline || '',
    priority: values.priority, status: values.status,
    required: form.elements.required?.checked === true,
    createdBy: s65Actor.personId, createdAt: stamp, updatedAt: stamp
  }));
  try {
    // Validate every record before changing any local state. One existing sync
    // packet applies the whole batch transactionally and safely retries its ID.
    S65.validateJson(tasks);
    form.dataset.mt65Saving = 'true';
    state.tasks.push(...tasks);
    closeModal();
    touch(`Задача для ${tasks.length} сотрудников: ${title}`);
    toast(tasks.length > 1 ? `Создано задач: ${tasks.length}` : 'Задача создана',
      'Идёт синхронизация. Статус сохранения указан внизу меню. Каждый выполняет свою задачу.');
  } catch (error) {
    form.dataset.mt65Saving = 'false';
    showError(error.message || 'Не удалось создать задачи.');
  }
};

const mt65Style = document.createElement('style');
mt65Style.id = 'ek65-mentor-multi-tasks';
mt65Style.textContent = `
  .mt65-recipients { min-inline-size: 0; min-width: 0; border: 0; padding: 0; margin: 0; }
  .mt65-recipients legend { margin: 0 0 6px; font-weight: 600; color: var(--text); }
  .mt65-recipients > p { margin: 0 0 10px; font-size: 13px; line-height: 1.5; }
  .mt65-tools { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .mt65-people { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  #taskForm .mt65-person { display: flex; align-items: center; gap: 10px; min-width: 0;
    padding: 10px 12px; border: 1px solid var(--border, #393629); border-radius: 11px; cursor: pointer; }
  #taskForm .mt65-person:has(input:checked) { border-color: #d0b14e; background: #d0b14e0d; }
  #taskForm .mt65-person > input { width: 17px; height: 17px; flex: 0 0 17px;
    margin: 0; accent-color: #d0b14e; }
  #taskForm .mt65-person > span { min-width: 0; }
  #taskForm .mt65-person b { display: block; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  #taskForm .mt65-person small { display: block; font-size: 11px; line-height: 1.4;
    color: var(--muted, #aaa18d); overflow-wrap: anywhere; }
  #taskForm [data-mt65-count] { display: block; margin: 10px 0 0; color: var(--muted, #aaa18d); }
  #taskForm .mt65-error { color: #edb58c; margin: 8px 0 0; }
  @media (max-width: 540px) { .mt65-people { grid-template-columns: minmax(0, 1fr); }
    #taskForm .form-actions { flex-wrap: wrap; } }
`;
document.head.appendChild(mt65Style);
