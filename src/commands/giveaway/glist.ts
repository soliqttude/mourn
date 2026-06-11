import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { giveaways } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "glist",
  description: "List all active giveaways in this server.",
  category: "giveaway",
  guildOnly: true,
  usage: "glist",
  examples: ["glist"],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const active = await db.select().from(giveaways)
      .where(and(eq(giveaways.guildId, guild.id), eq(giveaways.ended, false)));

    if (!active.length)
      return ctx.reply({ embeds: [errorEmbed("No active giveaways in this server.")] });

    const lines = active.map((g) =>
      `**#${g.id}** — ${g.prize} · **${g.winnersCount}w** · <#${g.channelId}> · ends <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>`
    );

    return ctx.reply({
      embeds: [brandEmbed({
        description: `**active giveaways (${active.length})**\n\n${lines.join("\n")}`,
        page: "giveaway",
      })],
    });
  },
};
