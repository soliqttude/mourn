import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "tempmute",
  aliases: ["tm", "timemute"],
  description: "Temporarily mute (timeout) a member.",
  usage: "tempmute [user] [duration] [reason]",
  examples: ["tempmute Rule violation"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to mute", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration e.g. 10m, 1h, 1d (max 28d)", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const durStr = ctx.getString("duration", true)!;
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't mute yourself.")] });
    const ms = parseDuration(durStr);
    if (!ms || ms > 28 * 24 * 60 * 60 * 1000) return ctx.reply({ embeds: [errorEmbed("Invalid duration. Max 28 days.")] });
    if (!target.moderatable) return ctx.reply({ embeds: [errorEmbed("I can't timeout that user.")] });
    try {
      await target.timeout(ms, `${ctx.user.tag}: ${reason}`);
      return ctx.reply({ embeds: [successEmbed(`Muted **${target.user.tag}** for **${durStr}** — ${reason}`)] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
