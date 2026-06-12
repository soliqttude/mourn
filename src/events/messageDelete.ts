import type { Client, Message, PartialMessage, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { storeSnipe } from "../features/snipes.js";
import { db } from "../db/index.js";
import { logIgnores } from "../db/schema.js";
import { and, eq, inArray } from "drizzle-orm";

async function isIgnored(guildId: string, ids: string[]): Promise<boolean> {
  const clean = ids.filter(Boolean);
  if (!clean.length) return false;
  const rows = await db.select().from(logIgnores).where(
    and(eq(logIgnores.guildId, guildId), inArray(logIgnores.targetId, clean))
  );
  return rows.length > 0;
}

export const event = {
  name: "messageDelete",
  async execute(_client: Client, message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;

    const replyMsg = message.reference?.messageId
      ? message.channel.messages?.cache.get(message.reference.messageId)
      : undefined;

    const channelName =
      "name" in message.channel ? (message.channel as any).name as string : "unknown";

    storeSnipe(message.channel.id, "delete", {
      authorId: message.author?.id ?? "unknown",
      authorTag: message.author?.tag ?? "unknown",
      authorAvatar: message.author?.displayAvatarURL({ size: 256 }) ?? null,
      content: message.content ?? "",
      attachments: message.attachments?.map((a) => a.url) ?? [],
      stickers: message.stickers?.map((s) => s.url) ?? [],
      at: Date.now(),
      sentAt: message.createdTimestamp ?? undefined,
      channelName,
      replyTo: replyMsg
        ? {
            authorTag: replyMsg.author?.tag ?? "unknown",
            content: replyMsg.content || "",
          }
        : undefined,
    });

    const settings = await getGuildSettings(message.guild.id);
    if (!settings.msgLogChannel) return;
    if (await isIgnored(message.guild.id, [message.author?.id ?? "", message.channel.id])) return;

    const ch = message.guild.channels.cache.get(settings.msgLogChannel);
    if (!ch?.isTextBased()) return;

    const author = message.author;
    const avatarURL = author?.displayAvatarURL({ size: 256 });
    const content = message.content?.slice(0, 1024) || "*no text content*";
    const attachments = message.attachments?.map((a) => a.url) ?? [];

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({
        name: author ? `${author.username} (${author.id})` : "Unknown User",
        iconURL: avatarURL,
      })
      .setThumbnail(avatarURL ?? null)
      .setDescription(`**message deleted in** <#${message.channel.id}>`)
      .addFields({ name: "content", value: content, inline: false })
      .setTimestamp()
      .setFooter({ text: `message id: ${message.id}` });

    if (attachments.length) {
      embed.addFields({
        name: `attachments (${attachments.length})`,
        value: attachments.join("\n").slice(0, 1024),
        inline: false,
      });
    }

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
