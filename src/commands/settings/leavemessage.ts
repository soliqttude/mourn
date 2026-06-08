import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "leavemessage",
  description: "Configure leave message settings.",
  category: "settings",
  aliases: ["leavemsg"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "channel", description: "Channel for leave messages", type: ApplicationCommandOptionType.Channel, required: false }, { name: "message", description: "Custom leave message", type: ApplicationCommandOptionType.String, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") : null;
    const msg = ctx.getString("message");
    if (ch) await updateGuildSettings(ctx.guild.id, { leaveChannelId: (ch as any).id } as any);
    if (msg) await updateGuildSettings(ctx.guild.id, { leaveMessage: msg } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("⚙️ Leave Message Config").setDescription(`${ch ? `Channel: <#${(ch as any).id}>\n` : ""}${msg ? `Message: ${msg}` : ""}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
