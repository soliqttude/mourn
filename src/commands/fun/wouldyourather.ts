import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "wouldyourather",
  description: "Get a would you rather question.",
  category: "fun",
  aliases: ["wyr", "rather"],
  
  async execute(ctx) {
    const options = [["be invisible","be able to fly"],["never use social media again","never watch another movie/TV show again"],["have unlimited money","have unlimited time"],["be famous","be smart"],["live in the past","live in the future"],["only eat sweet food forever","only eat savoury food forever"],["be able to speak every language","be able to play every instrument"],["have no internet","have no phone"],["fight 100 duck-sized horses","fight 1 horse-sized duck"],["always be hot","always be cold"]];
    const [a, b] = options[Math.floor(Math.random()*options.length)];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x9b59b6).setTitle("🤔 Would You Rather").setDescription(`**A)** ${a}\n\n**OR**\n\n**B)** ${b}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
