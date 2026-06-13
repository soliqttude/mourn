import type { Client, Role, TextChannel } from "discord.js";
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { handleAntinukeAction } from "../features/antinuke.js";

export const event = {
  name: "roleCreate",
  async execute(client: Client, role: Role) {
    await handleAntinukeAction(client, role.guild, "role_create", role.id);

    const settings    = await getGuildSettings(role.guild.id);
    const logChannelId = (settings as any).roleLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = role.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    let executor: string | null = null;
    try {
      const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && entry.targetId === role.id && (Date.now() - entry.createdTimestamp) < 5000)
        executor = entry.executorId ?? null;
    } catch {}

    const guildIcon = role.guild.iconURL({ size: 64 }) ?? undefined;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Role Created", iconURL: guildIcon })
      .setDescription(
        `Role <@&${role.id}> was created${executor ? ` by <@${executor}>` : ""}`
      )
      .addFields(
        { name: "Color",       value: role.hexColor,                    inline: true },
        { name: "Hoisted",     value: role.hoist ? "yes" : "no",       inline: true },
        { name: "Mentionable", value: role.mentionable ? "yes" : "no", inline: true },
        { name: "Position",    value: `${role.position}`,               inline: true },
        { name: "Members",     value: `${role.members.size}`,           inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Role ID: ${role.id}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
