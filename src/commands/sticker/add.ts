import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "stickeradd",
  description: "Add a sticker to the server.",
  category: "sticker",
  aliases: ["addsticker", "uploadsticker"],
  guildOnly: true,
  userPermissions: ["ManageEmojisAndStickers"],
  options: [
    { name: "name", description: "Sticker name", type: ApplicationCommandOptionType.String, required: true },
    { name: "url", description: "Image URL (PNG/APNG/Lottie)", type: ApplicationCommandOptionType.String, required: true },
    { name: "emoji", description: "Related emoji", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const name = ctx.getString("name") ?? ctx.args[0];
    const url = ctx.getString("url") ?? ctx.args[1];
    const emoji = ctx.getString("emoji") ?? ctx.args[2] ?? "⭐";
    if (!name || !url) return ctx.reply({ content: "Provide name and URL.", ephemeral: true } as any);
    const sticker = await ctx.guild.stickers.create({ name, url, tags: emoji, reason: `Added by ${ctx.user.tag}` }).catch((e: Error) => e);
    if (sticker instanceof Error) return ctx.reply({ content: `Failed: ${sticker.message}`, ephemeral: true } as any);
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Sticker Added").setDescription(`**${(sticker as any).name}** has been added.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
