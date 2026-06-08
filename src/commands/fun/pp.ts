import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "pp",
  description: "Measure someone's pp size (just for fun).",
  category: "fun",
  aliases: ["ppsize", "dong"],
  options: [{ name: "user", description: "User to measure", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const seed = target.id.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
    const size = seed % 21;
    const bar = "8" + "=".repeat(size) + "D";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("📏 PP Size").setDescription(`**${target.username}'s pp:**\n\`${bar}\` (${size} cm)`).setFooter({ text: "Not real • " + config.embedFooter }).setTimestamp()] });
  },
};
