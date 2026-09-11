import test from 'node:test';
import assert from 'node:assert/strict';
import { smmDefaults, smmPlan, smmScore } from './src/smm-core.mjs';
function fixture() { return { events: [], smm: { config: smmDefaults('2026-08-01'), entries: {} } }; }
function complete(data, kinds) {
  for (const slot of smmPlan(data, '2026-08').filter(s => kinds.includes(s.kind))) {
    data.smm.entries[slot.id] = { id: slot.id, date: slot.date, kind: slot.kind,
      links: slot.platform ? [{ platform: slot.platform, url: '', views: null }] : [],
      storyFrames: 3, eventIds: [], status: 'approved' };
  }
}
test('Approved full-month base and four-part cap', () => {
  const d = fixture(), r = smmScore(d, '2026-08');
  assert.equal(r.base, 25000); assert.equal(r.stories.max, 10000);
  assert.equal(r.posts.max, 7500); assert.equal(r.production.max, 7500);
  complete(d, ['story', 'post', 'video', 'shoot']);
  assert.equal(smmScore(d, '2026-08').estimate, 50000);
});
for (const [kinds, expected] of [[['story'], 35000], [['post'], 32500], [['video', 'shoot'], 32500]]) {
  test('Independent bonus bucket ' + kinds.join('+'), () => { const d = fixture(); complete(d, kinds); assert.equal(smmScore(d, '2026-08').estimate, expected); });
}
test('Three separate accepted story records fulfil one daily platform slot', () => {
  const d = fixture();
  for (let i = 0; i < 3; i++) d.smm.entries['story-' + i] = { id: 'story-' + i,
    date: '2026-08-02', kind: 'story', storyFrames: 1, eventIds: [], status: 'approved',
    links: [{ platform: 'instagram', url: '', views: null }] };
  const r = smmScore(d, '2026-08'); assert.equal(r.stories.done, 1);
  assert.equal(r.slots.filter(s => s.entryId).length, 1);
});
test('Two accepted frames plus one pending frame do not complete the day', () => {
  const d = fixture();
  d.smm.entries.a = { id: 'a', date: '2026-08-02', kind: 'story', storyFrames: 2, eventIds: [], status: 'approved', links: [{ platform: 'instagram', views: null }] };
  d.smm.entries.b = { ...d.smm.entries.a, id: 'b', storyFrames: 1, status: 'pending' };
  assert.equal(smmScore(d, '2026-08').stories.done, 0);
});
