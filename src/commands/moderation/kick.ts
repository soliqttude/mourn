import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "kick",
  description: "Kick a member from the server.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to kick", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getMember("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't kick yourself.")] });
    if (!target.kickable) return ctx.reply({ embeds: [errorEmbed("I can't kick that user.")] });
    try {
      await target.kick(`${ctx.user.tag}: ${reason}`);
      const caseId = await logCase(guild.id, target.id, ctx.user.id, "kick", reason);
      return ctx.reply({ embeds: [successEmbed(`Kicked **${target.user.tag}** — ${reason}\nCase #${caseId}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
