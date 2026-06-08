import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "tagcreate",
  description: "Create a new tag.",
  category: "tags",
  aliases: ["tagadd", "newtag"],
  guildOnly: true,
  options: [{ name: "name", description: "Tag name", type: ApplicationCommandOptionType.String, required: true }, { name: "content", description: "Tag content", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const content = ctx.getString("content") ?? ctx.args.slice(1).join(" ");
    if (!name || !content) return ctx.reply({ content: "Provide name and content.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Tag Created").addFields({ name: "Name", value: name, inline: true },{ name: "Content", value: content.slice(0,200) }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
