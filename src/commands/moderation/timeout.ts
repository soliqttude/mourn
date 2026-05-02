import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { logCase } from "../../features/modcase.js";

export const command: HybridCommand = {
  name: "timeout",
  aliases: ["mute"],
  description: "Timeout a member.",
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
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target || !dur) return;
    const ms = parseDuration(dur);
    if (!ms || ms > 28 * 24 * 60 * 60 * 1000) return ctx.reply({ embeds: [errorEmbed("Invalid duration. Max 28 days.")] });
    if (!target.moderatable) return ctx.reply({ embeds: [errorEmbed("I can't timeout that user.")] });
    try {
      await target.timeout(ms, `${ctx.user.tag}: ${reason}`);
      const caseId = await logCase(guild.id, target.id, ctx.user.id, "timeout", reason, dur);
      return ctx.reply({ embeds: [successEmbed(`Timed out **${target.user.tag}** for ${dur} — ${reason}\nCase #${caseId}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
