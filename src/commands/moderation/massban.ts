import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "massban",
  description: "Ban multiple users by their IDs.",
  category: "moderation",
  aliases: ["bulkban","multiban"],
  guildOnly: true,
  userPermissions: ["BanMembers"],
  options: [
    { name: "ids", description: "Space-separated user IDs", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ids = (ctx.getString("ids") ?? ctx.args[0] ?? "").split(/\s+/).filter(Boolean);
    const reason = ctx.getString("reason") ?? "Mass ban";
    if (!ids.length) return ctx.reply({ content: "Provide user IDs.", ephemeral: true } as any);
    let success = 0, failed = 0;
    for (const id of ids.slice(0, 20)) {
      await ctx.guild.members.ban(id, { reason: `${reason} | by ${ctx.user.tag}` }).then(() => success++).catch(() => failed++);
    }
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setTitle("🔨 Mass Ban").addFields({ name: "Banned", value: success.toString(), inline: true },{ name: "Failed", value: failed.toString(), inline: true },{ name: "Reason", value: reason }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
