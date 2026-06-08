import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "riddle",
  description: "Get a random riddle.",
  category: "fun",
  aliases: ["brainteaser"],
  
  async execute(ctx) {
    const riddles = [["I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?","An echo"],["The more you take, the more you leave behind. What am I?","Footsteps"],["What has keys but no locks, space but no room, and you can enter but can't go inside?","A keyboard"],["What gets wetter as it dries?","A towel"],["I have cities, but no houses live there. I have mountains, but no trees grow there. What am I?","A map"]];
    const [q, a] = riddles[Math.floor(Math.random()*riddles.length)];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🧩 Riddle").setDescription(`**${q}``**\n\n||Answer: ${a}||`).setFooter({ text: "Spoiler the answer • " + config.embedFooter }).setTimestamp()] });
  },
};
