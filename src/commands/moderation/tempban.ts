import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "tempban",
  description: "Temporarily ban a user.",
  category: "moderation",
  aliases: ["tban"],
  guildOnly: true,
  userPermissions: ["BanMembers"],
  options: [
    { name: "user", description: "User to ban", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration (e.g. 1h, 30m, 1d)", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const duration = ctx.getString("duration") ?? ctx.args[1];
    const reason = ctx.getString("reason") ?? "Temp ban";
    if (!target) return ctx.reply({ content: "Provide a user.", ephemeral: true } as any);
    if (!duration) return ctx.reply({ content: "Provide a duration (e.g. 1h, 30m, 1d).", ephemeral: true } as any);
    const ms = duration.endsWith("d") ? parseInt(duration)*86400000 : duration.endsWith("h") ? parseInt(duration)*3600000 : duration.endsWith("m") ? parseInt(duration)*60000 : 3600000;
    await ctx.guild.members.ban(target.id, { reason: `[Temp ban ${duration}] ${reason} | by ${ctx.user.tag}` });
    setTimeout(() => ctx.guild?.members.unban(target.id, "Temp ban expired").catch(() => null), ms);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🔨 Temp Ban").addFields({ name: "User", value: target.tag, inline: true },{ name: "Duration", value: duration, inline: true },{ name: "Reason", value: reason }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
