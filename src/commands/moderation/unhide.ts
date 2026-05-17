import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "unhide",
  aliases: ["showchannel", "uch"],
  description: "Restore visibility of a hidden channel.",
  usage: "unhide [channel]",
  examples: ["unhide"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "channel", description: "Channel to unhide (defaults to current)", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = (ctx.getChannel("channel") ?? ctx.channel) as any;
    if (!target?.permissionOverwrites) return ctx.reply({ embeds: [errorEmbed("Cannot unhide this channel type.")] });
    try {
      await target.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
      return ctx.reply({ embeds: [successEmbed(`Restored visibility of <#${target.id}>.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to unhide channel. Check my permissions.")] });
    }
  },
};
