import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { addReminder } from "../../features/reminders.js";

export const command: HybridCommand = {
  name: "remind",
  aliases: ["remindme", "reminder"],
  description: "Set a personal reminder.",
  usage: "remind [duration] [message]",
  examples: ["remind"],
  category: "utility",
  options: [
    { name: "duration", description: "Duration (e.g. 10m, 1h)", type: ApplicationCommandOptionType.String, required: true },
    { name: "message", description: "What to remind", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const dur = ctx.getString("duration", true);
    const msg = ctx.getString("message", true);
    if (!dur || !msg) return;
    const ms = parseDuration(dur);
    if (!ms || ms < 5_000) return ctx.reply({ embeds: [errorEmbed("Invalid duration. Min 5s.")] });
    const remindAt = new Date(Date.now() + ms);
    if (!ctx.channel) return ctx.reply({ embeds: [errorEmbed("No channel.")] });
    await addReminder(ctx.user.id, ctx.channel.id, ctx.guild?.id ?? null, msg, remindAt);
    return ctx.reply({
      embeds: [
        successEmbed(
          `I'll remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>: ${msg.slice(0, 200)}`
        ),
      ],
    });
  },
};
