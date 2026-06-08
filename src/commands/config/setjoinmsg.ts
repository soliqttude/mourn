import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setjoinmsg",
  description: "Set the join message for new members.",
  category: "config",
  aliases: ["joinmessage", "welcomemsg"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "message", description: "Join message (use {user} and {server} as placeholders)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const message = ctx.getString("message") ?? ctx.args.join(" ");
    if (!message) return ctx.reply({ content: "Provide a message.", ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { joinMessage: message });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Join message set.\n> ${message}`).setFooter({ text: `Use {user} and {server} as placeholders • ${config.embedFooter}` }).setTimestamp()] });
  },
};
