import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "beg",
  description: "Beg for a small amount of coins.",
  category: "economy",
  aliases: ["spare"],
  guildOnly: true,
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const CD = 600_000;
    const last = await getCooldown(ctx.guild.id, ctx.user.id, "lastBeg");
    const remaining = cdRemaining(last, CD);
    if (remaining > 0) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`🙏 Stop spamming! Wait **${fmtMs(remaining)}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    await setCooldown(ctx.guild.id, ctx.user.id, "lastBeg");
    const success = Math.random() > 0.3;
    if (success) {
      const reward = Math.floor(Math.random() * 40) + 5;
      await addBalance(ctx.guild.id, ctx.user.id, reward);
      const givers = ["a kind stranger","a rich businessman","a tourist","a guild member","the bot itself"];
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("🙏 Begging").setDescription(`${givers[Math.floor(Math.random()*givers.length)]} gave you **${formatCoins(reward)}** coins.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } else {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x888888).setTitle("🙏 Begging").setDescription("Nobody gave you anything. How sad.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
