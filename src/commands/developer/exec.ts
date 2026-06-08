import { EmbedBuilder, ApplicationCommandOptionType, codeBlock } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { execSync } from "child_process";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "exec",
  description: "(Dev) Execute a shell command.",
  category: "developer",
  aliases: ["sh", "shell"],
  ownerOnly: true,
  options: [{ name: "command", description: "Shell command", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const cmd = ctx.getString("command") ?? ctx.args.join(" ");
    try {
      const output = execSync(cmd, { timeout: 10000, encoding: "utf8" });
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Exec").addFields({ name: "Command", value: codeBlock("sh", cmd.slice(0,500)) },{ name: "Output", value: codeBlock("sh", output.slice(0,1000) || "(empty)") }).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
    } catch (e: any) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("❌ Error").addFields({ name: "Command", value: codeBlock("sh", cmd.slice(0,500)) },{ name: "Error", value: codeBlock("sh", (e.message ?? String(e)).slice(0,1000)) }).setFooter({ text: config.embedFooter }).setTimestamp()], ephemeral: true } as any);
    }
  },
};
