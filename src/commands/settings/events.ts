import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { eventsSettings } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

const TOGGLEABLE_EVENTS: Record<string, string> = {
  "afk":               "AFK mention detection",
  "autoresponder":     "Autoresponders on message",
  "reaction_trigger":  "Reaction triggers on message",
  "snipe":             "Snipe (message delete tracking)",
  "level_up":          "Level up messages",
  "command_error":     "Command error messages",
  "bump_reminder":     "Bump reminders",
  "counting":          "Counting channel",
  "highlight":         "Highlight keyword pings",
  "autopublish":       "Auto-publish news channel",
};

export async function isEventEnabled(guildId: string, event: string): Promise<boolean> {
  const rows = await db.select().from(eventsSettings).where(and(eq(eventsSettings.guildId, guildId), eq(eventsSettings.event, event)));
  return rows[0]?.enabled ?? true;
}

export const command: HybridCommand = {
  name: "events",
  description: "Toggle bot events on or off per server.",
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  usage: "events [toggle|status] [event]",
  examples: ["events toggle afk", "events toggle snipe", "events status"],
  options: [
    { name: "subcommand", description: "toggle | status | list", type: ApplicationCommandOptionType.String, required: false },
    { name: "event", description: "Event name to toggle", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const guildId = ctx.guild.id;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "status").toLowerCase();
    const eventName = (ctx.getString("event") ?? ctx.args[1] ?? "").toLowerCase();

    if (sub === "toggle") {
      if (!eventName) return ctx.reply({ embeds: [errorEmbed(`provide an event name. available: ${Object.keys(TOGGLEABLE_EVENTS).join(", ")}`)] });
      if (!TOGGLEABLE_EVENTS[eventName]) return ctx.reply({ embeds: [errorEmbed(`unknown event \`${eventName}\`. available: ${Object.keys(TOGGLEABLE_EVENTS).join(", ")}`)] });
      const rows = await db.select().from(eventsSettings).where(and(eq(eventsSettings.guildId, guildId), eq(eventsSettings.event, eventName)));
      const current = rows[0]?.enabled ?? true;
      const newVal = !current;
      await db.insert(eventsSettings).values({ guildId, event: eventName, enabled: newVal }).onConflictDoUpdate({ target: [eventsSettings.guildId, eventsSettings.event], set: { enabled: newVal } });
      return ctx.reply({ embeds: [successEmbed(`event **${eventName}** (${TOGGLEABLE_EVENTS[eventName]}) is now **${newVal ? "enabled" : "disabled"}**.`)] });
    }

    const all = await db.select().from(eventsSettings).where(eq(eventsSettings.guildId, guildId));
    const statusMap = Object.fromEntries(all.map(r => [r.event, r.enabled]));
    const lines = Object.entries(TOGGLEABLE_EVENTS).map(([k, v]) => {
      const enabled = statusMap[k] ?? true;
      return `${enabled ? "✅" : "❌"} \`${k}\` — ${v}`;
    });
    return ctx.reply({ embeds: [brandEmbed({ title: "Events Toggle", description: lines.join("\n") })] });
  },
};
