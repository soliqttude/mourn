import ms from "ms";

// `ms`'s type defs expect a literal template-string type (StringValue)
// rather than plain `string`, which doesn't fit runtime user input.
// Cast the function once, narrowly, instead of scattering `as any` at
// every call site.
const parse = ms as unknown as (value: string) => number;
const format = ms as unknown as (value: number, options?: { long?: boolean }) => string;

// Discord's timeout API caps communication_disabled_until at 28 days out,
// and JS's setTimeout overflows past ~24.8 days (signed 32-bit ms), firing
// immediately instead of waiting. Clamp well under both.
const MAX_DURATION_MS = 28 * 24 * 60 * 60 * 1000; // 28 days
const MIN_DURATION_MS = 1000; // 1 second floor — avoids accidental 5ms "mutes"

export function parseDuration(input: string): number | null {
  const v = parse(input);
  if (!Number.isFinite(v) || v < MIN_DURATION_MS || v > MAX_DURATION_MS) {
    return null;
  }
  return v;
}

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0 seconds";
  }
  return format(milliseconds, { long: true });
}

export function formatRelative(date: Date | number): string {
  const ts = Math.floor((date instanceof Date ? date.getTime() : date) / 1000);
  return `<t:${ts}:R>`;
}

export function formatFull(date: Date | number): string {
  const ts = Math.floor((date instanceof Date ? date.getTime() : date) / 1000);
  return `<t:${ts}:F>`;
}
