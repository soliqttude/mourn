import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "nick",
  aliases: ["nickname", "setnick"],
  description: "Change a member's nickname.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "Member", type: ApplicationCommandOptionType.User, required: true },
    { name: "name", description: "New nickname (blank to reset)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const target = await ctx.getMember("user", true);
    const name = ctx.getString("name") ?? null;
    if (!target) return;
    try {
      await target.setNickname(name);
      return ctx.reply({
        embeds: [successEmbed(name ? `Renamed to **${name}**.` : "Nickname reset.")],
      });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
