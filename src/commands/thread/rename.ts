import { ChannelType, PermissionFlagsBits, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { EmbedBuilder } from "discord.js";

export const command: HybridCommand = {
  name: "threadrename",
  description: "Rename the current thread.",
  category: "thread",
  aliases: ["renamethread"],
  guildOnly: true,
  userPermissions: ["ManageThreads"],
  options: [{ name: "name", description: "New name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = ctx.getString("name") ?? ctx.args[0];
    if (!name) return ctx.reply({ content: "Provide a new name.", ephemeral: true } as any);
    const ch = ctx.channel as any;
    if (!ch?.isThread?.()) return ctx.reply({ content: "Run this inside a thread.", ephemeral: true } as any);
    await ch.setName(name, `Renamed by ${ctx.user.tag}`).catch(() => null);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Thread renamed to **${name}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
