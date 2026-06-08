import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "settingsreset",
  description: "Reset all server settings to defaults.",
  category: "settings",
  aliases: ["resetconfig", "clearsettings"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  
  async execute(ctx) {
    if (!ctx.guild) return;
    await updateGuildSettings(ctx.guild.id, { prefix: "!", logChannelId: null, welcomeChannelId: null, muteRoleId: null, modRoleId: null, autoRoleId: null } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription("🔄 All settings have been reset to defaults.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
