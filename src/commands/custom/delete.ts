import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ccdelete",
  description: "Delete a custom command.",
  category: "custom",
  aliases: ["removecc", "deletecc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "name", description: "Command name to delete", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Custom command \`${name}\` deleted.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
