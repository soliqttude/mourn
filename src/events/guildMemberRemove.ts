import type { Client, GuildMember, PartialGuildMember, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { renderTemplate } from "../lib/template.js";
import { trackMemberLeave } from "../features/invites.js";

export const event = {
  name: "guildMemberRemove",
  async execute(_client: Client, member: GuildMember | PartialGuildMember) {
    if (member.user.bot) return;
    const settings = await getGuildSettings(member.guild.id);

    await trackMemberLeave(member.guild.id, member.id);

    if (settings.goodbyeChannel) {
      const ch = member.guild.channels.cache.get(settings.goodbyeChannel);
      if (ch?.isTextBased()) {
        const tmpl = settings.goodbyeMessage || "{user.mention} just left **{server}**. We now have {member_count} members.";
        await (ch as TextChannel).send({
          content: renderTemplate(tmpl, { member: member as GuildMember }),
          allowedMentions: { parse: ["users"] },
        }).catch(() => {});
      }
    }

    if (!settings.joinLogChannel) return;
    const ch = member.guild.channels.cache.get(settings.joinLogChannel);
    if (!ch?.isTextBased()) return;

    const avatarURL = member.user.displayAvatarURL({ size: 256 });
    const joined    = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
    const created   = Math.floor(member.user.createdTimestamp / 1000);
    const roles     = (member as GuildMember).roles?.cache
      .filter((r) => r.id !== member.guild.id)
      .map((r) => `<@&${r.id}>`)
      .join(", ") || "none";

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: `${member.user.username} left`, iconURL: avatarURL })
      .setThumbnail(avatarURL)
      .addFields(
        { name: "user",    value: `<@${member.id}> \`${member.id}\``,     inline: false },
        { name: "joined",  value: joined ? `<t:${joined}:R>` : "unknown", inline: true  },
        { name: "created", value: `<t:${created}:R>`,                      inline: true  },
        { name: "members", value: `${member.guild.memberCount}`,            inline: true  },
        { name: "roles",   value: roles.slice(0, 1024),                    inline: false },
      )
      .setTimestamp()
      .setFooter({ text: `user id: ${member.id}` });

    await (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
  },
};
