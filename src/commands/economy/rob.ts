import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { addBalance } from "../../features/economy.js";
import { humanDuration } from "../../lib/format.js";

const ROB_COOLDOWN = 30 * 60 * 1000;
const cooldowns = new Map<string, number>();

async function getBal(guildId: string, userId: string): Promise<number> {
  const rows = await db.select({ balance: economy.balance }).from(economy)
    .where(and(eq(economy.guildId, guildId), eq(economy.userId, userId)));
  return rows[0]?.balance ?? 0;
}

export const command: HybridCommand = {
  name: "rob",
  aliases: ["steal", "mug"],
  description: "Attempt to steal coins from another member.",
  category: "economy",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to rob", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const key = `${guild.id}:${ctx.user.id}`;
    const remaining = ROB_COOLDOWN - (Date.now() - (cooldowns.get(key) ?? 0));
    if (remaining > 0) {
      return ctx.reply({ embeds: [errorEmbed(`you're on cooldown — try again in **${humanDuration(remaining)}**.`)] });
    }
    const target = await ctx.getUser("user", true);
    if (!target) return;
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("you can't rob yourself.")] });
    if (target.bot) return ctx.reply({ embeds: [errorEmbed("you can't rob a bot.")] });
    const targetBal = await getBal(guild.id, target.id);
    if (targetBal < 100) return ctx.reply({ embeds: [errorEmbed("that user doesn't have enough to rob.")] });
    cooldowns.set(key, Date.now());
    const success = Math.random() < 0.4;
    if (success) {
      const pct = 0.1 + Math.random() * 0.3;
      const stolen = Math.max(1, Math.floor(targetBal * pct));
      await db.update(economy).set({ balance: targetBal - stolen })
        .where(and(eq(economy.guildId, guild.id), eq(economy.userId, target.id)));
      await addBalance(guild.id, ctx.user.id, stolen);
      return ctx.reply({ embeds: [successEmbed(`you robbed **${target.username}** and stole **${stolen.toLocaleString()}** coins. 💰`)] });
    } else {
      const selfBal = await getBal(guild.id, ctx.user.id);
      const fine = Math.min(selfBal, 50 + Math.floor(Math.random() * 150));
      if (fine > 0) await addBalance(guild.id, ctx.user.id, -fine);
      return ctx.reply({ embeds: [errorEmbed(`you got caught and paid a **${fine.toLocaleString()}** coin fine. 🚔`)] });
    }
  },
};
