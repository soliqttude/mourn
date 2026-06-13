import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder, GuildChannel, ChannelType } from "discord.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "channelUpdate",
  async execute(client: Client, oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!newChannel.guild) return;

    const settings    = await getGuildSettings(newChannel.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = newChannel.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const guildIcon = newChannel.guild.iconURL({ size: 64 }) ?? undefined;
    const changes: { name: string; value: string; inline: boolean }[] = [];

    if (oldChannel.name !== newChannel.name)
      changes.push({ name: "Name",     value: `\`${oldChannel.name}\` → \`${newChannel.name}\``,           inline: false });
    if ((oldChannel as any).topic !== (newChannel as any).topic)
      changes.push({ name: "Topic",    value: `\`${(oldChannel as any).topic ?? "none"}\` → \`${(newChannel as any).topic ?? "none"}\``, inline: false });
    if ((oldChannel as any).nsfw !== (newChannel as any).nsfw)
      changes.push({ name: "NSFW",     value: `${(oldChannel as any).nsfw ? "yes" : "no"} → ${(newChannel as any).nsfw ? "yes" : "no"}`, inline: true });
    if ((oldChannel as any).rateLimitPerUser !== (newChannel as any).rateLimitPerUser)
      changes.push({ name: "Slowmode", value: `${(oldChannel as any).rateLimitPerUser ?? 0}s → ${(newChannel as any).rateLimitPerUser ?? 0}s`, inline: true });
    if ((oldChannel as any).bitrate !== (newChannel as any).bitrate)
      changes.push({ name: "Bitrate",  value: `${(oldChannel as any).bitrate ?? 0} → ${(newChannel as any).bitrate ?? 0}`, inline: true });

    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Channel Updated", iconURL: guildIcon })
      .setDescription(`Channel <#${newChannel.id}> was updated in ${newChannel.guild.name}`)
      .addFields(...changes)
      .setTimestamp()
      .setFooter({ text: `Channel ID: ${newChannel.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
