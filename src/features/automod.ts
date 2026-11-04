import type { Client, Message } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { filterExempts, filterWhitelist, filterChannelSettings, filterLinkWhitelist } from "../db/schema.js";
import { getGuildSettings } from "../db/settings.js";
import { hasModPerms } from "../lib/permissions.js";

const URL_RE = /https?:\/\/[^\s]+/gi;
const recentMessages = new Map<string, number[]>();

function hostOf(value: string): string | null {
  try { return new URL(value.startsWith("http") ? value : "https://" + value).hostname.toLowerCase(); }
  catch { return null; }
}

export async function handleAutomod(_client: Client, message: Message) {
  if (!message.guild || message.author.bot || !message.member) return;
  if (hasModPerms(message.member)) return;

  const settings = await getGuildSettings(message.guild.id);
  const configured = await db.select().from(filterChannelSettings).where(and(
    eq(filterChannelSettings.guildId, message.guild.id),
    eq(filterChannelSettings.channelId, message.channelId),
  ));
  const channelConfig = new Map(configured.map(row => [row.filterType, row]));
  const legacy: Record<string, boolean> = {
    links: settings.linkFilterEnabled, invites: settings.inviteFilterEnabled,
    caps: settings.capsFilterEnabled, spoilers: settings.spoilersFilterEnabled,
    massmention: settings.massMentionEnabled, emoji: settings.emojiFilterEnabled,
    musicfiles: settings.musicFilesFilterEnabled, spam: settings.automodEnabled,
  };
  const enabled = (type: string) => channelConfig.has(type) ? channelConfig.get(type)!.enabled : Boolean(legacy[type]);
  const threshold = (type: string, fallback: number) => channelConfig.get(type)?.threshold ?? fallback;
  const types = ["links", "invites", "caps", "spoilers", "massmention", "emoji", "musicfiles", "spam"];
  if (!types.some(type => enabled(type))) return;

  const exemptions = await db.select().from(filterExempts).where(eq(filterExempts.guildId, message.guild.id));
  const roles = message.member.roles.cache;
  const exempt = (type: string) => exemptions.some(row =>
    (row.filterType === type || row.filterType === "all") && roles.has(row.roleId)
  );
  const whitelist = await db.select().from(filterWhitelist).where(eq(filterWhitelist.guildId, message.guild.id));
  const linkWhitelist = await db.select().from(filterLinkWhitelist).where(and(
    eq(filterLinkWhitelist.guildId, message.guild.id),
    eq(filterLinkWhitelist.channelId, message.channelId),
  ));
  const allowed = (type: string, value: string) => whitelist.some(row =>
    (row.filterType === type || (type === "links" && row.filterType === "domains")) &&
    (row.value === value || (type === "links" && value.endsWith("." + row.value)))
  ) || (type === "links" && linkWhitelist.some(row => {
    const host = hostOf(row.url);
    return host ? value === host || value.endsWith("." + host) : value === row.url || value.endsWith("." + row.url);
  }));

  const content = message.content;
  let reason: string | null = null;
  const regexRules = whitelist.filter(row => row.filterType === "regex");
  if (regexRules.some(row => { try { return new RegExp(row.value, "i").test(content); } catch { return false; } })) {
    reason = "your message matched a blocked regular expression";
  }

  if (!reason && enabled("links") && !exempt("links")) {
    const urls = content.match(URL_RE) ?? [];
    if (urls.some(url => { const host = hostOf(url); return !host || !allowed("links", host); })) reason = "links are not allowed here";
  }
  if (!reason && enabled("invites") && !exempt("invites")) {
    const invites = content.match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/gi) ?? [];
    if (invites.some(invite => !allowed("invites", invite.toLowerCase()))) reason = "server invites are not allowed";
  }
  if (!reason && enabled("caps") && !exempt("caps")) {
    const letters = content.match(/[A-Za-z]/g) ?? [];
    const upper = content.match(/[A-Z]/g) ?? [];
    const percent = letters.length ? upper.length / letters.length * 100 : 0;
    if (letters.length >= 10 && percent >= threshold("caps", 70)) reason = "excessive capital letters are not allowed";
  }
  if (!reason && enabled("spoilers") && !exempt("spoilers")) {
    const count = (content.match(/\|\|[\s\S]+?\|\|/g) ?? []).length;
    if (count >= threshold("spoilers", 1)) reason = "spoilers are not allowed";
  }
  if (!reason && enabled("massmention") && !exempt("massmention")) {
    const count = message.mentions.users.size + message.mentions.roles.size;
    if (message.mentions.everyone || count >= threshold("massmention", 5)) reason = "mass mentions are not allowed";
  }
  if (!reason && enabled("emoji") && !exempt("emoji")) {
    const count = (content.match(/\p{Extended_Pictographic}/gu) ?? []).length;
    if (count >= threshold("emoji", 10)) reason = "excessive emoji are not allowed";
  }
  if (!reason && enabled("musicfiles") && !exempt("musicfiles")) {
    const hasMusic = message.attachments.some(a => /\.(mp3|wav|ogg|flac|m4a|aac|opus)(?:$|\?)/i.test(a.name ?? a.url));
    if (hasMusic) reason = "music files are not allowed here";
  }
  if (!reason && enabled("spam") && !exempt("spam")) {
    const key = message.guild.id + ":" + message.author.id;
    const now = Date.now();
    const recent = (recentMessages.get(key) ?? []).filter(time => now - time < 5000);
    recent.push(now);
    recentMessages.set(key, recent);
    if (recent.length >= threshold("spam", 5)) {
      reason = "please slow down";
      recentMessages.delete(key);
    }
    if (recentMessages.size > 5000) {
      for (const [id, times] of recentMessages) if (!times.length || now - times[times.length - 1]! > 30000) recentMessages.delete(id);
    }
  }
  if (!reason) return;
  await message.delete().catch(() => {});
  if ("send" in message.channel && typeof message.channel.send === "function") {
    await message.channel.send({
      content: `<@${message.author.id}>, ${reason}.`,
      allowedMentions: { users: [message.author.id] },
    }).catch(() => {});
  }
}
