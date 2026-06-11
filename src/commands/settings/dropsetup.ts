import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { getGuildSettings, updateGuildSettings } from "../../db/settings.js";
import { hasAdminPerms } from "../../lib/permissions.js";

export const command: HybridCommand = {
  name: "dropsetup",
  description: "Set the channel for random coin drops.",
  usage: "dropsetup [channel]",
  examples: ["dropsetup"],
  category: "settings",
  guildOnly: true,
  options: [
    { name: "channel", description: "Channel to send drops in (leave blank to disable)", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    if (!ctx.member || !hasAdminPerms(ctx.member)) {
      return ctx.reply({ embeds: [errorEmbed("Only admins can configure drops.")], ephemeral: true } as any);
    }

    const ch = ctx.getChannel("channel");

    if (!ch) {
      await updateGuildSettings(ctx.guild.id, { dropChannel: null });
      return ctx.reply({ embeds: [successEmbed("Coin drops disabled.")] });
    }

    await updateGuildSettings(ctx.guild.id, { dropChannel: ch.id });
    return ctx.reply({ embeds: [successEmbed(`drops will appear in <#${ch.id}> every 2–4 hours.\n\nuse \`/drops\` to check if there's an active drop.`)] });
  },
};
