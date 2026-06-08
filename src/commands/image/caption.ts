import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "caption",
  description: "Add a caption to a user's avatar.",
  category: "image",
  aliases: ["imgcaption"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: false },
    { name: "text", description: "Caption text", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const text = ctx.getString("text") ?? ctx.args[0];
    if (!text) return ctx.reply({ content: "Provide caption text.", ephemeral: true } as any);
    const avatar = target.displayAvatarURL({ extension: "png", size: 512 });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffffff).setTitle("🖼️ Caption").setImage(`https://some-random-api.com/canvas/misc/youtube-comment?avatar=${encodeURIComponent(avatar)}&username=${encodeURIComponent(target.username)}&comment=${encodeURIComponent(text)}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
