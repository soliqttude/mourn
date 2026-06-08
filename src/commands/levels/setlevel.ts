import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "setlevel",
  description: "Set a user's level directly.",
  category: "levels",
  aliases: ["forcelvl"],
  guildOnly: true,
  options: [{ name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true }, { name: "level", description: "Level to set", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const level = ctx.getNumber("level") ?? parseInt(ctx.args[1] ?? "0");
    if (!target || level < 0) return ctx.reply({ content: "Provide user and valid level.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Set **${target.username}'s** level to **${level}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
