import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
function safeEval(expr: string): string {
  const clean = expr.replace(/[^0-9+\-*/.()%^\s]/g, "").trim();
  if (!clean) return "Invalid expression";
  try {
    const fn = new Function(`"use strict"; return (${clean.replace(/\^/g, "**")})`);
    const result = (fn as () => number)();
    if (!isFinite(result)) return "Math error (division by zero?)";
    return String(Math.round(result * 1e10) / 1e10);
  } catch { return "Invalid expression"; }
}
export const command: HybridCommand = {
  name: "calculator", aliases: ["calc"], description: "Evaluate a math expression.", category: "utility",
  options: [{ name: "expression", description: "Math expression (e.g. 2+2*10, 15%4, 2^8)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const expr = ctx.getString("expression", true) ?? ctx.rawArgs;
    if (!expr) return ctx.reply({ embeds: [errorEmbed("Please provide an expression.")] });
    const result = safeEval(expr.slice(0, 200));
    return ctx.reply({ embeds: [brandEmbed({ title: "🔢 Calculator", description: `\`${expr}\` = **${result}**`, page: "Calc" })] });
  },
};
