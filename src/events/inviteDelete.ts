import type { Client, Invite, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
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

    const guildIcon = invite.guild.iconURL({ size: 64 }) ?? undefined;
    const inviter   = invite.inviter;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setAuthor({ name: "invite deleted", iconURL: guildIcon })
      .addFields(
        { name: "code",       value: `\`${invite.code}\``,                                          inline: true  },
        { name: "channel",    value: invite.channel ? `<#${invite.channel.id}>` : "unknown",       inline: true  },
        { name: "uses",       value: `${invite.uses ?? 0}`,                                         inline: true  },
        { name: "created by", value: inviter ? `<@${inviter.id}> \`${inviter.id}\`` : "unknown",   inline: false },
      )
      .setTimestamp()
      .setFooter({ text: `code: ${invite.code}` });

    await (logCh as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
