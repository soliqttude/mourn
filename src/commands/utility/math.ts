import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "math",
  description: "Evaluate a math expression.",
  usage: "math [expression]",
  examples: ["math"],
  category: "utility",
  aliases: ["calc", "calculate"],
  options: [{ name: "expression", description: "Math expression", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const expr = ctx.getString("expression", true) ?? ctx.rawArgs;
    if (!expr) return;
    const safe = expr.replace(/[^0-9+\-*/().% ]/g, "");
    if (!safe.trim()) return ctx.reply({ embeds: [errorEmbed("Invalid expression.")] });
    try {
      const result = Function(`"use strict"; return (${safe})`)();
      if (typeof result !== "number" || !isFinite(result)) throw new Error("Invalid");
      return ctx.reply({ embeds: [brandEmbed({ title: "🧮 Calculator", description: `\`${expr}\` = **${result}**`, page: "Utility" })] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Invalid math expression.")] });
    }
  },
};
