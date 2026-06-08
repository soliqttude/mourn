import { EmbedBuilder, ApplicationCommandOptionType, codeBlock } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "eval",
  description: "(Dev) Evaluate JavaScript code.",
  category: "developer",
  aliases: ["evaluate", "js"],
  ownerOnly: true,
  options: [{ name: "code", description: "Code to evaluate", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const code = ctx.getString("code") ?? ctx.args.join(" ");
    try {
      let result = eval(code);
      if (result instanceof Promise) result = await result;
      const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Eval").addFields({ name: "Input", value: codeBlock("js", code.slice(0,500)) },{ name: "Output", value: codeBlock("js", (output ?? "undefined").slice(0,1000)) }).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } catch (e: any) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("❌ Error").addFields({ name: "Input", value: codeBlock("js", code.slice(0,500)) },{ name: "Error", value: codeBlock("js", e.message?.slice(0,1000) ?? String(e)) }).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
