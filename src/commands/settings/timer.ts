import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { autoMessages } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { parseDuration } from "../../lib/time.js";

export const command: HybridCommand = {
  name: "timer",
  aliases: ["automessage", "autom"],
  description: "Schedule repeating messages in a channel. Supports embed scripting.",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "timer (add|remove|list) [channel] [interval] [message]",
  examples: [
    "timer add #announcements 2h Reminder: follow the rules!",
    "timer add #general 30m {embed}$v{title: Daily Reminder}$v{description: Be kind}",
    "timer list",
    "timer remove 3",
  ],
  options: [
    {
      name: "action",
      description: "add, remove, or list",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }],
    },
    { name: "channel", description: "Channel to post in", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "interval", description: "Interval e.g. 30m, 1h, 6h", type: ApplicationCommandOptionType.String, required: false },
    { name: "message", description: "Message to send (supports embed scripting)", type: ApplicationCommandOptionType.String, required: false },
    { name: "id", description: "Timer ID (for remove)", type: ApplicationCommandOptionType.Number, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

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

    if (action === "remove") {
      const id = ctx.getNumber("id");
      if (!id) return ctx.reply({ embeds: [errorEmbed("Please provide the timer id.")] });
      const rows = await db.select().from(autoMessages)
        .where(and(eq(autoMessages.id, id), eq(autoMessages.guildId, guild.id)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed(`no timer found with id \`${id}\`.`)] });
      await db.delete(autoMessages).where(eq(autoMessages.id, id));
      return ctx.reply({ embeds: [successEmbed(`removed timer #${id}.`, "settings")] });
    }

    if (action === "add") {
      const channel = ctx.getChannel("channel");
      const intervalStr = ctx.getString("interval");
      const msg = ctx.getString("message");

      if (!channel) return ctx.reply({ embeds: [errorEmbed("Please specify a **channel**.")] });
      if (!intervalStr) return ctx.reply({ embeds: [errorEmbed("Please specify an interval e.g. `30m`, `1h`.")] });
      if (!msg) return ctx.reply({ embeds: [errorEmbed("Please specify a message.")] });

      const ms = parseDuration(intervalStr);
      if (!ms || ms < 60_000)
        return ctx.reply({ embeds: [errorEmbed("Minimum interval is 1 minute.")] });
      if (ms > 7 * 24 * 60 * 60 * 1000)
        return ctx.reply({ embeds: [errorEmbed("Maximum interval is 7 days.")] });

      const existing = await db.select().from(autoMessages).where(eq(autoMessages.guildId, guild.id));
      if (existing.length >= 10)
        return ctx.reply({ embeds: [errorEmbed("Maximum of 10 auto messages per server.")] });

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
