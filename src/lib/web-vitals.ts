import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from "web-vitals";
import { hasAnalyticsConsent } from "./consent";

/**
 * Privacy-friendly Real User Monitoring for Core Web Vitals.
 *
 * - No third-party analytics, no cookies, no advertising identifiers.
 * - No IP address, user id, query string or page content is ever sent.
 * - Only runs after the user explicitly accepts in the consent banner.
 */
function handleMetric(metric: Metric) {
  if (import.meta.env.DEV) {
    console.log(`[web-vitals] ${metric.name}: ${Math.round(metric.value)} (${metric.rating})`);
    return;
  }

  if (!hasAnalyticsConsent()) return;

  try {
    const body = JSON.stringify({
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      // pathname only — never search params, which can carry personal data
      path: window.location.pathname,
    });

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
