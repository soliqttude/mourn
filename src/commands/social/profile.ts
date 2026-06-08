import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "profile",
  description: "View a user's profile.",
  category: "social",
  aliases: ["me", "user"],
  options: [{ name: "user", description: "User to view", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const member = ctx.guild?.members.cache.get(target.id);
    const joinedAt = member?.joinedAt ? member.joinedAt.toDateString() : "Unknown";
    const roles = member?.roles.cache.filter(r => r.id !== ctx.guild?.id).map(r => `<@&${r.id}>`).slice(0,5).join(", ") || "None";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(member?.displayHexColor as any ?? 0x5865f2).setAuthor({ name: target.tag, iconURL: target.displayAvatarURL() }).setThumbnail(target.displayAvatarURL({ size: 256 })).addFields({ name: "Account Created", value: target.createdAt.toDateString(), inline: true },{ name: "Server Joined", value: joinedAt, inline: true },{ name: "Top Roles", value: roles, inline: false }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
