import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "banner",
  aliases: ["userbanner", "ub"],
  description: "Show a user's banner.",
  usage: "banner [user]",
  examples: ["banner", "banner @user"],
  category: "utility",
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const t = (await ctx.getUser("user")) ?? ctx.user;
    const fetched = await ctx.client.users.fetch(t.id, { force: true });
    const url = fetched.bannerURL({ size: 4096 });
    if (!url) return ctx.reply({ embeds: [errorEmbed("that user has no banner.")] });
    return ctx.reply({
      embeds: [
        brandEmbed({
          image: url,
          authorName: t.globalName ?? t.username,
          authorIcon: t.displayAvatarURL({ size: 64 }),
        }),
      ],
    });
  },
};
