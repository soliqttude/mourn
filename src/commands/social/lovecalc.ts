import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "lovecalc",
  description: "Calculate love compatibility between two names.",
  category: "social",
  aliases: ["compatibility", "lovetest"],
  options: [
    { name: "name1", description: "First name", type: ApplicationCommandOptionType.String, required: true },
    { name: "name2", description: "Second name", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const n1 = ctx.getString("name1") ?? ctx.args[0];
    const n2 = ctx.getString("name2") ?? ctx.args[1];
    if (!n1 || !n2) return ctx.reply({ content: "Provide two names.", ephemeral: true } as any);
    const seed = (n1+n2).toLowerCase().split("").reduce((a,c)=>a+c.charCodeAt(0),0);
    const pct = seed % 101;
    const hearts = "❤️".repeat(Math.ceil(pct/10));
    const msg = pct >= 90 ? "Perfect match! 💞" : pct >= 70 ? "Great chemistry! 💕" : pct >= 50 ? "Could work! 💛" : pct >= 30 ? "Needs work... 🤔" : "Not meant to be 💔";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("💘 Love Calculator").setDescription(`**${n1}** ❤️ **${n2}**\n\n${hearts}\n\n**${pct}%** — ${msg}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
