import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { eventsSettings } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "enableevent",
  aliases: ["eventon"],
  description: "Re-enable a previously disabled event.",
  usage: "enableevent <event>",
  examples: ["enableevent messageDelete"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "event", description: "Event name to re-enable", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const evt = ctx.getString("event") ?? ctx.args[0] ?? "";
    await db.insert(eventsSettings).values({ guildId: ctx.guild.id, event: evt, enabled: true })
      .onConflictDoUpdate({ target: [eventsSettings.guildId, eventsSettings.event], set: { enabled: true } });
    return ctx.reply({ embeds: [successEmbed(`event \`${evt}\` re-enabled.`)] });
  },
};
