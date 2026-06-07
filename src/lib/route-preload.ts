// Centralised lazy-route importers so we can warm them ahead of navigation.
// Hovering/pressing a nav link (or browser idle time) triggers the dynamic
// import early, so the chunk is already in memory when the route renders —
// eliminating the visible "reload flash" on slow networks.

const importers: Record<string, () => Promise<unknown>> = {
  '/lesson-plan': () => import('@/pages/LessonPlanForm'),
  '/ai-notes': () => import('@/pages/CopyNoteGenerator'),
  '/scheme': () => import('@/pages/SchemeOfWork'),
  '/class-tracker': () => import('@/pages/ClassTracker'),
  '/my-plans': () => import('@/pages/MyPlans'),
  '/reviewer': () => import('@/pages/LessonReviewer'),
  '/collaborate': () => import('@/pages/Collaborate'),
  '/my-resources': () => import('@/pages/MyResources'),
  '/portfolio': () => import('@/pages/Portfolio'),
  '/settings': () => import('@/pages/Settings'),
  '/templates': () => import('@/pages/Templates'),
  '/onboarding': () => import('@/pages/Onboarding'),
};

const prefetched = new Set<string>();

/** Warm a single route's chunk (no-op if already loaded). */
export function preloadRoute(path: string) {
  if (prefetched.has(path)) return;
  const importer = importers[path];
  if (!importer) return;
  prefetched.add(path);
  // Fire and forget — failures are harmless, the route will retry on nav.
  importer().catch(() => prefetched.delete(path));
}

/** Warm every route during browser idle time after first paint. */
export function preloadAllRoutes() {
  const run = () => Object.keys(importers).forEach(preloadRoute);
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void) => void;
  }).requestIdleCallback;
  if (ric) ric(run);
  else setTimeout(run, 1500);
}