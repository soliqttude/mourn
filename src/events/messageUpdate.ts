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
  name: "messageUpdate",
  async execute(_client: Client, oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;

    storeSnipe(newMsg.channel.id, "edit", {
      authorId: newMsg.author?.id ?? "unknown",
      authorTag: newMsg.author?.tag ?? "unknown",
      authorAvatar: newMsg.author?.displayAvatarURL({ size: 256 }) ?? null,
      content: oldMsg.content ?? "",
      after: newMsg.content ?? "",
      at: Date.now(),
    });

    const settings = await getGuildSettings(newMsg.guild.id);
    if (!settings.msgLogChannel) return;
    if (await isIgnored(newMsg.guild.id, [newMsg.author?.id ?? "", newMsg.channel.id])) return;

    const ch = newMsg.guild.channels.cache.get(settings.msgLogChannel);
    if (!ch?.isTextBased()) return;

    const author = newMsg.author;
    const avatarURL = author?.displayAvatarURL({ size: 256 });

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setAuthor({
        name: author ? `${author.username} (${author.id})` : "Unknown User",
        iconURL: avatarURL,
      })
      .setThumbnail(avatarURL ?? null)
      .setDescription(`**message edited in** <#${newMsg.channel.id}> — [jump to message](${newMsg.url})`)
      .addFields(
        { name: "before", value: (oldMsg.content || "*no content*").slice(0, 1024), inline: false },
        { name: "after",  value: (newMsg.content || "*no content*").slice(0, 1024), inline: false },
      )
      .setTimestamp()
      .setFooter({ text: `message id: ${newMsg.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
