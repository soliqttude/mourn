import ms from "ms";

export function parseDuration(input: string): number | null {
  try {
    const v = (ms as any)(input);
    if (typeof v !== "number" || v <= 0) return null;
    return v;
  } catch {
    return null;
  }
}

export function formatDuration(milliseconds: number): string {
  return (ms as any)(milliseconds, { long: true });
}

export function formatRelative(date: Date | number): string {
  const ts = Math.floor((date instanceof Date ? date.getTime() : date) / 1000);
  return `<t:${ts}:R>`;
}

export function formatFull(date: Date | number): string {
  const ts = Math.floor((date instanceof Date ? date.getTime() : date) / 1000);
  return `<t:${ts}:F>`;
}
