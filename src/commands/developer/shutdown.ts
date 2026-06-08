import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "shutdown",
  description: "(Dev) Gracefully shut down the bot.",
  category: "developer",
  aliases: ["kill", "restart_bot"],
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    await ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("👋 Shutting down...").setFooter({ text: config.embedFooter }).setTimestamp()] });
    setTimeout(() => process.exit(0), 1000);
  },
};
