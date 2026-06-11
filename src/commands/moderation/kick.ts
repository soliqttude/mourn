import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { modEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "kick",
  aliases: ["k", "remove"],
  description: "Kick a member from the server.",
  usage: "kick [user] [reason]",
  examples: ["kick Rule violation"],
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
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't kick yourself.")] });
    if (!target.kickable) return ctx.reply({ embeds: [errorEmbed("I can't kick that **user**.")] });
    try {
      await target.kick(`${ctx.user.tag}: ${reason}`);
      return ctx.reply({
        embeds: [modEmbed({ action: "kicked", target: target.user, moderator: ctx.user, reason })],
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
