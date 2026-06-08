import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "stickerrename",
  description: "Rename a server sticker.",
  category: "sticker",
  aliases: ["renamesticker"],
  guildOnly: true,
  userPermissions: ["ManageEmojisAndStickers"],
  options: [
    { name: "name", description: "Current name", type: ApplicationCommandOptionType.String, required: true },
    { name: "newname", description: "New name", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const newName = ctx.getString("newname") ?? ctx.args[1];
    if (!newName) return ctx.reply({ content: "Provide a new name.", ephemeral: true } as any);
    const stickers = await ctx.guild.stickers.fetch();
    const sticker = stickers.find(s => s.name.toLowerCase() === name);
    if (!sticker) return ctx.reply({ content: "Sticker not found.", ephemeral: true } as any);
    await sticker.edit({ name: newName });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Renamed to **${newName}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
