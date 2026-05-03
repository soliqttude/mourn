import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "softban",
  description: "Ban then immediately unban a member, wiping their recent messages.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to softban", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You cannot softban yourself.")] });
    try {
      await guild.bans.create(target.id, { deleteMessageSeconds: 604800, reason });
      await guild.bans.remove(target.id, "softban cleanup");
      await logCase(guild.id, target.id, ctx.user.id, "softban", reason);
      return ctx.reply({ embeds: [successEmbed(`Softbanned **${target.tag}** — recent messages cleared.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to softban. Check my permissions.")] });
    }
  },
};
