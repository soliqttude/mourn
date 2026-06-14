import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { countingData } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "setupcounting",
  description: "set a counting channel",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "setupcounting #channel",
  examples: ["setupcounting #counting"],
  options: [
    { name: "channel", description: "the counting channel", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;

    const ch = ctx.getChannel("channel") ?? (ctx.args[0]
      ? ctx.guild.channels.cache.get(ctx.args[0].replace(/[<#>]/g, ""))
      : null);

    if (!ch) return ctx.reply({ embeds: [errorEmbed("Please mention a valid **channel**.")] });

    await updateGuildSettings(ctx.guild.id, { countingChannel: ch.id } as any);
    await db
      .insert(countingData)
      .values({ guildId: ctx.guild.id, count: 0, lastUserId: null })
      .onConflictDoUpdate({ target: [countingData.guildId], set: { count: 0, lastUserId: null } });

    return ctx.reply({
      embeds: [successEmbed(`counting channel set to <#${ch.id}>. members start from **1**.`, "settings")],
    });
  },
};
