import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

export const command: HybridCommand = {
  name: "unlock",
  aliases: ["unlockchannel", "ulch"],
  description: "Unlock the current channel.",
  usage: "unlock",
  examples: ["unlock"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel || !ctx.guild) return;
    const ch = ctx.channel as any;
    if (!ch.permissionOverwrites) {
      return ctx.reply({ embeds: [errorEmbed("Cannot unlock this channel type.")] });
    }
    try {
      await ch.permissionOverwrites.edit(ctx.guild.roles.everyone, {
        SendMessages: null,
      });
      return ctx.reply({ embeds: [successEmbed("🔓 Channel unlocked.")] });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed((err as Error).message)] });
    }
  },
};
