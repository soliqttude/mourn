import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "settings",
  description: "View current server settings.",
  category: "settings",
  aliases: ["serverconfig", "guildconfig"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  
  async execute(ctx) {
    if (!ctx.guild) return;
    const s = await getGuildSettings(ctx.guild.id);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`⚙️ ${ctx.guild.name} Settings`).addFields(
      { name: "Prefix", value: (s as any)?.prefix ?? config.prefix ?? "!", inline: true },
      { name: "Log Channel", value: (s as any)?.logChannelId ? `<#${(s as any).logChannelId}>` : "Not set", inline: true },
      { name: "Welcome Channel", value: (s as any)?.welcomeChannelId ? `<#${(s as any).welcomeChannelId}>` : "Not set", inline: true },
      { name: "Mute Role", value: (s as any)?.muteRoleId ? `<@&${(s as any).muteRoleId}>` : "Not set", inline: true },
      { name: "Mod Role", value: (s as any)?.modRoleId ? `<@&${(s as any).modRoleId}>` : "Not set", inline: true },
      { name: "Auto Role", value: (s as any)?.autoRoleId ? `<@&${(s as any).autoRoleId}>` : "Not set", inline: true },
    ).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
