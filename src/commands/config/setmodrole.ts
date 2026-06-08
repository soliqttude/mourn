import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setmodrole",
  description: "Set the moderator role.",
  category: "config",
  aliases: ["modrole", "staffrole"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "role", description: "Mod role", type: ApplicationCommandOptionType.Role, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole ? ctx.getRole("role") : null;
    const roleId = (role as any)?.id ?? ctx.args[0]?.replace(/[<@&>]/g,"");
    if (!roleId) return ctx.reply({ content: "Provide a role.", ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { modRoleId: roleId });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Mod role set to <@&${roleId}>.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
