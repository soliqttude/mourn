import type { Client, Message, PartialMessage, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings, getLogEmbedColor, isLogTargetIgnored } from "../db/settings.js";
import { storeSnipe } from "../features/snipes.js";

export const event = {
  name: "messageUpdate",
  async execute(_client: Client, oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    storeSnipe(newMsg.channel.id, "edit", {
      authorId: newMsg.author?.id ?? "unknown", authorTag: newMsg.author?.tag ?? "unknown",
      authorAvatar: newMsg.author?.displayAvatarURL({ size: 256 }) ?? null,
      content: oldMsg.content ?? "", after: newMsg.content ?? "", at: Date.now(),
    });
    const settings = await getGuildSettings(newMsg.guild.id);
    if (newMsg.author && await isLogTargetIgnored(newMsg.guild.id, newMsg.author.id)) return;
    if (!settings.msgLogChannel) return;
    const ch = newMsg.guild.channels.cache.get(settings.msgLogChannel);
    if (!ch?.isTextBased()) return;
    const author = newMsg.author;
    const avatarURL = author?.displayAvatarURL({ size: 256 }) ?? undefined;
    const embed = new EmbedBuilder()
      .setColor(getLogEmbedColor(settings, "messages", settings.msgLogChannel)).setAuthor({ name: "Message Edited", iconURL: avatarURL })
      .setDescription(`Message from <@${author?.id}> edited in <#${newMsg.channel.id}> — [jump](${newMsg.url})`)
      .addFields(
        { name: "Before", value: (oldMsg.content || "*no content*").slice(0, 1024), inline: false },
        { name: "After",  value: (newMsg.content || "*no content*").slice(0, 1024), inline: false },
      )
      .setTimestamp().setFooter({ text: `User ID: ${author?.id ?? "unknown"}` });
    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
