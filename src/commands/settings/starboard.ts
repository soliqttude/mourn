import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "starboard",
  description: "Configure the starboard.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "channel", description: "Starboard channel", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "threshold", description: "Required reactions (default 3)", type: ApplicationCommandOptionType.Integer, required: false },
    { name: "emoji", description: "Emoji (default ⭐)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel", true);
    const thr = ctx.getNumber("threshold") ?? 3;
    const emoji = ctx.getString("emoji") ?? "⭐";
    if (!ch) return ctx.reply({ embeds: [errorEmbed("Channel required.")] });
    if (thr < 1 || thr > 50) return ctx.reply({ embeds: [errorEmbed("Threshold must be 1-50.")] });
    await updateGuildSettings(ctx.guild.id, {
      starboardChannel: ch.id,
      starboardThreshold: thr,
      starboardEmoji: emoji,
    });
    return ctx.reply({
      embeds: [successEmbed(`Starboard set to <#${ch.id}> at ${thr} ${emoji}.`)],
    });
  },
};
