import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "stickerlist",
  description: "List all stickers in the server.",
  category: "sticker",
  aliases: ["stickers"],
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.guild) return;
    const stickers = await ctx.guild.stickers.fetch();
    if (!stickers.size) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("This server has no stickers.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    const lines = stickers.map(s => `**${s.name}** — `+`${s.format}`).slice(0,30);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🎟️ Stickers (${stickers.size})`).setDescription(lines.join("\n")).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
