import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

function getIqLabel(iq: number): string {
  if (iq >= 160) return "Genius 🧠";
  if (iq >= 130) return "Very gifted 🌟";
  if (iq >= 110) return "Above average 📈";
  if (iq >= 90) return "Average 😐";
  if (iq >= 70) return "Below average 😬";
  return "Uh oh... 💀";
}

export const command: HybridCommand = {
  name: "iq",
  aliases: ["iqtest", "brains"],
  description: "Check someone's IQ.",
  category: "fun",
  options: [{ name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const iq = Number(BigInt(target.id) % 180n) + 40;
    return ctx.reply({ embeds: [brandEmbed({ title: `${target.username}'s IQ`, description: `**${iq}** — ${getIqLabel(iq)}`, page: "Fun" })] });
  },
};
