import { EmbedBuilder, ApplicationCommandOptionType, AttachmentBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "triggered",
  description: "Generate a triggered gif for a user.",
  category: "image",
  aliases: ["trigger"],
  guildOnly: false,
  options: [{ name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? ctx.user;
    const avatar = target.displayAvatarURL({ extension: "png", size: 512 });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle("😤 TRIGGERED").setImage(`https://some-random-api.com/canvas/misc/triggered?avatar=${encodeURIComponent(avatar)}`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
