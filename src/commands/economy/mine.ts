import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";
import { humanDuration } from "../../lib/format.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 60 * 60 * 1000;

const finds = [
  { item: "💎 diamond",             coins: [500, 1000] },
  { item: "🟡 gold",                coins: [200, 400]  },
  { item: "⚪ silver",               coins: [100, 200]  },
  { item: "🪨 iron",                coins: [50,  100]  },
  { item: "🪨 coal",                coins: [20,  50]   },
  { item: "💣 a cave-in",           coins: [0,   0]    },
];

export const command: HybridCommand = {
  name: "mine",
  aliases: ["mining"],
  description: "Mine for resources and coins.",
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
          ? `⛏️ you mined ${find.item} and earned **${earned.toLocaleString()}** coins.`
          : `⛏️ you hit ${find.item}. no coins this time.`,
        page: "Economy",
      })],
    });
  },
};
