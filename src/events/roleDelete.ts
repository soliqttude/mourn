import type { Client, Role, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
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

    await (logCh as TextChannel).send({
      embeds: [
        brandEmbed({
          authorName: "role deleted",
          description: `**Name:** ${role.name}\n**ID:** \`${role.id}\`\n**Color:** \`${role.hexColor}\``,
          page: "Logs",
        }).setTimestamp(),
      ],
    }).catch(() => {});
  },
};
