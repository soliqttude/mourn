import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "pout",
  description: "😤 pout at someone.",
  category: "roleplay",
  aliases: [],
  guildOnly: false,
  options: [{ name: "user", description: "User to pout at", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.guild?.members.cache.get(ctx.args[0]?.replace(/[<@!>]/g,""))?.user;
    if (!target) return ctx.reply({ content: "Mention a user.", ephemeral: true } as any);
    try {
      const res = await fetch("https://api.waifu.pics/sfw/pout");
      const data = await res.json() as { url: string };
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setDescription(`**${ctx.user.username}** pout ats **${target.username}**! 😤`).setImage(data.url).setFooter({ text: `${config.embedFooter}` }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setDescription(`**${ctx.user.username}** pout ats **${target.username}**! 😤`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
