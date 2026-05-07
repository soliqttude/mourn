import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { economy } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
const OID = "177803210738630656";
export const command: HybridCommand = {
  name: "resetuser", description: "(Owner) Reset all economy data for a user.", category: "owner", ownerOnly: true,
  options: [
    { name: "user", description: "User to reset", type: ApplicationCommandOptionType.User, required: true },
    { name: "guild", description: "Guild ID (omit to reset all servers)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const target = await ctx.getUser("user", true);
    if (!target) return ctx.reply({ content: "User not found." });
    const guildId = ctx.getString("guild") ?? ctx.args[1];
    if (guildId) await db.delete(economy).where(and(eq(economy.userId, target.id), eq(economy.guildId, guildId)));
    else await db.delete(economy).where(eq(economy.userId, target.id));
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(config.successColor).setTitle("🗑️ User Reset")
      .setDescription(guildId
        ? `Reset economy for **${target.username}** in guild \`${guildId}\`.`
        : `Reset **all** economy data for **${target.username}** across every server.`)
      .setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};