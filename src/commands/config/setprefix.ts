import { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setprefix",
  description: "Set the bot prefix for this server.",
  category: "config",
  aliases: ["prefix", "changeprefix"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "prefix", description: "New prefix", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const prefix = ctx.getString("prefix") ?? ctx.args[0];
    if (!prefix || prefix.length > 5) return ctx.reply({ content: "Prefix must be 1–5 characters.", ephemeral: true } as any);
    await updateGuildSettings(ctx.guild.id, { prefix });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Prefix set to \`${prefix}\`.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
