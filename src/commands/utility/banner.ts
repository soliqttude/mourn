import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "banner",
  description: "Show a user's banner.",
  category: "utility",
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const t = (await ctx.getUser("user")) ?? ctx.user;
    const fetched = await ctx.client.users.fetch(t.id, { force: true });
    const url = fetched.bannerURL({ size: 1024 });
    if (!url) return ctx.reply({ embeds: [errorEmbed("That user has no banner.")] });
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `${t.tag}'s banner`,
          image: url,
          page: "Banner",
        }),
      ],
    });
  },
};
