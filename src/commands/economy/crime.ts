import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance, removeBalance, getBalance } from "../../features/economy.js";
import { humanDuration } from "../../lib/format.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 45 * 60 * 1000;

const successes = [
  "pickpocketed a tourist", "robbed a vending machine", "sold fake watches downtown",
  "hacked a parking meter", "ran a shell game on the corner", "fenced stolen goods",
];
const failures = [
  "got caught shoplifting", "tripped while running from a cop", "got spotted by a camera",
  "your accomplice snitched", "police were right there the whole time",
];

export const command: HybridCommand = {
  name: "crime",
  aliases: ["criminal", "cr"],
  description: "Commit a crime for coins — risky.",
  usage: "crime",
  examples: ["crime"],
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
    const success = Math.random() > 0.4;
    if (success) {
      const earned = 200 + Math.floor(Math.random() * 500);
      await addBalance(ctx.guild.id, ctx.user.id, earned);
      const act = successes[Math.floor(Math.random() * successes.length)];
      return ctx.reply({ embeds: [brandEmbed({ description: `🦹 you ${act} and got away with **${earned.toLocaleString()}** coins.`, page: "Economy" })] });
    } else {
      const fine = 50 + Math.floor(Math.random() * 150);
      const bal = await getBalance(ctx.guild.id, ctx.user.id);
      const actual = Math.min(fine, bal.balance);
      if (actual > 0) await removeBalance(ctx.guild.id, ctx.user.id, actual);
      const act = failures[Math.floor(Math.random() * failures.length)];
      return ctx.reply({ embeds: [brandEmbed({ description: `🚔 you ${act} and lost **${actual.toLocaleString()}** coins.`, page: "Economy" })] });
    }
  },
};
