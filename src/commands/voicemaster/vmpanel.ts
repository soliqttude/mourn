import type { TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { vmPanelEmbed, vmPanelButtons } from "../../features/voicemaster.js";

export const command: HybridCommand = {
  name: "vmpanel",
  description: "Send the voicemaster control panel here.",
  category: "voicemaster",
  permission: "admin",
  guildOnly: true,
  async execute(ctx) {
    if (!ctx.channel) return;
    await (ctx.channel as TextChannel).send({
      embeds: [vmPanelEmbed()],
      components: [vmPanelButtons()],
    });
    return ctx.reply({ embeds: [successEmbed("Panel sent.")], ephemeral: true });
  },
};
