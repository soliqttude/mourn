import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const relationships = new Map<string, { partner: string; since: Date }>();

export const command: HybridCommand = {
  name: "relationship",
  description: "Check your relationship status.",
  category: "social",
  aliases: ["partner", "rs"],
  options: [{ name: "user", description: "User to check", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const rel = relationships.get(target.id);
    if (!rel) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`**${target.username}** is currently single.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    const days = Math.floor((Date.now() - rel.since.getTime()) / 86400000);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff69b4).setTitle("💑 Relationship Status").setDescription(`**${target.username}** is in a relationship with <@${rel.partner}>.`).addFields({ name: "Together Since", value: rel.since.toDateString(), inline: true },{ name: "Days Together", value: days.toString(), inline: true }).setThumbnail(target.displayAvatarURL()).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
