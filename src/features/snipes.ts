export interface Snipe {
  authorId: string;
  authorTag: string;
  authorAvatar: string | null;
  content: string;
  attachments?: string[];
  stickers?: string[];
  after?: string;
  at: number;
  sentAt?: number;
  channelName?: string;
  replyTo?: {
    authorTag: string;
    content: string;
  };
}

const deleteSnipes = new Map<string, Snipe[]>();
const editSnipes   = new Map<string, Snipe[]>();

export function storeSnipe(channelId: string, type: "delete" | "edit", snipe: Snipe) {
  const map = type === "delete" ? deleteSnipes : editSnipes;
  const arr = map.get(channelId) ?? [];
  arr.unshift(snipe);
  if (arr.length > 10) arr.pop();
  map.set(channelId, arr);
}

export function getSnipe(
  channelId: string,
  type: "delete" | "edit",
  index = 0,
): Snipe | null {
  const map = type === "delete" ? deleteSnipes : editSnipes;
  return map.get(channelId)?.[index] ?? null;
}

export function getSnipeCount(channelId: string, type: "delete" | "edit"): number {
  const map = type === "delete" ? deleteSnipes : editSnipes;
  return map.get(channelId)?.length ?? 0;
}
