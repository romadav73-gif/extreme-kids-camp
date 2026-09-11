'use strict';
// Exact source adjustments for the approved 25k + 10k + 7.5k + 7.5k pilot.
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] || 'smm65';
if (fs.readFileSync(path.join(root, 'src/smm-core.mjs'), 'utf8').includes('storyBonus: 10000')) {
  console.log('Approved SMM rates already integrated');
  process.exit(0);
}
function edit(file, edits) {
  const p = path.join(root, file); let text = fs.readFileSync(p, 'utf8');
  for (const [before, after, multiple = false] of edits) {
    const count = text.split(before).length - 1;
    if (!count || !multiple && count !== 1) throw Error('Source anchor mismatch: ' + file + ': ' + before.slice(0, 80));
    text = multiple ? text.split(before).join(after) : text.replace(before, after);
  }
  fs.writeFileSync(p, text);
}
edit('src/smm-core.mjs', [
 ['base: 25000, regularBonus: 15000, productionBonus: 10000, cap: 50000,', 'base: 25000, storyBonus: 10000, postBonus: 7500, productionBonus: 7500, cap: 50000,'],
 ["    const e = approved.find(e => e.date === slot.date && e.kind === slot.kind\n      && (!slot.platform || e.links.some(l => l.platform === slot.platform))\n      && (slot.kind !== 'story' || e.storyFrames >= rules.storyFrames)\n      && (!slot.eventIds.length || slot.eventIds.every(id => e.eventIds.includes(id))));\n    if (e) matched.set(slot.id, e.id);", "    const candidates = approved.filter(e => e.date === slot.date && e.kind === slot.kind\n      && (!slot.platform || e.links.some(l => l.platform === slot.platform)));\n    if (slot.kind === 'story') {\n      const frames = candidates.reduce((n, e) => n + e.storyFrames, 0);\n      if (frames >= rules.storyFrames && slot.eventIds.every(id => candidates.some(e => e.eventIds.includes(id))))\n        matched.set(slot.id, candidates[0].id);\n    } else {\n      const e = candidates.find(e => slot.eventIds.every(id => e.eventIds.includes(id)));\n      if (e) matched.set(slot.id, e.id);\n    }"],
 ["  const regular = eligible.filter(s => ['story', 'post'].includes(s.kind));", "  const stories = eligible.filter(s => s.kind === 'story');\n  const posts = eligible.filter(s => s.kind === 'post');\n  const regular = [...stories, ...posts];"],
 ["  const base = Math.round(rules.base * fraction), regularMax = Math.round(rules.regularBonus * fraction), productionMax = Math.round(rules.productionBonus * fraction), cap = Math.round(rules.cap * fraction);\n  const regularEarned = Math.round(regularMax * ratio(regular)), productionEarned = Math.round(productionMax * ratio(production));", "  const base = Math.round(rules.base * fraction), storyMax = Math.round(rules.storyBonus * fraction), postMax = Math.round(rules.postBonus * fraction), productionMax = Math.round(rules.productionBonus * fraction), cap = Math.round(rules.cap * fraction);\n  const storyEarned = Math.round(storyMax * ratio(stories)), postEarned = Math.round(postMax * ratio(posts));\n  const regularMax = storyMax + postMax, regularEarned = storyEarned + postEarned, productionEarned = Math.round(productionMax * ratio(production));"],
 ["    regular: { planned: regular.length", "    stories: { planned: stories.length, done: done(stories), max: storyMax, earned: storyEarned },\n    posts: { planned: posts.length, done: done(posts), max: postMax, earned: postEarned },\n    regular: { planned: regular.length"]
]);
edit('src/smm-server.mjs', [
 ["'regularBonus'", "'storyBonus', 'postBonus'", true],
 ['raw.base + raw.regularBonus + raw.productionBonus', 'raw.base + raw.storyBonus + raw.postBonus + raw.productionBonus'],
 ['const previous = next.entries[body.id]; version(previous, body.version);', "const previous = next.entries[body.id]; version(previous, body.version);\n        if (previous?.deletedAt) fail(409, 'SMM_DELETED', 'Материал удалён. Создайте новую запись.');"],
 ["      const other = e.links.map(l => l.url).filter(Boolean);", "      if (candidate.kind === 'story' && e.kind === 'story' && candidate.archiveUrl\n          && e.archiveUrl === candidate.archiveUrl && candidate.links.some(l => e.links.some(x => x.platform === l.platform)))\n        fail(409, 'SMM_DUPLICATE', 'Это подтверждение сторис уже использовано для выбранной площадки.');\n      const other = e.links.map(l => l.url).filter(Boolean);"]
]);
edit('src/smm-ui.js', [
 ["'regularBonus', 'productionBonus'", "'storyBonus', 'postBonus', 'productionBonus'", true],
 ["['regularBonus', 'Бонус за регулярность']", "['storyBonus', 'Бонус за ежедневные сторис'], ['postBonus', 'Бонус за план постов']"],
 ["['Регулярность публикаций', score.regular.earned, score.regular.max, `${score.regular.done} из ${score.regular.planned} пунктов приняты`]", "['Ежедневные сторис', score.stories.earned, score.stories.max, `${score.stories.done} из ${score.stories.planned} пунктов приняты`], ['План постов', score.posts.earned, score.posts.max, `${score.posts.done} из ${score.posts.planned} пунктов приняты`]"]
]);
edit('tests/server.test.mjs', [["'regularBonus', 'productionBonus'", "'storyBonus', 'postBonus', 'productionBonus'", true]]);
edit('tests/browser-test.py', [["wait_for_selector('#modal.hidden')", "wait_for_selector('#modal', state='hidden')", true]]);
console.log('Approved SMM pilot rates and reliability repairs applied.');
