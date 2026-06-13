import type { Client, Guild, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { handleVanityChange } from "../features/antinuke.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "guildUpdate",
  async execute(client: Client, oldGuild: Guild, newGuild: Guild) {
    if (oldGuild.vanityURLCode && oldGuild.vanityURLCode !== newGuild.vanityURLCode) await handleVanityChange(client, newGuild).catch(() => {});
    const settings    = await getGuildSettings(newGuild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = newGuild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;
    const guildIcon = newGuild.iconURL({ size: 64 }) ?? undefined;
    const changes: { name: string; value: string; inline: boolean }[] = [];
    if (oldGuild.name !== newGuild.name) changes.push({ name: "Name", value: `\`${oldGuild.name}\` → \`${newGuild.name}\``, inline: false });
    if (oldGuild.icon !== newGuild.icon) changes.push({ name: "Icon", value: "Updated", inline: true });
    if (oldGuild.banner !== newGuild.banner) changes.push({ name: "Banner", value: "Updated", inline: true });
    if (oldGuild.description !== newGuild.description) changes.push({ name: "Description", value: `\`${oldGuild.description ?? "none"}\` → \`${newGuild.description ?? "none"}\``, inline: false });
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) changes.push({ name: "Vanity URL", value: `\`${oldGuild.vanityURLCode ?? "none"}\` → \`${newGuild.vanityURLCode ?? "none"}\``, inline: false });
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push({ name: "Verification Level", value: `${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`, inline: true });
    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) changes.push({ name: "Content Filter", value: `${oldGuild.explicitContentFilter} → ${newGuild.explicitContentFilter}`, inline: true });
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) changes.push({ name: "AFK Channel", value: newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : "none", inline: true });
    if (!changes.length) return;
    const embed = new EmbedBuilder()
      .setColor(0x000000).setAuthor({ name: "Server Updated", iconURL: guildIcon })
      .setDescription(`Settings were updated in ${newGuild.name}`)
      .addFields(...changes).setTimestamp().setFooter({ text: `Guild ID: ${newGuild.id}` });
    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
