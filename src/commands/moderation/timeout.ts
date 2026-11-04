import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { REASON_DEFAULT } from "../../lib/format.js";
import { parseDuration } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "timeout",
  aliases: ["mute"],
  description: "Timeout a member for a set duration. Also available as mute.",
  usage: "timeout <member> <duration> [reason]",
  examples: ["timeout @member 10m rule violation"],
  category: "moderation",
  permission: "moderate_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to timeout", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration (e.g. 10m, 1h, 1d; max 28d)", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getMember("user", true);
    const duration = ctx.getString("duration", true) ?? ctx.args[1];
    const reason = (ctx.getString("reason") ?? ctx.args.slice(2).join(" ")) || REASON_DEFAULT;
    if (!target || !duration) return ctx.reply({ embeds: [errorEmbed("Provide a member and timeout duration.")] });
    const ms = parseDuration(duration);
    if (!ms || ms > 28 * 24 * 60 * 60 * 1000) {
      return ctx.reply({ embeds: [errorEmbed("Invalid duration. Use a value such as 10m, 1h, or 1d (maximum 28 days).")] });
    }
    if (!target.moderatable) return ctx.reply({ embeds: [errorEmbed("I cannot timeout that member. Check my Moderate Members permission and role hierarchy.")] });
    try {
      await target.timeout(ms, `Timeout by ${ctx.user.tag}: ${reason}`);
      const dmSent = await target.user.send(`You have been timed out in ${guild.name} for ${duration}. Reason: ${reason}`).then(() => true).catch(() => false);
      return ctx.reply({ embeds: [successEmbed(`Timed out **${target.user.tag}** for ${duration}.${dmSent ? "" : " I could not DM the member."}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message || "Failed to apply timeout.")] });
    }
  },
};
