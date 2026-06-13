import type { Client, Invite, TextChannel } from "discord.js";
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { removeInvite } from "../features/invites.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "inviteDelete",
  async execute(client: Client, invite: Invite) {
    if (!invite.guild) return;
    await removeInvite(invite.guild.id, invite.code);

    const settings    = await getGuildSettings(invite.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = invite.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    let executor: string | null = null;
    try {
      const audit = await invite.guild.fetchAuditLogs({ type: AuditLogEvent.InviteDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && (Date.now() - entry.createdTimestamp) < 5000)
        executor = entry.executorId ?? null;
    } catch {}

    const guildIcon = invite.guild.iconURL({ size: 64 }) ?? undefined;
    const inviter   = invite.inviter;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "Invite Deleted", iconURL: guildIcon })
      .setDescription(
        `Invite \`${invite.code}\` for ${invite.channel ? `<#${invite.channel.id}>` : "unknown"} was deleted${executor ? ` by <@${executor}>` : ""}`
        + (inviter ? `\nCreated by <@${inviter.id}>` : "")
      )
      .addFields({ name: "Uses", value: `${invite.uses ?? 0}`, inline: true })
      .setTimestamp()
      .setFooter({ text: `Code: ${invite.code}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
