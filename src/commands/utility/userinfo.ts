import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { formatRelative } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "userinfo",
  aliases: ["whois", "ui"],
  description: "Show information about a user.",
  usage: "userinfo [user]",
  examples: ["userinfo", "userinfo @user"],
  category: "utility",
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const member = ctx.guild ? await ctx.guild.members.fetch(target.id).catch(() => null) : null;

    const fields: { name: string; value: string; inline?: boolean }[] = [
      { name: "id", value: target.id, inline: true },
      { name: "created", value: formatRelative(target.createdAt), inline: true },
    ];

    if (member?.joinedAt) {
      fields.push({ name: "joined", value: formatRelative(member.joinedAt), inline: true });
    }
    if (member?.nickname) {
      fields.push({ name: "nickname", value: member.nickname, inline: true });
    }
    if (target.bot) {
      fields.push({ name: "bot", value: "yes", inline: true });
    }
    if (member && member.roles.cache.size > 1) {
      const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `<@&${r.id}>`)
        .slice(0, 15)
        .join(" ");
      fields.push({ name: `roles [${member.roles.cache.size - 1}]`, value: roles });
    }

    const displayName = member?.displayName ?? target.globalName ?? target.username;

    return ctx.reply({
      embeds: [
        brandEmbed({
          description: `<@${target.id}>`,
          thumbnail: target.displayAvatarURL({ size: 256 }),
          fields,
          authorName: displayName,
          authorIcon: target.displayAvatarURL({ size: 64 }),
        }),
      ],
    });
  },
};