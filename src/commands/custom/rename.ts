import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ccrename",
  description: "Rename a custom command trigger.",
  category: "custom",
  aliases: ["renamecc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "old_name", description: "Current trigger", type: ApplicationCommandOptionType.String, required: true }, { name: "new_name", description: "New trigger", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const oldName = (ctx.getString("old_name") ?? ctx.args[0] ?? "").toLowerCase();
    const newName = (ctx.getString("new_name") ?? ctx.args[1] ?? "").toLowerCase();
    if (!oldName || !newName) return ctx.reply({ content: "Provide old and new names.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Renamed \`${oldName}\` to \`${newName}\`.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
