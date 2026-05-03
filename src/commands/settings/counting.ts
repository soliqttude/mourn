import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { updateGuildSettings, getGuildSettings } from "../../db/settings.js";
import { db } from "../../db/index.js";
import { countingData } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "counting",
  description: "Manage the counting game.",
  category: "settings",
  guildOnly: true,
  options: [
    {
      name: "setup", description: "Set up the counting channel (admin)", type: ApplicationCommandOptionType.Subcommand,
      options: [{ name: "channel", description: "Counting channel", type: ApplicationCommandOptionType.Channel, required: true }],
    },
    { name: "reset", description: "Reset the count to 0 (admin)", type: ApplicationCommandOptionType.Subcommand },
    { name: "stats", description: "Show current counting stats", type: ApplicationCommandOptionType.Subcommand },
  ] as any,
  async execute(ctx) {
    if (!ctx.guild) return;
    const interaction = ctx.raw as any;
    const subName = ctx.source === "slash" ? interaction.options?.getSubcommand?.() : ctx.args[0];

    if (subName === "setup") {
      const ch = ctx.getChannel("channel");
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Channel not found.")] });
      await updateGuildSettings(ctx.guild.id, { countingChannel: ch.id } as any);
      await db.insert(countingData).values({ guildId: ctx.guild.id, count: 0, lastUserId: null })
        .onConflictDoUpdate({ target: [countingData.guildId], set: { count: 0, lastUserId: null } });
      return ctx.reply({ embeds: [successEmbed(`Counting channel set to <#${ch.id}>. Start counting from 1!`)] });
    }

    if (subName === "reset") {
      await db.update(countingData).set({ count: 0, lastUserId: null }).where(eq(countingData.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [successEmbed("Count has been reset to 0.")] });
    }

    const row = await db.select().from(countingData).where(eq(countingData.guildId, ctx.guild.id));
    const data = row[0];
    return ctx.reply({
      embeds: [brandEmbed({
        title: "Counting Stats",
        fields: [
          { name: "Current Count", value: String(data?.count ?? 0), inline: true },
          { name: "Last Counter", value: data?.lastUserId ? `<@${data.lastUserId}>` : "Nobody", inline: true },
        ],
        page: "Settings",
      })],
    });
  },
};
