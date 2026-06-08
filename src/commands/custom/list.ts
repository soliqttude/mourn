import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "cclist",
  description: "List all custom commands.",
  category: "custom",
  aliases: ["customlist", "listcc"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  
  async execute(ctx) {
    if (!ctx.guild) return;
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("⚙️ Custom Commands").setDescription("No custom commands set up yet. Use `/cc <name> <response>` to create one.").setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
