import type { Client, Role, TextChannel } from "discord.js";
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "roleDelete",
  async execute(client: Client, role: Role) {
    await handleAntinukeAction(client, role.guild, "role_delete", role.id);

    const settings    = await getGuildSettings(role.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = role.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    let executor: string | null = null;
    try {
      const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.targetId === role.id && (Date.now() - entry.createdTimestamp) < 5000)
        executor = entry.executorId ?? null;
    } catch {}

    const guildIcon = role.guild.iconURL({ size: 64 }) ?? undefined;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Role Deleted", iconURL: guildIcon })
      .setDescription(
        `Role \`${role.name}\` was deleted${executor ? ` by <@${executor}>` : ""}`
      )
      .addFields(
        { name: "Color",   value: role.hexColor,          inline: true },
        { name: "Members", value: `${role.members.size}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Role ID: ${role.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
