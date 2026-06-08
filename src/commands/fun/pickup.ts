import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "pickup",
  description: "Get a pickup line.",
  category: "fun",
  aliases: ["pickupline", "flirt"],
  
  async execute(ctx) {
    const lines = ["Are you a magician? Because whenever I look at you, everyone else disappears.","Do you have a map? I keep getting lost in your eyes.","Is your name Google? Because you have everything I've been searching for.","Are you a parking ticket? Because you've got 'fine' written all over you.","Do you have a Band-Aid? I just scraped my knee falling for you.","If you were a vegetable, you'd be a cute-cumber.","Are you a camera? Because every time I look at you, I smile.","Your hand looks heavy — can I hold it for you?","Do you believe in love at first sight, or should I walk by again?","Are you a bank loan? Because you've got my interest."];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("💘 Pickup Line").setDescription(lines[Math.floor(Math.random()*lines.length)]).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
