import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { giveaways } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "greroll",
  description: "Reroll a giveaway winner.",
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
    const giveaway = rows[0];
    if (!giveaway) return ctx.reply({ embeds: [errorEmbed("Giveaway not found.")] });
    if (!giveaway.ended) return ctx.reply({ embeds: [errorEmbed("This giveaway hasn't ended yet. Use /gend first.")] });
    const ch = guild.channels.cache.get(giveaway.channelId);
    if (!ch || !giveaway.messageId) return ctx.reply({ embeds: [errorEmbed("Could not find the giveaway message.")] });
    const msg = await (ch as any).messages.fetch(giveaway.messageId).catch(() => null);
    if (!msg) return ctx.reply({ embeds: [errorEmbed("Giveaway message not found.")] });
    const reaction = msg.reactions.cache.get("🎉");
    const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
    const entrants = users ? [...users.values()].filter((u: any) => !u.bot) : [];
    if (entrants.length === 0) return ctx.reply({ embeds: [errorEmbed("No valid entrants to reroll.")] });
    const winner = entrants[Math.floor(Math.random() * entrants.length)] as any;
    return ctx.reply({
      content: `🎉 New winner for **${giveaway.prize}**: <@${winner.id}>! Congratulations!`,
      allowedMentions: { users: [winner.id] },
    });
  },
};
