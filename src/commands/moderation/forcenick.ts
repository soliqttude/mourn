import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "forcenick", aliases: ["setnick"], description: "Force a nickname on a member (leave nickname empty to reset).", category: "moderation", permission: "mod", guildOnly: true,
  options: [
    { name: "user", description: "Member to rename", type: ApplicationCommandOptionType.User, required: true },
    { name: "nickname", description: "New nickname (leave empty to reset)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    const nick = ctx.getString("nickname") ?? (ctx.args.length > 1 ? ctx.args.slice(1).join(" ") : null) ?? null;
    try {
      await target.setNickname(nick, `Forced by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(nick ? `Set **${target.user.username}**'s nickname to **${nick}**.` : `Reset **${target.user.username}**'s nickname.`)] });
    } catch (e) { return ctx.reply({ embeds: [errorEmbed((e as Error).message.slice(0, 200))] }); }
  },
};
