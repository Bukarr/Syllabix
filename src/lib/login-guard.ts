/**
 * Client-side login throttling: after 5 consecutive failures the sign-in form
 * locks for 15 minutes. This is a usability/abuse speed-bump layered on top of
 * the auth provider's own server-side rate limiting — never the only control.
 */
const KEY = 'syllabix:login-attempts';
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

interface AttemptState {
  count: number;
  lockedUntil: number;
}

function read(): AttemptState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { count: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<AttemptState>;
    return { count: Number(parsed.count) || 0, lockedUntil: Number(parsed.lockedUntil) || 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function write(state: AttemptState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode) — throttling degrades gracefully */
  }
}

/** Remaining lockout in milliseconds; 0 when sign-in is allowed. */
export function lockoutRemaining(now = Date.now()): number {
  const { lockedUntil } = read();
  return lockedUntil > now ? lockedUntil - now : 0;
}

export function recordFailure(now = Date.now()): number {
  const state = read();
  const count = state.count + 1;
  const lockedUntil = count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
  write({ count: lockedUntil ? 0 : count, lockedUntil });
  return lockedUntil ? LOCKOUT_MS : 0;
}

export function clearFailures() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}