import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "impostor", aliases: ["imposter"], description: "Was this person the impostor?", category: "fun", guildOnly: true,
  options: [{ name: "user", description: "User to accuse", type: ApplicationCommandOptionType.User, required: false }],
  async execute(ctx) {
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const seed = parseInt(target.id.slice(-6), 16);
    const isImp = seed % 4 === 0;
    const desc = isImp
      ? `🔴 **${target.username}** was **The Impostor**. There is 1 Impostor remaining.`
      : `🔵 **${target.username}** was **not** the Impostor. There are 2 Impostors remaining.`;
    return ctx.reply({ embeds: [brandEmbed({ description: desc, page: "Fun" })] });
  },
};
