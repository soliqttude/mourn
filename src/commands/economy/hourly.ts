import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { addBalance } from "../../features/economy.js";
import { config } from "../../config.js";

const COOLDOWN = 60 * 60 * 1000; // 1 hour
const lastClaim = new Map<string, number>();

export const command: HybridCommand = {
  name: "hourly",
  description: "Claim your hourly coin reward! (100-300 coins every hour)",
  category: "economy",
  guildOnly: true,
  aliases: ["hr", "hourlyclaim"],
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const now = Date.now();
    const last = lastClaim.get(key) ?? 0;
    const diff = now - last;

    if (diff < COOLDOWN) {
      const remaining = COOLDOWN - diff;
      const m = Math.floor(remaining / 60000), s = Math.floor((remaining % 60000) / 1000);
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff5252)
            .setTitle("⏰ Hourly — On Cooldown")
            .setDescription(`You already claimed your hourly!\nCome back in **${m}m ${s}s**.`)
            .setFooter({ text: `${config.embedFooter} • Economy` })
            .setTimestamp(),
        ],
      });
    }

    const amount = Math.floor(Math.random() * 201) + 100; // 100-300
    const streak = Math.floor(diff / COOLDOWN);
    const bonus = streak <= 1 ? 0 : Math.min(streak * 10, 100);
    const total = amount + bonus;

    lastClaim.set(key, now);
    await addBalance(ctx.guild.id, ctx.user.id, total);

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00e676)
          .setTitle("⏰ Hourly Coins Claimed!")
          .setDescription([
            `You received **${amount}** coins!`,
            bonus > 0 ? `🔥 Punctuality bonus: **+${bonus}** coins` : "",
            "",
            `**Total:** ${total} coins added to your wallet.`,
          ].filter(Boolean).join("\n"))
          .setFooter({ text: `${config.embedFooter} • Next hourly in 1 hour` })
          .setTimestamp(),
      ],
    });
  },
};
