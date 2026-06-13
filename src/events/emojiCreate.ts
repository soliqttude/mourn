import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder, GuildEmoji } from "discord.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "emojiCreate",
  async execute(client: Client, emoji: GuildEmoji) {
    if (!emoji.guild) return;
    const settings    = await getGuildSettings(emoji.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = emoji.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;
    const guildIcon = emoji.guild.iconURL({ size: 64 }) ?? undefined;
    const embed = new EmbedBuilder()
      .setColor(0x000000).setAuthor({ name: "Emoji Created", iconURL: guildIcon })
      .setDescription(`Emoji \`:${emoji.name}:\` was added to ${emoji.guild.name}`)
      .addFields(
        { name: "Animated", value: emoji.animated ? "yes" : "no", inline: true },
        { name: "Managed",  value: emoji.managed ? "yes" : "no",  inline: true },
      )
      .setTimestamp().setFooter({ text: `Emoji ID: ${emoji.id}` });
    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
