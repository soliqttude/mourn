import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 30_000;

const responses = [
  { msg: "A kind stranger gave you", coins: [10, 80] },
  { msg: "Someone felt sorry and tossed you", coins: [5, 50] },
  { msg: "You found coins on the ground", coins: [1, 30] },
  { msg: "Nobody gave you anything.", coins: [0, 0] },
];

export const command: HybridCommand = {
  name: "beg",
  description: "Beg for coins.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const last = cooldowns.get(key) ?? 0;
    if (Date.now() - last < COOLDOWN) {
      const left = Math.ceil((COOLDOWN - (Date.now() - last)) / 1000);
      return ctx.reply({ embeds: [errorEmbed(`Stop begging so fast. Try again in ${left}s.`)] });
    }
    cooldowns.set(key, Date.now());
    const r = responses[Math.floor(Math.random() * responses.length)]!;
    const [min, max] = r.coins;
    const earned = max === 0 ? 0 : min + Math.floor(Math.random() * (max - min));
    if (earned > 0) await addBalance(ctx.guild.id, ctx.user.id, earned);
    return ctx.reply({
      embeds: [brandEmbed({
        description: earned > 0 ? `🙏 ${r.msg} **${earned}** coins.` : "🙏 Nobody gave you anything. Pathetic.",
        page: "Economy",
      })],
    });
  },
};
