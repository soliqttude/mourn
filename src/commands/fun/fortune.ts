import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "fortune",
  description: "Get your daily fortune.",
  category: "fun",
  aliases: ["horoscope", "lucky"],
  
  async execute(ctx) {
    const fortunes = ["Today is a great day to take chances.","A surprise is in store for you this week.","Your hard work will soon pay off.","Good things come to those who wait.","An unexpected meeting will bring joy.","Keep your eyes open — opportunity is near.","Your patience will be greatly rewarded.","Today, luck is on your side.","The stars align in your favor today.","A great adventure awaits you.","Focus on what truly matters.","Today is perfect for new beginnings."];
    const lucky = Math.floor(Math.random()*100);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("🔮 Fortune").setDescription(fortunes[Math.floor(Math.random()*fortunes.length)]).addFields({ name: "Lucky Number", value: lucky.toString(), inline: true },{ name: "Lucky Color", value: ["Red","Blue","Green","Gold","Purple","Silver"][Math.floor(Math.random()*6)], inline: true }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
