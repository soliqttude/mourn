import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "deletechannel", aliases: ["delchannel", "removechannel"], description: "Delete a channel.", category: "moderation", permission: "manage_channels", guildOnly: true,
  options: [{ name: "channel", description: "Channel to delete", type: ApplicationCommandOptionType.Channel, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel", true);
    if (!channel) return ctx.reply({ embeds: [errorEmbed("**Channel** not found.")] });
    const name = (channel as any).name ?? "unknown";
    try {
      await (channel as any).delete(`Deleted by ${ctx.user.tag}`);
      return ctx.reply({ embeds: [successEmbed(`Deleted channel **#${name}**.`)] });
    } catch (e) { return ctx.reply({ embeds: [errorEmbed((e as Error).message.slice(0, 200))] }); }
  },
};
