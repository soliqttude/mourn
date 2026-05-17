import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const ALIASES: Record<string, string> = {
  est: "America/New_York", cst: "America/Chicago", mst: "America/Denver",
  pst: "America/Los_Angeles", gmt: "Europe/London", utc: "UTC",
  cet: "Europe/Paris", jst: "Asia/Tokyo", ist: "Asia/Kolkata",
  aest: "Australia/Sydney", cst2: "Asia/Shanghai", bst: "Europe/London",
};

export const command: HybridCommand = {
  name: "timezone",
  description: "Show the current time in any timezone.",
  usage: "timezone [zone]",
  examples: ["timezone"],
  category: "utility",
  aliases: ["tz", "time2", "localtime"],
  options: [
    { name: "zone", description: "Timezone (e.g. America/New_York, EST, UTC)", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const raw = (ctx.getString("zone") ?? ctx.args[0] ?? "UTC").trim();
    const zone = ALIASES[raw.toLowerCase()] ?? raw;

    try {
      const now = new Date();
      const formatted = now.toLocaleString("en-US", {
        timeZone: zone,
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
      });
      const offset = now.toLocaleString("en-US", { timeZone: zone, timeZoneName: "short" }).split(" ").pop();

      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x0f1923)
            .setTitle(`🌍 Time — ${zone}`)
            .setDescription([
              `**${formatted}**`,
              `Offset: **${offset}**`,
            ].join("\n"))
            .setFooter({ text: `${config.embedFooter} • Timezone` })
            .setTimestamp(),
        ],
      });
    } catch {
      return ctx.reply({ content: `Unknown timezone: \`${zone}\`. Try formats like \`America/New_York\`, \`UTC\`, \`EST\`.` });
    }
  },
};
