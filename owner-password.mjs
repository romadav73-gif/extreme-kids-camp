import { randomBytes, randomUUID, createHash, createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Buffer } from 'node:buffer';

const derive = promisify(scrypt);
const PARAMS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }); };
const same = (a, b) => typeof a === 'string' && typeof b === 'string'
  && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
let running = 0;

function checkNewPassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128
      || /^(.)\1+$/.test(value) || /^(password|qwerty|123456)/i.test(value)) {
    fail(422, 'PASSWORD_POLICY', 'Новый пароль: 12–128 символов, без очевидных последовательностей.');
  }
}
async function verify(value, encoded) {
  const parts = String(encoded || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts[1] !== '131072'
      || parts[2] !== '8' || parts[3] !== '1') return false;
  const expected = Buffer.from(parts[5], 'hex');
  const actual = await derive(value, parts[4], 64, PARAMS);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
async function encode(value) {
  const salt = randomBytes(16).toString('hex');
  const result = await derive(value, salt, 64, PARAMS);
  return `scrypt$131072$8$1$${salt}$${result.toString('hex')}`;
}
function audit(d, actor, detail, securityKey) {
  const entry = {
    id: randomUUID(), at: new Date().toISOString(), actorId: actor.id,
    workspaceId: actor.workspaceId, action: 'account.password_reset', detail,
    prev: d.audit.at(-1)?.hash || 'genesis'
  };
  entry.hash = createHmac('sha256', securityKey).update(JSON.stringify(entry)).digest('hex');
  d.audit.push(entry);
}

// New capability only. Never exposes stored passwords or password hashes.
// Existing password changes are performed only after an explicit owner request.
export function ownerPasswordController({ store, authenticate, getSecurityKey }) {
  function owner(d, sid, csrf) {
    const { user, sess } = authenticate(d, sid);
    if (!same(sess.csrf, csrf)) fail(403, 'CSRF', 'Обновите страницу и повторите действие.');
    if (user.role !== 'owner') fail(403, 'FORBIDDEN', 'Смена паролей сотрудников доступна только собственнику.');
    return user;
  }
  function employee(d, actor, id) {
    const user = Object.values(d.users).find(u => u.id === id && u.workspaceId === actor.workspaceId);
    if (!user || user.id === actor.id || user.role === 'owner') {
      fail(422, 'USER', 'Для своего пароля используйте кнопку «Пароль» в личном кабинете.');
    }
    const person = d.workspaces[actor.workspaceId]?.data.people.find(p => p.id === user.personId);
    if (!user.active || !user.passwordHash || !person || person.active === false
        || person.deletedAt || person.archivedAt) {
      fail(422, 'USER', 'У сотрудника должен быть активированный доступ. Для первого входа создайте приглашение.');
    }
    return user;
  }
  return async (sid, csrf, body) => {
    await store.tx(d => owner(d, sid, csrf));
    if (!body || typeof body.userId !== 'string' || body.userId.length > 128
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId || '')
        || typeof body.ownerPassword !== 'string' || !body.ownerPassword.length || body.ownerPassword.length > 128
        || body.confirm !== true) {
      fail(422, 'CONFIRM', 'Укажите новый пароль и подтвердите действие своим текущим паролем.');
    }
    checkNewPassword(body.password);
    const securityKey = await getSecurityKey();
    const fingerprint = createHmac('sha256', securityKey)
      .update(JSON.stringify(['owner-password-v1', body.userId, body.requestId, body.password])).digest('hex');
    const snapshot = await store.tx(d => {
      const actor = owner(d, sid, csrf), user = employee(d, actor, body.userId);
      const rid = 'owner-password:' + actor.id + ':' + body.requestId;
      const existing = d.requests[rid];
      if (existing?.expiresAt > Date.now()) {
        if (!same(existing.fingerprint, fingerprint)) fail(409, 'IDEMPOTENCY', 'Этот запрос уже использован для другого пароля. Откройте форму заново.');
        return { replay: { ...existing.result, replayed: true } };
      }
      const rateId = hash('owner-password:' + actor.id), now = Date.now();
      const rate = d.rates[rateId]?.until > now ? d.rates[rateId] : { n: 0, until: now + 900000 };
      if (rate.n >= 8) fail(429, 'RATE_LIMIT', 'Слишком много попыток подтверждения. Повторите через 15 минут.');
      rate.n++;
      d.rates[rateId] = rate;
      return { actorId: actor.id, actorVersion: actor.authVersion, actorHash: actor.passwordHash,
        targetVersion: user.authVersion, rateId, rid };
    });
    if (snapshot.replay) return snapshot.replay;
    if (running >= 2) fail(429, 'RATE_LIMIT', 'Сервис смены пароля занят. Повторите чуть позже.');
    running++;
    let passwordHash;
    try {
      if (!await verify(body.ownerPassword, snapshot.actorHash)) {
        fail(403, 'OWNER_PASSWORD', 'Неверный пароль собственника. Пароль сотрудника не изменён.');
      }
      passwordHash = await encode(body.password);
    } finally { running--; }
    return store.tx(d => {
      const actor = owner(d, sid, csrf), user = employee(d, actor, body.userId);
      if (actor.id !== snapshot.actorId || actor.authVersion !== snapshot.actorVersion) {
        fail(409, 'CONFLICT', 'Ваш доступ изменился. Войдите заново.');
      }
      const existing = d.requests[snapshot.rid];
      if (existing?.expiresAt > Date.now()) {
        if (!same(existing.fingerprint, fingerprint)) fail(409, 'IDEMPOTENCY', 'Запрос уже использован.');
        return { ...existing.result, replayed: true };
      }
      if (user.authVersion !== snapshot.targetVersion) {
        fail(409, 'CONFLICT', 'Доступ сотрудника изменился. Откройте форму заново.');
      }
      user.passwordHash = passwordHash;
      user.authVersion++;
      user.passwordChangedAt = new Date().toISOString();
      let sessionsRevoked = 0, devicesRevoked = 0;
      for (const [id, session] of Object.entries(d.sessions)) {
        if (session.userId === user.id) { delete d.sessions[id]; sessionsRevoked++; }
      }
      for (const [id, invite] of Object.entries(d.invites)) {
        if (invite.userId === user.id) delete d.invites[id];
      }
      const deviceIds = new Set();
      for (const [id, device] of Object.entries(d.trustedDevices || {})) {
        if (device.userId === user.id) {
          deviceIds.add(id); delete d.trustedDevices[id]; devicesRevoked++;
        }
      }
      for (const [id, challenge] of Object.entries(d.deviceChallenges || {})) {
        if (deviceIds.has(challenge.deviceId)) delete d.deviceChallenges[id];
      }
      delete d.rates[snapshot.rateId];
      const result = { ok: true, userId: user.id, username: user.username,
        changedAt: user.passwordChangedAt, sessionsRevoked, devicesRevoked };
      d.requests[snapshot.rid] = { fingerprint, result, expiresAt: Date.now() + 900000 };
      audit(d, actor, { userId: user.id, sessionsRevoked, devicesRevoked }, securityKey);
      return result;
    });
  };
}
