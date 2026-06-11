import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "hackban",
  aliases: ["forceban", "hb", "idban"],
  description: "Ban a user by ID even if they are not in the server.",
  usage: "hackban [userid] [reason]",
  examples: ["hackban Rule violation"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "userid", description: "User ID to ban", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const userId = ctx.getString("userid", true) ?? ctx.args[0] ?? "";
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!/^\d{17,19}$/.test(userId))
      return ctx.reply({ embeds: [errorEmbed("Please provide a valid Discord **user** ID (17-19 digits).")] });
    try {
      await guild.bans.create(userId, { reason, deleteMessageSeconds: 86400 });
      return ctx.reply({ embeds: [successEmbed(`Hackbanned user **${userId}**.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to ban. Check **permissions** or ID.")] });
    }
  },
};
