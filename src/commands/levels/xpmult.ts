import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "xpmult",
  description: "Set the XP multiplier for the server.",
  category: "levels",
  aliases: ["xpboost", "xpmultiplier"],
  guildOnly: true,
  options: [{ name: "multiplier", description: "Multiplier value (e.g. 1.5, 2.0)", type: ApplicationCommandOptionType.Number, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const mult = ctx.getNumber("multiplier") ?? parseFloat(ctx.args[0] ?? "1");
    if (!mult || mult < 0.1 || mult > 10) return ctx.reply({ content: "Multiplier must be between 0.1 and 10.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ XP multiplier set to **${mult}x**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
