import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "heist",
  description: "Start a server heist to steal from the guild bank.",
  category: "economy",
  aliases: ["bankrob"],
  guildOnly: true,
  options: [
    { name: "amount", description: "Amount to attempt to steal", type: ApplicationCommandOptionType.Integer, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[0] ?? "0");
    if (!amount || amount < 100) return ctx.reply({ content: "Minimum heist attempt is 100 coins.", ephemeral: true } as any);
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    if (amount > eco.balance) return ctx.reply({ content: "You can't risk more than you have.", ephemeral: true } as any);
    const success = Math.random() > 0.6;
    if (success) {
      const reward = Math.floor(amount * (Math.random() * 1.5 + 1));
      await addBalance(ctx.guild.id, ctx.user.id, reward);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("🏦 Heist Successful!").setDescription(`Your crew cracked the vault and you escaped with **${formatCoins(reward)}** coins!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    } else {
      await addBalance(ctx.guild.id, ctx.user.id, -amount);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🚔 Heist Failed!").setDescription(`The police caught your crew. You lost **${formatCoins(amount)}** coins.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
