import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";
import { humanDuration } from "../../lib/format.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 30 * 60 * 1000;

const animals = [
  { name: "🐇 rabbit", coins: [50,  100] },
  { name: "🦌 deer",   coins: [150, 250] },
  { name: "🐗 boar",   coins: [200, 350] },
  { name: "🦊 fox",    coins: [100, 200] },
  { name: "🐍 snake",  coins: [75,  125] },
  { name: "🐺 wolf",   coins: [300, 500] },
  { name: "🐻 bear",   coins: [400, 700] },
  { name: "nothing",   coins: [0,   0]   },
];

export const command: HybridCommand = {
  name: "hunt",
  description: "Go hunting for coins.",
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
    const animal = animals[Math.floor(Math.random() * animals.length)]!;
    const [min, max] = animal.coins;
    const earned = max === 0 ? 0 : min + Math.floor(Math.random() * (max - min));
    if (earned > 0) await addBalance(ctx.guild.id, ctx.user.id, earned);
    return ctx.reply({
      embeds: [brandEmbed({
        description: earned > 0
          ? `🏹 you hunted a ${animal.name} and earned **${earned.toLocaleString()}** coins.`
          : "🏹 you went hunting and found nothing.",
        page: "Economy",
      })],
    });
  },
};
