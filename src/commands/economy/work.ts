import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 60 * 60 * 1000;

const jobs = [
  "wrote dark poetry on the side of a building",
  "ran a haunted gas station for the night",
  "performed a ritual at midnight",
  "sold cursed relics in a back alley",
  "ferried souls across the river",
];

export const command: HybridCommand = {
  name: "work",
  description: "Work for some coins.",
  category: "economy",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const last = cooldowns.get(key) ?? 0;
    if (Date.now() - last < COOLDOWN) {
      const left = Math.ceil((COOLDOWN - (Date.now() - last)) / 60000);
      return ctx.reply({ embeds: [errorEmbed(`You need to rest. Try again in ${left}m.`)] });
    }
    cooldowns.set(key, Date.now());
    const earned = 100 + Math.floor(Math.random() * 200);
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    await addBalance(ctx.guild.id, ctx.user.id, earned);
    return ctx.reply({
      embeds: [successEmbed(`You ${job} and earned **${earned}** coins.`)],
    });
  },
};
