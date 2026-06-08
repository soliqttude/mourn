import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { getBalance, addBalance, setBalance, depositToBank, withdrawFromBank, transferCoins, getLeaderboard, getCooldown, setCooldown, formatCoins, cdRemaining, fmtMs } from "../../features/economy.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "coinflip",
  description: "Flip a coin and bet on the outcome.",
  category: "economy",
  aliases: ["cf", "flip"],
  guildOnly: true,
  options: [
    { name: "bet", description: "Amount to bet", type: ApplicationCommandOptionType.Integer, required: true }, { name: "choice", description: "heads or tails", type: ApplicationCommandOptionType.String, required: true }
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const bet = ctx.getNumber("bet") ?? parseInt(ctx.args[0] ?? "0");
    const choice = (ctx.getString("choice") ?? ctx.args[1] ?? "").toLowerCase();
    if (!bet || bet < 1) return ctx.reply({ content: "Provide a valid bet.", ephemeral: true } as any);
    if (!["heads","tails"].includes(choice)) return ctx.reply({ content: "Choose **heads** or **tails**.", ephemeral: true } as any);
    const eco = await getBalance(ctx.guild.id, ctx.user.id);
    if (bet > eco.balance) return ctx.reply({ content: "Not enough coins.", ephemeral: true } as any);
    const result = Math.random() > 0.5 ? "heads" : "tails";
    const won = result === choice;
    await addBalance(ctx.guild.id, ctx.user.id, won ? bet : -bet);
    const color = won ? 0x00e676 : 0xff4444;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle(`🪙 Coin Flip — ${result.toUpperCase()}`).setDescription(won ? `You chose **${choice}** and won **${formatCoins(bet)}** coins!` : `You chose **${choice}** but it was **${result}**. You lost **${formatCoins(bet)}** coins.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
