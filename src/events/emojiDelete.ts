import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder, GuildEmoji } from "discord.js";
import { handleAntinukeAction } from "../features/antinuke.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "emojiDelete",
  async execute(client: Client, emoji: GuildEmoji) {
    if (!emoji.guild) return;
    await handleAntinukeAction(client, emoji.guild, "emoji_delete", emoji.id).catch(() => {});

    const settings    = await getGuildSettings(emoji.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = emoji.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const guildIcon = emoji.guild.iconURL({ size: 64 }) ?? undefined;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "emoji deleted", iconURL: guildIcon })
      .addFields(
        { name: "name",      value: `\`:${emoji.name}:\``,      inline: true },
        { name: "animated",  value: emoji.animated ? "yes" : "no", inline: true },
        { name: "managed",   value: emoji.managed ? "yes" : "no",  inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `emoji id: ${emoji.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
