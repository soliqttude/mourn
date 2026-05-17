import { ApplicationCommandOptionType } from "discord.js";
import { and, eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { warnings } from "../../db/schema.js";

export const command: HybridCommand = {
  name: "clearwarns",
  aliases: ["clearwarnings", "cw", "delwarns"],
  description: "Clear all warnings for a member.",
  usage: "clearwarns [user]",
  examples: ["clearwarns"],
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "user", description: "User", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    const target = await ctx.getUser("user", true);
    if (!target || !ctx.guild) return;
    const rows = await db
      .delete(warnings)
      .where(and(eq(warnings.guildId, ctx.guild.id), eq(warnings.userId, target.id)))
      .returning();
    return ctx.reply({
      embeds: [successEmbed(`Cleared **${rows.length}** warning(s) for ${target.tag}.`)],
    });
  },
};
