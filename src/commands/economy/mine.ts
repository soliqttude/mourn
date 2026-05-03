import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 60 * 60 * 1000;

const finds = [
  { item: "💎 diamond", coins: [500, 1000] },
  { item: "🟡 gold", coins: [200, 400] },
  { item: "⚪ silver", coins: [100, 200] },
  { item: "🪨 iron", coins: [50, 100] },
  { item: "🪨 coal", coins: [20, 50] },
  { item: "💣 a cave-in! Lost some time", coins: [0, 0] },
];

export const command: HybridCommand = {
  name: "mine",
  description: "Mine for resources and coins.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const last = cooldowns.get(key) ?? 0;
    if (Date.now() - last < COOLDOWN) {
      const left = Math.ceil((COOLDOWN - (Date.now() - last)) / 60000);
      return ctx.reply({ embeds: [errorEmbed(`Your pickaxe needs to rest. Try in ${left}m.`)] });
    }
    cooldowns.set(key, Date.now());
    const find = finds[Math.floor(Math.random() * finds.length)]!;
    const [min, max] = find.coins;
    const earned = max === 0 ? 0 : min + Math.floor(Math.random() * (max - min));
    if (earned > 0) await addBalance(ctx.guild.id, ctx.user.id, earned);
    return ctx.reply({
      embeds: [brandEmbed({
        description: earned > 0
          ? `⛏️ You mined and found ${find.item}! Earned **${earned}** coins.`
          : `⛏️ You hit ${find.item}! No coins this time.`,
        page: "Economy",
      })],
    });
  },
};
