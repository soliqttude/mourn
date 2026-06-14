import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "hardban",
  aliases: ["hban", "permban"],
  description: "Permanently ban a user and delete all accessible message history.",
  usage: "hardban [user] [reason]",
  examples: ["hardban Rule violation"],
  category: "moderation",
  permission: "ban_members",
  guildOnly: true,
  options: [
    { name: "user", description: "User to hardban", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You cannot hardban yourself.")] });
    try {
      await guild.bans.create(target.id, { deleteMessageSeconds: 604800, reason });
      return ctx.reply({ embeds: [successEmbed(`Hardbanned **${target.tag}** — all message history cleared.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to hardban. Check my **permissions**.")] });
    }
  },
};
