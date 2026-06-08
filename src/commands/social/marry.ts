import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const marriages = new Map<string, string>();

export const command: HybridCommand = {
  name: "marry",
  description: "Propose marriage to a user.",
  category: "social",
  aliases: ["propose", "wed"],
  guildOnly: true,
  options: [{ name: "user", description: "User to propose to", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    if (!target || target.id === ctx.user.id || target.bot) return ctx.reply({ content: "Invalid target.", ephemeral: true } as any);
    if (marriages.has(ctx.user.id)) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`You are already married to <@${marriages.get(ctx.user.id)}>.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    if (marriages.has(target.id)) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`**${target.username}** is already married.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    marriages.set(ctx.user.id, target.id);
    marriages.set(target.id, ctx.user.id);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("💍 Marriage Proposal Accepted!").setDescription(`**${ctx.user.username}** and **${target.username}** are now married! 💒\n*(Note: Marriage is accepted automatically in this version)*`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
