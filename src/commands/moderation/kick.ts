import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { modEmbed, errorEmbed } from "../../lib/embeds.js";
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
    const reason = ctx.getString("reason") ?? "no reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("member not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't kick yourself.")] });
    if (!target.kickable) return ctx.reply({ embeds: [errorEmbed("i can't kick that user.")] });
    try {
      await target.kick(`${ctx.user.tag}: ${reason}`);
      const caseId = await logCase(guild.id, target.id, ctx.user.id, "kick", reason);
      return ctx.reply({
        embeds: [modEmbed({ action: "kicked", target: target.user, moderator: ctx.user, reason, caseId })],
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
