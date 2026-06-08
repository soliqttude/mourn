import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "stickerinfo",
  description: "Get info about a sticker.",
  category: "sticker",
  aliases: ["sticker"],
  guildOnly: true,
  options: [{ name: "name", description: "Sticker name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = (ctx.getString("name") ?? ctx.args[0] ?? "").toLowerCase();
    const stickers = await ctx.guild.stickers.fetch();
    const sticker = stickers.find(s => s.name.toLowerCase() === name);
    if (!sticker) return ctx.reply({ content: "Sticker not found.", ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🎟️ ${sticker.name}`).addFields({ name: "ID", value: sticker.id, inline: true },{ name: "Format", value: sticker.format.toString(), inline: true },{ name: "Description", value: sticker.description ?? "None", inline: false }).setImage(sticker.url).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
