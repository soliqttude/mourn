import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "runmute",
  aliases: ["reactunmute", "unreactionmute"],
  description: "Re-allow reactions for a user.",
  usage: "runmute [user]",
  examples: ["runmute"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [{ name: "user", description: "Member to reaction-unmute", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    await ctx.guild.channels.cache
      .filter(c => c.isTextBased())
      .forEach(async (ch) => {
        await (ch as any).permissionOverwrites.edit(target.id, { AddReactions: null }).catch(() => {});
      });
    return ctx.reply({ embeds: [successEmbed(`Removed reaction-mute from **${target.user.tag}**.`)] });
  },
};
