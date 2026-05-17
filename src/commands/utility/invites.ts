import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed } from "../../lib/embeds.js";
import { getInviteCount } from "../../features/invites.js";

export const command: HybridCommand = {
  name: "invites",
  aliases: ["myinvites", "invitecount"],
  description: "See how many people you (or another user) have invited.",
  usage: "invites [user]",
  examples: ["invites"],
  category: "utility",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = (await ctx.getUser("user")) ?? ctx.user;
    const count = await getInviteCount(ctx.guild.id, target.id);
    return ctx.reply({
      embeds: [
        brandEmbed({
          title: `Invites — ${target.username}`,
          description: `**${count}** member${count === 1 ? "" : "s"} invited.`,
          page: "Invites",
        }),
      ],
    });
  },
};
