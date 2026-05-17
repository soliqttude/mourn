import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { marriages } from "../../db/schema.js";
import { or, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "divorce",
  aliases: ["breakup", "separate"],
  description: "Divorce your partner.",
  usage: "divorce",
  examples: ["divorce"],
  category: "fun",
  guildOnly: true,
  async execute(ctx) {
    const existing = await db.select().from(marriages).where(
      or(eq(marriages.user1Id, ctx.user.id), eq(marriages.user2Id, ctx.user.id))
    );
    if (!existing.length) return ctx.reply({ embeds: [errorEmbed("You're not married.")] });
    await db.delete(marriages).where(
      or(eq(marriages.user1Id, ctx.user.id), eq(marriages.user2Id, ctx.user.id))
    );
    return ctx.reply({ embeds: [successEmbed("You are now divorced. 💔")] });
  },
};
