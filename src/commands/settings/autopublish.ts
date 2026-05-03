import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { autopublishChannels } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "autopublish",
  description: "Auto-publish messages in an announcement channel.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "action", description: "enable or disable", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "enable", value: "enable" }, { name: "disable", value: "disable" }] },
    { name: "channel", description: "Announcement channel", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = ctx.getString("action", true) ?? ctx.args[0];
    const ch = ctx.getChannel("channel");
    if (!ch) return ctx.reply({ embeds: [errorEmbed("Channel not found.")] });
    const full = ctx.guild.channels.cache.get(ch.id);
    if (!full || full.type !== ChannelType.GuildAnnouncement) return ctx.reply({ embeds: [errorEmbed("That must be an announcement channel.")] });
    if (action === "enable") {
      await db.insert(autopublishChannels).values({ guildId: ctx.guild.id, channelId: ch.id }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`Auto-publish enabled for <#${ch.id}>.`)] });
    } else {
      await db.delete(autopublishChannels).where(and(eq(autopublishChannels.guildId, ctx.guild.id), eq(autopublishChannels.channelId, ch.id)));
      return ctx.reply({ embeds: [successEmbed(`Auto-publish disabled for <#${ch.id}>.`)] });
    }
  },
};
