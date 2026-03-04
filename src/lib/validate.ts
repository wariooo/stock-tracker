// Shared input validation utilities

export function isValidTicker(s: string): boolean {
  return /^[A-Za-z0-9.\-]{1,12}$/.test(s);
}

export function isValidCusip(s: string): boolean {
  return /^[A-Za-z0-9]{9}$/.test(s);
}

export function isValidAccession(s: string): boolean {
  return /^[0-9\-]+$/.test(s);
}

export function isValidCacheKey(s: string): boolean {
  return /^[a-zA-Z0-9_\-]+$/.test(s);
}

const VALID_PERIODS = new Set(["1w", "1m", "6m", "1y"]);

export function isValidPeriod(s: string): s is "1w" | "1m" | "6m" | "1y" {
  return VALID_PERIODS.has(s);
}

export function sanitizePath(segment: string): string {
  return segment.replace(/\.\./g, "").replace(/[/\\]/g, "");
}
