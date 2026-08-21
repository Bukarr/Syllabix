import { useState, useEffect, useCallback } from 'react';

/**
 * Real connectivity probe. `navigator.onLine` only reports whether the device
 * has a network interface — it lies on dead captive portals and flaky mobile
 * data. This hook periodically fetches a tiny same-origin asset to confirm the
 * app can actually reach the network.
 */
export function useConnectivity(intervalMs = 20000) {
  const [reachable, setReachable] = useState(navigator.onLine);
  const [checking, setChecking] = useState(false);

  const probe = useCallback(async () => {
    if (!navigator.onLine) {
      setReachable(false);
      return false;
    }
    setChecking(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      // Cache-busted HEAD to a small always-present asset.
      await fetch(`/favicon.png?ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(t);
      setReachable(true);
      return true;
    } catch {
      setReachable(false);
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    probe();
    const id = setInterval(probe, intervalMs);
    const onOnline = () => probe();
    const onOffline = () => setReachable(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [probe, intervalMs]);

  return { reachable, checking, probe };
}
