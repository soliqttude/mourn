import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { eventsSettings } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const KNOWN_EVENTS = [
  "messageCreate", "messageDelete", "messageUpdate", "guildMemberAdd", "guildMemberRemove",
  "guildMemberUpdate", "voiceStateUpdate", "guildBanAdd", "guildBanRemove",
  "channelCreate", "channelDelete", "channelUpdate", "roleCreate", "roleDelete", "roleUpdate",
  "inviteCreate", "inviteDelete", "emojiCreate", "emojiDelete",
];

export const command: HybridCommand = {
  name: "disableevent",
  aliases: ["eventoff"],
  description: "Disable a gateway event for this server.",
  usage: "disableevent <event> | disableevent list | disableevent events",
  examples: ["disableevent messageDelete", "disableevent list"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "event", description: "Event name, list, or events", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const evtArg = ctx.getString("event") ?? ctx.args[0] ?? "";

    if (evtArg.toLowerCase() === "events") {
      return ctx.reply({ embeds: [brandEmbed({ title: "toggleable events", description: KNOWN_EVENTS.map(e => `\`${e}\``).join(", ") })] });
    }

    if (evtArg.toLowerCase() === "list") {
      const rows = await db.select().from(eventsSettings).where(and(eq(eventsSettings.guildId, ctx.guild.id), eq(eventsSettings.enabled, false)));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No **events** are currently disabled.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: "disabled events", description: rows.map(r => `\`${r.event}\``).join("\n") })] });
    }

    const evt = evtArg;
    const existing = await db.select().from(eventsSettings).where(and(eq(eventsSettings.guildId, ctx.guild.id), eq(eventsSettings.event, evt)));
    if (existing.length && !existing[0]!.enabled) {
      return ctx.reply({ embeds: [errorEmbed(`event \`${evt}\` is already disabled.`)] });
    }

    await db.insert(eventsSettings).values({ guildId: ctx.guild.id, event: evt, enabled: false })
      .onConflictDoUpdate({ target: [eventsSettings.guildId, eventsSettings.event], set: { enabled: false } });
    return ctx.reply({ embeds: [successEmbed(`event \`${evt}\` disabled for this server.`)] });
  },
};
