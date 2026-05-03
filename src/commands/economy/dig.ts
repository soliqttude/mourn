import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 45 * 60 * 1000;

const finds = [
  { item: "an old coin collection", coins: [300, 600] },
  { item: "a buried wallet", coins: [100, 300] },
  { item: "a broken watch", coins: [50, 100] },
  { item: "some loose change", coins: [10, 50] },
  { item: "a rock", coins: [0, 0] },
  { item: "an angry worm", coins: [0, 0] },
];

export const command: HybridCommand = {
  name: "dig",
  description: "Dig for buried treasure.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const last = cooldowns.get(key) ?? 0;
    if (Date.now() - last < COOLDOWN) {
      const left = Math.ceil((COOLDOWN - (Date.now() - last)) / 60000);
      return ctx.reply({ embeds: [errorEmbed(`Your shovel is tired. Try in ${left}m.`)] });
    }
    cooldowns.set(key, Date.now());
    const find = finds[Math.floor(Math.random() * finds.length)]!;
    const [min, max] = find.coins;
    const earned = max === 0 ? 0 : min + Math.floor(Math.random() * (max - min));
    if (earned > 0) await addBalance(ctx.guild.id, ctx.user.id, earned);
    return ctx.reply({
      embeds: [brandEmbed({
        description: earned > 0 ? `🪣 You dug up ${find.item} and earned **${earned}** coins.` : `🪣 You found ${find.item}. Nothing useful.`,
        page: "Economy",
      })],
    });
  },
};
