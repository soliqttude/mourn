import type { Client, Message, PartialMessage, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { storeSnipe } from "../features/snipes.js";

export const event = {
  name: "messageDelete",
  async execute(client: Client, message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;
    storeSnipe(message.channel.id, "delete", {
      authorId: message.author?.id ?? "unknown",
      authorTag: message.author?.tag ?? "unknown",
      content: message.content ?? "",
      attachments: message.attachments?.map((a) => a.url) ?? [],
      at: Date.now(),
    });
    const settings = await getGuildSettings(message.guild.id);
    if (!settings.msgLogChannel) return;
    const ch = message.guild.channels.cache.get(settings.msgLogChannel);
    if (!ch || !ch.isTextBased()) return;
    const embed = brandEmbed({
      title: "🗑️ Message Deleted",
      description:
        (message.content?.slice(0, 1900) || "*No content*") +
        `\n\n**Channel:** <#${message.channel.id}>\n**Author:** ${
          message.author ? `<@${message.author.id}> (${message.author.tag})` : "Unknown"
        }`,
      page: "Logs",
    });
    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
