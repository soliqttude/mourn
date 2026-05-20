import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "avatar",
  aliases: ["av", "pfp", "icon"],
  description: "Show a user's avatar.",
  usage: "avatar [user]",
  examples: ["avatar", "avatar @user"],
  category: "utility",
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const sizes = ["128", "256", "512", "1024", "2048", "4096"];
    const links = sizes.map(s => `[${s}](${target.displayAvatarURL({ size: Number(s) as any })})`).join(" · ");
    return ctx.reply({
      embeds: [
        brandEmbed({
          description: links,
          image: target.displayAvatarURL({ size: 4096 }),
          authorName: target.globalName ?? target.username,
          authorIcon: target.displayAvatarURL({ size: 64 }),
        }),
      ],
    });
  },
};