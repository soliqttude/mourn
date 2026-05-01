import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance, getEconomy, setLastDaily } from "../../features/economy.js";

const DAILY_AMOUNT = 500;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const command: HybridCommand = {
  name: "daily",
  description: "Claim your daily reward.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const eco = await getEconomy(ctx.guild.id, ctx.user.id);
    const now = Date.now();
    if (eco.lastDaily && now - eco.lastDaily.getTime() < DAILY_COOLDOWN_MS) {
      const next = Math.floor((eco.lastDaily.getTime() + DAILY_COOLDOWN_MS) / 1000);
      return ctx.reply({ embeds: [errorEmbed(`Already claimed. Next: <t:${next}:R>`)] });
    }
    await addBalance(ctx.guild.id, ctx.user.id, DAILY_AMOUNT);
    await setLastDaily(ctx.guild.id, ctx.user.id, new Date(now));
    return ctx.reply({
      embeds: [successEmbed(`You claimed **${DAILY_AMOUNT}** coins. See you tomorrow.`)],
    });
  },
};
