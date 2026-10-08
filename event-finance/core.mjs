export const EF_VERSION = '2026.10.08-events.1';
export const EF_TYPES = ['Соревнования', 'День рождения', 'Мастер-класс', 'Интенсив / сборы', 'Клубный праздник', 'Другое'];
export const EF_STATUSES = ['Планируется', 'Подтверждено', 'Проведено', 'Отменено'];
export const EF_HALLS = ['Не определено', 'Не закрываем', 'Половина зала', 'Весь зал'];
export const EF_CATEGORIES = ['Персонал', 'Судьи / ведущие', 'Реклама', 'Печать / дипломы', 'Инвентарь / аренда', 'Оформление', 'Уборка', 'Еда / вода', 'Транспорт', 'Комиссии / эквайринг', 'Налоги', 'Роялти', 'Доля постоянных расходов', 'Компенсации за тренировки', 'Реализованный риск', 'Прочее'];
export const EF_RISK_STATUSES = ['Открыт', 'Снижен', 'Реализовался', 'Закрыт'];
export const efUuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export const efRound = n => Math.round((Number(n) || 0) * 100) / 100;
const efSum = (rows, f) => efRound(rows.reduce((s, r) => s + f(r), 0));
const efN = n => typeof n === 'number' && Number.isFinite(n) ? n : 0;
export const efBlank = () => ({ title: '', date: '', type: 'Соревнования', status: 'Планируется', hall: 'Не определено', start: '', end: '', responsible: '', participantsPlan: null, participantsFact: null, notes: '', factsChecked: false, income: [], expenses: [], gifts: [], closure: [], risks: [] });
export function efRow(section, id) {
  const common = { id, label: '' };
  if (section === 'income') return { ...common, kind: 'income', plan: null, fact: null, note: '' };
  if (section === 'expenses') return { ...common, category: 'Прочее', plan: null, fact: null, riskId: '', note: '' };
  if (section === 'gifts') return { ...common, recipient: '', planQty: null, planPrice: null, factQty: null, factPrice: null, note: '' };
  if (section === 'closure') return { ...common, planRevenue: null, planRetained: null, planSavedCosts: null, factRevenue: null, factRetained: null, factSavedCosts: null, note: '' };
  return { ...common, probability: null, impact: null, status: 'Открыт', mitigation: '', responsible: '' };
}
export function efCalculate(raw) {
  const c = { ...efBlank(), ...raw };
  const errors = [];
  const result = { formulaVersion: EF_VERSION, plan: {}, fact: {}, risks: {}, warnings: errors };
  for (const mode of ['plan', 'fact']) {
    const revenue = efSum(c.income, r => efN(r[mode]) * (r.kind === 'refund' ? -1 : 1));
    const expenses = efSum(c.expenses, r => efN(r[mode]));
    const gifts = efSum(c.gifts, r => efRound(efN(r[mode + 'Qty']) * efN(r[mode + 'Price'])));
    const hallLoss = efSum(c.closure, r => Math.max(0, efN(r[mode + 'Revenue']) - efN(r[mode + 'Retained']) - efN(r[mode + 'SavedCosts'])));
    const costs = efRound(expenses + gifts), profit = efRound(revenue - costs);
    const known = c.factsChecked && mode === 'fact' || c.income.some(r => r[mode] !== null) || c.expenses.some(r => r[mode] !== null)
      || c.gifts.some(r => r[mode + 'Qty'] !== null || r[mode + 'Price'] !== null) || c.closure.some(r => r[mode + 'Revenue'] !== null);
    result[mode] = { known: Boolean(known), revenue, expenses, gifts, costs, profit, hallLoss,
      economicResult: efRound(profit - hallLoss), margin: revenue > 0 ? profit / revenue * 100 : null,
      roi: costs > 0 ? profit / costs * 100 : null,
      perParticipant: efN(c[mode === 'plan' ? 'participantsPlan' : 'participantsFact']) > 0 ? efRound(profit / c[mode === 'plan' ? 'participantsPlan' : 'participantsFact']) : null };
  }
  const reserve = efSum(c.risks.filter(r => ['Открыт', 'Снижен'].includes(r.status)), r => efN(r.probability) / 100 * efN(r.impact));
  result.risks = { reserve, actualBooked: efSum(c.expenses.filter(r => r.riskId), r => efN(r.fact)), open: c.risks.filter(r => ['Открыт', 'Снижен'].includes(r.status)).length };
  result.plan.afterRisk = efRound(result.plan.economicResult - reserve);
  if (!c.factsChecked) errors.push('Факт предварительный: расходы, возвраты, налоги, роялти и потери зала ещё не подтверждены.');
  if (c.income.some(r => r.fact === null) || c.expenses.some(r => r.fact === null)) errors.push('Есть статьи без фактической суммы. Пусто означает «не заполнено», 0 — подтверждённый ноль.');
  if (c.gifts.some(r => r.factQty === null || r.factPrice === null)) errors.push('Закупка подарков заполнена не полностью.');
  if (c.hall === 'Не определено') errors.push('Укажите, закрывается ли зал.');
  if (['Половина зала', 'Весь зал'].includes(c.hall) && (!c.closure.length || c.closure.some(r => r.factRevenue === null))) errors.push('Оцените затронутые тренировки. Нулевые потери в свободном окне укажите явно.');
  if (c.risks.some(r => ['Открыт', 'Снижен'].includes(r.status) && (r.probability === null || r.impact === null))) errors.push('Часть открытых рисков ещё не оценена.');
  if (c.risks.some(r => r.status === 'Реализовался' && !c.expenses.some(e => e.riskId === r.id && e.fact !== null))) errors.push('Для реализованного риска укажите связанные расходы, в том числе 0 при отсутствии денежного ущерба.');
  if (c.hall !== 'Не закрываем' && c.date && new Date(c.date + 'T12:00:00Z').getUTCDay() === 5 && c.start && c.end && c.start < '20:00' && c.end > '17:00') errors.push('Пятница 17:00–20:00: пиковое время. Закрытие зала требует отдельной проверки расписания и потерь.');
  return result;
}
export function efValidate(raw) {
  const bad = msg => { throw Object.assign(Error(msg), { status: 422, code: 'EVENT_INPUT' }); };
  const obj = x => x && typeof x === 'object' && !Array.isArray(x);
  const shape = (x, keys) => { if (!obj(x) || Object.keys(x).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(x, k))) bad('Некорректные поля карточки мероприятия.'); };
  const text = (v, max, required = false) => { if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v) || required && !v.trim()) bad(required ? 'Заполните название мероприятия и каждой добавленной статьи.' : 'Текст слишком длинный или содержит недопустимые символы.'); return v.trim(); };
  const number = (v, max = 100000000, integer = false) => { if (v === null) return v; if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max || integer && !Number.isInteger(v) || Math.abs(v * 100 - Math.round(v * 100)) > 0.00001) bad('Введите неотрицательное число, не более двух знаков после запятой.'); return v; };
  shape(raw, Object.keys(efBlank()));
  const c = structuredClone(raw);
  c.title = text(c.title, 180, true); c.notes = text(c.notes, 4000); c.responsible = text(c.responsible, 180);
  if (typeof c.date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(c.date) || !Number.isFinite(Date.parse(c.date + 'T12:00:00Z')) || !new Date(c.date + 'T12:00:00Z').toISOString().startsWith(c.date)) bad('Укажите действительную дату мероприятия.');
  if (!EF_TYPES.includes(c.type) || !EF_STATUSES.includes(c.status) || !EF_HALLS.includes(c.hall) || typeof c.factsChecked !== 'boolean') bad('Проверьте тип, статус и использование зала.');
  for (const k of ['start', 'end']) if (typeof c[k] !== 'string' || c[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(c[k])) bad('Некорректное время.');
  if (Boolean(c.start) !== Boolean(c.end) || c.start && c.end <= c.start) bad('Начало и окончание задаются вместе. Окончание должно быть позже начала в тот же день.');
  number(c.participantsPlan, 10000, true); number(c.participantsFact, 10000, true);
  for (const section of ['income', 'expenses', 'gifts', 'closure', 'risks']) if (!Array.isArray(c[section])) bad('Некорректный список статей.');
  const ids = new Set();
  for (const section of ['income', 'expenses', 'gifts', 'closure', 'risks']) {
    if (!Array.isArray(c[section]) || c[section].length > 150) bad('В каждом блоке допустимо до 150 статей.');
    for (const r of c[section]) {
      shape(r, Object.keys(efRow(section, '')));
      if (!efUuid(r.id) || ids.has(r.id)) bad('Повторный или некорректный идентификатор статьи.'); ids.add(r.id);
      r.label = text(r.label, 180, true);
      if ('note' in r) r.note = text(r.note, 1000);
      if (section === 'income' || section === 'expenses') { number(r.plan); number(r.fact); }
      if (section === 'income' && !['income', 'refund'].includes(r.kind)) bad('Неизвестный вид дохода.');
      if (section === 'expenses' && (!EF_CATEGORIES.includes(r.category) || r.riskId && !c.risks.some(x => x.id === r.riskId))) bad('Выберите категорию расхода и существующий риск.');
      if (section === 'expenses') text(r.riskId, 36);
      if (section === 'gifts') { text(r.recipient, 180); for (const m of ['plan', 'fact']) { number(r[m + 'Qty'], 100000, true); number(r[m + 'Price']); if ((r[m + 'Qty'] === null) !== (r[m + 'Price'] === null)) bad('Для подарка заполните количество и цену вместе либо оставьте оба поля пустыми.'); if (efN(r[m + 'Qty']) * efN(r[m + 'Price']) > 100000000) bad('Сумма закупки превышает допустимый предел.'); } }
      if (section === 'closure') for (const m of ['plan', 'fact']) { for (const k of ['Revenue', 'Retained', 'SavedCosts']) number(r[m + k]); if ((efN(r[m + 'Retained']) || efN(r[m + 'SavedCosts'])) && r[m + 'Revenue'] === null) bad('Укажите исходный доход затронутых тренировок.'); if (efN(r[m + 'Retained']) > efN(r[m + 'Revenue'])) bad('Сохранённый доход не может превышать исходный доход тренировок.'); }
      if (section === 'risks') { number(r.probability, 100); number(r.impact); text(r.mitigation, 1000); text(r.responsible, 180); if (!EF_RISK_STATUSES.includes(r.status)) bad('Некорректный статус риска.'); }
    }
  }
  return c;
}
