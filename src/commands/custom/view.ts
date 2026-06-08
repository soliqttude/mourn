import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "ccview",
  description: "View a custom command's response.",
  category: "custom",
  aliases: ["viewcc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "name", description: "Command name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`⚙️ Custom Command: ${name}`).setDescription("Custom command data coming soon.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
