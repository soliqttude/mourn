import type { Client, GuildMember, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { renderTemplate } from "../lib/template.js";
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
        const tmpl =
          settings.welcomeMessage ||
          "Welcome {user.mention} to **{server}** — you're member #{member_count}.";
        await (ch as TextChannel)
          .send({
            content: renderTemplate(tmpl, { member, inviter }),
            allowedMentions: { parse: ["users"] },
          })
          .catch(() => {});
      }
    }

    if (settings.joinLogChannel) {
      const ch = member.guild.channels.cache.get(settings.joinLogChannel);
      if (ch?.isTextBased()) {
        const accountAge = Math.floor(
          (Date.now() - member.user.createdTimestamp) / 86_400_000
        );
        const embed = brandEmbed({
          title: "📥 Member Joined",
          description: `<@${member.id}> (${member.user.tag})\n**Account age:** ${accountAge} days\n**Member count:** ${member.guild.memberCount}${
            inviter ? `\n**Invited by:** <@${inviter.inviterId}> (\`${inviter.code}\`)` : ""
          }`,
          page: "Logs",
          thumbnail: member.user.displayAvatarURL(),
        });
        await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
      }
    }
  },
};
