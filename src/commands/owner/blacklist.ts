import { ApplicationCommandOptionType } from "discord.js";
import { eq } from "drizzle-orm";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { blacklist } from "../../db/schema.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "blacklist",
  description: "(Owner only) Blacklist a user from using the bot.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "action", description: "add | remove", type: ApplicationCommandOptionType.String, required: true },
    { name: "user_id", description: "User ID", type: ApplicationCommandOptionType.String, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ embeds: [errorEmbed("Owner only.")] });
    const action = (ctx.getString("action", true) ?? "").toLowerCase();
    const id = ctx.getString("user_id", true);
    if (!id) return;
    if (action === "add") {
      await db
        .insert(blacklist)
        .values({ userId: id, reason: ctx.getString("reason") ?? null })
        .onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`Blacklisted ${id}.`)] });
    }
    if (action === "remove") {
      await db.delete(blacklist).where(eq(blacklist.userId, id));
      return ctx.reply({ embeds: [successEmbed(`Removed ${id} from blacklist.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("Unknown action.")] });
  },
};
