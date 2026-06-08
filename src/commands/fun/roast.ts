import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "roast",
  description: "Roast a user (all in good fun).",
  category: "fun",
  aliases: ["burn"],
  options: [{ name: "user", description: "User to roast", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const roasts = ["I'd roast you, but my parents told me not to burn trash.","You're not stupid; you just have bad luck thinking.","I'd agree with you, but then we'd both be wrong.","You bring everyone so much joy — when you leave the room.","I'm jealous of people who've never met you.","Some day you'll go far... and I hope you stay there.","You're the reason the gene pool needs a lifeguard.","I'd call you a tool, but that implies you're useful.","You have your whole life to be an idiot. Take a day off!","I thought of you today. It reminded me to take out the trash."];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff6600).setTitle("🔥 Roasted").setDescription(`<@${target.id}>, ${roasts[Math.floor(Math.random()*roasts.length)]}`).setFooter({ text: "All in good fun! • " + config.embedFooter }).setTimestamp()] });
  },
};
