import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { addReminder } from "../../features/reminders.js";

export const command: HybridCommand = {
  name: "remind",
  aliases: ["reminder", "remindme"],
  description: "Set a reminder for a duration and message.",
  category: "utility",
  options: [
    { name: "duration", description: "When to remind you (e.g. 10m, 2h, 1d)", type: ApplicationCommandOptionType.String, required: true },
    { name: "reminder", description: "What should I remind you about?", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const duration = ctx.getString("duration") ?? ctx.args[0];
    const message = ctx.getString("reminder") ?? ctx.args.slice(1).join(" ").trim();
    if (!duration || !message) return ctx.reply({ embeds: [errorEmbed("Usage: `,remind <duration> <reminder>`.")] });
    const ms = parseDuration(duration);
    if (!ms || ms < 60_000 || ms > 365 * 24 * 60 * 60 * 1000) {
      return ctx.reply({ embeds: [errorEmbed("Use a valid duration from 1 minute up to 365 days (for example, `30m`, `2h`, or `1d`).")] });
    }
    const channelId = ctx.channel?.id;
    if (!channelId) return ctx.reply({ embeds: [errorEmbed("Reminders must be set in a server or direct-message channel.")] });
    const remindAt = new Date(Date.now() + ms);
    try {
      await addReminder(ctx.user.id, channelId, ctx.guild?.id ?? null, message, remindAt);
      return ctx.reply({ embeds: [successEmbed(`Reminder **#** set for <t:${Math.floor(remindAt.getTime() / 1000)}:R>.\n**Reminder:** ${message}`)] });
    } catch (error) {
      return ctx.reply({ embeds: [errorEmbed((error as Error).message || "Could not save your reminder.")] });
    }
  },
};
