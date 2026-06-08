import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setautorole",
  description: "Set a role to auto-assign to new members.",
  category: "config",
  aliases: ["autorole", "joinrole"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "role", description: "Auto-assign role (leave empty to disable)", type: ApplicationCommandOptionType.Role, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole ? ctx.getRole("role") : null;
    const roleId = (role as any)?.id ?? ctx.args[0]?.replace(/[<@&>]/g,"") ?? null;
    await updateGuildSettings(ctx.guild.id, { autoRoleId: roleId });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(roleId ? `✅ Auto role set to <@&${roleId}>.` : "✅ Auto role disabled.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
