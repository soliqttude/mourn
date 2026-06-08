import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "stickerdelete",
  description: "Delete a server sticker.",
  category: "sticker",
  aliases: ["deletesticker", "removesticker"],
  guildOnly: true,
  userPermissions: ["ManageEmojisAndStickers"],
  options: [{ name: "name", description: "Sticker name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const stickers = await ctx.guild.stickers.fetch();
    const sticker = stickers.find(s => s.name.toLowerCase() === name);
    if (!sticker) return ctx.reply({ content: "Sticker not found.", ephemeral: true } as any);
    await sticker.delete(`Deleted by ${ctx.user.tag}`);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Sticker **${sticker.name}** deleted.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
