import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ccedit",
  description: "Edit a custom command's response.",
  category: "custom",
  aliases: ["editcc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "name", description: "Command to edit", type: ApplicationCommandOptionType.String, required: true }, { name: "response", description: "New response", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const response = ctx.getString("response") ?? ctx.args.slice(1).join(" ");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Updated \`${name}\` response.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
