import type { Client, Role, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "roleCreate",
  async execute(client: Client, role: Role) {
    await handleAntinukeAction(client, role.guild, "role_create", role.id);

    const settings = await getGuildSettings(role.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = role.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    await (logCh as TextChannel).send({
      embeds: [
        brandEmbed({
          authorName: "role created",
          description: `**Role:** <@&${role.id}> (${role.name})\n**Color:** \`${role.hexColor}\`\n**Hoisted:** ${role.hoist ? "yes" : "no"}\n**Mentionable:** ${role.mentionable ? "yes" : "no"}`,
          page: "Logs",
        }).setTimestamp(),
      ],
    }).catch(() => {});
  },
};
