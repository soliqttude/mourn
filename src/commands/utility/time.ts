import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "time", description: "Get the current time in any timezone.", category: "utility",
  options: [{ name: "timezone", description: "Timezone (e.g. America/New_York, UTC, Europe/London)", type: ApplicationCommandOptionType.String, required: false }],
  async execute(ctx) {
    const tz = (ctx.getString("timezone") ?? ctx.args.join(" ")) || "UTC";
    try {
      const now = new Date();
      const formatted = now.toLocaleString("en-US", {
        timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
      });
      const unix = Math.floor(now.getTime() / 1000);
      return ctx.reply({ embeds: [brandEmbed({ title: "🕐 Current Time", description: `**${tz}**\n${formatted}\n\nUnix timestamp: \`${unix}\``, page: "Time" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed(`Invalid timezone: \`${tz}\`. Examples: \`America/New_York\`, \`Europe/London\`, \`Asia/Tokyo\`, \`UTC\``)] }); }
  },
};