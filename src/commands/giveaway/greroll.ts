import { ApplicationCommandOptionType, type TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { giveaways } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "greroll",
  description: "Reroll winners for an ended giveaway.",
  category: "giveaway",
  permission: "mod",
  guildOnly: true,
  usage: "greroll (id) [winners]",
  examples: ["greroll 12", "greroll 5 2"],
  options: [
    { name: "id", description: "Giveaway ID", type: ApplicationCommandOptionType.Number, required: true },
    { name: "winners", description: "Number of winners to reroll (default 1)", type: ApplicationCommandOptionType.Number, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const id = ctx.getNumber("id", true);
    if (!id) return ctx.reply({ embeds: [errorEmbed("please provide a giveaway id.")] });

    const rows = await db.select().from(giveaways)
      .where(and(eq(giveaways.id, id), eq(giveaways.guildId, guild.id)));
    const gw = rows[0];
    if (!gw) return ctx.reply({ embeds: [errorEmbed(`no giveaway found with id \`${id}\`.`)] });
    if (!gw.ended) return ctx.reply({ embeds: [errorEmbed("that giveaway hasn't ended yet.")] });
    if (!gw.messageId) return ctx.reply({ embeds: [errorEmbed("couldn't find the giveaway message.")] });

    const ch = ctx.client.channels.cache.get(gw.channelId) as TextChannel | undefined;
    if (!ch) return ctx.reply({ embeds: [errorEmbed("giveaway channel not found.")] });

    const msg = await ch.messages.fetch(gw.messageId).catch(() => null);
    if (!msg) return ctx.reply({ embeds: [errorEmbed("giveaway message not found.")] });

    const reaction = msg.reactions.cache.get("🎉");
    const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
    const entrants = users ? [...users.values()].filter((u) => !u.bot) : [];

    if (!entrants.length) return ctx.reply({ embeds: [errorEmbed("no valid entrants to reroll from.")] });

    const count = Math.min(ctx.getNumber("winners") ?? 1, entrants.length);
    const pool = [...entrants];
    const winners: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      winners.push(pool[idx].id);
      pool.splice(idx, 1);
    }

    const winText = winners.map((w) => `<@${w}>`).join(", ");
    await ch.send({
      content: `🎉 New winner(s) for **${gw.prize}**: ${winText}! Congratulations!`,
      allowedMentions: { users: winners },
    });

    return ctx.reply({ embeds: [successEmbed(`rerolled — new winner(s): ${winText}`, "giveaway")] });
  },
};
