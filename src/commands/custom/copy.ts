import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "cccopy",
  description: "Copy a custom command from another server.",
  category: "custom",
  aliases: ["copycc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [{ name: "name", description: "Command name", type: ApplicationCommandOptionType.String, required: true }, { name: "guild_id", description: "Source server ID", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const guildId = ctx.getString("guild_id") ?? ctx.args[1];
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setDescription(`🔄 Cross-server custom command copy coming soon.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
