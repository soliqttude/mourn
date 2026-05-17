import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "avatar",
  aliases: ["av", "pfp"],
  description: "Show a user's avatar.",
  usage: "avatar [user]",
  examples: ["avatar"],
  category: "utility",
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `${target.tag}'s avatar`,
          image: target.displayAvatarURL({ size: 1024 }),
          page: "Avatar",
        }),
      ],
    });
  },
};
