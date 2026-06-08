import { EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const marriages = new Map<string, string>();

export const command: HybridCommand = {
  name: "divorce",
  description: "Divorce your current partner.",
  category: "social",
  aliases: ["breakup"],
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    if (!marriages.has(ctx.user.id)) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("You are not married.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    const partnerId = marriages.get(ctx.user.id)!;
    marriages.delete(ctx.user.id);
    marriages.delete(partnerId);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("💔 Divorce").setDescription(`You have divorced <@${partnerId}>. 💔`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
