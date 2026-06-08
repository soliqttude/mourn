import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "joinmessage",
  description: "Configure join message settings.",
  category: "settings",
  aliases: ["joinmsg", "welcomeconfig"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "channel", description: "Channel for join messages", type: ApplicationCommandOptionType.Channel, required: false }, { name: "message", description: "Custom join message", type: ApplicationCommandOptionType.String, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel ? ctx.getChannel("channel") : null;
    const msg = ctx.getString("message");
    if (ch) await updateGuildSettings(ctx.guild.id, { welcomeChannelId: (ch as any).id } as any);
    if (msg) await updateGuildSettings(ctx.guild.id, { joinMessage: msg } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("⚙️ Join Message Config").setDescription(`${ch ? `Channel: <#${(ch as any).id}>\n` : ""}${msg ? `Message: ${msg}` : ""}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
