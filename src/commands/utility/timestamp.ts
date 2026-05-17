import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "timestamp",
  description: "Generate Discord timestamp formats for a date.",
  usage: "timestamp [date]",
  examples: ["timestamp"],
  category: "utility",
  aliases: ["ts", "time"],
  options: [{ name: "date", description: "Date string (e.g. 2025-12-25) or Unix timestamp", type: ApplicationCommandOptionType.String, required: false }],
  async execute(ctx) {
    const input = ctx.getString("date") ?? ctx.args[0];
    const date = input ? new Date(isNaN(Number(input)) ? input : Number(input) * 1000) : new Date();
    if (isNaN(date.getTime())) return ctx.reply({ embeds: [errorEmbed("Invalid date.")] });
    const unix = Math.floor(date.getTime() / 1000);
    const formats = ["t", "T", "d", "D", "f", "F", "R"].map(f => `\`<t:${unix}:${f}>\` → <t:${unix}:${f}>`).join("\n");
    return ctx.reply({ embeds: [brandEmbed({ title: "🕐 Timestamps", description: formats, page: "Utility" })] });
  },
};
