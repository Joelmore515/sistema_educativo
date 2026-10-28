const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const WINDOW_MS = Number(process.env.LOGIN_ATTEMPT_WINDOW_MS || 15 * 60 * 1000);
const LOCK_MS = Number(process.env.LOGIN_LOCK_MS || 15 * 60 * 1000);

const attempts = new Map();

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const normalizeIp = (ip = '') => String(ip).replace(/^::ffff:/, '');

const buildKey = (email, ip) => `${normalizeEmail(email)}|${normalizeIp(ip)}`;

const pruneExpired = (now = Date.now()) => {
  if (attempts.size < 5000) return;
  for (const [key, entry] of attempts.entries()) {
    if (entry.lockedUntil <= now && entry.firstAttempt + WINDOW_MS <= now) {
      attempts.delete(key);
    }
  }
};

const getLockStatus = (email, ip) => {
  const key = buildKey(email, ip);
  const entry = attempts.get(key);
  if (!entry) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  if (entry.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000)
    };
  }

  if (entry.firstAttempt + WINDOW_MS <= now) {
    attempts.delete(key);
  }

  return { locked: false, retryAfterSeconds: 0 };
};

const recordFailure = (email, ip) => {
  const key = buildKey(email, ip);
  const now = Date.now();
  pruneExpired(now);

  const entry = attempts.get(key);
  if (!entry || entry.firstAttempt + WINDOW_MS <= now) {
    attempts.set(key, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
};

const recordSuccess = (email, ip) => {
  attempts.delete(buildKey(email, ip));
};

const resetLoginGuard = () => attempts.clear();

module.exports = {
  getLockStatus,
  recordFailure,
  recordSuccess,
  resetLoginGuard
};
