import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "iunmute",
  description: "Re-allow images/attachments for a user.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [{ name: "user", description: "Member to image-unmute", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    await ctx.guild.channels.cache
      .filter(c => c.isTextBased())
      .forEach(async (ch) => {
        await (ch as any).permissionOverwrites.edit(target.id, {
          AttachFiles: null,
          EmbedLinks: null,
        }).catch(() => {});
      });
    return ctx.reply({ embeds: [successEmbed(`Removed image-mute from **${target.user.tag}**.`)] });
  },
};
