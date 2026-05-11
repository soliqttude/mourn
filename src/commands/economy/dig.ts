import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";
import { humanDuration } from "../../lib/format.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 45 * 60 * 1000;

const finds = [
  { item: "an old coin collection", coins: [300, 600] },
  { item: "a buried wallet",        coins: [100, 300] },
  { item: "a broken watch",         coins: [50,  100] },
  { item: "some loose change",      coins: [10,  50]  },
  { item: "a rock",                 coins: [0,   0]   },
  { item: "an angry worm",          coins: [0,   0]   },
];

export const command: HybridCommand = {
  name: "dig",
  description: "Dig for buried treasure.",
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
    const find = finds[Math.floor(Math.random() * finds.length)]!;
    const [min, max] = find.coins;
    const earned = max === 0 ? 0 : min + Math.floor(Math.random() * (max - min));
    if (earned > 0) await addBalance(ctx.guild.id, ctx.user.id, earned);
    return ctx.reply({
      embeds: [brandEmbed({
        description: earned > 0
          ? `🪣 you dug up ${find.item} and earned **${earned.toLocaleString()}** coins.`
          : `🪣 you found ${find.item}. nothing useful.`,
        page: "Economy",
      })],
    });
  },
};
