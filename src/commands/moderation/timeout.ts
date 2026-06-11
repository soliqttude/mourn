import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { modEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "timeout",
  aliases: ["mute"],
  description: "Timeout a member.",
  usage: "timeout [user] [duration] [reason]",
  examples: ["timeout Rule violation"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to timeout", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration (e.g. 10m, 1h, 1d)", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getMember("user", true);
    const dur = ctx.getString("duration", true);
    const reason = ctx.getString("reason") ?? "no reason provided";
    if (!target || !dur) return;
    const ms = parseDuration(dur);
    if (!ms || ms > 28 * 24 * 60 * 60 * 1000) return ctx.reply({ embeds: [errorEmbed("Invalid duration. max 28 days.")] });
    if (!target.moderatable) return ctx.reply({ embeds: [errorEmbed("I can't timeout that **user**.")] });
    try {
      await target.timeout(ms, `${ctx.user.tag}: ${reason}`);
      return ctx.reply({
        embeds: [modEmbed({ action: "timed out", target: target.user, moderator: ctx.user, reason, duration: dur })],
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
