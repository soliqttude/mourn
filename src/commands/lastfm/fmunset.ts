import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { lastfmAccounts } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "fmunset",
  aliases: ["lastfmunset", "unsetfm"],
  description: "Unlink your Last.fm account.",
  usage: "fmunset",
  examples: ["fmunset"],
  category: "lastfm",
  async execute(ctx) {
    const row = await db.select().from(lastfmAccounts).where(eq(lastfmAccounts.userId, ctx.user.id)).then(r => r[0]);
    if (!row) return ctx.reply({ embeds: [errorEmbed("you don't have a linked last.fm account.")] });
    await db.delete(lastfmAccounts).where(eq(lastfmAccounts.userId, ctx.user.id));
    return ctx.reply({ embeds: [successEmbed(`unlinked your last.fm account (**${row.username}**).`)] });
  },
};
