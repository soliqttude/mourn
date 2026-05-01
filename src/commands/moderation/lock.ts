import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "lock",
  description: "Lock the current channel.",
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel || !ctx.guild) return;
    const ch = ctx.channel as any;
    if (!ch.permissionOverwrites) {
      return ctx.reply({ embeds: [errorEmbed("Cannot lock this channel type.")] });
    }
    try {
      await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, {
        SendMessages: false,
      });
      return ctx.reply({ embeds: [successEmbed("🔒 Channel locked.")] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
