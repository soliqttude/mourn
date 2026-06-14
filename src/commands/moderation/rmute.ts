import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "rmute",
  aliases: ["reactionmute", "reactmute"],
  description: "Prevent a user from adding reactions.",
  usage: "rmute [user] [reason]",
  examples: ["rmute Rule violation"],
  category: "moderation",
  permission: "mute_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to reaction-mute", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    const reason = ctx.getString("reason") ?? "No reason provided";
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    await ctx.guild.channels.cache
      .filter(c => c.isTextBased())
      .forEach(async (ch) => {
        await (ch as any).permissionOverwrites.edit(target.id, { AddReactions: false }).catch(() => {});
      });
    return ctx.reply({ embeds: [successEmbed(`Reaction-muted **${target.user.tag}** — ${reason}`)] });
  },
};
