import { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { suggestions } from "../../db/schema.js";
import { getGuildSettings } from "../../db/settings.js";
import { eq, and } from "drizzle-orm";

export const command: HybridCommand = {
  name: "suggest",
  description: "Submit a suggestion.",
  category: "settings",
  guildOnly: true,
  options: [{ name: "suggestion", description: "Your suggestion", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const text = ctx.getString("suggestion", true) ?? ctx.rawArgs;
    if (!text) return;
    const settings = await getGuildSettings(ctx.guild.id);
    const channel = (settings as any).suggestionsChannel;
    if (!channel) return ctx.reply({ embeds: [errorEmbed("No suggestions channel set. Ask an admin to use `/suggestchannel`.")] });
    const ch = ctx.guild.channels.cache.get(channel);
    if (!ch?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Suggestions channel is invalid.")] });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("suggest_up").setLabel("👍 0").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("suggest_down").setLabel("👎 0").setStyle(ButtonStyle.Danger),
    );
    const msg = await (ch as any).send({
      embeds: [brandEmbed({ title: "💡 New Suggestion", description: text, user: ctx.user, page: "Suggestions" })],
      components: [row],
    });
    await db.insert(suggestions).values({ guildId: ctx.guild.id, userId: ctx.user.id, messageId: msg.id, channelId: ch.id, content: text });
    return ctx.reply({ embeds: [successEmbed("Your suggestion has been submitted!")], ephemeral: true } as any);
  },
};
