import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "crime",
  description: "Commit a crime for coins (risky).",
  category: "economy",
  aliases: ["steal"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 7_200_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastCrime");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`⏳ Laying low for **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    await setCooldown(ctx.guild.id, ctx.user.id, "lastCrime");
    const success = Math.random() > 0.4;
    if (success) {
      const reward = Math.floor(Math.random() * 400) + 100;
      await addBalance(ctx.guild.id, ctx.user.id, reward);
      const crimes = ["robbed a bank","hacked an ATM","pickpocketed someone","sold counterfeit goods"];
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("🦹 Crime Success").setDescription(`You ${crimes[Math.floor(Math.random()*crimes.length)]} and got **${formatCoins(reward)}** coins!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } else {
      const fine = Math.floor(Math.random() * 150) + 50;
      const eco = await getBalance(ctx.guild.id, ctx.user.id);
      const actual = Math.min(fine, eco.balance);
      if (actual > 0) await addBalance(ctx.guild.id, ctx.user.id, -actual);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🚔 Caught!").setDescription(`You got caught and were fined **${formatCoins(actual)}** coins.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
