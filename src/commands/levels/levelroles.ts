import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "levelroles",
  description: "List or configure level-up role rewards.",
  category: "levels",
  aliases: ["levelrewards", "xproles"],
  guildOnly: true,
  options: [{ name: "level", description: "Level threshold", type: ApplicationCommandOptionType.Integer, required: false }, { name: "role", description: "Role to assign at this level", type: ApplicationCommandOptionType.Role, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const level = ctx.getNumber("level");
    const role = ctx.getRole ? ctx.getRole("role") : null;
    if (level && role) {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Added role reward: Level **${level}** → <@&${(role as any).id}>.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("🎖️ Level Roles").setDescription("No level roles configured yet. Use `/levelroles [level] [role]` to add one.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
