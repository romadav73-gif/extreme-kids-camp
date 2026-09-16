// Student attendance is observational: it never changes mentor payroll or KPI.
function rg65StudentStats(data, groupId, childId, now, from = '', to = now) {
  const counters = { present: 0, sick: 0, warned: 0, vacation: 0, freeze: 0, noShow: 0, unknown: 0 };
  const memberships = (data.attendanceMemberships || []).filter(m => m.groupId === groupId && m.childId === childId);
  const child = (data.attendanceChildren || []).find(c => c.id === childId);
  const rows = [], seen = new Set();
  for (const session of data.attendanceSessions || []) {
    if (seen.has(session.id) || session.deletedAt || session.active === false || session.mode === 'planned'
      || session.status === 'cancelled' || session.cancelled === true || session.groupId !== groupId
      || !session.date || session.date > now || session.date > to || (from && session.date < from)) continue;
    seen.add(session.id);
    const record = (session.records || []).find(r => r.childId === childId);
    const wasMember = memberships.some(m => !m.deletedAt && (!m.startDate || m.startDate <= session.date)
      && (!m.endDate || m.endDate >= session.date));
    if (!record && !wasMember) continue;
    const status = record && Object.hasOwn(counters, record.status) ? record.status : 'unknown';
    counters[status]++;
    rows.push({ sessionId: session.id, date: session.date, status, name: child?.name || record?.nameSnapshot || 'Ученик',
      recorded: Boolean(record), groupId, notes: session.notes || '' });
  }
  rows.sort((a, b) => b.date.localeCompare(a.date) || a.sessionId.localeCompare(b.sessionId));
  const misses = counters.sick + counters.warned + counters.noShow, counted = counters.present + misses;
  const cutoff = new Date(now + 'T12:00:00Z'); cutoff.setUTCDate(cutoff.getUTCDate() - 27);
  const recent = rows.filter(r => r.date >= cutoff.toISOString().slice(0, 10) && ['present', 'sick', 'warned', 'noShow'].includes(r.status));
  const recentPresent = recent.filter(r => r.status === 'present').length;
  let streak = 0;
  for (const row of rows) { if (!['sick', 'warned', 'noShow'].includes(row.status)) break; streak++; }
  return { ...counters, misses, pauses: counters.vacation + counters.freeze, counted,
    percent: counted ? counters.present / counted * 100 : null,
    recentCounted: recent.length, recentPresent, recentPercent: recent.length ? recentPresent / recent.length * 100 : null,
    streak, lastVisit: rows.find(r => r.status === 'present')?.date || null, rows };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { rg65StudentStats };
