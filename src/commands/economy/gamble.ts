import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { addBalance } from "../../features/economy.js";

export const command: HybridCommand = {
  name: "gamble",
  description: "Bet coins on a 50/50 chance.",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "amount", description: "Amount to bet (or 'all')", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const rows = await db.select({ balance: economy.balance }).from(economy)
      .where(and(eq(economy.guildId, guild.id), eq(economy.userId, ctx.user.id)));
    const balance = rows[0]?.balance ?? 0;
    const raw = (ctx.getString("amount", true) ?? ctx.args[0] ?? "").toLowerCase();
    let bet = raw === "all" ? balance : parseInt(raw);
    if (!Number.isFinite(bet) || bet < 1) return ctx.reply({ embeds: [errorEmbed("Please provide a valid bet amount (min 1).")] });
    if (bet > balance) return ctx.reply({ embeds: [errorEmbed(`You only have **${balance}** coins.`)] });
    const win = Math.random() < 0.5;
    await addBalance(guild.id, ctx.user.id, win ? bet : -bet);
    const newBal = balance + (win ? bet : -bet);
    if (win) {
      return ctx.reply({ embeds: [successEmbed(`🎰 You won **${bet}** coins! Balance: **${newBal}** 💰`)] });
    } else {
      return ctx.reply({ embeds: [errorEmbed(`🎰 You lost **${bet}** coins. Balance: **${newBal}**`)] });
    }
  },
};
