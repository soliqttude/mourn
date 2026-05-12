import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { getGuildSettings } from "../../db/settings.js";

const confessionCounts = new Map<string, number>();

export const command: HybridCommand = {
  name: "confession",
  description: "Post an anonymous confession to the confession channel.",
  category: "fun",
  guildOnly: true,
  aliases: ["confess", "anon"],
  options: [
    { name: "text", description: "Your confession (anonymous!)", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;
    const text = ctx.getString("text") ?? ctx.rawArgs;
    if (!text?.trim()) return ctx.reply({ content: "provide a confession.", ephemeral: true } as any);
    if (text.length > 500) return ctx.reply({ content: "keep it under 500 characters.", ephemeral: true } as any);

    const settings = await getGuildSettings(ctx.guild.id);
    if (!settings.confessionChannel) {
      return ctx.reply({ content: "no confession channel configured. ask an admin to run `/confession setup`.", ephemeral: true } as any);
    }

    const channel = ctx.guild.channels.cache.get(settings.confessionChannel);
    if (!channel?.isTextBased()) {
      return ctx.reply({ content: "confession channel not found or invalid — ask an admin to reconfigure it.", ephemeral: true } as any);
    }

    const count = (confessionCounts.get(ctx.guild.id) ?? 0) + 1;
    confessionCounts.set(ctx.guild.id, count);

    await ctx.reply({ content: "✅ confession posted anonymously.", ephemeral: true } as any);

    await (channel as any).send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle(`🤫 anonymous confession #${count}`)
          .setDescription(`"${text}"`)
          .setFooter({ text: `${config.embedFooter} • identity hidden` })
          .setTimestamp(),
      ],
    });
  },
};
