import { EmbedBuilder, ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "deepfry",
  description: "Deep fry a user's avatar.",
  category: "image",
  aliases: ["fry"],
  guildOnly: false,
  options: [{ name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const avatar = target.displayAvatarURL({ extension: "png", size: 512 });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff8c00).setTitle("🍳 Deep Fried").setDescription(`**${target.username}'s** deep fried avatar.`).setImage(`https://some-random-api.com/canvas/filter/deepfry?avatar=${encodeURIComponent(avatar)}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
