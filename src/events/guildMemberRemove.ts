import type { Client, GuildMember, PartialGuildMember, TextChannel } from "discord.js";
import { brandEmbed } from "../lib/embeds.js";
import { getGuildSettings } from "../db/settings.js";
import { renderTemplate } from "../lib/template.js";

export const event = {
  name: "guildMemberRemove",
  async execute(client: Client, member: GuildMember | PartialGuildMember) {
    if (member.user.bot) return;
    const settings = await getGuildSettings(member.guild.id);

    if (settings.goodbyeChannel) {
      const ch = member.guild.channels.cache.get(settings.goodbyeChannel);
      if (ch?.isTextBased()) {
        const tmpl =
          settings.goodbyeMessage ||
          "{user.mention} just left **{server}**. We now have {member_count} members.";
        await (ch as TextChannel)
          .send({
            content: renderTemplate(tmpl, { member: member as GuildMember }),
            allowedMentions: { parse: ["users"] },
          })
          .catch(() => {});
      }
    }

    if (settings.joinLogChannel) {
      const ch = member.guild.channels.cache.get(settings.joinLogChannel);
      if (ch?.isTextBased()) {
        const embed = brandEmbed({
          title: "📤 Member Left",
          description: `<@${member.id}> (${member.user.tag})\n**Member count:** ${member.guild.memberCount}`,
          page: "Logs",
          thumbnail: member.user.displayAvatarURL(),
        });
        await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
      }
    }
  },
};
