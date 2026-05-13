import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { autopublishChannels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "autopublish",
  description: "Toggle auto-publish for an announcement channel. Just run the command again to turn it off.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "channel", description: "Announcement channel to toggle", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const ch = ctx.getChannel("channel", true);
    if (!ch) return ctx.reply({ embeds: [errorEmbed("Channel not found.")] });
    const full = ctx.guild.channels.cache.get(ch.id);
    if (!full || full.type !== ChannelType.GuildAnnouncement) return ctx.reply({ embeds: [errorEmbed("That must be an announcement channel.")] });
    const existing = await db.select().from(autopublishChannels).where(and(eq(autopublishChannels.guildId, ctx.guild.id), eq(autopublishChannels.channelId, ch.id)));
    if (existing.length) {
      await db.delete(autopublishChannels).where(and(eq(autopublishChannels.guildId, ctx.guild.id), eq(autopublishChannels.channelId, ch.id)));
      return ctx.reply({ embeds: [successEmbed(`Auto-publish **disabled** for <#${ch.id}>.`)] });
    }
    await db.insert(autopublishChannels).values({ guildId: ctx.guild.id, channelId: ch.id }).onConflictDoNothing();
    return ctx.reply({ embeds: [successEmbed(`Auto-publish **enabled** for <#${ch.id}>.`)] });
  },
};
