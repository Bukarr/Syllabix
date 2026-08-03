/** Strip control characters and cap length on any untrusted string. */
export function sanitizeText(value: unknown, max = 300): string {
  return typeof value === "string" ? value.replace(/[\x00-\x1F\x7F]/g, "").slice(0, max) : "";
}

export function sanitizeList(value: unknown, max = 100, limit = 20): string[] {
  return Array.isArray(value) ? value.map(v => sanitizeText(v, max)).slice(0, limit) : [];
}

export function clampNumber(value: unknown, min: number, max: number, fallback = min): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), min), max)
    : fallback;
}