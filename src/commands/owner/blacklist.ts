import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { blacklist } from "../../db/schema.js";
import { config } from "../../config.js";
import { invalidateBlacklist } from "../../lib/blacklistCache.js";

export const command: HybridCommand = {
  name: "blacklist",
  description: "(Owner only) Blacklist or unblacklist a user from using the bot.",
  usage: "blacklist [action] [user_id] [reason]",
  examples: ["blacklist Rule violation"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "action",  description: "add | remove",  type: ApplicationCommandOptionType.String, required: true },
    { name: "user_id", description: "User ID",        type: ApplicationCommandOptionType.String, required: true },
    { name: "reason",  description: "Reason",         type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ embeds: [errorEmbed("Owner only.")] });
    const action = (ctx.getString("action", true) ?? ctx.args[0] ?? "").toLowerCase();
    const id = ctx.getString("user_id", true) ?? ctx.args[1];
    if (!id) return ctx.reply({ embeds: [errorEmbed("Provide a **user** ID.")] });

    if (action === "add") {
      const reason = ctx.getString("reason") ?? ctx.args[2] ?? null;
      await db.insert(blacklist).values({ userId: id, reason }).onConflictDoNothing();
      invalidateBlacklist(id);
      return ctx.reply({ embeds: [successEmbed(`Blacklisted \`${id}\`.${reason ? ` Reason: ${reason}` : ""}`)] });
    }

    if (action === "remove") {
      await db.delete(blacklist).where(eq(blacklist.userId, id));
      invalidateBlacklist(id);
      return ctx.reply({ embeds: [successEmbed(`Removed \`${id}\` from the blacklist.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Action must be `add` or `remove`.")] });
  },
};
