import type { Client, Role, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "roleDelete",
  async execute(client: Client, role: Role) {
    await handleAntinukeAction(client, role.guild, "role_delete", role.id);

    const settings = await getGuildSettings(role.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = role.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const guildIcon = role.guild.iconURL({ size: 256 });

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: "role deleted", iconURL: guildIcon ?? undefined })
      .setThumbnail(guildIcon)
      .addFields(
        { name: "name",    value: role.name,           inline: true },
        { name: "color",   value: role.hexColor,       inline: true },
        { name: "members", value: `${role.members.size}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `role id: ${role.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
