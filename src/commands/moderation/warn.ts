import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "warn",
  description: "Warn a server member.",
  category: "moderation",
  aliases: ["warning"],
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  options: [
    { name: "user", description: "User to warn", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason for warning", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const reason = ctx.getString("reason") ?? ctx.args.slice(1).join(" ") ?? "No reason provided.";
    if (!target || target.bot) return ctx.reply({ content: "Provide a valid user.", ephemeral: true } as any);
    await target.send({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle(`⚠️ Warning — ${ctx.guild.name}`).setDescription(`You have received a warning.\n**Reason:** ${reason}`).setFooter({ text: config.embedFooter }).setTimestamp()] }).catch(() => null);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle("⚠️ Member Warned").addFields({ name: "User", value: target.tag, inline: true },{ name: "Reason", value: reason }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
