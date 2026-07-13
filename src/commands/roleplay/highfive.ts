import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "highfive",
  description: "✋ high five someone.",
  category: "roleplay",
  aliases: [],
  guildOnly: false,
  options: [{ name: "user", description: "User to high five", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.guild?.members.cache.get(ctx.args[0]?.replace(/[<@!>]/g,""))?.user;
    if (!target) return ctx.reply({ content: "Mention a user.", ephemeral: true } as any);
    try {
      const res = await fetch("https://nekos.best/api/v2/highfive");
      const data = await res.json() as { results: { url: string }[] };
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setDescription(`**${ctx.user.username}** high fives **${target.username}**! ✋`).setImage(data.results[0]!.url).setFooter({ text: `${config.embedFooter}` }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setDescription(`**${ctx.user.username}** high fives **${target.username}**! ✋`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
