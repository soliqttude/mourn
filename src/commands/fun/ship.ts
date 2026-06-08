import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ship",
  description: "Calculate the love compatibility between two users.",
  category: "fun",
  aliases: ["lovecalc", "love"],
  options: [{ name: "user1", description: "First person", type: ApplicationCommandOptionType.User, required: true }, { name: "user2", description: "Second person", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const u1 = await ctx.getUser("user1") ?? ctx.user;
    const u2 = await ctx.getUser("user2") ?? ctx.user;
    const seed = (u1.id + u2.id).split("").reduce((a,c)=>a+c.charCodeAt(0),0);
    const pct = seed % 101;
    const bar = "💗".repeat(Math.floor(pct/10)) + "🤍".repeat(10-Math.floor(pct/10));
    const msg = pct >= 90 ? "Soulmates! 💞" : pct >= 70 ? "Great match! 💕" : pct >= 50 ? "Could work! 💛" : pct >= 30 ? "Hmm... 🤔" : "Yikes... 💔";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("💘 Ship").setDescription(`**${u1.username}** + **${u2.username}**\n\n${bar}\n\n**${pct}%** — ${msg}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
