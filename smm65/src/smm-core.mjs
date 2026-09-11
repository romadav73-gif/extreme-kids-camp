// Pure plan and score functions shared by the UI and the authoritative server.
export const SMM_PLATFORMS = { instagram: 'Instagram', vk: 'ВКонтакте', telegram: 'Telegram', tiktok: 'TikTok', likee: 'Likee' };
export const SMM_KINDS = { story: 'Сторис', post: 'Пост', video: 'Короткое видео', shoot: 'Съёмка', film: 'Мини-фильм' };
export const smmDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const smmValidDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x + 'T12:00:00Z')) && new Date(x + 'T12:00:00Z').toISOString().slice(0, 10) === x;
export const smmAddDays = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
export const smmDistance = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
export function smmDefaults(start = smmDay()) {
  const end = new Date(start + 'T12:00:00Z'); end.setUTCMonth(end.getUTCMonth() + 2);
  return { version: 1, personId: 'karina', start, end: smmAddDays(end.toISOString().slice(0, 10), -1),
    base: 25000, regularBonus: 15000, productionBonus: 10000, cap: 50000,
    storyPlatforms: ['instagram', 'vk', 'telegram'], postPlatforms: ['instagram', 'vk', 'telegram'],
    videoPlatforms: ['instagram', 'vk', 'tiktok', 'likee'], postEvery: 2, storyFrames: 3,
    videoDays: [2, 5], shootDays: [2, 5], workDays: [1, 2, 4, 5], accounts: {} };
}
export function smmMonthDates(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Некорректный месяц.');
  const first = month + '-01', days = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  return Array.from({ length: days }, (_, i) => smmAddDays(first, i));
}
export function smmRules(data, month) {
  const config = data.smm?.config || smmDefaults();
  return { ...config, ...(data.smm?.rulesByMonth?.[month] || {}) };
}
export function smmUrl(value) {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > 1600) throw Error('Ссылка слишком длинная.');
  const u = new URL(value.trim());
  if (u.protocol !== 'https:' || u.username || u.password || u.port || !u.hostname.includes('.')
      || /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)
      || /[\[\]:]/.test(u.hostname) || /^\d+(\.\d+){3}$/.test(u.hostname)) throw Error('Нужна публичная HTTPS-ссылка без логина и пароля.');
  u.hash = ''; for (const k of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|igsh|igshid|si)$/.test(k)) u.searchParams.delete(k);
  u.searchParams.sort(); return u.toString();
}
export function smmPlatformUrl(platform, value) {
  const normalized = smmUrl(value); if (!normalized) return '';
  const host = new URL(normalized).hostname.toLowerCase();
  const domains = { instagram: ['instagram.com'], vk: ['vk.com', 'vk.ru', 'vkvideo.ru'], telegram: ['t.me', 'telegram.me'], tiktok: ['tiktok.com'], likee: ['likee.video', 'likee.com'] };
  if (!(domains[platform] || []).some(d => host === d || host.endsWith('.' + d))) throw Error('Ссылка не соответствует площадке ' + SMM_PLATFORMS[platform] + '.');
  return normalized;
}
export function smmPlan(data, month) {
  const rules = smmRules(data, month), map = new Map();
  const add = (date, kind, platform, label, event = null) => {
    if (date.slice(0, 7) !== month || date < rules.start) return;
    const id = [kind, date, platform || 'source'].join(':');
    if (!map.has(id)) map.set(id, { id, date, kind, platform: platform || '', label, eventIds: [], required: true });
    const slot = map.get(id);
    if (event) { slot.eventIds.push(event.id); slot.label = label; }
  };
  for (const date of smmMonthDates(month).filter(d => d >= rules.start)) {
    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    for (const p of rules.storyPlatforms) add(date, 'story', p, 'Жизнь клуба · от ' + rules.storyFrames + ' сторис');
    if (smmDistance(rules.start, date) % rules.postEvery === 0) for (const p of rules.postPlatforms) add(date, 'post', p, 'Пост по контент-плану');
    if (rules.videoDays.includes(dow)) for (const p of rules.videoPlatforms) add(date, 'video', p, 'Короткое видео · монтаж и публикация');
    if (rules.shootDays.includes(dow)) add(date, 'shoot', '', 'Съёмка тренировки / интервью · сохранить исходники');
  }
  for (const e of (data.events || []).filter(e => !e.deletedAt && !['cancelled', 'canceled', 'отменено', 'Отменено'].includes(e.status) && smmValidDate(e.date))) {
    for (const p of rules.postPlatforms) {
      add(smmAddDays(e.date, -3), 'post', p, 'Анонс: ' + e.title, e);
      add(smmAddDays(e.date, 1), 'post', p, 'Итоги: ' + e.title, e);
    }
    add(e.date, 'shoot', '', 'Снять мероприятие: ' + e.title, e);
    for (const p of rules.storyPlatforms) add(e.date, 'story', p, 'Сторис с мероприятия: ' + e.title, e);
  }
  const exceptions = data.smm?.exceptions || {};
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || a.platform.localeCompare(b.platform))
    .map(slot => ({ ...slot, exception: exceptions[slot.id] || null }));
}
export function smmScore(data, month, now = smmDay()) {
  const rules = smmRules(data, month), allDates = smmMonthDates(month), active = allDates.filter(d => d >= rules.start && d <= rules.end);
  const slots = smmPlan(data, month), entries = Object.values(data.smm?.entries || {}).filter(e => e.date?.startsWith(month) && !e.deletedAt);
  const approved = entries.filter(e => e.status === 'approved');
  const matched = new Map();
  for (const slot of slots) {
    const e = approved.find(e => e.date === slot.date && e.kind === slot.kind
      && (!slot.platform || e.links.some(l => l.platform === slot.platform))
      && (slot.kind !== 'story' || e.storyFrames >= rules.storyFrames)
      && (!slot.eventIds.length || slot.eventIds.every(id => e.eventIds.includes(id))));
    if (e) matched.set(slot.id, e.id);
  }
  const eligible = slots.filter(s => !s.exception && active.includes(s.date));
  const fraction = active.length / allDates.length;
  const regular = eligible.filter(s => ['story', 'post'].includes(s.kind));
  const production = eligible.filter(s => ['video', 'shoot'].includes(s.kind));
  const done = list => list.filter(s => matched.has(s.id)).length;
  const ratio = list => list.length ? done(list) / list.length : 0;
  const base = Math.round(rules.base * fraction), regularMax = Math.round(rules.regularBonus * fraction), productionMax = Math.round(rules.productionBonus * fraction), cap = Math.round(rules.cap * fraction);
  const regularEarned = Math.round(regularMax * ratio(regular)), productionEarned = Math.round(productionMax * ratio(production));
  const channels = Object.keys(SMM_PLATFORMS).map(platform => {
    const planned = slots.filter(s => s.platform === platform && !s.exception);
    const links = entries.flatMap(e => e.links.filter(l => l.platform === platform).map(l => ({ ...l, status: e.status })));
    return { platform, planned: planned.length, accepted: done(planned), submitted: links.length, views: links.reduce((n, l) => n + (l.views || 0), 0) };
  });
  return { month, rules, activeDays: active.length, daysInMonth: allDates.length, slots: slots.map(s => ({ ...s, entryId: matched.get(s.id) || null })),
    regular: { planned: regular.length, done: done(regular), max: regularMax, earned: regularEarned },
    production: { planned: production.length, done: done(production), max: productionMax, earned: productionEarned },
    base, cap, estimate: Math.min(cap, base + regularEarned + productionEarned),
    active: active.length > 0, lastActive: active.at(-1) || null, canClose: active.length > 0 && active.at(-1) < now,
    pending: entries.filter(e => e.status === 'pending').length, approved: approved.length,
    units: entries.length, channels, final: data.smm?.payroll?.[month] || null };
}
