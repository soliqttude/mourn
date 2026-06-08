import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "compliment",
  description: "Compliment a user.",
  category: "fun",
  aliases: ["praise", "flatter"],
  options: [{ name: "user", description: "User to compliment", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const compliments = ["You have an incredible smile!","You make the world a better place just by being in it.","You're more helpful than you realize.","You have a great sense of humor.","You're genuinely kind-hearted.","Your positivity is contagious.","You always know exactly what to say.","You're incredibly creative.","You inspire everyone around you.","You have a talent for making people feel special."];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("💖 Compliment").setDescription(`<@${target.id}>, ${compliments[Math.floor(Math.random()*compliments.length)]}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
