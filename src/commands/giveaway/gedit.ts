import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { db } from "../../db/index.js";
import { giveaways } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { type TextChannel, EmbedBuilder } from "discord.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "gedit",
  description: "Edit an active giveaway's prize, winners, description, thumbnail, or image.",
  category: "giveaway",
  permission: "manage_guild",
  guildOnly: true,
  usage: "gedit (id) [--prize <text>] [--winners <n>] [--desc <text>] [--thumb <url>] [--image <url>] [--duration <time>]",
  examples: ["gedit 12 --prize Nitro Classic --winners 2", "gedit 5 --desc Must be level 10+"],
  options: [
    { name: "id", description: "Giveaway ID", type: ApplicationCommandOptionType.Number, required: true },
    { name: "prize", description: "New prize text", type: ApplicationCommandOptionType.String, required: false },
    { name: "winners", description: "New winner count", type: ApplicationCommandOptionType.Number, required: false },
    { name: "description", description: "New description", type: ApplicationCommandOptionType.String, required: false },
    { name: "thumbnail", description: "Thumbnail URL", type: ApplicationCommandOptionType.String, required: false },
    { name: "image", description: "Image URL", type: ApplicationCommandOptionType.String, required: false },
    { name: "duration", description: "Extend by duration e.g. 30m", type: ApplicationCommandOptionType.String, required: false },
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
    if (gw.ended) return ctx.reply({ embeds: [errorEmbed("That giveaway has already ended.")] });

    const prize = ctx.getString("prize");
    const winners = ctx.getNumber("winners");
    const description = ctx.getString("description");
    const thumbnail = ctx.getString("thumbnail");
    const image = ctx.getString("image");
    const durStr = ctx.getString("duration");

    if (!prize && !winners && !description && !thumbnail && !image && !durStr) {
      return ctx.reply({ embeds: [errorEmbed("Provide at least one field to edit.")] });
    }

    const update: Partial<typeof giveaways.$inferInsert> = {};
    if (prize) update.prize = prize;
    if (winners && winners >= 1) update.winnersCount = Math.floor(winners);
    if (description) update.description = description;
    if (thumbnail) update.thumbnail = thumbnail;
    if (image) update.imageUrl = image;
    if (durStr) {
      const ms = parseDuration(durStr);
      if (!ms) return ctx.reply({ embeds: [errorEmbed("Invalid duration.")] });
      update.endsAt = new Date(gw.endsAt.getTime() + ms);
    }

    await db.update(giveaways).set(update).where(eq(giveaways.id, id));

    if (gw.messageId && gw.channelId) {
      const ch = ctx.client.channels.cache.get(gw.channelId) as TextChannel | undefined;
      const msg = ch ? await ch.messages.fetch(gw.messageId).catch(() => null) : null;
      if (msg) {
        const newGw = { ...gw, ...update };
        const embed = new EmbedBuilder()
          .setColor(config.brandColor)
          .setTitle("🎉 GIVEAWAY 🎉")
          .setDescription(
            `**Prize:** ${newGw.prize}\n` +
            (newGw.description ? `${newGw.description}\n` : "") +
            `**Winners:** ${newGw.winnersCount}\n**Hosted by:** <@${gw.hostId}>\n` +
            `**Ends:** <t:${Math.floor((newGw.endsAt as Date).getTime() / 1000)}:R>\n\nReact with 🎉 to enter!`
          )
          .setFooter({ text: `ID: ${id} • ${config.embedFooter}` })
          .setTimestamp(newGw.endsAt as Date);
        if (newGw.thumbnail) embed.setThumbnail(newGw.thumbnail);
        if (newGw.imageUrl) embed.setImage(newGw.imageUrl);
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }
    }

    return ctx.reply({ embeds: [successEmbed(`giveaway #${id} updated.`, "giveaway")] });
  },
};
