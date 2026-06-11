import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "hide",
  aliases: ["hidechannel", "hch"],
  description: "Hide a channel from @everyone.",
  usage: "hide [channel]",
  examples: ["hide"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "channel", description: "Channel to hide (defaults to current)", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = (ctx.getChannel("channel") ?? ctx.channel) as any;
    if (!target?.permissionOverwrites) return ctx.reply({ embeds: [errorEmbed("Cannot hide this **channel** type.")] });
    try {
      await target.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
      return ctx.reply({ embeds: [successEmbed(`Hidden <#${target.id}> from @everyone.`)] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed to hide **channel**. Check my **permissions**.")] });
    }
  },
};
