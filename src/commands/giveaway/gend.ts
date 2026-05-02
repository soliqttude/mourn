import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { endGiveaway } from "../../features/giveaway.js";
import { db } from "../../db/index.js";
import { giveaways } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "gend",
  description: "End a giveaway early.",
  category: "giveaway",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "id", description: "Giveaway ID", type: ApplicationCommandOptionType.Integer, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const id = ctx.getNumber("id", true);
    if (!id) return;
    const rows = await db.select().from(giveaways).where(
      and(eq(giveaways.id, id), eq(giveaways.guildId, guild.id))
    );
    if (!rows[0]) return ctx.reply({ embeds: [errorEmbed("Giveaway not found.")] });
    if (rows[0].ended) return ctx.reply({ embeds: [errorEmbed("That giveaway has already ended.")] });
    await ctx.defer();
    await endGiveaway(ctx.client, id);
    return ctx.reply({ embeds: [successEmbed(`Giveaway #${id} ended.`)] });
  },
};
