import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";
import { humanDuration } from "../../lib/format.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 30_000;

const responses = [
  { msg: "a kind stranger gave you", coins: [10, 80] },
  { msg: "someone felt sorry and tossed you", coins: [5, 50] },
  { msg: "you found coins on the ground worth", coins: [1, 30] },
];

export const command: HybridCommand = {
  name: "beg",
  description: "Beg for coins.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const remaining = COOLDOWN - (Date.now() - (cooldowns.get(key) ?? 0));
    if (remaining > 0) {
      return ctx.reply({ embeds: [errorEmbed(`you're on cooldown — try again in **${humanDuration(remaining)}**.`)] });
    }
    cooldowns.set(key, Date.now());
    const r = responses[Math.floor(Math.random() * responses.length)]!;
    const [min, max] = r.coins;
    const earned = min + Math.floor(Math.random() * (max - min));
    if (earned > 0) await addBalance(ctx.guild.id, ctx.user.id, earned);
    return ctx.reply({
      embeds: [brandEmbed({
        description: earned > 0
          ? `🙏 ${r.msg} **${earned.toLocaleString()}** coins.`
          : "🙏 nobody gave you anything.",
        page: "Economy",
      })],
    });
  },
};
