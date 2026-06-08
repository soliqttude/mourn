import { EmbedBuilder, ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "grayscale",
  description: "Apply grayscale to a user's avatar.",
  category: "image",
  aliases: ["greyscale", "gray"],
  guildOnly: false,
  options: [{ name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const avatar = target.displayAvatarURL({ extension: "png", size: 512 });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x888888).setTitle("⬛ Grayscale").setDescription(`**${target.username}'s** grayscale avatar.`).setImage(`https://some-random-api.com/canvas/filter/greyscale?avatar=${encodeURIComponent(avatar)}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
