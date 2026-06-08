import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "dare",
  description: "Get a random dare.",
  category: "fun",
  aliases: ["dareq"],
  
  async execute(ctx) {
    const dares = ["Send a voice message singing the first 10 seconds of a song.","Type with your elbows for the next 5 minutes.","Change your status to 'I smell like cheese' for 10 minutes.","Send a random GIF without context.","Send a message in all caps for the next 3 messages.","React to the last 5 messages with 🍕.","Say something nice about everyone in this server.","Share the last photo in your camera roll.","DM a random person 'I know what you did'.","Do your best robot impression in voice chat."];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🔥 Dare").setDescription(dares[Math.floor(Math.random()*dares.length)]).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
