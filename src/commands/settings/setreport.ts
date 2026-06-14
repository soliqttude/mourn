import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setreport",
  description: "Set the channel where user reports are sent.",
  usage: "setreport [channel]",
  examples: ["setreport"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "channel", description: "Report channel", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const ch = ctx.getChannel("channel");
    if (!ch) return ctx.reply({ embeds: [errorEmbed("Please specify a **channel**.")] });
    await updateGuildSettings(guild.id, { reportChannel: ch.id });
    return ctx.reply({ embeds: [successEmbed(`Report channel set to <#${ch.id}>. Users can now use \`/report\`.`)] });
  },
};
