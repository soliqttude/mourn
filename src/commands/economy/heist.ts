import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getBalance, addBalance, removeBalance } from "../../features/economy.js";

const cooldowns = new Map<string, number>();
const COOLDOWN = 90 * 60 * 1000;

export const command: HybridCommand = {
  name: "heist",
  description: "Organize a heist for a big payout — or lose it all.",
  category: "economy",
  guildOnly: true,
  options: [{ name: "bet", description: "Amount to risk", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const key = `${ctx.guild.id}:${ctx.user.id}`;
    const last = cooldowns.get(key) ?? 0;
    if (Date.now() - last < COOLDOWN) {
      const left = Math.ceil((COOLDOWN - (Date.now() - last)) / 60000);
      return ctx.reply({ embeds: [errorEmbed(`Heat is too high. Try again in ${left}m.`)] });
    }
    const bet = ctx.getNumber("bet", true) ?? parseInt(ctx.args[0]);
    if (!bet || bet <= 0) return ctx.reply({ embeds: [errorEmbed("Invalid bet.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`You only have **${bal.balance}** coins.`)] });
    cooldowns.set(key, Date.now());
    const outcomes = [
      { msg: "The vault was empty. You barely escaped.", mult: 0 },
      { msg: "You triggered the alarm. Lost everything.", mult: 0 },
      { msg: "Small score. Clean getaway.", mult: 1.5 },
      { msg: "You cracked the safe. Big haul.", mult: 2.5 },
      { msg: "PERFECT HEIST. You're a legend.", mult: 4 },
    ];
    const weights = [20, 20, 30, 20, 10];
    let rand = Math.random() * 100;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) { rand -= weights[i]!; if (rand <= 0) { idx = i; break; } }
    const outcome = outcomes[idx]!;
    await removeBalance(ctx.guild.id, ctx.user.id, bet);
    if (outcome.mult > 0) {
      const won = Math.floor(bet * outcome.mult);
      await addBalance(ctx.guild.id, ctx.user.id, won);
      return ctx.reply({ embeds: [brandEmbed({ title: "💰 Heist", description: `${outcome.msg}\nYou walked away with **${won}** coins (${outcome.mult}x)!`, page: "Economy" })] });
    }
    return ctx.reply({ embeds: [brandEmbed({ title: "💰 Heist", description: `${outcome.msg}\nLost **${bet}** coins.`, page: "Economy" })] });
  },
};
