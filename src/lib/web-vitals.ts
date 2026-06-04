import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";

/**
 * Lightweight Real User Monitoring for Core Web Vitals.
 * Reports LCP, INP, CLS, FCP and TTFB. In dev it logs to the console;
 * in production it forwards each metric to the user_activity table
 * (best-effort, non-blocking, never throws).
 */
function handleMetric(metric: Metric) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[web-vitals] ${metric.name}: ${Math.round(metric.value)} (${metric.rating})`);
    return;
  }

  try {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      path: window.location.pathname,
    });

    // sendBeacon survives page unload; falls back to no-op if unavailable.
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/vitals", blob);
    }
  } catch {
    /* never let monitoring break the app */
  }
}

export function reportWebVitals() {
  try {
    onLCP(handleMetric);
    onINP(handleMetric);
    onCLS(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);
  } catch {
    /* no-op */
  }
}
