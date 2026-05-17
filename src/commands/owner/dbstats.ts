import { EmbedBuilder } from "discord.js";
import { sql } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";

const TABLES = [
  "guild_settings","economy","levels","warnings","mod_cases",
  "reminders","tickets","giveaways","tags","autoresponders",
  "blacklist","marriages","birthdays","word_filter","mod_notes",
  "shop_items","user_items","reports","custom_commands","counters",
];

export const command: HybridCommand = {
  name: "dbstats",
  description: "(Owner only) Database row counts and statistics.",
  usage: "dbstats",
  examples: ["dbstats"],
  category: "owner",
  ownerOnly: true,
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "this isn't yours to touch." });
    await ctx.defer(true);
    const rows: string[] = [];
    for (const table of TABLES) {
      try {
        const res = await db.execute(sql.raw(`SELECT COUNT(*) as c FROM ${table}`));
        const count = (res as any).rows?.[0]?.c ?? (res as any)[0]?.c ?? "?";
        rows.push(`\`${table}\` — **${Number(count).toLocaleString()}** rows`);
      } catch { rows.push(`\`${table}\` — *skipped*`); }
    }
    const eb = new EmbedBuilder()
      .setColor(config.brandColor)
      .setTitle("🗄️ Database Statistics")
      .setDescription(rows.join("\n"))
      .setFooter({ text: config.embedFooter }).setTimestamp();
    return ctx.reply({ embeds: [eb] });
  },
};
