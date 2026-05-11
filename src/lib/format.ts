export const REASON_DEFAULT = "no reason provided";

export function pluralize(count: number, word: string): string {
  return `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

export function fmt(n: number): string {
  return n.toLocaleString();
}

export function humanDuration(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m < 60) return remS > 0 ? `${m}m ${remS}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
}

export function cleanError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)) ?? "something went wrong.";
  if (msg.includes("Missing Permissions")) return "i don't have permission to do that.";
  if (msg.includes("Unknown Member")) return "that member wasn't found.";
  if (msg.includes("Unknown User")) return "that user wasn't found.";
  if (msg.includes("Unknown Ban")) return "that user isn't banned.";
  if (msg.includes("Unknown Channel")) return "that channel wasn't found.";
  if (msg.includes("Unknown Role")) return "that role wasn't found.";
  if (msg.includes("Cannot execute action on a channel this type")) return "i can't do that in this channel type.";
  if (msg.includes("Maximum number of guild roles reached")) return "this server has reached the role limit (250).";
  if (msg.includes("Cannot ban the owner")) return "you can't ban the server owner.";
  if (msg.includes("You are missing")) return "i'm missing a required permission.";
  if (msg.includes("Already timed out")) return "that member is already timed out.";
  if (msg.includes("Cannot send messages to this user")) return "i can't dm that user (their dms are closed).";
  return msg.charAt(0).toLowerCase() + msg.slice(1).replace(/\.$/, "") + ".";
}

export function clampDuration(ms: number, maxMs: number): number {
  return Math.min(ms, maxMs);
}
