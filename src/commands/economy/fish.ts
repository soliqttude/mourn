import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { addBalance } from "../../features/economy.js";

const COOLDOWN = 5 * 60 * 1000;
const cooldowns = new Map<string, number>();

const FISH = [
  { name: "Old Boot",     value: 3,   emoji: "👟", weight: 15 },
  { name: "Seaweed",      value: 5,   emoji: "🌿", weight: 15 },
  { name: "Small Fish",   value: 20,  emoji: "🐟", weight: 35 },
  { name: "Salmon",       value: 60,  emoji: "🐠", weight: 20 },
  { name: "Tuna",         value: 120, emoji: "🐡", weight: 10 },
  { name: "Lobster",      value: 250, emoji: "🦞", weight: 4  },
  { name: "Golden Fish",  value: 750, emoji: "✨", weight: 1  },
];

function roll(): typeof FISH[number] {
  const total = FISH.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FISH) { r -= f.weight; if (r <= 0) return f; }
  return FISH[0];
}

export const command: HybridCommand = {
  name: "fish",
  description: "Go fishing and earn coins (5-min cooldown).",
  category: "economy",
  guildOnly: true,
  options: [],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const key = `${guild.id}:${ctx.user.id}`;
    const last = cooldowns.get(key) ?? 0;
    if (Date.now() - last < COOLDOWN) {
      const left = Math.ceil((COOLDOWN - (Date.now() - last)) / 60000);
      return ctx.reply({ embeds: [errorEmbed(`Your fishing rod needs **${left}m** to cool down.`)] });
    }
    cooldowns.set(key, Date.now());
    const caught = roll();
    await addBalance(guild.id, ctx.user.id, caught.value);
    return ctx.reply({
      embeds: [brandEmbed({
        title: "🎣 You went fishing!",
        description: `You caught a **${caught.name}** ${caught.emoji} and earned **${caught.value}** coins.`,
        page: "Economy",
      })],
    });
  },
};
