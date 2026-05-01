import type {
  Client,
  Message,
  PartialMessage,
  TextChannel,
} from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { storeSnipe } from "../features/snipes.js";

export const event = {
  name: "messageUpdate",
  async execute(
    client: Client,
    oldMsg: Message | PartialMessage,
    newMsg: Message | PartialMessage
  ) {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    storeSnipe(newMsg.channel.id, "edit", {
      authorId: newMsg.author?.id ?? "unknown",
      authorTag: newMsg.author?.tag ?? "unknown",
      content: oldMsg.content ?? "",
      after: newMsg.content ?? "",
      at: Date.now(),
    });
    const settings = await getGuildSettings(newMsg.guild.id);
    if (!settings.msgLogChannel) return;
    const ch = newMsg.guild.channels.cache.get(settings.msgLogChannel);
    if (!ch || !ch.isTextBased()) return;
    const embed = brandEmbed({
      title: "✏️ Message Edited",
      description:
        `**Channel:** <#${newMsg.channel.id}>\n**Author:** <@${newMsg.author?.id}>\n\n**Before:** ${
          (oldMsg.content || "*No content*").slice(0, 900)
        }\n\n**After:** ${(newMsg.content || "*No content*").slice(0, 900)}`,
      page: "Logs",
    });
    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
