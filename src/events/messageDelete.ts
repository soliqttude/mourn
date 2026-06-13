import type { Client, Message, PartialMessage, TextChannel } from "discord.js";
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { storeSnipe } from "../features/snipes.js";
import { db } from "../db/index.js";
import { logIgnores } from "../db/schema.js";
import { and, eq, inArray } from "drizzle-orm";

async function isIgnored(guildId: string, ids: string[]): Promise<boolean> {
  const clean = ids.filter(Boolean);
  if (!clean.length) return false;
  const rows = await db.select().from(logIgnores).where(and(eq(logIgnores.guildId, guildId), inArray(logIgnores.targetId, clean)));
  return rows.length > 0;
}

export const event = {
  name: "messageDelete",
  async execute(_client: Client, message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;
    const channelName = "name" in message.channel ? (message.channel as any).name as string : "unknown";
    storeSnipe(message.channel.id, "delete", {
      authorId: message.author?.id ?? "unknown", authorTag: message.author?.tag ?? "unknown",
      authorAvatar: message.author?.displayAvatarURL({ size: 256 }) ?? null,
      content: message.content ?? "", attachments: message.attachments?.map((a) => a.url) ?? [],
      stickers: message.stickers?.map((s) => s.url) ?? [], at: Date.now(),
      sentAt: message.createdTimestamp ?? undefined, channelName,
    });
    const settings = await getGuildSettings(message.guild.id);
    if (!settings.msgLogChannel) return;
    if (await isIgnored(message.guild.id, [message.author?.id ?? "", message.channel.id])) return;
    const ch = message.guild.channels.cache.get(settings.msgLogChannel);
    if (!ch?.isTextBased()) return;
    const author = message.author;
    const avatarURL = author?.displayAvatarURL({ size: 256 }) ?? undefined;
    const content = message.content?.slice(0, 1024) || "*no text content*";
    const sentAt = message.createdTimestamp ? Math.floor(message.createdTimestamp / 1000) : null;
    const attachments = message.attachments?.map((a) => a.url) ?? [];
    let deletedBy: string | null = null;
    try {
      const audit = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.targetId === author?.id && (Date.now() - entry.createdTimestamp) < 5000) deletedBy = entry.executorId ?? null;
    } catch {}
    const descLines = [
      deletedBy && deletedBy !== author?.id
        ? `Message from <@${author?.id}> deleted by <@${deletedBy}> in <#${message.channel.id}>`
        : `Message from <@${author?.id}> deleted in <#${message.channel.id}>`,
      sentAt ? `It was sent at <t:${sentAt}:f>` : "",
    ].filter(Boolean);
    const embed = new EmbedBuilder()
      .setColor(0x000000).setAuthor({ name: "Message Deleted", iconURL: avatarURL })
      .setDescription(descLines.join("\n"))
      .addFields({ name: "Message Content", value: content, inline: false })
      .setTimestamp().setFooter({ text: `User ID: ${author?.id ?? "unknown"}` });
    if (attachments.length) embed.addFields({ name: `Attachments (${attachments.length})`, value: attachments.join("\n").slice(0, 1024), inline: false });
    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
