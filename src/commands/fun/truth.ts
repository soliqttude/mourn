import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "truth",
  description: "Get a random truth question.",
  category: "fun",
  aliases: ["truthq"],
  
  async execute(ctx) {
    const truths = ["What's the most embarrassing thing that's ever happened to you?","What's your biggest fear?","Have you ever lied to get out of trouble? What did you say?","What's the worst gift you've ever received?","What's a secret you've never told anyone?","Have you ever cheated on a test?","What's the most childish thing you still do?","Who was your first crush?","What's your most embarrassing memory?","Have you ever pretended to be sick to avoid something?"];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00bfff).setTitle("💬 Truth").setDescription(truths[Math.floor(Math.random()*truths.length)]).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
