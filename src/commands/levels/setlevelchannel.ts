import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setlevelchannel",
  description: "Set the channel for level-up messages.",
  usage: "setlevelchannel [channel]",
  examples: ["setlevelchannel"],
  category: "levels",
  permission: "admin",
  guildOnly: true,
  options: [{ name: "channel", description: "Channel for level-up messages", type: ApplicationCommandOptionType.Channel, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel");
    if (!ch) return;
    await updateGuildSettings(ctx.guild.id, { levelUpChannel: ch.id } as any);
    return ctx.reply({ embeds: [successEmbed(`Level-up messages will now be sent in <#${ch.id}>.`)] });
  },
};
