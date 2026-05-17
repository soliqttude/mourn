import { ApplicationCommandOptionType, EmbedBuilder, codeBlock } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { logError } from "../../lib/ownerState.js";

export const command: HybridCommand = {
  name: "eval",
  description: "(Owner only) Execute JavaScript code in the bot process.",
  usage: "eval [code]",
  examples: ["eval"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "code", description: "Code to execute", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    const code = ctx.getString("code") ?? ctx.rawArgs;
    if (!code) return ctx.reply({ content: "Provide code to execute." });
    let result: unknown;
    let success = true;
    const start = Date.now();
    try {
      // eslint-disable-next-line no-eval
      result = eval(code);
      if (result instanceof Promise) result = await result;
    } catch (err) {
      result = (err as Error).message;
      success = false;
      logError((err as Error).message, (err as Error).stack);
    }
    const elapsed = Date.now() - start;
    const output = (typeof result === "string" ? result : JSON.stringify(result, null, 2)) ?? "undefined";
    const eb = new EmbedBuilder()
      .setColor(success ? config.successColor : config.errorColor)
      .setTitle(success ? "✅ Eval — Success" : "❌ Eval — Error")
      .addFields(
        { name: "Input", value: codeBlock("js", code.slice(0, 1000)) },
        { name: "Output", value: codeBlock("js", output.slice(0, 1000)) },
      )
      .setFooter({ text: `${elapsed}ms • ${config.embedFooter}` })
      .setTimestamp();
    return ctx.reply({ embeds: [eb], ephemeral: true });
  },
};
