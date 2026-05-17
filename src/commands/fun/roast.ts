import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

const roasts = [
  "You're the reason they put instructions on shampoo.",
  "I'd agree with you but then we'd both be wrong.",
  "You're proof that evolution can go in reverse.",
  "Your WiFi password is probably 'password123'.",
  "You have the energy of a dying laptop at 1%.",
  "You're not stupid — you just have bad luck thinking.",
  "You bring everyone so much joy when you leave the room.",
  "If brains were gasoline, you couldn't power a mosquito's scooter.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "Some people are a waste of two brain cells.",
];

export const command: HybridCommand = {
  name: "roast",
  aliases: ["rip", "insult"],
  description: "Roast someone.",
  usage: "roast [user]",
  examples: ["roast"],
  category: "fun",
  options: [{ name: "user", description: "User to roast", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target) return;
    const roast = roasts[Math.floor(Math.random() * roasts.length)];
    return ctx.reply({ embeds: [brandEmbed({ title: `🔥 ${target.username} got roasted`, description: roast, page: "Fun" })] });
  },
};
