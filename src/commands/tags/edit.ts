import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "tagedit",
  description: "Edit a tag's content.",
  category: "tags",
  aliases: ["edittag"],
  guildOnly: true,
  options: [{ name: "name", description: "Tag name", type: ApplicationCommandOptionType.String, required: true }, { name: "content", description: "New content", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const content = ctx.getString("content") ?? ctx.args.slice(1).join(" ");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Tag **${name}** updated.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
