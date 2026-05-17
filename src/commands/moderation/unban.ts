import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "unban",
  aliases: ["ub", "pardon"],
  description: "Unban a user.",
  usage: "unban [user_id]",
  examples: ["unban"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user_id", description: "User ID to unban", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const id = ctx.getString("user_id", true);
    if (!id || !ctx.guild) return;
    try {
      await ctx.guild.members.unban(id, `Unbanned by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Unbanned <@${id}>.`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
