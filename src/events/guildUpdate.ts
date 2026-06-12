import type { Client, Guild, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { handleVanityChange } from "../features/antinuke.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "guildUpdate",
  async execute(client: Client, oldGuild: Guild, newGuild: Guild) {
    if (oldGuild.vanityURLCode && oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      await handleVanityChange(client, newGuild).catch(() => {});
    }

    const settings    = await getGuildSettings(newGuild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = newGuild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const guildIcon = newGuild.iconURL({ size: 64 }) ?? undefined;
    const changes: { name: string; value: string; inline: boolean }[] = [];

    if (oldGuild.name !== newGuild.name)
      changes.push({ name: "name", value: `\`${oldGuild.name}\` → \`${newGuild.name}\``, inline: false });
    if (oldGuild.icon !== newGuild.icon)
      changes.push({ name: "icon", value: "updated", inline: true });
    if (oldGuild.banner !== newGuild.banner)
      changes.push({ name: "banner", value: "updated", inline: true });
    if (oldGuild.description !== newGuild.description)
      changes.push({ name: "description", value: `\`${oldGuild.description ?? "none"}\` → \`${newGuild.description ?? "none"}\``, inline: false });
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode)
      changes.push({ name: "vanity url", value: `\`${oldGuild.vanityURLCode ?? "none"}\` → \`${newGuild.vanityURLCode ?? "none"}\``, inline: false });
    if (oldGuild.verificationLevel !== newGuild.verificationLevel)
      changes.push({ name: "verification level", value: `${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`, inline: true });
    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter)
      changes.push({ name: "content filter", value: `${oldGuild.explicitContentFilter} → ${newGuild.explicitContentFilter}`, inline: true });
    if (oldGuild.afkChannelId !== newGuild.afkChannelId)
      changes.push({ name: "afk channel", value: newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : "none", inline: true });

    if (!changes.length) return;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "server updated", iconURL: guildIcon })
      .addFields(...changes)
      .setTimestamp()
      .setFooter({ text: `guild id: ${newGuild.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
