import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { giveaways } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { type TextChannel } from "discord.js";

export const command: HybridCommand = {
  name: "gcancel",
  description: "Cancel an active giveaway and delete its embed.",
  category: "giveaway",
  permission: "manage_guild",
  guildOnly: true,
  usage: "gcancel (id)",
  examples: ["gcancel 5"],
  options: [
    { name: "id", description: "Giveaway ID", type: ApplicationCommandOptionType.Number, required: true },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const id = ctx.getNumber("id", true);
    if (!id) return ctx.reply({ embeds: [errorEmbed("Please provide a giveaway id.")] });

    const rows = await db.select().from(giveaways)
      .where(and(eq(giveaways.id, id), eq(giveaways.guildId, guild.id)));
    const gw = rows[0];
    if (!gw) return ctx.reply({ embeds: [errorEmbed(`no giveaway found with id \`${id}\`.`)] });
    if (gw.ended) return ctx.reply({ embeds: [errorEmbed("That giveaway is already ended.")] });

    await db.update(giveaways).set({ ended: true }).where(eq(giveaways.id, id));

    if (gw.messageId && gw.channelId) {
      const ch = ctx.client.channels.cache.get(gw.channelId) as TextChannel | undefined;
      const msg = ch ? await ch.messages.fetch(gw.messageId).catch(() => null) : null;
      if (msg) await msg.delete().catch(() => {});
    }

    return ctx.reply({ embeds: [successEmbed(`giveaway #${id} has been cancelled.`, "giveaway")] });
  },
};
