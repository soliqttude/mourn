import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setleavemsg",
  description: "Set the leave message.",
  category: "config",
  aliases: ["leavemessage"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "message", description: "Leave message", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const message = ctx.getString("message") ?? ctx.args.join(" ");
    if (!message) return ctx.reply({ content: "Provide a message.", ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { leaveMessage: message });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Leave message set.\n> ${message}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
