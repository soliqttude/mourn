import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "noxp",
  description: "Toggle XP gain off for a channel or role.",
  category: "levels",
  aliases: ["nolvl", "noxpchannel"],
  guildOnly: true,
  options: [{ name: "channel", description: "Channel to exclude", type: ApplicationCommandOptionType.Channel, required: false }, { name: "role", description: "Role to exclude", type: ApplicationCommandOptionType.Role, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") : null;
    const role = ctx.getRole ? ctx.getRole("role") : null;
    if (!ch && !role) return ctx.reply({ content: "Provide a channel or role to exclude from XP.", ephemeral: true } as any);
    const target = ch ? `<#${(ch as any).id}>` : `<@&${(role as any).id}>`;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`✅ XP gain disabled for ${target}.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
