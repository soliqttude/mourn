import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "calculate",
  description: "Evaluate a math expression.",
  category: "utility",
  aliases: ["calc", "math", "eval_math"],
  options: [{ name: "expression", description: "Math expression", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const expr = ctx.getString("expression") ?? ctx.args.join(" ");
    if (!expr) return ctx.reply({ content: "Provide an expression.", ephemeral: true } as any);
    if (!/^[0-9+\-*/%.() \t^]+$/.test(expr)) return ctx.reply({ content: "Only safe math expressions allowed (0-9 + - * / % . ( ) ^).", ephemeral: true } as any);
    try {
      const result = Function(`"use strict"; return (${expr.replace(/\^/g,"**")})`)();
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🔢 Calculator").addFields({ name: "Expression", value: `\`${expr}\``, inline: false },{ name: "Result", value: `\`${result}\``, inline: false }).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } catch {
      return ctx.reply({ content: "Invalid expression.", ephemeral: true } as any);
    }
  },
};
