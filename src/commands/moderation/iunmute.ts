import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "iunmute",
  aliases: [],
  description: "Re-allow images/attachments for a user.",
  usage: "iunmute <member> [reason]",
  examples: ["iunmute @mmoudder"],
  category: "moderation",
  permission: "moderate_members",
  guildOnly: true,
  options: [
    { name: "user", description: "Member to image-unmute", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("user", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("**Member** not found.")] });
    const reason = ctx.getString("reason") ?? ctx.args.slice(1).join(" ") || "No reason provided";
    await Promise.all(ctx.guild.channels.cache
      .filter(c => c.isTextBased())
      .map(async (ch) => {
        await (ch as any).permissionOverwrites.edit(target.id, {
          AttachFiles: null,
          EmbedLinks: null,
        }, reason).catch(() => {});
      }));
    return ctx.reply({ embeds: [successEmbed(`Removed image-mute from **${target.user.tag}** — ${reason}`)] });
  },
};
