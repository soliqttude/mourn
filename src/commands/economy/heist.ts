import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { getBalance, addBalance, removeBalance } from "../../features/economy.js";
import { humanDuration } from "../../lib/format.js";

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
    const remaining = COOLDOWN - (Date.now() - (cooldowns.get(key) ?? 0));
    if (remaining > 0) {
      return ctx.reply({ embeds: [errorEmbed(`you're on cooldown — try again in **${humanDuration(remaining)}**.`)] });
    }
    const bet = ctx.getNumber("bet", true) ?? parseInt(ctx.args[0]);
    if (!bet || bet <= 0) return ctx.reply({ embeds: [errorEmbed("enter a valid bet amount.")] });
    const bal = await getBalance(ctx.guild.id, ctx.user.id);
    if (bal.balance < bet) return ctx.reply({ embeds: [errorEmbed(`you only have **${bal.balance.toLocaleString()}** coins.`)] });
    cooldowns.set(key, Date.now());
    const outcomes = [
      { msg: "the vault was empty. you barely escaped.",    mult: 0   },
      { msg: "you triggered the alarm. lost everything.",   mult: 0   },
      { msg: "small score. clean getaway.",                 mult: 1.5 },
      { msg: "you cracked the safe. big haul.",             mult: 2.5 },
      { msg: "perfect heist. you're a legend.",             mult: 4   },
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
      return ctx.reply({ embeds: [brandEmbed({ title: "💰 heist", description: `${outcome.msg}\nyou walked away with **${won.toLocaleString()}** coins (${outcome.mult}x).`, page: "Economy" })] });
    }
    return ctx.reply({ embeds: [brandEmbed({ title: "💰 heist", description: `${outcome.msg}\nlost **${bet.toLocaleString()}** coins.`, page: "Economy" })] });
  },
};
