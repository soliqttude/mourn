import type { Client, Invite, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { upsertInvite } from "../features/invites.js";
import { getGuildSettings } from "../db/settings.js";

export const event = {
  name: "inviteCreate",
  async execute(client: Client, invite: Invite) {
    if (!invite.guild) return;
    await upsertInvite(invite.guild.id, invite.code, invite.uses ?? 0, invite.inviter?.id ?? null);

    const settings    = await getGuildSettings(invite.guild.id);
    const logChannelId = (settings as any).serverLogChannel as string | null;
    if (!logChannelId) return;
    const logCh = invite.guild.channels.cache.get(logChannelId);
    if (!logCh?.isTextBased()) return;

    const inviter    = invite.inviter;
    const avatarURL  = inviter?.displayAvatarURL({ size: 64 }) ?? invite.guild.iconURL({ size: 64 }) ?? undefined;
    const expiresAt  = invite.expiresTimestamp ? Math.floor(invite.expiresTimestamp / 1000) : null;
    const maxUses    = invite.maxUses ? `${invite.maxUses}` : "unlimited";

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: `${inviter?.username ?? "unknown"} — invite created`, iconURL: avatarURL })
      .addFields(
        { name: "code",     value: `\`${invite.code}\``,                                       inline: true },
        { name: "channel",  value: invite.channel ? `<#${invite.channel.id}>` : "unknown",    inline: true },
        { name: "max uses", value: maxUses,                                                     inline: true },
        { name: "expires",  value: expiresAt ? `<t:${expiresAt}:R>` : "never",                inline: true },
        { name: "created by", value: inviter ? `<@${inviter.id}> \`${inviter.id}\`` : "unknown", inline: false },
      )
      .setTimestamp()
      .setFooter({ text: `code: ${invite.code}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
