/**
 * Cookie / storage consent.
 *
 * Syllabix uses no third-party trackers. The only optional processing is
 * privacy-friendly, first-party performance measurement (Core Web Vitals),
 * which is disabled until the user explicitly opts in. Strictly necessary
 * storage (offline lesson data, theme, session) always stays on because the
 * app cannot function offline without it.
 */

export type ConsentValue = 'accepted' | 'rejected';

const KEY = 'syllabix:consent';
const EVENT = 'syllabix:consent-changed';

export function getConsent(): ConsentValue | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === 'accepted' || raw === 'rejected' ? raw : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage blocked — treat as rejected for this session */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: value }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === 'accepted';
}

export function onConsentChange(handler: (value: ConsentValue) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<ConsentValue>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
