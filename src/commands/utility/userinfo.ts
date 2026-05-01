import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { formatRelative } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "userinfo",
  aliases: ["whois"],
  description: "Show information about a user.",
  category: "utility",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const member = ctx.guild ? await ctx.guild.members.fetch(target.id).catch(() => null) : null;
    const fields: { name: string; value: string; inline?: boolean }[] = [
      { name: "ID", value: target.id, inline: true },
      { name: "Created", value: formatRelative(target.createdAt), inline: true },
    ];
    if (member?.joinedAt) fields.push({ name: "Joined", value: formatRelative(member.joinedAt), inline: true });
    if (member && member.roles.cache.size > 1) {
      const roles = member.roles.cache
        .filter((r) => r.id !== member.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => `<@&${r.id}>`)
        .slice(0, 15)
        .join(" ");
      fields.push({ name: "Roles", value: roles });
    }
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: target.tag,
          description: `<@${target.id}>`,
          thumbnail: target.displayAvatarURL({ size: 256 }),
          fields,
          page: "Userinfo",
        }),
      ],
    });
  },
};
