import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
export const command: HybridCommand = {
  name: "bumpreminder", aliases: ["setbump", "bumpchannel"], description: "Set a channel for Disboard bump reminders (every 2h).", category: "settings", permission: "admin", guildOnly: true,
  options: [{ name: "channel", description: "Channel for bump reminders (leave empty to disable)", type: ApplicationCommandOptionType.Channel, required: false }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const channel = ctx.getChannel("channel");
    await updateGuildSettings(ctx.guild.id, { bumpChannel: channel?.id ?? null });
    return ctx.reply({ embeds: [successEmbed(channel ? `Bump reminders set to <#${channel.id}>. I'll remind you to bump every 2 hours!` : "Bump reminders **disabled**.")] });
  },
};
