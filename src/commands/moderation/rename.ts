import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "rename",
  description: "Assign a member a new nickname.",
  category: "moderation",
  aliases: ["renamemember"],
  permission: "manage_nicknames",
  guildOnly: true,
  options: [
    { name: "member", description: "Member to rename", type: ApplicationCommandOptionType.User, required: true },
    { name: "name", description: "New nickname", type: ApplicationCommandOptionType.String, required: true, max_length: 32 },
  ],
  async execute(ctx) {
    const target = await ctx.getMember("member", true);
    const name = ctx.getString("name", true);
    if (!target || name === null) return;
    if (target.id === ctx.guild?.ownerId) return ctx.reply({ embeds: [errorEmbed("The server owner cannot be renamed by a moderator.")] });
    if (target.roles.highest.position >= (ctx.member?.roles.highest.position ?? 0) && ctx.user.id !== ctx.guild?.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("You cannot rename a member with an equal or higher role.")] });
    }
    try {
      await target.setNickname(name, `Nickname changed by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Changed **${target.user.tag}**'s nickname to **${name}**.`)] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Failed to change nickname.")] });
    }
  },
};
