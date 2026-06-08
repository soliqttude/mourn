import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "addxp",
  description: "Add XP to a user.",
  category: "levels",
  aliases: ["givexp_add"],
  guildOnly: true,
  options: [{ name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true }, { name: "amount", description: "XP to add", type: ApplicationCommandOptionType.Integer, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getUser("user");
    const amount = ctx.getNumber("amount") ?? parseInt(ctx.args[1] ?? "0");
    if (!target || !amount) return ctx.reply({ content: "Provide user and amount.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Added **${amount} XP** to **${target.username}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
