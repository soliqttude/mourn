import type { Client, GuildMember, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { trackInviteUse } from "../features/invites.js";
import { handleAntiraidJoin } from "../features/antiraid.js";

export const event = {
  name: "guildMemberAdd",
  async execute(client: Client, member: GuildMember) {
    if (member.user.bot) return;
    const settings = await getGuildSettings(member.guild.id);

    await handleAntiraidJoin(member, settings);
    const inviter = await trackInviteUse(member);

    if (settings.welcomeChannel) {
      const ch = member.guild.channels.cache.get(settings.welcomeChannel);
      if (ch?.isTextBased()) {
        const welcome = (settings as any).welcomeMessage
          ? (settings as any).welcomeMessage
              .replace("{user}", `<@${member.id}>`)
              .replace("{server}", member.guild.name)
          : null;

        const embed = brandEmbed({
          description: welcome ?? `welcome to **${member.guild.name}**, <@${member.id}>`,
          thumbnail: member.user.displayAvatarURL({ size: 256 }),
          authorName: member.user.globalName ?? member.user.username,
          authorIcon: member.user.displayAvatarURL({ size: 64 }),
        });

        await (ch as TextChannel).send({
          embeds: [embed],
          allowedMentions: { users: [member.id] },
        }).catch(() => {});
      }
    }

    if (settings.joinLogChannel) {
      const ch = member.guild.channels.cache.get(settings.joinLogChannel);
      if (ch?.isTextBased()) {
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86_400_000);
        const lines = [
          `<@${member.id}> **${member.user.username}** (\`${member.id}\`)`,
          `**account age** — ${accountAge}d`,
          `**members** — ${member.guild.memberCount}`,
          inviter ? `**invited by** — <@${inviter.inviterId}> (\`${inviter.code}\`)` : null,
        ].filter(Boolean).join("\n");

        const embed = brandEmbed({
          description: lines,
          thumbnail: member.user.displayAvatarURL({ size: 256 }),
          authorName: "member joined",
          authorIcon: member.user.displayAvatarURL({ size: 64 }),
        });
        embed.setTimestamp();
        await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
      }
    }
  },
};
