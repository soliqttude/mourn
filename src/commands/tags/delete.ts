import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "tagdelete",
  description: "Delete a tag.",
  category: "tags",
  aliases: ["removetag", "deltag"],
  guildOnly: true,
  options: [{ name: "name", description: "Tag name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Tag **${name}** deleted.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
