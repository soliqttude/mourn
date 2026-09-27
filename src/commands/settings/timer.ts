import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { autoMessages } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseDuration } from "../../lib/time.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "timer",
  aliases: ["automessage", "autom"],
  description: "Schedule one repeating message per channel. Supports raw text, embed scripting, and dynamic variables.",
  category: "settings",
  permission: "manage_channels",
  guildOnly: true,
  usage: "timer <add|remove|view|list> [channel] [interval] [message]",
  examples: [
    "timer add #announcements 2h Reminder: follow the rules!",
    "timer view #announcements",
    "timer remove #announcements",
    "timer list",
  ],
  options: [
    {
      name: "action",
      description: "add, remove, view, or list",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "view", value: "view" }, { name: "list", value: "list" }],
    },
    { name: "channel", description: "Channel to post in", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "interval", description: "Interval e.g. 30m, 1h, 6h", type: ApplicationCommandOptionType.String, required: false },
    { name: "message", description: "Message to send (supports embed scripting)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    if (!config.databaseEnabled) {
      return ctx.reply({ embeds: [errorEmbed("timer requires the database to be enabled. Add DATABASE_URL to Render.")] });
    }

    const action = ctx.getString("action");

    if (action === "list") {
      const rows = await db.select().from(autoMessages).where(eq(autoMessages.guildId, guild.id));
      if (!rows.length)
        return ctx.reply({ embeds: [errorEmbed("No auto messages configured.")] });

      const lines = rows.map((r) => {
        const mins = Math.round(r.intervalMs / 60000);
        const preview = r.message.length > 40 ? r.message.slice(0, 40) + "…" : r.message;
        return `**#${r.id}** — <#${r.channelId}> every **${mins}m** — \`${preview}\``;
      });
      return ctx.reply({
        embeds: [brandEmbed({ description: `**auto messages (${rows.length})**\n\n${lines.join("\n")}`, page: "settings" })],
      });
    }

    if (action === "view" || action === "remove") {
      const channel = ctx.getChannel("channel");
      if (!channel) return ctx.reply({ embeds: [errorEmbed("Please provide the channel.")] });
      const rows = await db.select().from(autoMessages).where(and(eq(autoMessages.channelId, channel.id), eq(autoMessages.guildId, guild.id)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`No timer found for <#${channel.id}>.`)] });
      if (action === "view") return ctx.reply({ embeds: [brandEmbed({ title: "Timer", description: `**channel:** <#${channel.id}>\\n**interval:** ${Math.round(rows[0].intervalMs / 60000)} minutes\\n**message:** ${rows[0].message}` })] });
      await db.delete(autoMessages).where(and(eq(autoMessages.channelId, channel.id), eq(autoMessages.guildId, guild.id)));
      return ctx.reply({ embeds: [successEmbed(`removed timer for <#${channel.id}>.`, "settings")] });
    }

    if (action === "add") {
      const channel = ctx.getChannel("channel");
      const intervalStr = ctx.getString("interval");
      const msg = ctx.getString("message");

      if (!channel) return ctx.reply({ embeds: [errorEmbed("Please specify a **channel**.")] });
      if (!intervalStr) return ctx.reply({ embeds: [errorEmbed("Please specify an interval e.g. `30m`, `1h`.")] });
      if (!msg) return ctx.reply({ embeds: [errorEmbed("Please specify a message.")] });

      const ms = parseDuration(intervalStr);
      if (!ms || ms < 10 * 60_000)
        return ctx.reply({ embeds: [errorEmbed("Minimum interval is 10 minutes.")] });

      const existing = await db.select().from(autoMessages).where(and(eq(autoMessages.guildId, guild.id), eq(autoMessages.channelId, channel.id)));
      if (existing.length)
        return ctx.reply({ embeds: [errorEmbed(`A timer already exists for <#${channel.id}>. Remove it first.`)] });

      const result = await db.insert(autoMessages).values({
        guildId: guild.id,
        channelId: channel.id,
        intervalMs: ms,
        message: msg,
      }).returning({ id: autoMessages.id });

      const mins = Math.round(ms / 60000);
      return ctx.reply({
        embeds: [successEmbed(`timer #${result[0].id} created — posting in <#${channel.id}> every **${mins}m**.`, "settings")],
      });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid action.")] });
  },
};
