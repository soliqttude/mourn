import type { Client, Message, TextChannel } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { filterExempts, filterWhitelist } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { hasModPerms } from "../lib/permissions.js";

const URL_RE = /https?:\/\/[^\s]+/gi;
const INVITE_RE = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/i;
const recentMessages = new Map<string, number[]>();

function hostOf(value: string): string | null {
  try { return new URL(value.startsWith("http") ? value : "https://" + value).hostname.toLowerCase(); }
  catch { return null; }
}

export async function handleAutomod(_client: Client, message: Message) {
  if (!message.guild || message.author.bot || !message.member) return;
  if (hasModPerms(message.member)) return;
  const settings = await getGuildSettings(message.guild.id);
  const types = ["links", "invites", "caps", "spoilers", "massmention", "emoji", "musicfiles", "spam"];
  const enabled: Record<string, boolean> = {
    links: settings.linkFilterEnabled, invites: settings.inviteFilterEnabled,
    caps: settings.capsFilterEnabled, spoilers: settings.spoilersFilterEnabled,
    massmention: settings.massMentionEnabled, emoji: settings.emojiFilterEnabled,
    musicfiles: settings.musicFilesFilterEnabled, spam: settings.automodEnabled,
  };
  if (!types.some(type => enabled[type])) return;

  const exemptions = await db.select().from(filterExempts).where(eq(filterExempts.guildId, message.guild.id));
  const roles = message.member.roles.cache;
  const exempt = (type: string) => exemptions.some(row =>
    (row.filterType === type || row.filterType === "all") && roles.has(row.roleId)
  );
  const whitelist = await db.select().from(filterWhitelist).where(eq(filterWhitelist.guildId, message.guild.id));
  const allowed = (type: string, value: string) => whitelist.some(row =>
    (row.filterType === type || (type === "links" && row.filterType === "domains")) &&
    (row.value === value || (type === "links" && value.endsWith("." + row.value)))
  );
  const content = message.content;
  let reason: string | null = null;

  if (enabled.links && !exempt("links")) {
    const urls = content.match(URL_RE) ?? [];
    if (urls.some(url => { const host = hostOf(url); return !host || !allowed("links", host); })) reason = "links are not allowed here";
  }
  if (!reason && enabled.invites && !exempt("invites")) {
    const invites = content.match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/gi) ?? [];
    if (invites.some(invite => !allowed("invites", invite.toLowerCase()))) reason = "server invites are not allowed";
  }
  if (!reason && enabled.caps && !exempt("caps")) {
    const letters = content.match(/[A-Za-z]/g) ?? [];
    const upper = content.match(/[A-Z]/g) ?? [];
    if (letters.length >= 10 && upper.length / letters.length >= 0.7) reason = "excessive capital letters are not allowed";
  }
  if (!reason && enabled.spoilers && !exempt("spoilers") && /\|\|[\s\S]+?\|\|/.test(content)) reason = "spoilers are not allowed";
  if (!reason && enabled.massmention && !exempt("massmention") && (message.mentions.everyone || message.mentions.users.size + message.mentions.roles.size >= 5)) reason = "mass mentions are not allowed";
  if (!reason && enabled.emoji && !exempt("emoji")) {
    const emojiCount = (content.match(/\p{Extended_Pictographic}/gu) ?? []).length;
    if (emojiCount >= 10) reason = "excessive emoji are not allowed";
  }
  if (!reason && enabled.musicfiles && !exempt("musicfiles")) {
    const media = message.attachments.some(a => /\.(mp3|wav|ogg|flac|m4a|aac|opus)(?:$|\?)/i.test(a.name ?? a.url));
    if (media) reason = "music files are not allowed here";
  }
  if (!reason && enabled.spam && !exempt("spam")) {
    const key = message.guild.id + ":" + message.author.id;
    const now = Date.now();
    const recent = (recentMessages.get(key) ?? []).filter(time => now - time < 5000);
    recent.push(now);
    recentMessages.set(key, recent);
    if (recent.length >= 5) { reason = "please slow down"; recentMessages.delete(key); }
    if (recentMessages.size > 5000) {
      for (const [id, times] of recentMessages) if (!times.length || now - times[times.length - 1]! > 30000) recentMessages.delete(id);
    }
  }
  if (!reason) return;
  await message.delete().catch(() => {});
  await (message.channel as TextChannel).send({
    content: `<@${message.author.id}>, ${reason}.`,
    allowedMentions: { users: [message.author.id] },
  }).catch(() => {});
}
