import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { userMood } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "mood",
  aliases: ["mymood", "feelings"],
  description: "Set your current mood (shows on your profile).",
  usage: "mood [text]",
  examples: ["mood"],
  category: "fun",
  guildOnly: true,
  options: [
    { name: "text", description: "Your mood (emoji + short text, max 64 chars)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const text = ctx.getString("text") ?? ctx.rawArgs?.trim();

    if (!text) {
      const row = await db.select().from(userMood).where(and(eq(userMood.guildId, ctx.guild.id), eq(userMood.userId, ctx.user.id))).then(r => r[0]);
      return ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.brandColor)
            .setDescription(`your current mood: **${row?.mood ?? "not set"}**\nuse \`/mood text:\` to change it.`)
            .setFooter({ text: `${config.embedFooter} • fun` })
            .setTimestamp(),
        ],
      });
    }

    if (text.length > 64) return ctx.reply({ embeds: [successEmbed("Keep it under 64 characters.")] });

    await db.insert(userMood)
      .values({ guildId: ctx.guild.id, userId: ctx.user.id, mood: text })
      .onConflictDoUpdate({ target: [userMood.guildId, userMood.userId], set: { mood: text, updatedAt: new Date() } });

    return ctx.reply({ embeds: [successEmbed(`mood set to: **${text}**`)] });
  },
};
